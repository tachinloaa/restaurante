import twilioClient from '../config/twilio.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import DatabaseStorageService from './databaseStorageService.js';
import { supabase } from '../config/database.js';

/**
 * Servicio de Twilio para envío de mensajes de WhatsApp
 */
class TwilioService {
  /**
   * Límite de caracteres de WhatsApp (Twilio)
   * Usamos 1500 para dejar un margen de seguridad
   */
  static MAX_CARACTERES = 1500;
  static notificationQueue = [];
  static isQueueProcessing = false;
  static isReliabilityInitialized = false;
  static maxQueueRetries = 20;

  /**
   * Registra un mensaje enviado en el log de auditoría (fire-and-forget)
   */
  static logDelivery(messageSid, destinatario, tipo, pedidoNumero = null) {
    supabase
      .from('whatsapp_delivery_log')
      .insert({ message_sid: messageSid, destinatario, tipo, pedido_numero: pedidoNumero ? String(pedidoNumero) : null, estado: 'sent' })
      .then(({ error }) => { if (error) logger.warn(`⚠️ delivery_log insert: ${error.message}`); })
      .catch(() => {});
  }

  static iniciarSistemaConfiabilidad() {
    if (this.isReliabilityInitialized) {
      return;
    }

    this.cargarColaPersistente();

    setInterval(() => {
      this.procesarColaNotificaciones();
    }, 30000);

    process.on('SIGTERM', () => {
      // No es necesario guardar más (ahora está en el DB)
    });

    process.on('SIGINT', () => {
      // No es necesario guardar más (ahora está en el DB)
    });

    this.isReliabilityInitialized = true;
    logger.info(`📨 Sistema confiable de notificaciones activo. Cola inicial: ${this.notificationQueue.length}`);
  }

  static async cargarColaPersistente() {
    try {
      const data = await DatabaseStorageService.loadPendingNotifications();
      if (Array.isArray(data)) {
        this.notificationQueue = data;
      }
    } catch (error) {
      logger.error('❌ Error cargando cola de notificaciones:', error.message);
      this.notificationQueue = [];
    }
  }

  static guardarColaPersistente() {
    // Ya no es necesario guardar en archivo (está en DB)
    // Este método se mantiene para compatibilidad pero no hace nada
  }

  static async encolarNotificacionFallida(job) {
    const queueItem = {
      ...job,
      numero_intentos: job.numero_intentos ?? job.retryCount ?? 0,
      proximo_reintento_at: job.proximo_reintento_at || new Date(job.nextRetryAt || Date.now() + 30000).toISOString(),
      createdAt: job.createdAt || job.creado_at || new Date().toISOString(),
      numero_destino: job.numero_destino || job.numeroDestino || null,
      admin_targets: job.admin_targets || job.adminTargets || null
    };

    this.notificationQueue.push(queueItem);
    
    // Guardar en BD (no-blocking)
    DatabaseStorageService.enqueueNotification(queueItem).catch(err => {
      logger.warn('⚠️ No se pudo guardar notificación en Supabase:', err.message);
    });

    logger.warn(`⚠️ Notificación encolada para reintento (${job.tipo})`);

    // 📲 Canal de respaldo: si es un mensaje al admin y Twilio falló,
    // enviar push via ntfy para que el admin se entere aunque WhatsApp esté caído
    if (job.tipo === 'admin') {
      this.enviarAlertaNtfy(`⚠️ Twilio falló — notificación admin encolada\n\n${job.mensaje || ''}`).catch(() => {});
    }
  }

