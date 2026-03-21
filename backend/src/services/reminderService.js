import Order from '../models/Order.js';
import TwilioService from './twilioService.js';
import { supabase } from '../config/database.js';
import { formatearPrecio, formatearHora, formatearTelefono } from '../utils/formatters.js';
import { EMOJIS } from '../config/constants.js';
import logger from '../utils/logger.js';
import config from '../config/environment.js';

/**
 * Servicio de recordatorios automáticos
 */
class ReminderService {
  constructor() {
    this.recordatoriosEnviados = new Set(); // Cache de pedidos con recordatorio enviado
    this.ultimaVerificacion = null; // Timestamp de la última verificación
    this.ultimaVerificacionDLQ = null; // Timestamp de última verificación DLQ
  }

  /**
   * Verificar y enviar recordatorios de pedidos pendientes
   */
  async verificarPedidosPendientes() {
    try {
      // Si acabamos de verificar hace menos de 1 minuto, saltar
      const ahora = new Date();
      if (this.ultimaVerificacion && (ahora - this.ultimaVerificacion) < 60000) {
        return;
      }
      this.ultimaVerificacion = ahora;

      // Obtener pedidos pendientes de pago, pendientes y en preparación
      const resultado = await Order.getAll({
        estados: ['pendiente_pago', 'pendiente', 'preparando']
      });

      if (!resultado.success || !resultado.data.length) {
        return;
      }

      for (const pedido of resultado.data) {
        const tiempoTranscurrido = this.calcularMinutosTranscurridos(pedido.created_at, ahora);

        // Regla crítica: si pasan 2 minutos sin aprobar pago, avisar al cliente (sin autoaprobar)
        if (pedido.estado === 'pendiente_pago') {
          // 🔴 Auto-cancelar si lleva más de 4 horas sin aprobación
          if (tiempoTranscurrido >= 240) {
            const keyAutoCancelado = `${pedido.id}-pendiente_pago-autocancelado`;
            if (!this.recordatoriosEnviados.has(keyAutoCancelado)) {
              this.recordatoriosEnviados.add(keyAutoCancelado);
              await this.cancelarPendientePagoExpirado(pedido);
            }
            continue;
          }

          // Recordatorio al cliente (solo 1 vez, a los 2 min)
          const keyClientePendiente = `${pedido.id}-pendiente_pago-cliente`;
          if (tiempoTranscurrido >= 2 && !this.recordatoriosEnviados.has(keyClientePendiente)) {
            await this.enviarRecordatorioPendientePagoCliente(pedido, tiempoTranscurrido);
          }

          // Re-alertas escaladas al admin: a los 15, 30, 45 min
          for (const umbral of [15, 30, 45]) {
            if (tiempoTranscurrido >= umbral) {
              const keyAdmin = `${pedido.id}-pendiente_pago-admin-${umbral}`;
              if (!this.recordatoriosEnviados.has(keyAdmin)) {
                this.recordatoriosEnviados.add(keyAdmin);
                await this.reenviarAlertaAdminPendientePago(pedido, tiempoTranscurrido);
                break; // Solo uno por ciclo
              }
            }
          }

          continue;
        }

        // Verificar si necesita recordatorio al admin
        if (this.necesitaRecordatorio(pedido, tiempoTranscurrido)) {
          // Verificar en BD si ya se envió recordatorio
          const yaEnviado = await this.verificarRecordatorioEnviado(pedido.id, pedido.estado);
          if (!yaEnviado) {
            await this.enviarRecordatorio(pedido, tiempoTranscurrido);
          }
        }
      }
    } catch (error) {
      logger.error('Error al verificar pedidos pendientes:', error);
    }
  }

