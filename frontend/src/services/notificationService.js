/**
 * Servicio de Notificaciones - API para gestión de notificaciones
 * 
 * Endpoints:
 * - GET /notifications - Obtener todas las notificaciones del usuario
 * - PUT /notifications/:id/read - Marcar notificación como leída
 * - PUT /notifications/read-all - Marcar todas como leídas
 * - DELETE /notifications/:id - Eliminar notificación
 */
import api from './api';

/**
 * Obtiene todas las notificaciones del usuario actual
 * @param {number} limit - Límite de notificaciones a obtener
 * @returns {Promise} Promesa con las notificaciones
 */
export const getNotifications = async (limit = 50) => {
  try {
    const response = await api.get(`/notifications?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    throw error;
  }
};

/**
 * Obtiene el conteo de notificaciones no leídas
 * @returns {Promise} Promesa con el conteo
 */
export const getUnreadCount = async () => {
  try {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error('Error obteniendo conteo de no leídas:', error);
    throw error;
  }
};

/**
 * Marca una notificación como leída
 * @param {number} notificationId - ID de la notificación
 * @returns {Promise} Promesa con el resultado
 */
export const markAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    throw error;
  }
};

/**
 * Marca todas las notificaciones como leídas
 * @returns {Promise} Promesa con el resultado
 */
export const markAllAsRead = async () => {
  try {
    const response = await api.put('/notifications/read-all');
    return response.data;
  } catch (error) {
    console.error('Error marcando todas como leídas:', error);
    throw error;
  }
};

/**
 * Elimina una notificación
 * @param {number} notificationId - ID de la notificación
 * @returns {Promise} Promesa con el resultado
 */
export const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Error eliminando notificación:', error);
    throw error;
  }
};

/**
 * Crea una nueva notificación (admin)
 * @param {Object} notification - Datos de la notificación
 * @returns {Promise} Promesa con el resultado
 */
export const createNotification = async (notification) => {
  try {
    const response = await api.post('/notifications', notification);
    return response.data;
  } catch (error) {
    console.error('Error creando notificación:', error);
    throw error;
  }
};
