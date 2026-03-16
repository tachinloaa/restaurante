import twilioClient from '../config/twilio.js';
import config from '../config/environment.js';
import { ADMIN_PHONE_FIJO } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Servicio de Twilio para envío de mensajes de WhatsApp
 */
class TwilioService {
  /**
   * Límite de caracteres de WhatsApp (Twilio)
   * Usamos 1500 para dejar un margen de seguridad
   */
  static MAX_CARACTERES = 1500;

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
  static async enviarMensajeCliente(numeroDestino, mensaje, intentos = 3) {
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
    // Si no viene número, usar el número fijo inamovible
    const raw = numero || ADMIN_PHONE_FIJO;
    // Quitar prefijo whatsapp: si existe
    let s = String(raw).replace(/^whatsapp:/i, '').trim();
    // Dejar solo dígitos y el '+' inicial
    s = s.replace(/[^\d+]/g, '');
    // E.164 requiere '+' al inicio
    if (!s.startsWith('+')) s = '+' + s;
    // Verificación mínima: debe tener al menos 10 dígitos después del '+'
    if (s.replace(/\D/g, '').length < 10) {
      // Último recurso: usar el número fijo
      logger.warn('⚠️ Número admin inválido, usando ADMIN_PHONE_FIJO como respaldo');
      return ADMIN_PHONE_FIJO;
    }
    return s;
  }

  /**
   * Enviar mensaje de WhatsApp al administrador
   * Si el mensaje es muy largo, lo divide automáticamente
   */
  static async enviarMensajeAdmin(mensaje) {
    try {
      // Modo de prueba: No enviar mensajes reales
      if (process.env.TWILIO_TEST_MODE === 'true') {
        logger.info(`[TEST MODE] Mensaje a admin: ${mensaje.substring(0, 100)}...`);
        return { success: true, messageSid: 'TEST_MODE', test: true };
      }

      // Obtener número del admin con validación y normalización robusta
      const numeroAdmin = TwilioService.normalizarNumeroAdmin(config.admin.phoneNumber);
      if (!numeroAdmin) {
        logger.error('❌ ADMIN_PHONE_NUMBER no está configurado o tiene formato inválido — no se envió mensaje al admin');
        return { success: false, error: 'Admin phone not configured' };
      }
      const numeroFormateado = `whatsapp:${numeroAdmin}`;
      logger.info(`📤 Enviando mensaje al admin: ${numeroAdmin}`);

      // Dividir mensaje si es necesario
      const partes = this.dividirMensaje(mensaje);
      const messageSids = [];

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
          to: numeroFormateado
        });

        messageSids.push(message.sid);
        logger.info(`Mensaje enviado a admin ${numeroAdmin} (parte ${i + 1}/${partes.length}): ${message.sid}`);

        // Pequeño delay entre mensajes
        if (i < partes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      return { success: true, messageSid: messageSids[0], messageSids, partes: partes.length };
    } catch (error) {
      logger.error('Error al enviar mensaje a admin:', error);
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
  static async enviarNotificacionAdminConPlantilla(numeroPedido, nombreCliente, telefono, total, tipoPedido, comprobanteUrl = null) {
    try {
      if (process.env.TWILIO_TEST_MODE === 'true') {
        logger.info(`[TEST MODE] Plantilla nuevo pedido #${numeroPedido} para admin`);
        return { success: true, messageSid: 'TEST_MODE', test: true };
      }

      const numeroAdmin = TwilioService.normalizarNumeroAdmin(config.admin.phoneNumber);
      if (!numeroAdmin) {
        logger.error('❌ ADMIN_PHONE_NUMBER no configurado — no se envió plantilla al admin');
        return { success: false, error: 'Admin phone not configured' };
      }
      const numeroFormateado = `whatsapp:${numeroAdmin}`;
      logger.info(`📤 Enviando plantilla al admin: ${numeroAdmin}`);

      const tipoBase = tipoPedido === 'para_llevar' ? 'Recoger en Restaurante' : 'Domicilio';
      // Variables de WhatsApp NO admiten \n ni emojis — URL en misma línea con separador
      const tipoTexto = comprobanteUrl
        ? `${tipoBase} | Comprobante: ${comprobanteUrl}`
        : tipoBase;

      const message = await twilioClient.messages.create({
        contentSid: config.twilio.templateNuevoPedido,
        contentVariables: JSON.stringify({
          '1': String(numeroPedido),
          '2': nombreCliente,
          '3': telefono,
          '4': total,
          '5': tipoTexto
        }),
        from: config.twilio.whatsappClientes,
        to: numeroFormateado
      });

      logger.info(`✅ Notificación con plantilla enviada al admin: ${message.sid}`);
      return { success: true, messageSid: message.sid };
    } catch (error) {
      logger.error('Error enviando plantilla al admin, intentando mensaje normal:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar template de comprobante con imagen al admin (Media template - business initiated)
   * Variables: {{1}}=comprobanteUrl, {{2}}=numeroPedido, {{3}}=cliente, {{4}}=telefono, {{5}}=total, {{6}}=tipo
   */
  static async enviarTemplateComprobanteAdmin(numeroPedido, nombreCliente, telefono, total, tipoPedido, comprobanteUrl) {
    try {
      if (process.env.TWILIO_TEST_MODE === 'true') {
        logger.info(`[TEST MODE] Template comprobante pedido #${numeroPedido}`);
        return { success: true, messageSid: 'TEST_MODE', test: true };
      }

      const numeroAdmin = TwilioService.normalizarNumeroAdmin(config.admin.phoneNumber);
      if (!numeroAdmin) {
        return { success: false, error: 'Admin phone not configured' };
      }

      const tipoTexto = tipoPedido === 'para_llevar' ? 'Recoger en Restaurante' : 'Domicilio';

      logger.info(`📸 Enviando template con comprobante al admin: ${numeroAdmin}`);
      const message = await twilioClient.messages.create({
        contentSid: config.twilio.templateComprobantePago,
        contentVariables: JSON.stringify({
          '1': comprobanteUrl || '',
          '2': String(numeroPedido),
          '3': nombreCliente,
          '4': telefono,
          '5': total,
          '6': tipoTexto
        }),
        from: config.twilio.whatsappClientes,
        to: `whatsapp:${numeroAdmin}`
      });

      logger.info(`✅ Template con comprobante enviado al admin: ${message.sid}`);
      return { success: true, messageSid: message.sid };
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
