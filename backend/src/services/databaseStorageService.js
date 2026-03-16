import supabase from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * DatabaseStorageService: Centraliza todas las operaciones a Supabase BD
 * Reemplaza archivos JSON:
 *   - sessions_backup.json → sessions_backup table
 *   - emergency_orders.json → order_emergency_queue table
 *   - failed_notifications.json → notification_queue table
 * 
 * Soporta fallback a memoria local si Supabase no está disponible
 */
class DatabaseStorageService {
  constructor() {
    this.isSupabaseConnected = true;
    this.localCache = {
      sessions: new Map(),
      orderQueue: [],
      notificationQueue: []
    };
  }

  isMissingTableError(error) {
    const message = error?.message || '';
    return message.includes('schema cache') || message.includes('Could not find the table');
  }

  // ============================================================
  // SESSIONS BACKUP
  // ============================================================

  /**
   * Cargar sesión desde Supabase o cache local
   */
  async loadSession(telefono) {
    try {
      const { data, error } = await supabase
        .from('sessions_backup')
        .select('*')
        .eq('telefono', telefono)
        .single();

      if (error && error.code !== 'PGRST116') {
        if (this.isMissingTableError(error)) {
          logger.warn('⚠️ Tabla sessions_backup no disponible todavía en Supabase');
        } else {
          logger.warn(`⚠️ Error cargando sesión de Supabase: ${error.message}`);
        }
        this.isSupabaseConnected = false;
        return this.localCache.sessions.get(telefono) || null;
      }

      if (data) {
        this.localCache.sessions.set(telefono, data);
        return data;
      }

      return null;
    } catch (error) {
      logger.error(`❌ Error en loadSession: ${error.message}`);
      this.isSupabaseConnected = false;
      return this.localCache.sessions.get(telefono) || null;
    }
  }

  /**
   * Guardar sesión en Supabase y cache local
   */
  async saveSession(telefono, sessionData) {
    try {
      // Siempre guardar en cache local
      this.localCache.sessions.set(telefono, {
        ...sessionData,
        actualizado_at: new Date().toISOString()
      });

      if (!this.isSupabaseConnected) {
        logger.warn(`⚠️ Supabase no disponible, sessión guardada solo en cache local`);
        return { success: false, usedLocal: true };
      }

      const { error } = await supabase
        .from('sessions_backup')
        .upsert({
          telefono,
          carrito: sessionData.carrito || [],
          datos: sessionData.datos || {},
          estado: sessionData.estado || 'esperando_menu',
          ultimo_mensaje_sid: sessionData.last_message_sid || null,
          actualizado_at: new Date().toISOString(),
          creado_at: sessionData.creado_at || new Date().toISOString()
        }, {
          onConflict: 'telefono'
        });

      if (error) {
        if (this.isMissingTableError(error)) {
          logger.warn('⚠️ Tabla sessions_backup no disponible todavía en Supabase');
        } else {
          logger.warn(`⚠️ Error guardando sesión en Supabase: ${error.message}`);
        }
        this.isSupabaseConnected = false;
        return { success: false, usedLocal: true };
      }

      return { success: true, stored: 'supabase+local' };
    } catch (error) {
      logger.error(`❌ Error en saveSession: ${error.message}`);
      this.isSupabaseConnected = false;
      return { success: false, usedLocal: true };
    }
  }

  /**
   * Cargar todas las sesiones (para restauración al iniciar)
   */
  async loadAllSessions() {
    try {
      const { data, error } = await supabase
        .from('sessions_backup')
        .select('*')
        .gt('actualizado_at', new Date(Date.now() - 2*60*60*1000).toISOString()); // últimas 2h

      if (error) {
        if (this.isMissingTableError(error)) {
          logger.warn('⚠️ Tabla sessions_backup no disponible todavía en Supabase');
        } else {
          logger.warn(`⚠️ Error cargando todas las sesiones: ${error.message}`);
        }
        this.isSupabaseConnected = false;
        return [];
      }

      // Llenar cache local
      if (Array.isArray(data)) {
        for (const session of data) {
          this.localCache.sessions.set(session.telefono, session);
        }
      }

      return data || [];
    } catch (error) {
      logger.error(`❌ Error en loadAllSessions: ${error.message}`);
      return Array.from(this.localCache.sessions.values());
    }
  }

  /**
   * Limpiar sesión expirada
   */
  async deleteSession(telefono) {
    try {
      this.localCache.sessions.delete(telefono);

      if (!this.isSupabaseConnected) {
        return { success: false, usedLocal: true };
      }

      const { error } = await supabase
        .from('sessions_backup')
        .delete()
        .eq('telefono', telefono);

      if (error) {
        logger.warn(`⚠️ Error borrando sesión: ${error.message}`);
        return { success: false, usedLocal: true };
      }

      return { success: true };
    } catch (error) {
      logger.error(`❌ Error en deleteSession: ${error.message}`);
      return { success: false, usedLocal: true };
    }
  }

  // ============================================================
  // ORDER EMERGENCY QUEUE
  // ============================================================

