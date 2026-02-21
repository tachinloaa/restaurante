import { verifyToken, extractToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';

/**
 * Middleware de autenticación JWT
 * Verifica que el request tenga un token válido
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extraer token del header Authorization
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
    }

    // Verificar y decodificar token
    const decoded = verifyToken(token);

    // Agregar información del usuario al request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };

    logger.info(`✅ Usuario autenticado: ${decoded.username} (${decoded.role})`);
    next();
  } catch (error) {
    logger.warn(`❌ Autenticación fallida: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: error.message || 'Token inválido o expirado'
    });
  }
};

/**
 * Middleware de autenticación opcional
 * Si hay token, lo verifica. Si no hay, continúa sin autenticar
 */
export const authenticateOptional = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };
      logger.info(`✅ Usuario autenticado: ${decoded.username} (${decoded.role})`);
    }

    next();
  } catch (error) {
    // Si el token es inválido, continuar sin autenticar
    logger.debug(`Token inválido en ruta opcional: ${error.message}`);
    next();
  }
};

export default { authenticate, authenticateOptional };
