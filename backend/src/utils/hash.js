import bcrypt from 'bcryptjs';
import logger from './logger.js';

/**
 * Hashear password con bcrypt
 * @param {string} password - Password en texto plano
 * @param {number} saltRounds - Rondas de salt (default: 10)
 * @returns {Promise<string>} Hash del password
 */
export const hashPassword = async (password, saltRounds = 10) => {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    logger.error('Error hasheando password:', error);
    throw new Error('Error procesando password');
  }
};

/**
 * Comparar password con hash
 * @param {string} password - Password en texto plano
 * @param {string} hash - Hash almacenado
 * @returns {Promise<boolean>} True si coinciden
 */
export const comparePassword = async (password, hash) => {
  try {
    const match = await bcrypt.compare(password, hash);
    return match;
  } catch (error) {
    logger.error('Error comparando password:', error);
    throw new Error('Error verificando password');
  }
};

export default { hashPassword, comparePassword };
