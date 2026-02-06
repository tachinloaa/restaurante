/**
 * Rutas de Notificaciones - Endpoints para gestión de notificaciones
 */
import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
} from '../controllers/notificationController.js';

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Obtener todas las notificaciones
 * @access  Private
 */
router.get('/', getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Obtener conteo de notificaciones no leídas
 * @access  Private
 */
router.get('/unread-count', getUnreadCount);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Marcar todas las notificaciones como leídas
 * @access  Private
 */
router.put('/read-all', markAllAsRead);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Marcar notificación como leída
 * @access  Private
 */
router.put('/:id/read', markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Eliminar notificación
 * @access  Private
 */
router.delete('/:id', deleteNotification);

/**
 * @route   POST /api/notifications
 * @desc    Crear nueva notificación
 * @access  Private
 */
router.post('/', createNotification);

export default router;
