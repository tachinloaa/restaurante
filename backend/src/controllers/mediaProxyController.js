import config from '../config/environment.js';
import TwilioService from '../services/twilioService.js';
import logger from '../utils/logger.js';

/**
 * Proxy de media de Twilio
 * Descarga imágenes de Twilio (que requieren auth) y las sirve públicamente.
 * Protegido por token HMAC para que solo URLs generadas por el sistema sean válidas.
 */
async function mediaProxyController(req, res) {
  try {
    const { url, token } = req.query;

    if (!url || !token) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Verificar que la URL sea de Twilio
    if (!url.includes('api.twilio.com')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Verificar token HMAC
    if (!TwilioService.verificarMediaToken(url, token)) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Descargar imagen de Twilio con autenticación
    const authHeader = 'Basic ' + Buffer.from(
      `${config.twilio.accountSid}:${config.twilio.authToken}`
    ).toString('base64');

    const response = await fetch(url, {
      headers: { 'Authorization': authHeader },
      redirect: 'follow'
    });

    if (!response.ok) {
      logger.error(`❌ Media proxy: Twilio respondió ${response.status}`);
      return res.status(502).json({ error: 'Failed to fetch media' });
    }

    // Pasar content-type y cachear por 1 hora
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');

    // Stream la imagen al response
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    logger.error('❌ Error en media proxy:', error.message);
    res.status(500).json({ error: 'Internal error' });
  }
}

export default mediaProxyController;
