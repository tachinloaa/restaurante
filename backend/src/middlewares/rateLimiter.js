import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

// Cliente Redis para rate limiting (solo si está habilitado)
let redisClient = null;

if (config.redis.enabled && config.redis.url) {
  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('❌ No se pudo reconectar a Redis después de 10 intentos');
            return new Error('Redis reconnection failed');
          }
          return retries * 100; // ms entre intentos
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Error de Redis (rate limiting):', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis conectado para rate limiting');
    });

    redisClient.connect().catch(err => {
      logger.error('❌ No se pudo conectar a Redis:', err);
      redisClient = null;
    });
  } catch (error) {
    logger.error('❌ Error inicializando Redis:', error);
    redisClient = null;
  }
}

/**
 * Configuración base del rate limiter
 */
const createLimiter = (options) => {
  const baseConfig = {
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const identifier = options.keyGenerator ? options.keyGenerator(req) : req.ip;
      logger.warn(`⚠️ Rate limit excedido para: ${identifier}`);
      res.status(429).json({
        success: false,
        message: options.message || 'Demasiadas peticiones. Por favor espera un momento.'
      });
    }
  };

  // Si Redis está disponible, usarlo como store
  if (redisClient) {
    try {
      baseConfig.store = new RedisStore({
        client: redisClient,
        prefix: options.prefix || 'rl:'
      });
      logger.info(`✅ Rate limiter usando Redis: ${options.prefix || 'rl:'}`);
    } catch (error) {
      logger.warn('⚠️ No se pudo usar Redis para rate limiting, usando memoria');
    }
  } else {
    logger.warn('⚠️ Rate limiting en MEMORIA (no recomendado en producción con múltiples instancias)');
  }

  return rateLimit({ ...baseConfig, ...options });
};

/**
 * Rate limiter para webhooks de Twilio
 * 30 requests por minuto por teléfono
 */
export const webhookLimiter = createLimiter({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30,
  message: 'Demasiadas peticiones. Por favor espera un momento.',
  keyGenerator: (req) => req.body?.From || req.ip,
  prefix: 'rl:webhook:'
});

/**
 * Rate limiter para API pública (GET sin auth)
 * 100 requests por 15 minutos por IP
 */
export const publicApiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: 'Demasiadas peticiones al API. Intenta de nuevo en 15 minutos.',
  keyGenerator: (req) => req.ip,
  prefix: 'rl:api:public:'
});

/**
 * Rate limiter para API autenticada
 * 300 requests por 15 minutos por usuario
 */
export const authApiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  message: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.',
  keyGenerator: (req) => req.user?.id || req.ip,
  prefix: 'rl:api:auth:'
});

/**
 * Rate limiter estricto para operaciones críticas
 * 10 requests por 5 minutos
 */
export const strictLimiter = createLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10,
  message: 'Has realizado demasiadas acciones. Espera 5 minutos.',
  keyGenerator: (req) => req.body?.From || req.user?.id || req.ip,
  prefix: 'rl:strict:'
});

/**
 * Rate limiter para login
 * 5 intentos por 15 minutos por IP
 */
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
  keyGenerator: (req) => req.ip,
  prefix: 'rl:login:',
  skipSuccessfulRequests: true // No contar requests exitosos
});

export default {
  webhookLimiter,
  publicApiLimiter,
  authApiLimiter,
  strictLimiter,
  loginLimiter
};

