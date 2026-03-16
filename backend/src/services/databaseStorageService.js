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
        // PGRST116 = no row found
        logger.warn(`⚠️ Error cargando sesión de Supabase: ${error.message}`);
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
        logger.warn(`⚠️ Error guardando sesión en Supabase: ${error.message}`);
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
        logger.warn(`⚠️ Error cargando todas las sesiones: ${error.message}`);
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
        logger.warn(`⚠️ Error enqueueing pedido: ${error.message}`);
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
        logger.warn(`⚠️ Error cargando pedidos pendientes: ${error.message}`);
        return this.localCache.orderQueue;
      }

      return data || [];
    } catch (error) {
      logger.error(`❌ Error en loadPendingOrders: ${error.message}`);
      return this.localCache.orderQueue;
    }
  }

  /**
   * Actualizar intento de reintento de pedido
   */
  async updateOrderRetry(orderId, error = null) {
    try {
      const newRetryTime = new Date(Date.now() + Math.min(600000, 30000 * Math.pow(2, 3)));

      if (!this.isSupabaseConnected) {
        return { success: false, usedLocal: true };
      }

      const { error: updateError } = await supabase
        .from('order_emergency_queue')
        .update({
          numero_intentos: supabase.rpc('increment', { row_id: orderId }),
          proximo_reintento_at: newRetryTime.toISOString(),
          error_mensaje: error,
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
        numero_destino: job.numeroDestino || null,
        mensaje: job.mensaje,
        numero_intentos: job.retryCount || 0,
        proximo_reintento_at: job.nextRetryAt || new Date(Date.now() + 30000).toISOString(),
        admin_targets: job.adminTargets || null,
        ultimo_error: job.lastError || null
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
        logger.warn(`⚠️ Error enqueueing notificación: ${error.message}`);
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
        logger.warn(`⚠️ Error cargando notificaciones: ${error.message}`);
        return this.localCache.notificationQueue;
      }

      return data || [];
    } catch (error) {
      logger.error(`❌ Error en loadPendingNotifications: ${error.message}`);
      return this.localCache.notificationQueue;
    }
  }

  /**
   * Actualizar reintento de notificación
   */
  async updateNotificationRetry(notificationId, error = null) {
    try {
      const backoff = Math.min(600000, 30000 * Math.pow(2, 3));
      const newRetryTime = new Date(Date.now() + backoff);

      if (!this.isSupabaseConnected) {
        return { success: false, usedLocal: true };
      }

      const { error: updateError } = await supabase
        .from('notification_queue')
        .update({
          numero_intentos: supabase.rpc('increment', { row_id: notificationId }),
          proximo_reintento_at: newRetryTime.toISOString(),
          ultimo_error: error,
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
