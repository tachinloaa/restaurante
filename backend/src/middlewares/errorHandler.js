import logger from '../utils/logger.js';
import { serverError } from '../utils/responses.js';

/**
 * Middleware para manejo centralizado de errores
 */
export const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error('Error capturado:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

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