  /**
   * Enqueue un pedido en la cola de emergencia
   */
  async enqueueOrder(pedidoData) {
    try {
      // Guardar en cache local primero
      const queueItem = {
        id: pedidoData.id || `pending-${Date.now()}`,
        pedido_data: pedidoData,
        numero_intentos: 0,
        proximo_reintento_at: new Date().toISOString(),
        error_mensaje: null
      };

      this.localCache.orderQueue.push(queueItem);

      if (!this.isSupabaseConnected) {
        logger.warn(`⚠️ Pedido encolado en cache local (Supabase no disponible)`);
        return { success: false, usedLocal: true, id: queueItem.id };
      }

      const { data, error } = await supabase
        .from('order_emergency_queue')
        .insert([queueItem])
        .select();

      if (error) {
        if (this.isMissingTableError(error)) {
          logger.warn('⚠️ Tabla order_emergency_queue no disponible todavía en Supabase');
        } else {
          logger.warn(`⚠️ Error enqueueing pedido: ${error.message}`);
        }
        this.isSupabaseConnected = false;
        return { success: false, usedLocal: true, id: queueItem.id };
      }

      return { success: true, id: data?.[0]?.id, stored: 'supabase+local' };
    } catch (error) {
      logger.error(`❌ Error en enqueueOrder: ${error.message}`);
      return { success: false, usedLocal: true };
    }
  }

  /**
   * Cargar todos los pedidos pendientes de la cola
   */
  async loadPendingOrders() {
    try {
      const { data, error } = await supabase
        .from('order_emergency_queue')
        .select('*')
        .lte('proximo_reintento_at', new Date().toISOString())
        .limit(100);

      if (error) {
        if (this.isMissingTableError(error)) {
          logger.warn('⚠️ Tabla order_emergency_queue no disponible todavía en Supabase');
        } else {
          logger.warn(`⚠️ Error cargando pedidos pendientes: ${error.message}`);
        }
        this.isSupabaseConnected = false;
        return this.localCache.orderQueue;
      }

      this.localCache.orderQueue = Array.isArray(data) ? [...data] : [];
      return data || [];
    } catch (error) {
      logger.error(`❌ Error en loadPendingOrders: ${error.message}`);
      return this.localCache.orderQueue;
    }
  }

