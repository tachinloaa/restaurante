import BotService from '../services/botService.js';
import TwilioService from '../services/twilioService.js';
import OrderService from '../services/orderService.js';
import SessionService from '../services/sessionService.js';
import WebhookDedupService from '../services/webhookDedupService.js';
import { supabase } from '../config/database.js';
import { success } from '../utils/responses.js';
import logger from '../utils/logger.js';
import config from '../config/environment.js';

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
  async procesarMensajeEnSegundoPlano(from, mensajeData) {
    try {
      const respuesta = await BotService.procesarMensaje(from, mensajeData);

      if (!respuesta.success) {
        logger.error('❌ Error al procesar mensaje del bot:', respuesta.mensaje);
      }

      if (respuesta.mensaje) {
        await TwilioService.enviarMensajeCliente(from, respuesta.mensaje);
      }
    } catch (error) {
      logger.error('💥 Error crítico en procesamiento del mensaje:', error);

      try {
        await TwilioService.enviarMensajeCliente(
          from,
          '❌ Disculpa, hubo un problema procesando tu mensaje.\n\nEscribe *hola* para comenzar de nuevo o intenta más tarde.'
        );
      } catch (notificationError) {
        logger.error('💥 Error al enviar notificación de error al cliente:', notificationError);
      }
    }
  }

  getSafeMetric(getter, fallback, source, metricErrors) {
    try {
      return getter();
    } catch (error) {
      logger.error(`Error obteniendo métrica ${source}:`, error);
      metricErrors[source] = error.message;
      return fallback;
    }
  }

  async getSafeDatabaseProbe(metricErrors) {
    const dbProbe = {
      ok: true,
      latencyMs: null,
      error: null
    };

    try {
      const dbStart = Date.now();
      const { error: dbError } = await supabase
        .from('productos')
        .select('id')
        .limit(1);

      dbProbe.latencyMs = Date.now() - dbStart;

      if (dbError) {
        dbProbe.ok = false;
        dbProbe.error = dbError.message || 'Error desconocido en consulta BD';
        metricErrors.database = dbProbe.error;
      }
    } catch (error) {
      logger.error('Error obteniendo métrica database:', error);
      dbProbe.ok = false;
      dbProbe.error = error.message;
      metricErrors.database = error.message;
    }

    return dbProbe;
  }

  /**
   * Webhook para recibir mensajes de WhatsApp desde Twilio
   * POST /webhook
   */
  async whatsapp(req, res) {
    try {
      const { From, Body, NumMedia, MediaUrl0, MediaContentType0, Latitude, Longitude, MessageSid } = req.body;

      if (!From) {
        logger.warn('⚠️ Webhook WhatsApp recibido sin From, ignorando');
        res.type('text/xml');
        res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        return;
      }

      logger.info(`📱 Webhook WhatsApp recibido de ${From}`);

      // 🛡️ PREVENCIÓN DE DUPLICADOS: Detectar reintentos de Twilio
      const msgKey = `${From}:${Body}:${MessageSid}`;
      if (recentMessages.has(msgKey)) {
        logger.warn(`⚠️ Mensaje duplicado detectado de ${From}, ignorando...`);
        res.type('text/xml');
        res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        return;
      }

      // Deduplicación persistente para resistir reinicios del proceso
      const dedup = await WebhookDedupService.isDuplicateOrRegister(MessageSid, From, Body);
      if (dedup.duplicate) {
        logger.warn(`⚠️ Mensaje duplicado persistente detectado de ${From}, ignorando... (${dedup.reason})`);
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
        messageSid: MessageSid || null,
        numMedia: parseInt(NumMedia) || 0,
        mediaUrl: MediaUrl0 || null,
        mediaType: MediaContentType0 || null,
        latitude: Latitude || null,
        longitude: Longitude || null
      };

      logger.info('📦 Datos del mensaje preparados', { mensajeData });

      // 🔄 PROCESAR FUERA DEL CICLO DE RESPUESTA PARA NO RETENER EL REQUEST
      setImmediate(() => {
        this.procesarMensajeEnSegundoPlano(From, mensajeData);
      });
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
    * POST /webhook/status
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

  /**
   * Health operativo con métricas en vivo
   * GET /api/health/ops
   */
  async healthOps(req, res) {
    try {
      const nowIso = new Date().toISOString();
      const metricErrors = {};
      const sessionMetrics = this.getSafeMetric(
        () => SessionService.getOperationalMetrics(),
        {
          sessions: {
            total: 0,
            activas: 0,
            redisEnabled: !!config.redis.enabled,
            redisConnected: false,
            centralStorageConnected: false,
            localBackupExists: false,
            localBackupSizeBytes: 0,
            localCachedSessions: 0,
            timeoutMs: 0
          }
        },
        'sessions',
        metricErrors
      );
      const twilioMetrics = this.getSafeMetric(
        () => TwilioService.getOperationalMetrics(),
        {
          queue: {
            total: 0,
            adminPendientes: 0,
            clientePendientes: 0,
            oldestPendingMs: 0,
            processing: false,
            maxQueueRetries: 0
          }
        },
        'twilio',
        metricErrors
      );
      const emergencyMetrics = this.getSafeMetric(
        () => OrderService.getOperationalMetrics(),
        {
          emergencyOrders: {
            totalPendientes: 0,
            oldestPendingMs: 0,
            maxIntentos: 0,
            processing: false,
            processorStarted: false
          }
        },
        'orders',
        metricErrors
      );

      const dbProbe = await this.getSafeDatabaseProbe(metricErrors);

      const redisDegraded = config.isProduction && !sessionMetrics.sessions.redisConnected;
      const pendingAdminNotifications = twilioMetrics.queue?.adminPendientes || 0;
      const staleAdminQueue = pendingAdminNotifications > 0 && (twilioMetrics.queue?.oldestPendingMs || 0) > 5 * 60 * 1000;
      const dbDegraded = !dbProbe.ok;
      const metricFailures = Object.keys(metricErrors).length > 0;

      const estado = (redisDegraded || staleAdminQueue || dbDegraded || metricFailures) ? 'degraded' : 'ok';

      return success(res, {
        status: estado,
        timestamp: nowIso,
        uptimeSeconds: process.uptime(),
        metrics: {
          ...sessionMetrics,
          ...twilioMetrics,
          ...emergencyMetrics,
          database: dbProbe,
          webhook: {
            recentMessageCacheSize: recentMessages.size
          },
          metricErrors
        },
        alerts: {
          redisDegraded,
          dbDegraded,
          staleAdminQueue,
          pendingAdminNotifications,
          metricFailures
        }
      }, 'Health operativo obtenido');
    } catch (error) {
      logger.error('Error en healthOps:', error);
      return success(res, {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptimeSeconds: process.uptime(),
        metrics: {
          database: {
            ok: false,
            latencyMs: null,
            error: error.message
          },
          webhook: {
            recentMessageCacheSize: recentMessages.size
          },
          metricErrors: {
            healthOps: error.message
          }
        },
        alerts: {
          redisDegraded: true,
          dbDegraded: true,
          staleAdminQueue: false,
          pendingAdminNotifications: 0,
          metricFailures: true
        }
      }, 'Health operativo degradado');
    }
  }
}

export default new WebhookController();
