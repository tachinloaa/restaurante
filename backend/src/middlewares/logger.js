import morgan from 'morgan';
import logger from '../utils/logger.js';
import config from '../config/environment.js';

/**
 * Stream personalizado para morgan que usa winston
 */
const stream = {
  write: (message) => logger.http(message.trim())
};

/**
 * Formato de morgan según el entorno
 */
const format = config.isDevelopment ? 'dev' : 'combined';

/**
 * Middleware de logging HTTP
 */
export const httpLogger = morgan(format, { stream });

export default httpLogger;
