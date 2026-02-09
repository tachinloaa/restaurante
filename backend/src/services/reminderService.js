import Order from '../models/Order.js';
import TwilioService from './twilioService.js';
import { formatearPrecio, formatearHora } from '../utils/formatters.js';
import { EMOJIS } from '../config/constants.js';
import logger from '../utils/logger.js';
import config from '../config/environment.js';

/**
 * Servicio de recordatorios automáticos
 */
class ReminderService {
  constructor() {
    this.recordatoriosEnviados = new Set(); // Cache de pedidos con recordatorio enviado
  }

  /**
   * Verificar y enviar recordatorios de pedidos pendientes
   */
  async verificarPedidosPendientes() {
    try {
      // Obtener pedidos pendientes y preparando
      const resultado = await Order.getAll({
        estados: ['pendiente', 'preparando']
      });

      if (!resultado.success || !resultado.data.length) {
        return;
      }

      const ahora = new Date();
      
      for (const pedido of resultado.data) {
        const tiempoTranscurrido = this.calcularMinutosTranscurridos(pedido.created_at, ahora);
        
        // Verificar si necesita recordatorio
        if (this.necesitaRecordatorio(pedido, tiempoTranscurrido)) {
          await this.enviarRecordatorio(pedido, tiempoTranscurrido);
        }
      }
    } catch (error) {
      logger.error('Error al verificar pedidos pendientes:', error);
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
    
    // Si ya enviamos recordatorio para este pedido en este estado, no enviar otro
    if (this.recordatoriosEnviados.has(key)) {
      return false;
    }

    // Recordatorio para pedidos pendientes sin atender
    if (pedido.estado === 'pendiente' && minutos >= 10) {
      return true;
    }

    // Recordatorio para pedidos en preparación que tardan mucho
    if (pedido.estado === 'preparando' && minutos >= 25) {
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
      
      let mensaje = `⚠️ *RECORDATORIO - PEDIDO SIN ATENDER*\n\n`;
      
      if (pedido.estado === 'pendiente') {
        mensaje += `❗ El pedido #${pedido.numero_pedido} lleva *${minutos} minutos* SIN ATENDER\n\n`;
      } else if (pedido.estado === 'preparando') {
        mensaje += `⏰ El pedido #${pedido.numero_pedido} lleva *${minutos} minutos* EN PREPARACIÓN\n\n`;
      }
      
      mensaje += `${EMOJIS.TICKET} Pedido: *#${pedido.numero_pedido}*\n`;
      mensaje += `${EMOJIS.RELOJ} Creado: ${formatearHora(pedido.created_at)}\n`;
      mensaje += `${EMOJIS.PERSONA} Cliente: ${pedido.clientes?.nombre || 'Sin nombre'}\n`;
      mensaje += `${EMOJIS.TELEFONO} ${pedido.clientes?.telefono}\n`;
      
      if (pedido.direccion_entrega) {
        mensaje += `${EMOJIS.UBICACION} ${pedido.direccion_entrega}\n`;
      }
      
      mensaje += `${EMOJIS.DINERO} Total: ${formatearPrecio(pedido.total)}\n\n`;
      mensaje += `${EMOJIS.FLECHA} Ver en dashboard: ${config.frontendUrl}/pedidos\n\n`;
      mensaje += `⚡ *POR FAVOR ATENDER DE INMEDIATO*`;

      // Enviar mensaje
      const resultado = await TwilioService.enviarMensajeAdmin(mensaje);

      if (resultado.success) {
        // Marcar como enviado
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
   * Iniciar verificación periódica (cada 2 minutos)
   */
  iniciarVerificacionPeriodica() {
    // Verificar inmediatamente
    this.verificarPedidosPendientes();
    
    // Ejecutar cada 2 minutos
    setInterval(() => {
      this.verificarPedidosPendientes();
    }, 2 * 60 * 1000); // 2 minutos
    
    logger.info('Sistema de recordatorios iniciado - verificando cada 2 minutos');
  }
}

// Exportar instancia singleton
const reminderService = new ReminderService();
export default reminderService;
