import logger from '../utils/logger.js';

/**
 * Roles disponibles en el sistema
 */
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  BOT: 'bot'
};

/**
 * Middleware de autorización por roles
 * Verifica que el usuario tenga uno de los roles permitidos
 * 
 * @param {Array<string>} allowedRoles - Roles que pueden acceder
 * @returns {Function} Middleware function
 * 
 * @example
 * router.post('/', authenticate, authorize([ROLES.ADMIN]), createProduct)
 */
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    // Si no hay usuario en el request, significa que no pasó por authenticate
    if (!req.user) {
      logger.warn('❌ Intento de acceso sin autenticación');
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    // Verificar si el rol del usuario está en los roles permitidos
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`❌ Acceso denegado para ${req.user.username} (${req.user.role}). Requiere: ${allowedRoles.join(' o ')}`);
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    logger.info(`✅ Autorización exitosa para ${req.user.username} (${req.user.role})`);
    next();
  };
};

/**
 * Middleware para verificar que el usuario es admin
 */
export const isAdmin = authorize([ROLES.ADMIN]);

/**
 * Middleware para verificar que el usuario está autenticado (cualquier rol)
 */
export const isAuthenticated = authorize([ROLES.ADMIN, ROLES.USER, ROLES.BOT]);

export default { authorize, isAdmin, isAuthenticated, ROLES };