  /**
   * Enviar alerta push de emergencia via ntfy.sh
   * Canal de respaldo completamente independiente de Twilio.
   * No lanza excepciones — si falla, solo loguea.
   */
  static async enviarAlertaNtfy(mensaje, prioridad = 'high') {
    const topic = config.ntfy?.topic;
    if (!topic) return;

    const url = `${config.ntfy?.url || 'https://ntfy.sh'}/${encodeURIComponent(topic)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Title': 'El Rinconcito - Alerta',
          'Priority': prioridad,
          'Tags': 'warning,restaurant',
          'Content-Type': 'text/plain'
        },
        body: mensaje.substring(0, 4096)
      });

      if (res.ok) {
        logger.info('📲 Alerta ntfy enviada exitosamente');
      } else {
        logger.warn(`⚠️ ntfy respondió con status ${res.status}`);
      }
    } catch (error) {
      logger.warn(`⚠️ No se pudo enviar alerta ntfy: ${error.message}`);
    }
  }

  static async procesarColaNotificaciones() {
    if (this.isQueueProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isQueueProcessing = true;

    try {
      const ahora = Date.now();
      const pendientes = [];

      for (const job of this.notificationQueue) {
        const nextRetryAt = job.nextRetryAt || (job.proximo_reintento_at ? new Date(job.proximo_reintento_at).getTime() : 0);
        if (nextRetryAt > ahora) {
          pendientes.push(job);
          continue;
        }

        let resultado;

        if (job.tipo === 'cliente') {
          resultado = await this.enviarMensajeCliente(job.numero_destino, job.mensaje, 2, { skipQueue: true });
        } else if (job.tipo === 'admin') {
          resultado = await this.enviarMensajeAdmin(job.mensaje, {
            skipQueue: true,
            adminTargets: Array.isArray(job.admin_targets) ? job.admin_targets : null
          });
        } else {
          resultado = { success: true };
        }

        if (resultado.success) {
          logger.info(`✅ Notificación recuperada desde cola (${job.tipo})`);
          // Remover de BD
          if (job.id) {
            DatabaseStorageService.removeNotification(job.id).catch(err => {
              logger.warn('⚠️ No se pudo remover notificación de DB:', err.message);
            });
          }
          continue;
        }

        const retryCount = (job.numero_intentos || 0) + 1;
        const backoff = Math.min(600000, 30000 * Math.pow(2, Math.min(retryCount, 5)));

        // Nunca descartar automáticamente: mantener fuera de limbo y seguir reintentando.
        if (retryCount >= this.maxQueueRetries && retryCount % 10 === 0) {
          logger.error(`🚨 Notificación sigue pendiente tras ${retryCount} intentos (${job.tipo})`);
          // Si es un mensaje admin y lleva demasiados intentos, ntfy como último recurso
          if (job.tipo === 'admin') {
            this.enviarAlertaNtfy(
              `🚨 Twilio sigue roto tras ${retryCount} intentos\n\n${job.mensaje || ''}`,
              'urgent'
            ).catch(() => {});
          }
        }

        const updatedJob = {
          ...job,
          numero_intentos: retryCount,
          proximo_reintento_at: new Date(Date.now() + backoff).toISOString(),
          nextRetryAt: Date.now() + backoff,
          ultimo_error: resultado.error || 'Error desconocido'
        };

        pendientes.push(updatedJob);
        
        // Actualizar en BD
        if (job.id) {
          DatabaseStorageService.updateNotificationRetry(job.id, {
            numero_intentos: retryCount,
            proximo_reintento_at: updatedJob.proximo_reintento_at,
            ultimo_error: updatedJob.ultimo_error
          }).catch(err => {
            logger.warn('⚠️ No se pudo actualizar notificación en DB:', err.message);
          });
        }
      }

      this.notificationQueue = pendientes;
      // Ya no es necesario guardar en archivo
    } catch (error) {
      logger.error('❌ Error procesando cola de notificaciones:', error.message);
    } finally {
      this.isQueueProcessing = false;
    }
  }

  static getOperationalMetrics() {
    const ahora = Date.now();
    const total = this.notificationQueue.length;
    const adminPendientes = this.notificationQueue.filter(j => j.tipo === 'admin').length;
    const clientePendientes = this.notificationQueue.filter(j => j.tipo === 'cliente').length;

    let oldestMs = 0;
    for (const job of this.notificationQueue) {
      const created = new Date(job.createdAt || job.creado_at || ahora).getTime();
      const age = ahora - created;
      if (age > oldestMs) oldestMs = age;
    }

    return {
      queue: {
        total,
        adminPendientes,
        clientePendientes,
        oldestPendingMs: oldestMs,
        processing: this.isQueueProcessing,
        maxQueueRetries: this.maxQueueRetries
      }
    };
  }

  static getAdminRecipients(overrideTargets = null) {
    if (Array.isArray(overrideTargets) && overrideTargets.length > 0) {
      return [...new Set(overrideTargets.map(n => this.normalizarNumeroAdmin(n)).filter(Boolean))];
    }

    const recipients = [
      this.normalizarNumeroAdmin(config.admin.phoneNumber),
      config.admin.secondaryPhoneNumber ? this.normalizarNumeroAdmin(config.admin.secondaryPhoneNumber) : null
    ].filter(Boolean);

    return [...new Set(recipients)];
  }

  static extraerNumeroLocal(numero) {
    const digits = String(numero || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  }

  static getAuthorizedAdminLocals() {
    return [...new Set(
      this.getAdminRecipients()
        .map(numero => this.extraerNumeroLocal(numero))
        .filter(numero => numero.length === 10)
    )];
  }

  static isAdminNumber(numero) {
    const numeroLocal = this.extraerNumeroLocal(numero);

    if (numeroLocal.length !== 10) {
      return false;
    }

    // 🔒 Ambos admins configurados son siempre autorizados — inamovibles
    if (numeroLocal === this.extraerNumeroLocal(config.admin.phoneNumber)) return true;
    if (config.admin.secondaryPhoneNumber && numeroLocal === this.extraerNumeroLocal(config.admin.secondaryPhoneNumber)) return true;

    return this.getAuthorizedAdminLocals().includes(numeroLocal);
  }

  /**
   * Dividir mensaje en partes si excede el límite
   */
  static dividirMensaje(mensaje) {
    if (mensaje.length <= this.MAX_CARACTERES) {
      return [mensaje];
    }

    const partes = [];
    let textoRestante = mensaje;

    while (textoRestante.length > 0) {
      if (textoRestante.length <= this.MAX_CARACTERES) {
        partes.push(textoRestante);
        break;
      }

      // Buscar el último salto de línea antes del límite
      let puntoCorte = textoRestante.lastIndexOf('\n', this.MAX_CARACTERES);

      // Si no hay salto de línea, buscar el último espacio
      if (puntoCorte === -1 || puntoCorte < this.MAX_CARACTERES * 0.7) {
        puntoCorte = textoRestante.lastIndexOf(' ', this.MAX_CARACTERES);
      }

      // Si no hay espacio, cortar en el límite
      if (puntoCorte === -1 || puntoCorte < this.MAX_CARACTERES * 0.7) {
        puntoCorte = this.MAX_CARACTERES;
      }

      partes.push(textoRestante.substring(0, puntoCorte).trim());
      textoRestante = textoRestante.substring(puntoCorte).trim();
    }

    return partes;
  }

  /**
   * Enviar mensaje de WhatsApp a un cliente
   * Si el mensaje es muy largo, lo divide automáticamente
   * Con reintentos automáticos en caso de fallo
   */
  static async enviarMensajeCliente(numeroDestino, mensaje, intentos = 3, opciones = {}) {
    let ultimoError = null;
    
    for (let i = 0; i < intentos; i++) {
      try {
        // Modo de prueba: No enviar mensajes reales
        if (process.env.TWILIO_TEST_MODE === 'true') {
          logger.info(`[TEST MODE] Mensaje a cliente ${numeroDestino}: ${mensaje.substring(0, 100)}...`);
          return { success: true, messageSid: 'TEST_MODE', test: true };
        }

        // Asegurar formato de WhatsApp
        const numeroFormateado = numeroDestino.startsWith('whatsapp:')
          ? numeroDestino
          : `whatsapp:${numeroDestino}`;

        // Dividir mensaje si es necesario
        const partes = this.dividirMensaje(mensaje);
        const messageSids = [];

        // Enviar cada parte con un pequeño delay
        for (let j = 0; j < partes.length; j++) {
          const parte = partes[j];
          let mensajeConEncabezado = parte;

          // Agregar número de parte si hay múltiples
          if (partes.length > 1) {
            mensajeConEncabezado = `📱 *Parte ${j + 1}/${partes.length}*\n\n${parte}`;
          }

          const message = await twilioClient.messages.create({
            body: mensajeConEncabezado,
            from: config.twilio.whatsappClientes,
            to: numeroFormateado
          });

          messageSids.push(message.sid);
          logger.info(`Mensaje enviado a cliente ${numeroDestino} (parte ${j + 1}/${partes.length}): ${message.sid}`);

          // Pequeño delay entre mensajes para evitar sobrecarga
          if (j < partes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }

        return { success: true, messageSid: messageSids[0], messageSids, partes: partes.length };
        
      } catch (error) {
        ultimoError = error;
        logger.error(`❌ Intento ${i + 1}/${intentos} fallido para ${numeroDestino}:`, error.message);
        
        // Si es el último intento, devolver error
        if (i === intentos - 1) {
          break;
        }
        
        // Backoff exponencial: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, i);
        logger.info(`⏳ Esperando ${delay}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Todos los intentos fallaron
    logger.error(`❌ Todos los intentos fallaron para ${numeroDestino}`);

    if (!opciones.skipQueue) {
      this.encolarNotificacionFallida({
        tipo: 'cliente',
        numeroDestino,
        mensaje,
        intentos
      });

      return {
        success: true,
        queued: true,
        error: ultimoError?.message || 'Encolado para reintento'
      };
    }

    return {
      success: false,
      error: ultimoError?.message || 'Error desconocido al enviar mensaje',
      code: ultimoError?.code
    };
  }

