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

      // Obtener pedidos pendientes y preparando
      const resultado = await Order.getAll({
        estados: ['pendiente', 'preparando']
      });

      if (!resultado.success || !resultado.data.length) {
        return;
      }
      
      for (const pedido of resultado.data) {
        const tiempoTranscurrido = this.calcularMinutosTranscurridos(pedido.created_at, ahora);
        
        // Verificar si necesita recordatorio
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
    
    // Si ya enviamos recordatorio para este pedido en este estado, no enviar otro
    if (this.recordatoriosEnviados.has(key)) {
      return false;
    }

    // Tiempos iguales para TODOS los tipos de pedido (domicilio, restaurante, para llevar)
    // Recordatorio para pedidos pendientes sin atender
    if (pedido.estado === 'pendiente' && minutos >= 10) {
      return true;
    }

    // Recordatorio para pedidos en preparación que tardan mucho
    // 35 minutos permite 30-45min totales (preparación + entrega)
    if (pedido.estado === 'preparando' && minutos >= 35) {
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
        'restaurante': 'RESTAURANTE',
        'para_llevar': 'PARA LLEVAR'
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
      mensaje += `${EMOJIS.TELEFONO} ${formatearTelefono(pedido.clientes?.telefono || '')}\n`;
      
      if (pedido.direccion_entrega) {
        mensaje += `${EMOJIS.UBICACION} ${pedido.direccion_entrega}\n`;
      }
      
      if (pedido.numero_mesa) {
        mensaje += `🪑 Mesa: ${pedido.numero_mesa}\n`;
      }
      
      mensaje += `${EMOJIS.DINERO} Total: ${formatearPrecio(pedido.total)}\n\n`;
      mensaje += `${EMOJIS.FLECHA} Ver en dashboard: ${config.frontendUrl}/pedidos\n\n`;
      mensaje += `⚡ *POR FAVOR ATENDER DE INMEDIATO*`;

      // Enviar mensaje
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
   * Iniciar verificación periódica (cada 2 minutos)
   */
  iniciarVerificacionPeriodica() {
    // NO verificar inmediatamente para evitar spam al reiniciar servidor
    // Esperar el primer intervalo (2 minutos)
    
    // Ejecutar cada 2 minutos
    setInterval(() => {
      this.verificarPedidosPendientes();
    }, 2 * 60 * 1000); // 2 minutos
    
    logger.info('Sistema de recordatorios iniciado - verificando cada 2 minutos (primera verificación en 2 min)');
  }
}

// Exportar instancia singleton
const reminderService = new ReminderService();
export default reminderService;
