import logger from '../utils/logger.js';
import { serverError } from '../utils/responses.js';
import adminNotificationService from '../services/adminNotificationService.js';
import config from '../config/environment.js';

/**
 * Middleware para manejo centralizado de errores
 */
export const errorHandler = async (err, req, res, next) => {
  // Log del error
  logger.error('Error capturado:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Notificar al admin solo en producción y errores críticos
  if (config.isProduction) {
    const isCritical = 
      err.code?.startsWith('PGRST') || // Error de base de datos
      err.statusCode >= 500 || // Error del servidor
      err.name === 'DatabaseError' ||
      err.name === 'ConnectionError';

    if (isCritical) {
      adminNotificationService.notificarErrorAPI(
        err,
        req.originalUrl,
        req.method
      ).catch(notifErr => {
        logger.error('Error notificando al admin:', notifErr);
      });
    }
  }

  // Errores de validación de express-validator
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.errors
    });
  }

  // Errores de Supabase
  if (err.code && err.code.startsWith('PGRST')) {
    return res.status(400).json({
      success: false,
      message: 'Error en la base de datos',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Error por defecto
  return serverError(res, err.message, err);
};

/**
 * Middleware para rutas no encontradas
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
};

export default { errorHandler, notFoundHandler };
