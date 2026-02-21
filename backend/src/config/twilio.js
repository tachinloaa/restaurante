import twilio from 'twilio';
import config from './environment.js';
import logger from '../utils/logger.js';

/**
 * Cliente de Twilio configurado
 */
const twilioClient = twilio(
  config.twilio.accountSid,
  config.twilio.authToken
);

/**
 * Verificar conexión a Twilio
 */
export const testTwilioConnection = async () => {
  try {
    const account = await twilioClient.api.accounts(config.twilio.accountSid).fetch();
    logger.info(`✅ Conexión exitosa a Twilio - Cuenta: ${account.friendlyName}`);
    return true;
  } catch (error) {
    logger.error('❌ Error al conectar con Twilio:', error.message);
    return false;
  }
};

/**
 * Validar firma de Twilio en webhooks (seguridad)
 */
export const validateTwilioSignature = (req) => {
  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  return twilio.validateRequest(
    config.twilio.authToken,
    twilioSignature,
    url,
    req.body
  );
};

export default twilioClient;
