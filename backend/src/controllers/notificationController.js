/**
 * Controlador de Notificaciones - Gestión de notificaciones del sistema
 * 
 * Funcionalidades:
 * - Obtener notificaciones del usuario
 * - Marcar notificaciones como leídas
 * - Eliminar notificaciones
 * - Crear notificaciones del sistema
 */
import { supabase } from '../config/database.js';
import { success as successResponse, serverError as errorResponse } from '../utils/responses.js';
import logger from '../utils/logger.js';

/**
 * Obtiene todas las notificaciones del usuario actual
 * @route GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // Obtener notificaciones ordenadas por fecha (más recientes primero)
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    logger.info(`Notificaciones obtenidas: ${data?.length || 0}`);
    
    return successResponse(res, data || [], 'Notificaciones obtenidas correctamente');
  } catch (error) {
    logger.error('Error obteniendo notificaciones:', error);
    return errorResponse(res, 'Error al obtener notificaciones', 500);
  }
};

/**
 * Obtiene el conteo de notificaciones no leídas
 * @route GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('leida', false);

    if (error) throw error;

    return successResponse(res, { count: count || 0 }, 'Conteo obtenido correctamente');
  } catch (error) {
    logger.error('Error obteniendo conteo de no leídas:', error);
    return errorResponse(res, 'Error al obtener conteo', 500);
  }
};

/**
 * Marca una notificación como leída
 * @route PUT /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return errorResponse(res, 'Notificación no encontrada', 404);
    }

    logger.info(`Notificación ${id} marcada como leída`);
    
    return successResponse(res, data, 'Notificación marcada como leída');
  } catch (error) {
    logger.error('Error marcando notificación como leída:', error);
    return errorResponse(res, 'Error al marcar notificación', 500);
  }
};

/**
 * Marca todas las notificaciones como leídas
 * @route PUT /api/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('leida', false)
      .select();

    if (error) throw error;

    logger.info(`${data?.length || 0} notificaciones marcadas como leídas`);
    
    return successResponse(res, { count: data?.length || 0 }, 'Todas las notificaciones marcadas como leídas');
  } catch (error) {
    logger.error('Error marcando todas como leídas:', error);
    return errorResponse(res, 'Error al marcar notificaciones', 500);
  }
};

/**
 * Elimina una notificación
 * @route DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info(`Notificación ${id} eliminada`);
    
    return successResponse(res, null, 'Notificación eliminada correctamente');
  } catch (error) {
    logger.error('Error eliminando notificación:', error);
    return errorResponse(res, 'Error al eliminar notificación', 500);
  }
};

/**
 * Crea una nueva notificación
 * @route POST /api/notifications
 */
export const createNotification = async (req, res) => {
  try {
    const { tipo, mensaje, datos_adicionales } = req.body;

    if (!tipo || !mensaje) {
      return errorResponse(res, 'Tipo y mensaje son requeridos', 400);
    }

    const { data, error } = await supabase
      .from('notificaciones')
      .insert({
        tipo,
        mensaje,
        datos_adicionales: datos_adicionales || null,
        leida: false
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Notificación creada: ${tipo} - ${mensaje}`);
    
    return successResponse(res, data, 'Notificación creada correctamente', 201);
  } catch (error) {
    logger.error('Error creando notificación:', error);
    return errorResponse(res, 'Error al crear notificación', 500);
  }
};

/**
 * Elimina notificaciones antiguas (más de 30 días)
 * Esta función puede ejecutarse como tarea programada
 */
export const cleanOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('notificaciones')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .eq('leida', true);

    if (error) throw error;

    logger.info(`Notificaciones antiguas limpiadas: ${data?.length || 0}`);
    
    return data?.length || 0;
  } catch (error) {
    logger.error('Error limpiando notificaciones antiguas:', error);
    return 0;
  }
};
