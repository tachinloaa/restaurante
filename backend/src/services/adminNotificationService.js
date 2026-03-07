import TwilioService from '../services/twilioService.js';
import config from '../config/environment.js';
import { ADMIN_PHONE_FIJO } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Servicio de notificaciones al administrador
 * Envía alertas de errores críticos y eventos importantes
 */
class AdminNotificationService {
  constructor() {
    this.adminPhone = config.admin.phoneNumber || ADMIN_PHONE_FIJO;
    this.notificationQueue = [];
    this.isProcessing = false;
    this.lastNotification = {};
    
    // Anti-spam: No enviar más de 5 notificaciones del mismo tipo en 10 minutos
    this.SPAM_THRESHOLD = 5;
    this.SPAM_WINDOW = 10 * 60 * 1000; // 10 minutos
  }

  /**
   * Notificar error crítico al admin
   * @param {string} tipo - Tipo de error (DB, TWILIO, BOT, API)
   * @param {string} mensaje - Descripción del error
   * @param {Object} detalles - Información adicional
   */
  async notificarErrorCritico(tipo, mensaje, detalles = {}) {
    try {
      // Anti-spam: verificar si ya se envió este tipo de error recientemente
      const key = `${tipo}_${mensaje}`;
      const ahora = Date.now();
      
      if (!this.lastNotification[key]) {
        this.lastNotification[key] = { count: 0, firstTime: ahora };
      }

      const notif = this.lastNotification[key];
      
      // Si es dentro de la ventana de spam
      if (ahora - notif.firstTime < this.SPAM_WINDOW) {
        notif.count++;
        
        // Si ya se excedió el límite, no enviar
        if (notif.count > this.SPAM_THRESHOLD) {
          logger.warn(`⚠️ Notificación de ${tipo} bloqueada por spam (${notif.count} veces)`);
          return { success: false, error: 'Spam threshold exceeded' };
        }
      } else {
        // Resetear contador si ya pasó la ventana
        this.lastNotification[key] = { count: 1, firstTime: ahora };
      }

      // Formatear mensaje para el admin
      const timestamp = new Date().toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        hour12: true
      });

      let mensajeFormateado = `🚨 *ERROR CRÍTICO - ${tipo}*\n\n`;
      mensajeFormateado += `⏰ ${timestamp}\n\n`;
      mensajeFormateado += `📝 *Mensaje:*\n${mensaje}\n\n`;

      if (Object.keys(detalles).length > 0) {
        mensajeFormateado += `📊 *Detalles:*\n`;
        for (const [key, value] of Object.entries(detalles)) {
          mensajeFormateado += `• ${key}: ${value}\n`;
        }
      }

      // Enviar notificación
      const resultado = await TwilioService.enviarMensajeAdmin(mensajeFormateado);

      if (resultado.success) {
        logger.info(`✅ Notificación de error crítico enviada al admin: ${tipo}`);
      } else {
        logger.error(`❌ Error enviando notificación al admin:`, resultado.error);
      }

      return resultado;
    } catch (error) {
      logger.error('❌ Error en notificarErrorCritico:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notificar evento importante (no crítico)
   * @param {string} asunto - Asunto de la notificación
   * @param {string} mensaje - Mensaje
   */
  async notificarEvento(asunto, mensaje) {
    try {
      const timestamp = new Date().toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        hour12: true
      });

      let mensajeFormateado = `ℹ️ *${asunto}*\n\n`;
      mensajeFormateado += `⏰ ${timestamp}\n\n`;
      mensajeFormateado += mensaje;

      const resultado = await TwilioService.enviarMensajeAdmin(mensajeFormateado);

      if (resultado.success) {
        logger.info(`✅ Notificación de evento enviada al admin: ${asunto}`);
      }

      return resultado;
    } catch (error) {
      logger.error('❌ Error en notificarEvento:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notificar cuando el sistema se inicia
   */
  async notificarInicioSistema() {
    const mensaje = `🟢 *Sistema iniciado exitosamente*\n\n` +
      `Entorno: ${config.env}\n` +
      `Puerto: ${config.port}\n` +
      `Redis: ${config.redis.enabled ? '✅ Habilitado' : '⚠️ Deshabilitado'}\n\n` +
      `El sistema está funcionando correctamente.`;

    return await this.notificarEvento('Sistema Iniciado', mensaje);
  }

  /**
   * Notificar error de base de datos
   */
  async notificarErrorDB(error, contexto = '') {
    return await this.notificarErrorCritico(
      'BASE DE DATOS',
      `Error en la base de datos${contexto ? ': ' + contexto : ''}`,
      {
        'Error': error.message,
        'Código': error.code || 'N/A',
        'Contexto': contexto || 'N/A'
      }
    );
  }

  /**
   * Notificar error de Twilio
   */
  async notificarErrorTwilio(error, contexto = '') {
    return await this.notificarErrorCritico(
      'TWILIO',
      `Error al enviar mensaje de WhatsApp${contexto ? ': ' + contexto : ''}`,
      {
        'Error': error.message,
        'Código Twilio': error.code || 'N/A',
        'Status': error.status || 'N/A',
        'Contexto': contexto || 'N/A'
      }
    );
  }

  /**
   * Notificar error en el bot
   */
  async notificarErrorBot(error, telefono = '', estado = '') {
    return await this.notificarErrorCritico(
      'BOT',
      'Error procesando mensaje del bot',
      {
        'Error': error.message,
        'Usuario': telefono || 'N/A',
        'Estado': estado || 'N/A',
        'Stack': error.stack ? error.stack.substring(0, 200) : 'N/A'
      }
    );
  }

  /**
   * Notificar error en la API
   */
  async notificarErrorAPI(error, endpoint = '', metodo = '') {
    return await this.notificarErrorCritico(
      'API',
      'Error en endpoint de la API',
      {
        'Error': error.message,
        'Endpoint': endpoint || 'N/A',
        'Método': metodo || 'N/A',
        'Status Code': error.statusCode || 'N/A'
      }
    );
  }

  /**
   * Limpiar historial de notificaciones antiguas (anti-spam)
   */
  limpiarHistorial() {
    const ahora = Date.now();
    
    for (const [key, notif] of Object.entries(this.lastNotification)) {
      if (ahora - notif.firstTime > this.SPAM_WINDOW) {
        delete this.lastNotification[key];
      }
    }
  }
}

// Exportar instancia única (Singleton)
const adminNotificationService = new AdminNotificationService();

// Limpiar historial cada 15 minutos
setInterval(() => {
  adminNotificationService.limpiarHistorial();
}, 15 * 60 * 1000);

export default adminNotificationService;
