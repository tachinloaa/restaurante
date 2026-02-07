import twilioClient from '../config/twilio.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

/**
 * Servicio de Twilio para envío de mensajes de WhatsApp
 */
class TwilioService {
  /**
   * Enviar mensaje de WhatsApp a un cliente
   */
  static async enviarMensajeCliente(numeroDestino, mensaje) {
    try {
      // Asegurar formato de WhatsApp
      const numeroFormateado = numeroDestino.startsWith('whatsapp:') 
        ? numeroDestino 
        : `whatsapp:${numeroDestino}`;

      const message = await twilioClient.messages.create({
        body: mensaje,
        from: config.twilio.whatsappClientes,
        to: numeroFormateado
      });

      logger.info(`Mensaje enviado a cliente ${numeroDestino}: ${message.sid}`);
      return { success: true, messageSid: message.sid };
    } catch (error) {
      logger.error(`Error al enviar mensaje a cliente ${numeroDestino}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar mensaje de WhatsApp al administrador
   */
  static async enviarMensajeAdmin(mensaje) {
    try {
      // Obtener número del admin y formatear
      const numeroAdmin = config.admin.phoneNumber;
      const numeroFormateado = numeroAdmin.startsWith('whatsapp:') 
        ? numeroAdmin 
        : `whatsapp:${numeroAdmin}`;

      const message = await twilioClient.messages.create({
        body: mensaje,
        from: config.twilio.whatsappClientes,
        to: numeroFormateado
      });

      logger.info(`Mensaje enviado a admin ${numeroAdmin}: ${message.sid}`);
      return { success: true, messageSid: message.sid };
    } catch (error) {
      logger.error('Error al enviar mensaje a admin:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enviar mensaje con imagen
   */
  static async enviarMensajeConImagen(numeroDestino, mensaje, mediaUrl) {
    try {
      const numeroFormateado = numeroDestino.startsWith('whatsapp:') 
        ? numeroDestino 
        : `whatsapp:${numeroDestino}`;

      const message = await twilioClient.messages.create({
        body: mensaje,
        from: config.twilio.whatsappClientes,
        to: numeroFormateado,
        mediaUrl: [mediaUrl]
      });

      logger.info(`Mensaje con imagen enviado a ${numeroDestino}: ${message.sid}`);
      return { success: true, messageSid: message.sid };
    } catch (error) {
      logger.error(`Error al enviar mensaje con imagen a ${numeroDestino}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener estado de un mensaje
   */
  static async obtenerEstadoMensaje(messageSid) {
    try {
      const message = await twilioClient.messages(messageSid).fetch();
      
      return {
        success: true,
        data: {
          sid: message.sid,
          status: message.status,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage,
          dateSent: message.dateSent
        }
      };
    } catch (error) {
      logger.error(`Error al obtener estado del mensaje ${messageSid}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validar número de WhatsApp
   */
  static validarNumeroWhatsApp(numero) {
    // Remover prefijo whatsapp: si existe
    const limpio = numero.replace('whatsapp:', '');
    
    // Verificar que sea un número válido (10-15 dígitos)
    const regex = /^\+?[1-9]\d{9,14}$/;
    return regex.test(limpio);
  }

  /**
   * Formatear número para WhatsApp
   */
  static formatearNumeroWhatsApp(numero) {
    // Si ya tiene el prefijo, retornarlo
    if (numero.startsWith('whatsapp:')) {
      return numero;
    }

    // Si no tiene +, agregarlo (asumiendo número mexicano)
    if (!numero.startsWith('+')) {
      numero = `+52${numero}`;
    }

    return `whatsapp:${numero}`;
  }
}

export default TwilioService;