  /**
   * Normalizar número del admin al formato E.164 requerido por Twilio
    * Acepta: +525636399034, 525636399034, 5636399034, whatsapp:+525636399034, etc.
   */
  static normalizarNumeroAdmin(numero) {
    // Si no viene número, usar el número principal del admin
    const raw = numero || config.admin.phoneNumber;
    // Quitar prefijo whatsapp: si existe
    let s = String(raw).replace(/^whatsapp:/i, '').trim();
    // Dejar solo dígitos y el '+' inicial
    s = s.replace(/[^\d+]/g, '');
    // E.164 requiere '+' al inicio
    if (!s.startsWith('+')) s = '+' + s;
    // Verificación mínima: debe tener al menos 10 dígitos después del '+'
    if (s.replace(/\D/g, '').length < 10) {
      // Último recurso: usar el número fijo
      logger.warn('⚠️ Número admin inválido, usando número principal como respaldo');
      return config.admin.phoneNumber;
    }
    return s;
  }

  /**
   * Enviar mensaje de WhatsApp al administrador
   * Si el mensaje es muy largo, lo divide automáticamente.
   *
   * opciones.templateData = { numeroPedido, nombreCliente, telefono, total, tipoPedido, templateSid }
   * Si se proporciona, se envía primero el template (sin ventana 24h) como garantía,
   * y luego el freeform como detalle adicional.
   */
  static async enviarMensajeAdmin(mensaje, opciones = {}) {
    try {
      // Modo de prueba: No enviar mensajes reales
      if (process.env.TWILIO_TEST_MODE === 'true') {
        logger.info(`[TEST MODE] Mensaje a admin: ${mensaje.substring(0, 100)}...`);
        return { success: true, messageSid: 'TEST_MODE', test: true };
      }

      // Si hay datos del pedido, enviar template primero (garantiza entrega sin ventana 24h)
      if (opciones.templateData) {
        const { numeroPedido, nombreCliente, telefono, total, tipoPedido, templateSid } = opciones.templateData;
        try {
          await this.enviarNotificacionAdminConPlantilla(
            numeroPedido,
            nombreCliente || 'Sin nombre',
            telefono || 'N/A',
            total || '$0',
            tipoPedido || 'para_llevar',
            null,
            opciones.adminTargets || null,
            templateSid || null
          );
        } catch (te) {
          logger.warn(`⚠️ Template previo al freeform falló: ${te.message}`);
        }
      }

      // Obtener números admin (principal + secundario)
      const recipients = this.getAdminRecipients(opciones.adminTargets);
      if (recipients.length === 0) {
        logger.error('❌ ADMIN_PHONE_NUMBER no está configurado o tiene formato inválido — no se envió mensaje al admin');
        return { success: false, error: 'Admin phone not configured' };
      }

      const failures = [];
      const messageSids = [];

      for (const numeroAdmin of recipients) {
        const numeroFormateado = `whatsapp:${numeroAdmin}`;
        logger.info(`📤 Enviando mensaje al admin: ${numeroAdmin}`);

        try {
          // Dividir mensaje si es necesario
          const partes = this.dividirMensaje(mensaje);

          // Enviar cada parte
          for (let i = 0; i < partes.length; i++) {
            const parte = partes[i];
            let mensajeConEncabezado = parte;

            // Agregar número de parte si hay múltiples
            if (partes.length > 1) {
              mensajeConEncabezado = `📱 *Parte ${i + 1}/${partes.length}*\n\n${parte}`;
            }

            const message = await twilioClient.messages.create({
              body: mensajeConEncabezado,
              from: config.twilio.whatsappClientes,
              to: numeroFormateado,
              statusCallback: `${config.backendUrl}/webhook/status`
            });

            messageSids.push(message.sid);
            logger.info(`Mensaje enviado a admin ${numeroAdmin} (parte ${i + 1}/${partes.length}): ${message.sid}`);
            this.logDelivery(message.sid, numeroAdmin, 'freeform', null);

            // Pequeño delay entre mensajes
            if (i < partes.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          }
        } catch (targetError) {
          failures.push({ numeroAdmin, error: targetError.message || 'Error desconocido' });
          logger.error(`❌ Falló envío a admin ${numeroAdmin}:`, targetError.message);
        }
      }

      // Si al menos un admin recibió, consideramos éxito parcial/total.
      if (messageSids.length > 0) {
        // Si hubo fallos parciales, encolar solo para los objetivos fallidos.
        if (!opciones.skipQueue && failures.length > 0) {
          this.encolarNotificacionFallida({
            tipo: 'admin',
            mensaje,
            adminTargets: failures.map(f => f.numeroAdmin)
          });
        }

        return {
          success: true,
          partial: failures.length > 0,
          failures,
          messageSid: messageSids[0],
          messageSids
        };
      }

      // Fallo total en todos los admin targets.
      const errorConsolidado = failures.map(f => `${f.numeroAdmin}: ${f.error}`).join(' | ') || 'Error desconocido';
      throw new Error(errorConsolidado);
    } catch (error) {
      logger.error('Error al enviar mensaje a admin:', error);

      if (!opciones.skipQueue) {
        this.encolarNotificacionFallida({
          tipo: 'admin',
          mensaje,
          adminTargets: opciones.adminTargets || null
        });

        return {
          success: true,
          queued: true,
          error: error.message
        };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar mensaje de WhatsApp al repartidor
   * Requiere que REPARTIDOR_PHONE_NUMBER esté configurado en las variables de entorno
   */
  static async enviarMensajeRepartidor(mensaje) {
    try {
      if (process.env.TWILIO_TEST_MODE === 'true') {
        logger.info(`[TEST MODE] Mensaje a repartidor: ${mensaje.substring(0, 100)}...`);
        return { success: true, messageSid: 'TEST_MODE', test: true };
      }

      const repartidorPhone = config.repartidor?.phoneNumber;
      if (!repartidorPhone) {
        logger.info('ℹ️ REPARTIDOR_PHONE_NUMBER no configurado — omitiendo notificación al repartidor');
        return { success: false, error: 'Repartidor phone not configured', notConfigured: true };
      }

      const numeroFormateado = TwilioService.normalizarNumeroAdmin(repartidorPhone);
      if (!numeroFormateado) {
        logger.error('❌ REPARTIDOR_PHONE_NUMBER tiene formato inválido');
        return { success: false, error: 'Repartidor phone format invalid' };
      }

      // Dividir si el mensaje es muy largo
      const MAX_CHARS = 1600;
      const partes = [];
      if (mensaje.length <= MAX_CHARS) {
        partes.push(mensaje);
      } else {
        let i = 0;
        while (i < mensaje.length) {
          partes.push(mensaje.substring(i, i + MAX_CHARS));
          i += MAX_CHARS;
        }
      }

      const messageSids = [];
      for (let i = 0; i < partes.length; i++) {
        const msg = await twilioClient.messages.create({
          body: partes[i],
          from: `whatsapp:${config.twilio.whatsappClientes}`,
          to: `whatsapp:${numeroFormateado}`
        });
        messageSids.push(msg.sid);
        if (i < partes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      logger.info(`✅ Mensaje enviado al repartidor ${numeroFormateado}: SID ${messageSids[0]}`);
      return { success: true, messageSid: messageSids[0], messageSids };
    } catch (error) {
      logger.error('Error al enviar mensaje al repartidor:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar notificación al admin usando plantilla aprobada de WhatsApp (business-initiated)
   * Esto permite enviar mensajes al admin sin restricción de 24 horas
   */
  static async enviarNotificacionAdminConPlantilla(numeroPedido, nombreCliente, telefono, total, tipoPedido, comprobanteUrl = null, targets = null, templateSid = null) {
    try {
      if (process.env.TWILIO_TEST_MODE === 'true') {
        logger.info(`[TEST MODE] Plantilla nuevo pedido #${numeroPedido} para admin`);
        return { success: true, messageSid: 'TEST_MODE', test: true };
      }

      const admins = this.getAdminRecipients(targets);
      if (!admins.length) {
        logger.error('❌ Sin números admin configurados — no se envió plantilla');
        return { success: false, error: 'Admin phone not configured' };
      }

      const tipoBase = tipoPedido === 'para_llevar' ? 'Recoger en Restaurante' : 'Domicilio';
      // Variables de WhatsApp NO admiten \n ni emojis — URL en misma línea con separador
      const tipoTexto = comprobanteUrl
        ? `${tipoBase} | Comprobante: ${comprobanteUrl}`
        : tipoBase;

      const contentVariables = JSON.stringify({
        '1': String(numeroPedido),
        '2': nombreCliente,
        '3': telefono,
        '4': total,
        '5': tipoTexto
      });

      const failures = [];
      const messageSids = [];

      for (const numeroAdmin of admins) {
        try {
          logger.info(`📤 Enviando plantilla al admin: ${numeroAdmin}`);
          const message = await twilioClient.messages.create({
            contentSid: templateSid || config.twilio.templateNuevoPedido,
            contentVariables,
            from: config.twilio.whatsappClientes,
            to: `whatsapp:${numeroAdmin}`,
            statusCallback: `${config.backendUrl}/webhook/status`
          });
          logger.info(`✅ Notificación con plantilla enviada a ${numeroAdmin}: ${message.sid}`);
          messageSids.push(message.sid);
          this.logDelivery(message.sid, numeroAdmin, 'template', numeroPedido);
        } catch (adminError) {
          failures.push({ numeroAdmin, error: adminError.message });
          logger.error(`❌ Error enviando plantilla a ${numeroAdmin}: ${adminError.message}`);
        }
      }

      if (messageSids.length > 0) {
        return { success: true, messageSid: messageSids[0], messageSids, failures };
      }

      return { success: false, error: failures.map(f => `${f.numeroAdmin}: ${f.error}`).join(' | ') || 'Error desconocido' };
    } catch (error) {
      logger.error('Error enviando plantilla al admin, intentando mensaje normal:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar template de comprobante con imagen al admin (Media template - business initiated)
   * Variables: {{1}}=comprobanteUrl, {{2}}=numeroPedido, {{3}}=cliente, {{4}}=telefono, {{5}}=total, {{6}}=tipo
   */
  static async enviarTemplateComprobanteAdmin(numeroPedido, nombreCliente, telefono, total, tipoPedido, comprobanteUrl, targets = null) {
    try {
      if (process.env.TWILIO_TEST_MODE === 'true') {
        logger.info(`[TEST MODE] Template comprobante pedido #${numeroPedido}`);
        return { success: true, messageSid: 'TEST_MODE', test: true };
      }

      const admins = this.getAdminRecipients(targets);
      if (!admins.length) {
        return { success: false, error: 'Admin phone not configured' };
      }

      const tipoTexto = tipoPedido === 'para_llevar' ? 'Recoger en Restaurante' : 'Domicilio';
      const contentVariables = JSON.stringify({
        '1': comprobanteUrl || '',
        '2': String(numeroPedido),
        '3': nombreCliente,
        '4': telefono,
        '5': total,
        '6': tipoTexto
      });

      const failures = [];
      const messageSids = [];

      for (const numeroAdmin of admins) {
        try {
          logger.info(`📸 Enviando template con comprobante al admin: ${numeroAdmin}`);
          const message = await twilioClient.messages.create({
            contentSid: config.twilio.templateComprobantePago,
            contentVariables,
            from: config.twilio.whatsappClientes,
            to: `whatsapp:${numeroAdmin}`,
            statusCallback: `${config.backendUrl}/webhook/status`
          });
          logger.info(`✅ Template con comprobante enviado a ${numeroAdmin}: ${message.sid}`);
          messageSids.push(message.sid);
        } catch (adminError) {
          failures.push({ numeroAdmin, error: adminError.message });
          logger.error(`❌ Error enviando template comprobante a ${numeroAdmin}: ${adminError.message}`);
        }
      }

      if (messageSids.length > 0) {
        return { success: true, messageSid: messageSids[0], messageSids, failures };
      }

      return { success: false, error: failures.map(f => `${f.numeroAdmin}: ${f.error}`).join(' | ') || 'Error desconocido' };
    } catch (error) {
      logger.error('❌ Error enviando template con comprobante:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar mensaje con imagen
   */
  static async enviarMensajeConImagen(numeroDestino, mensaje, mediaUrl) {
    try {
      // Normalizar número destino (garantizar formato E.164)
      const numNorm = TwilioService.normalizarNumeroAdmin(numeroDestino);
      const numeroFormateado = numNorm.startsWith('whatsapp:')
        ? numNorm
        : `whatsapp:${numNorm}`;

      logger.info(`📤 Enviando mensaje con imagen a ${numeroDestino}`);
      logger.info(`🖼️ URL de media: ${mediaUrl}`);

      const message = await twilioClient.messages.create({
        body: mensaje,
        from: config.twilio.whatsappClientes,
        to: numeroFormateado,
        mediaUrl: [mediaUrl]
      });

      logger.info(`✅ Mensaje con imagen enviado a ${numeroDestino}: ${message.sid}`);
      return { success: true, messageSid: message.sid };
    } catch (error) {
      logger.error(`❌ Error al enviar mensaje con imagen a ${numeroDestino}:`, error);
      logger.error(`📍 Detalles: ${error.message} | Código: ${error.code}`);
      return { success: false, error: error.message, errorCode: error.code };
    }
  }

  /**
   * Obtener estado de un mensaje
   */
  static async obtenerEstadoMensaje(messageSid) {
    try {
      const message = await twilioClient.messages(messageSid).fetch();

      return {
        success: true,
        data: {
          sid: message.sid,
          status: message.status,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage,
          dateSent: message.dateSent
        }
      };
    } catch (error) {
      logger.error(`Error al obtener estado del mensaje ${messageSid}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validar número de WhatsApp
   */
  static validarNumeroWhatsApp(numero) {
    // Remover prefijo whatsapp: si existe
    const limpio = numero.replace('whatsapp:', '');

    // Verificar que sea un número válido (10-15 dígitos)
    const regex = /^\+?[1-9]\d{9,14}$/;
    return regex.test(limpio);
  }

  /**
   * Formatear número para WhatsApp
   */
  static formatearNumeroWhatsApp(numero) {
    // Si ya tiene el prefijo, retornarlo
    if (numero.startsWith('whatsapp:')) {
      return numero;
    }

    // Si no tiene +, agregarlo (asumiendo número mexicano)
    if (!numero.startsWith('+')) {
      numero = `+52${numero}`;
    }

    return `whatsapp:${numero}`;
  }
}

export default TwilioService;
