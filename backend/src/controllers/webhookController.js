import BotService from '../services/botService.js';
import TwilioService from '../services/twilioService.js';
import { success } from '../utils/responses.js';
import logger from '../utils/logger.js';

// Map para detectar mensajes duplicados
const recentMessages = new Map();

// Limpiar mensajes antiguos cada 60 segundos
setInterval(() => {
  const ahora = Date.now();
  for (const [key, timestamp] of recentMessages.entries()) {
    if (ahora - timestamp > 60000) { // 60 segundos
      recentMessages.delete(key);
    }
  }
}, 60000);

class WebhookController {
  /**
   * Webhook para recibir mensajes de WhatsApp desde Twilio
   * POST /webhook
   */
  async whatsapp(req, res) {
    try {
      const { From, Body, NumMedia, MediaUrl0, MediaContentType0, Latitude, Longitude, MessageSid } = req.body;

      logger.info(`📱 Webhook WhatsApp recibido de ${From}`);

      // 🛡️ PREVENCIÓN DE DUPLICADOS: Detectar reintentos de Twilio
      const msgKey = `${From}:${Body}:${MessageSid}`;
      if (recentMessages.has(msgKey)) {
        logger.warn(`⚠️ Mensaje duplicado detectado de ${From}, ignorando...`);
        res.type('text/xml');
        res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        return;
      }
      recentMessages.set(msgKey, Date.now());

      // ⚡ RESPUESTA INMEDIATA A TWILIO (prevenir reintentos)
      res.type('text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

      // Log de datos recibidos
      if (Latitude && Longitude) {
        logger.info(`📍 Ubicación recibida: ${Latitude}, ${Longitude}`);
      } else {
        logger.info(`📝 Body: ${Body}`);
      }

      logger.info(`📊 NumMedia: ${NumMedia}`);

      if (NumMedia > 0) {
        logger.info(`🖼️ MediaUrl0: ${MediaUrl0}`);
        logger.info(`📋 MediaContentType0: ${MediaContentType0}`);
      }

      // Preparar datos del mensaje
      const mensajeData = {
        body: Body,
        numMedia: parseInt(NumMedia) || 0,
        mediaUrl: MediaUrl0 || null,
        mediaType: MediaContentType0 || null,
        latitude: Latitude || null,
        longitude: Longitude || null
      };

      logger.info(`📦 Datos del mensaje preparados:`, JSON.stringify(mensajeData, null, 2));

      // 🔄 PROCESAR MENSAJE DE FORMA ASÍNCRONA (después de responder)
      try {
        // Procesar mensaje con el bot
        const respuesta = await BotService.procesarMensaje(From, mensajeData);

        if (!respuesta.success) {
          logger.error('❌ Error al procesar mensaje del bot:', respuesta.mensaje);
        }

        // Enviar respuesta al cliente
        if (respuesta.mensaje) {
          await TwilioService.enviarMensajeCliente(From, respuesta.mensaje);
        }
      } catch (error) {
        logger.error('💥 Error crítico en procesamiento del mensaje:', error);
        
        // 🚨 SIEMPRE AVISAR AL CLIENTE DEL ERROR
        try {
          await TwilioService.enviarMensajeCliente(
            From,
            '❌ Disculpa, hubo un problema procesando tu mensaje.\n\nEscribe *hola* para comenzar de nuevo o intenta más tarde.'
          );
        } catch (notificationError) {
          logger.error('💥 Error al enviar notificación de error al cliente:', notificationError);
        }
      }
    } catch (error) {
      logger.error('💥 Error fatal en webhook WhatsApp:', error);
      
      // Si aún no se respondió a Twilio, responder ahora
      if (!res.headersSent) {
        res.type('text/xml');
        res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }
    }
  }

  /**
   * Webhook para estado de mensajes de Twilio
   * GET /webhook/status
   */
  async status(req, res) {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

      logger.info(`Estado de mensaje ${MessageSid}: ${MessageStatus}`, {
        errorCode: ErrorCode,
        errorMessage: ErrorMessage
      });

      res.status(200).send('OK');
    } catch (error) {
      logger.error('Error en webhook status:', error);
      res.status(200).send('OK');
    }
  }

  /**
   * Endpoint para enviar mensaje manual (admin)
   * POST /api/whatsapp/send
   */
  async sendMessage(req, res) {
    try {
      const { telefono, mensaje } = req.body;

      if (!telefono || !mensaje) {
        return res.status(400).json({
          success: false,
          message: 'Teléfono y mensaje requeridos'
        });
      }

      const resultado = await TwilioService.enviarMensajeCliente(telefono, mensaje);

      if (!resultado.success) {
        return res.status(500).json({
          success: false,
          message: 'Error al enviar mensaje',
          error: resultado.error
        });
      }

      return success(res, { messageSid: resultado.messageSid }, 'Mensaje enviado exitosamente');
    } catch (error) {
      logger.error('Error en sendMessage:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar mensaje',
        error: error.message
      });
    }
  }

  /**
   * Health check
   * GET /api/health
   */
  health(req, res) {
    return success(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }, 'API funcionando correctamente');
  }
}

export default new WebhookController();