  /**
   * Avisar al cliente que su comprobante sigue en verificación manual
   */
  async enviarRecordatorioPendientePagoCliente(pedido, minutos) {
    try {
      const keyClientePendiente = `${pedido.id}-pendiente_pago-cliente`;

      const telefonoCliente = pedido.clientes?.telefono;
      if (!telefonoCliente) {
        logger.warn(`⚠️ No se pudo enviar recordatorio de pago al cliente para #${pedido.numero_pedido}: sin teléfono`);
        return { success: false, error: 'Cliente sin teléfono' };
      }

      let mensajeCliente = `⏳ *Seguimos verificando tu pago*\n\n`;
      mensajeCliente += `🧾 Pedido: *#${pedido.numero_pedido}*\n`;
      mensajeCliente += `Han pasado ${minutos} minutos desde que recibimos tu comprobante.\n\n`;
      mensajeCliente += `✅ Tu pedido sigue activo y en revisión manual por el equipo.\n`;
      mensajeCliente += `⚠️ No necesitas reenviar el comprobante por ahora.\n\n`;
      mensajeCliente += `Te avisaremos en cuanto quede aprobado.\n`;
      mensajeCliente += `*El Rinconcito* 🌮`;

      const resultadoCliente = await TwilioService.enviarMensajeCliente(telefonoCliente, mensajeCliente);

      if (resultadoCliente.success) {
        this.recordatoriosEnviados.add(keyClientePendiente);
        logger.info(`📨 Recordatorio pendiente_pago enviado al cliente para #${pedido.numero_pedido}`);

        // Persistir en BD para sobrevivir reinicios del servidor
        await supabase
          .from('notificaciones')
          .insert({
            tipo: 'recordatorio_pedido',
            mensaje: `RECORDATORIO pendiente_pago cliente ${pedido.id} #${pedido.numero_pedido}`,
            datos_adicionales: { pedido_id: pedido.id, tipo: 'pendiente_pago_cliente' },
            leida: false
          })
          .then(({ error }) => {
            if (error) logger.warn(`⚠️ No se pudo persistir recordatorio pendiente_pago: ${error.message}`);
          });
      }

      // Refuerzo al admin para atender aprobación pendiente
      let mensajeAdmin = `⚠️ *PAGO AÚN SIN APROBAR*\n\n`;
      mensajeAdmin += `🧾 Pedido: *#${pedido.numero_pedido}*\n`;
      mensajeAdmin += `👤 Cliente: ${pedido.clientes?.nombre || 'Sin nombre'}\n`;
      mensajeAdmin += `📞 https://wa.me/${(telefonoCliente || '').replace('whatsapp:', '').replace('+', '')}\n`;
      mensajeAdmin += `⏱️ Tiempo en espera: ${minutos} min\n\n`;
      mensajeAdmin += `Acción requerida:\n`;
      mensajeAdmin += `• *aprobar #${pedido.numero_pedido}*\n`;
      mensajeAdmin += `• *rechazar #${pedido.numero_pedido}*`;

      // Template solo al secondary para abrir ventana 24h (primary solo recibe el freeform)
      try {
        const tipoPedidoTemplate = pedido.tipo_pedido === 'domicilio' ? 'domicilio' : 'para_llevar';
        const secondaryTargets = config.admin.secondaryPhoneNumber
          ? [TwilioService.normalizarNumeroAdmin(config.admin.secondaryPhoneNumber)]
          : null;
        await TwilioService.enviarNotificacionAdminConPlantilla(
          pedido.numero_pedido,
          pedido.clientes?.nombre || 'Sin nombre',
          telefonoCliente || 'N/A',
          `$${pedido.total}`,
          tipoPedidoTemplate,
          null,
          secondaryTargets
        );
      } catch (templateError) {
        logger.warn(`⚠️ Error plantilla recordatorio pendiente_pago: ${templateError.message}`);
      }

      await TwilioService.enviarMensajeAdmin(mensajeAdmin);

      return resultadoCliente;
    } catch (error) {
      logger.error('Error enviando recordatorio pendiente_pago al cliente:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar si ya se envió recordatorio para este pedido en este estado
   */
  async verificarRecordatorioEnviado(pedidoId, estado) {
    try {
      // Verificar en cache primero
      const key = `${pedidoId}-${estado}`;
      if (this.recordatoriosEnviados.has(key)) {
        return true;
      }

      // Verificar en base de datos (notificaciones de recordatorio)
      // Buscar notificaciones que contengan "RECORDATORIO" y el numero de pedido en los últimos 30 minutos
      const hace30Min = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('notificaciones')
        .select('id')
        .ilike('mensaje', `%RECORDATORIO%${pedidoId}%`)
        .gte('created_at', hace30Min)
        .limit(1);

      if (error) {
        logger.error('Error al verificar recordatorio en BD:', error);
        return false;
      }

      if (data && data.length > 0) {
        // Marcar en cache para no volver a consultar
        this.recordatoriosEnviados.add(key);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error al verificar recordatorio:', error);
      return false;
    }
  }

  /**
   * Calcular minutos transcurridos desde la creación
   */
  calcularMinutosTranscurridos(fechaCreacion, ahora) {
    const creacion = new Date(fechaCreacion);
    return Math.floor((ahora - creacion) / 1000 / 60);
  }

  /**
   * Determinar si un pedido necesita recordatorio
   */
  necesitaRecordatorio(pedido, minutos) {
    const key = `${pedido.id}-${pedido.estado}`;

    // Si ya enviamos recordatorio para este pedido en este estado, NO enviar otro
    if (this.recordatoriosEnviados.has(key)) {
      return false;
    }

    // SOLO 1 recordatorio por pedido:
    // - Pendiente: después de 10 minutos sin atender
    // - Preparando: alerta si lleva más de 45 min (puede estar atascado)
    if (pedido.estado === 'pendiente' && minutos >= 10) {
      return true;
    }

    if (pedido.estado === 'preparando' && minutos >= 45) {
      return true;
    }

    return false;
  }

  /**
   * Enviar recordatorio al admin
   */
  async enviarRecordatorio(pedido, minutos) {
    try {
      const key = `${pedido.id}-${pedido.estado}`;

      // Obtener tipo de pedido en español
      const tipoPedidoTexto = {
        'domicilio': 'DOMICILIO',
        'para_llevar': 'RECOGER EN RESTAURANTE'
      }[pedido.tipo_pedido] || 'PEDIDO';

      let mensaje = `⚠️ *RECORDATORIO - PEDIDO SIN ATENDER*\n\n`;

      if (pedido.estado === 'pendiente') {
        mensaje += `❗ El pedido #${pedido.numero_pedido} (${tipoPedidoTexto}) lleva *${minutos} minutos* SIN ATENDER\n\n`;
      } else if (pedido.estado === 'preparando') {
        mensaje += `⏰ El pedido #${pedido.numero_pedido} (${tipoPedidoTexto}) lleva *${minutos} minutos* EN PREPARACIÓN\n\n`;
        mensaje += `⏱️ *Tiempo recomendado: 30-45 minutos*\n\n`;
      }

      mensaje += `${EMOJIS.TICKET} Pedido: *#${pedido.numero_pedido}*\n`;
      mensaje += `${EMOJIS.RELOJ} Creado: ${formatearHora(pedido.created_at)}\n`;
      mensaje += `${EMOJIS.PERSONA} Cliente: ${pedido.clientes?.nombre || 'Sin nombre'}\n`;
      mensaje += `${EMOJIS.TELEFONO} https://wa.me/${(pedido.clientes?.telefono || '').replace('whatsapp:', '').replace('+', '')}\n`;

      if (pedido.direccion_entrega) {
        mensaje += `${EMOJIS.UBICACION} ${pedido.direccion_entrega}\n`;
      }

      mensaje += `${EMOJIS.DINERO} Total: ${formatearPrecio(pedido.total)}\n\n`;
      mensaje += `${EMOJIS.FLECHA} Ver en dashboard: ${config.frontendUrl}/orders\n\n`;
      mensaje += `⚡ *POR FAVOR ATENDER DE INMEDIATO*`;

      // 1) Enviar plantilla solo al secondary para abrir ventana 24h (primary solo recibe el freeform)
      try {
        const tipoPedidoTemplate = pedido.tipo_pedido === 'domicilio' ? 'domicilio' : 'para_llevar';
        const secondaryTargets = config.admin.secondaryPhoneNumber
          ? [TwilioService.normalizarNumeroAdmin(config.admin.secondaryPhoneNumber)]
          : null;
        const resultadoPlantilla = await TwilioService.enviarNotificacionAdminConPlantilla(
          pedido.numero_pedido,
          pedido.clientes?.nombre || 'Sin nombre',
          pedido.clientes?.telefono || 'N/A',
          `$${pedido.total}`,
          tipoPedidoTemplate,
          null,
          secondaryTargets
        );
        if (resultadoPlantilla.success) {
          logger.info(`✅ Plantilla recordatorio enviada al secondary para pedido #${pedido.numero_pedido}`);
        }
      } catch (templateError) {
        logger.warn(`⚠️ Error plantilla recordatorio: ${templateError.message}`);
      }

      // 2) Enviar detalle completo (freeform)
      const resultado = await TwilioService.enviarMensajeAdmin(mensaje);

      if (resultado.success) {
        // Guardar notificación en BD para tracking
        await supabase
          .from('notificaciones')
          .insert({
            tipo: 'recordatorio_pedido',
            mensaje: `Recordatorio: Pedido #${pedido.numero_pedido} - ${pedido.estado} - ${minutos} min`,
            datos_adicionales: {
              pedido_id: pedido.id,
              estado: pedido.estado,
              minutos_transcurridos: minutos
            },
            leida: false
          });

        // Marcar en cache
        this.recordatoriosEnviados.add(key);
        logger.info(`Recordatorio enviado para pedido #${pedido.numero_pedido} (${minutos} min)`);
      }

      return resultado;
    } catch (error) {
      logger.error('Error al enviar recordatorio:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Re-alerta al admin (sin mensaje al cliente) cuando pendiente_pago lleva mucho tiempo.
   */
  async reenviarAlertaAdminPendientePago(pedido, minutos) {
    try {
      const telefonoCliente = pedido.clientes?.telefono || '';
      let mensajeAdmin = `🔔 *RECORDATORIO ${minutos} MIN — PAGO SIN APROBAR*\n\n`;
      mensajeAdmin += `🧾 Pedido: *#${pedido.numero_pedido}*\n`;
      mensajeAdmin += `👤 Cliente: ${pedido.clientes?.nombre || 'Sin nombre'}\n`;
      if (telefonoCliente) {
        mensajeAdmin += `📞 https://wa.me/${telefonoCliente.replace('whatsapp:', '').replace('+', '')}\n`;
      }
      mensajeAdmin += `⏱️ ${minutos} minutos sin aprobación\n\n`;
      mensajeAdmin += `Acciones:\n`;
      mensajeAdmin += `• *aprobar #${pedido.numero_pedido}*\n`;
      mensajeAdmin += `• *rechazar #${pedido.numero_pedido}*\n\n`;
      mensajeAdmin += `⚠️ Se cancelará automáticamente en ${240 - minutos} minutos si no hay respuesta.`;

      // Template solo al secondary para abrir ventana 24h (primary solo recibe el freeform)
      try {
        const tipoPedidoTemplate = pedido.tipo_pedido === 'domicilio' ? 'domicilio' : 'para_llevar';
        const secondaryTargets = config.admin.secondaryPhoneNumber
          ? [TwilioService.normalizarNumeroAdmin(config.admin.secondaryPhoneNumber)]
          : null;
        await TwilioService.enviarNotificacionAdminConPlantilla(
          pedido.numero_pedido,
          pedido.clientes?.nombre || 'Sin nombre',
          pedido.clientes?.telefono || 'N/A',
          `$${pedido.total}`,
          tipoPedidoTemplate,
          null,
          secondaryTargets
        );
      } catch (templateError) {
        logger.warn(`⚠️ Error plantilla re-alerta: ${templateError.message}`);
      }

      await TwilioService.enviarMensajeAdmin(mensajeAdmin);
      logger.warn(`🔔 Re-alerta admin enviada para pedido #${pedido.numero_pedido} (${minutos} min)`);
    } catch (error) {
      logger.error(`Error en re-alerta admin pendiente_pago #${pedido.numero_pedido}:`, error);
    }
  }

  /**
   * Cancela un pedido que lleva 4+ horas en pendiente_pago sin aprobación.
   */
  async cancelarPendientePagoExpirado(pedido) {
    try {
      logger.warn(`🕐 Auto-cancelando pedido #${pedido.numero_pedido} por inactividad (4h en pendiente_pago)`);

      const { error } = await supabase
        .from('pedidos')
        .update({ estado: 'cancelado', estado_pago: 'fallido' })
        .eq('id', pedido.id)
        .eq('estado', 'pendiente_pago'); // Guard: solo si sigue en ese estado

      if (error) {
        logger.error(`Error al auto-cancelar pedido #${pedido.numero_pedido}:`, error);
        return;
      }

      // Notificar al cliente
      const telefonoCliente = pedido.clientes?.telefono;
      if (telefonoCliente) {
        await TwilioService.enviarMensajeCliente(
          telefonoCliente,
          `⏰ *Tu pedido #${pedido.numero_pedido} fue cancelado automáticamente.*\n\n` +
          `Tu comprobante no fue verificado en 4 horas.\n\n` +
          `Si ya realizaste el pago, por favor contáctanos directamente.\n` +
          `Puedes hacer un nuevo pedido escribiendo *pedir*. 🌮`
        );
      }

      // Alertar al admin
      await TwilioService.enviarMensajeAdmin(
        `🚨 *AUTO-CANCELACIÓN*\n\n` +
        `Pedido *#${pedido.numero_pedido}* cancelado automáticamente.\n` +
        `Razón: 4 horas en pendiente_pago sin aprobación.\n\n` +
        `Si el cliente pagó, revisa manualmente en Supabase.`
      );

      logger.warn(`✅ Pedido #${pedido.numero_pedido} auto-cancelado por expiración de pendiente_pago`);
    } catch (error) {
      logger.error(`Error al auto-cancelar pedido #${pedido.numero_pedido}:`, error);
    }
  }

  /**
   * Limpiar recordatorios enviados (llamar cuando cambie estado del pedido)
   */
  limpiarRecordatorio(pedidoId, estado) {
    const key = `${pedidoId}-${estado}`;
    this.recordatoriosEnviados.delete(key);
  }

  /**
   * Verificar si hay pedidos atrapados en Dead Letter Queue y alertar al admin
   * Se ejecuta una vez por hora para no saturar.
   */
  async verificarDeadLetterQueue() {
    try {
      const ahora = Date.now();
      // Solo una vez por hora
      if (this.ultimaVerificacionDLQ && (ahora - this.ultimaVerificacionDLQ) < 60 * 60 * 1000) {
        return;
      }
      this.ultimaVerificacionDLQ = ahora;

      const { data, error } = await supabase
        .from('dead_letter_queue')
        .select('id, tipo, numero_intentos, razon_descarte, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !data || data.length === 0) return;

      logger.warn(`🗑️ Dead Letter Queue tiene ${data.length} item(s) sin atender`);

      const listaItems = data
        .slice(0, 5)
        .map((item, i) => `${i + 1}. [${item.tipo}] ${item.razon_descarte?.substring(0, 60) || 'sin razón'} (${item.numero_intentos} intentos)`)
        .join('\n');

      const mensajeAdmin =
        `🗑️ *DEAD LETTER QUEUE — ATENCIÓN REQUERIDA*\n\n` +
        `Hay *${data.length}* pedido(s)/notificación(es) que fallaron permanentemente y necesitan revisión manual:\n\n` +
        `${listaItems}${data.length > 5 ? `\n...y ${data.length - 5} más` : ''}\n\n` +
        `👉 Revisa la tabla *dead_letter_queue* en Supabase y actúa manualmente.`;

      await TwilioService.enviarMensajeAdmin(mensajeAdmin);
    } catch (error) {
      logger.error('Error verificando Dead Letter Queue:', error);
    }
  }

  /**
   * Iniciar verificación periódica (cada 5 minutos)
   */
  iniciarVerificacionPeriodica() {
    // Ejecutar cada 1 minuto para detectar el umbral de 2 minutos en pendiente_pago
    setInterval(() => {
      this.verificarPedidosPendientes();
    }, 60 * 1000);

    // Verificar DLQ cada hora
    setInterval(() => {
      this.verificarDeadLetterQueue();
    }, 60 * 60 * 1000);

    // Primera verificación DLQ al iniciar (con delay de 2 min para no saturar el arranque)
    setTimeout(() => {
      this.verificarDeadLetterQueue();
    }, 2 * 60 * 1000);

    logger.info('Sistema de recordatorios ACTIVADO - verificación cada 1 minuto (pendiente_pago a 2 min) + DLQ cada hora');
  }
}

// Exportar instancia singleton
const reminderService = new ReminderService();
export default reminderService;
