import { validateTwilioSignature } from '../config/twilio.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

/**
 * Middleware para validar firma de Twilio en webhooks
 * Asegura que las peticiones provienen de Twilio
 */
export const twilioValidator = (req, res, next) => {
  // En desarrollo, permitir sin validación si no hay firma
  if (config.isDevelopment && !req.headers['x-twilio-signature']) {
    logger.warn('Petición de webhook sin firma de Twilio (modo desarrollo)');
    return next();
  }

  try {
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    
    logger.info('🔐 Validando firma de Twilio:', {
      url,
      hasSignature: !!req.headers['x-twilio-signature']
    });

    const isValid = validateTwilioSignature(req);

    if (!isValid) {
      logger.error('❌ Firma de Twilio inválida');
      return res.status(403).json({
        success: false,
        message: 'Firma inválida'
      });
    }

    logger.info('✅ Firma válida');
    next();
  } catch (error) {
    logger.error('💥 Error validando firma:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar petición'
    });
  }
};

export default twilioValidator;