  /**
   * Actualizar intento de reintento de pedido
   */
  async updateOrderRetry(orderId, retryInfo = {}) {
    try {
      const localOrder = this.localCache.orderQueue.find(item => item.id === orderId);
      const numeroIntentos = retryInfo.numero_intentos ?? ((localOrder?.numero_intentos || 0) + 1);
      const proximoReintentoAt = retryInfo.proximo_reintento_at || new Date(Date.now() + Math.min(600000, 30000 * Math.pow(2, 3))).toISOString();
      const errorMensaje = retryInfo.error_mensaje || null;

      if (localOrder) {
        localOrder.numero_intentos = numeroIntentos;
        localOrder.proximo_reintento_at = proximoReintentoAt;
        localOrder.error_mensaje = errorMensaje;
        localOrder.actualizado_at = new Date().toISOString();
      }

      if (!this.isSupabaseConnected) {
        return { success: false, usedLocal: true };
      }

      const { error: updateError } = await supabase
        .from('order_emergency_queue')
        .update({
          numero_intentos: numeroIntentos,
          proximo_reintento_at: proximoReintentoAt,
          error_mensaje: errorMensaje,
          actualizado_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        logger.warn(`⚠️ Error actualizando reintento: ${updateError.message}`);
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      logger.error(`❌ Error en updateOrderRetry: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Completar/remover pedido de la cola
   */
  async removeOrder(orderId) {
    try {
      if (!this.isSupabaseConnected) {
        this.localCache.orderQueue = this.localCache.orderQueue.filter(o => o.id !== orderId);
        return { success: false, usedLocal: true };
      }

      const { error } = await supabase
        .from('order_emergency_queue')
        .delete()
        .eq('id', orderId);

      if (error) {
        logger.warn(`⚠️ Error removiendo pedido: ${error.message}`);
        return { success: false };
      }

      this.localCache.orderQueue = this.localCache.orderQueue.filter(o => o.id !== orderId);
      return { success: true };
    } catch (error) {
      logger.error(`❌ Error en removeOrder: ${error.message}`);
      return { success: false };
    }
  }

  // ============================================================
  // NOTIFICATION QUEUE
  // ============================================================

  /**
   * Enqueue una notificación fallida
   */
  async enqueueNotification(job) {
    try {
      const queueItem = {
        id: job.id || `notif-${Date.now()}`,
        tipo: job.tipo,
        numero_destino: job.numero_destino || job.numeroDestino || null,
        mensaje: job.mensaje,
        numero_intentos: job.numero_intentos ?? job.retryCount ?? 0,
        proximo_reintento_at: job.proximo_reintento_at || new Date(job.nextRetryAt || Date.now() + 30000).toISOString(),
        admin_targets: job.admin_targets || job.adminTargets || null,
        ultimo_error: job.ultimo_error || job.lastError || null
      };

      this.localCache.notificationQueue.push(queueItem);

      if (!this.isSupabaseConnected) {
        logger.warn(`⚠️ Notificación encolada en cache local`);
        return { success: false, usedLocal: true, id: queueItem.id };
      }

      const { data, error } = await supabase
        .from('notification_queue')
        .insert([queueItem])
        .select();

      if (error) {
        if (this.isMissingTableError(error)) {
          logger.warn('⚠️ Tabla notification_queue no disponible todavía en Supabase');
        } else {
          logger.warn(`⚠️ Error enqueueing notificación: ${error.message}`);
        }
        this.isSupabaseConnected = false;
        return { success: false, usedLocal: true, id: queueItem.id };
      }

      return { success: true, id: data?.[0]?.id, stored: 'supabase+local' };
    } catch (error) {
      logger.error(`❌ Error en enqueueNotification: ${error.message}`);
      return { success: false, usedLocal: true };
    }
  }

  /**
   * Cargar notificaciones pendientes
   */
  async loadPendingNotifications() {
    try {
      const { data, error } = await supabase
        .from('notification_queue')
        .select('*')
        .lte('proximo_reintento_at', new Date().toISOString())
        .limit(50);

      if (error) {
        if (this.isMissingTableError(error)) {
          logger.warn('⚠️ Tabla notification_queue no disponible todavía en Supabase');
        } else {
          logger.warn(`⚠️ Error cargando notificaciones: ${error.message}`);
        }
        this.isSupabaseConnected = false;
        return this.localCache.notificationQueue;
      }

      this.localCache.notificationQueue = Array.isArray(data) ? [...data] : [];
      return data || [];
    } catch (error) {
      logger.error(`❌ Error en loadPendingNotifications: ${error.message}`);
      return this.localCache.notificationQueue;
    }
  }

  /**
   * Actualizar reintento de notificación
   */
  async updateNotificationRetry(notificationId, retryInfo = {}) {
    try {
      const localNotification = this.localCache.notificationQueue.find(item => item.id === notificationId);
      const numeroIntentos = retryInfo.numero_intentos ?? ((localNotification?.numero_intentos || 0) + 1);
      const proximoReintentoAt = retryInfo.proximo_reintento_at || new Date(Date.now() + Math.min(600000, 30000 * Math.pow(2, 3))).toISOString();
      const ultimoError = retryInfo.ultimo_error || null;

      if (localNotification) {
        localNotification.numero_intentos = numeroIntentos;
        localNotification.proximo_reintento_at = proximoReintentoAt;
        localNotification.ultimo_error = ultimoError;
        localNotification.actualizado_at = new Date().toISOString();
      }

      if (!this.isSupabaseConnected) {
        return { success: false, usedLocal: true };
      }

      const { error: updateError } = await supabase
        .from('notification_queue')
        .update({
          numero_intentos: numeroIntentos,
          proximo_reintento_at: proximoReintentoAt,
          ultimo_error: ultimoError,
          actualizado_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (updateError) {
        logger.warn(`⚠️ Error actualizando reintento de notificación: ${updateError.message}`);
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      logger.error(`❌ Error en updateNotificationRetry: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Remover notificación de la cola
   */
  async removeNotification(notificationId) {
    try {
      if (!this.isSupabaseConnected) {
        this.localCache.notificationQueue = this.localCache.notificationQueue.filter(n => n.id !== notificationId);
        return { success: false, usedLocal: true };
      }

      const { error } = await supabase
        .from('notification_queue')
        .delete()
        .eq('id', notificationId);

      if (error) {
        logger.warn(`⚠️ Error removiendo notificación: ${error.message}`);
        return { success: false };
      }

      this.localCache.notificationQueue = this.localCache.notificationQueue.filter(n => n.id !== notificationId);
      return { success: true };
    } catch (error) {
      logger.error(`❌ Error en removeNotification: ${error.message}`);
      return { success: false };
    }
  }

  // ============================================================
  // DEAD LETTER QUEUE
  // ============================================================

  /**
   * Mover item fallido permanentemente a Dead Letter Queue
   */
  async moveToDeadLetterQueue(type, payload, attempts, reason) {
    try {
      if (!this.isSupabaseConnected) {
        logger.error(`🚨 DLQ no disponible: ${type} - ${reason}`);
        return { success: false, usedLocal: true };
      }

      const { error } = await supabase
        .from('dead_letter_queue')
        .insert([{
          tipo: type,
          payload,
          numero_intentos: attempts,
          razon_descarte: reason
        }]);

      if (error) {
        logger.error(`❌ Error moviendo a DLQ: ${error.message}`);
        return { success: false };
      }

      logger.error(`🗑️ Item movido a Dead Letter Queue: ${type} (${attempts} intentos)`);
      return { success: true };
    } catch (error) {
      logger.error(`❌ Error en moveToDeadLetterQueue: ${error.message}`);
      return { success: false };
    }
  }

  // ============================================================
  // DIAGNOSTICS
  // ============================================================

  getStatus() {
    return {
      supabaseConnected: this.isSupabaseConnected,
      localSessions: this.localCache.sessions.size,
      localOrderQueue: this.localCache.orderQueue.length,
      localNotificationQueue: this.localCache.notificationQueue.length
    };
  }
}

export default new DatabaseStorageService();
