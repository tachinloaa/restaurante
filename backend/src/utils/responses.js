import { HTTP_STATUS } from '../config/constants.js';

/**
 * Respuesta exitosa
 */
export const success = (res, data = null, message = 'Operación exitosa', statusCode = HTTP_STATUS.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Respuesta de creación exitosa
 */
export const created = (res, data = null, message = 'Recurso creado exitosamente') => {
  return success(res, data, message, HTTP_STATUS.CREATED);
};

/**
 * Respuesta de error
 */
export const error = (res, message = 'Ocurrió un error', statusCode = HTTP_STATUS.INTERNAL_ERROR, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors })
  });
};

/**
 * Respuesta de error de validación
 */
export const validationError = (res, errors, message = 'Error de validación') => {
  return error(res, message, HTTP_STATUS.BAD_REQUEST, errors);
};

/**
 * Respuesta de recurso no encontrado
 */
export const notFound = (res, message = 'Recurso no encontrado') => {
  return error(res, message, HTTP_STATUS.NOT_FOUND);
};

/**
 * Respuesta de no autorizado
 */
export const unauthorized = (res, message = 'No autorizado') => {
  return error(res, message, HTTP_STATUS.UNAUTHORIZED);
};

/**
 * Respuesta de prohibido
 */
export const forbidden = (res, message = 'Acceso prohibido') => {
  return error(res, message, HTTP_STATUS.FORBIDDEN);
};

/**
 * Respuesta de error de servidor
 */
export const serverError = (res, message = 'Error interno del servidor', error = null) => {
  return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && error && { error: error.message })
  });
};

export default {
  success,
  created,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  serverError
};
