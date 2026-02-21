import jwt from 'jsonwebtoken';
import config from '../config/environment.js';
import logger from './logger.js';

/**
 * Generar token JWT
 * @param {Object} payload - Datos a incluir en el token
 * @param {string} expiresIn - Tiempo de expiración (default: 24h)
 * @returns {string} Token JWT
 */
export const generateToken = (payload, expiresIn = '24h') => {
  try {
    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn,
      issuer: 'el-rinconcito-api'
    });
    return token;
  } catch (error) {
    logger.error('Error generando JWT:', error);
    throw new Error('Error generando token de autenticación');
  }
};

/**
 * Verificar y decodificar token JWT
 * @param {string} token - Token a verificar
 * @returns {Object} Payload decodificado
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'el-rinconcito-api'
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    logger.error('Error verificando JWT:', error);
    throw new Error('Error verificando token');
  }
};

/**
 * Extraer token del header Authorization
 * @param {Object} req - Request de Express
 * @returns {string|null} Token o null
 */
export const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Formato esperado: "Bearer <token>"
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

export default { generateToken, verifyToken, extractToken };
