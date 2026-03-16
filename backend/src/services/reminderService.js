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
          const keyClientePendiente = `${pedido.id}-pendiente_pago-cliente`;
          if (tiempoTranscurrido >= 2 && !this.recordatoriosEnviados.has(keyClientePendiente)) {
            await this.enviarRecordatorioPendientePagoCliente(pedido, tiempoTranscurrido);
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
    // - Preparando: NO se envía recordatorio (el admin ya lo vio)
    if (pedido.estado === 'pendiente' && minutos >= 10) {
      return true;
    }

    // No enviar recordatorios para pedidos en preparación
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
      mensaje += `${EMOJIS.FLECHA} Ver en dashboard: ${config.frontendUrl}\n\n`;
      mensaje += `⚡ *POR FAVOR ATENDER DE INMEDIATO*`;

      // 1) Enviar plantilla primero (abre ventana de 24h si estaba cerrada)
      try {
        const tipoPedidoTemplate = pedido.tipo_pedido === 'domicilio' ? 'domicilio' : 'para_llevar';
        const resultadoPlantilla = await TwilioService.enviarNotificacionAdminConPlantilla(
          pedido.numero_pedido,
          pedido.clientes?.nombre || 'Sin nombre',
          pedido.clientes?.telefono || 'N/A',
          `$${pedido.total}`,
          tipoPedidoTemplate
        );
        if (resultadoPlantilla.success) {
          logger.info(`✅ Plantilla recordatorio enviada para pedido #${pedido.numero_pedido}`);
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
   * Limpiar recordatorios enviados (llamar cuando cambie estado del pedido)
   */
  limpiarRecordatorio(pedidoId, estado) {
    const key = `${pedidoId}-${estado}`;
    this.recordatoriosEnviados.delete(key);
  }

  /**
   * Iniciar verificación periódica (cada 5 minutos)
   */
  iniciarVerificacionPeriodica() {
    // Ejecutar cada 1 minuto para detectar el umbral de 2 minutos en pendiente_pago
    setInterval(() => {
      this.verificarPedidosPendientes();
    }, 60 * 1000);

    logger.info('Sistema de recordatorios ACTIVADO - verificación cada 1 minuto (pendiente_pago a 2 min)');
  }
}

// Exportar instancia singleton
const reminderService = new ReminderService();
export default reminderService;
