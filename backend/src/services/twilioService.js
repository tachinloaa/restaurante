import twilioClient from '../config/twilio.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

/**
 * Servicio de Twilio para envío de mensajes de WhatsApp
 */
class TwilioService {
  /**
   * Límite de caracteres de WhatsApp (Twilio)
   * Usamos 1500 para dejar un margen de seguridad
   */
  static MAX_CARACTERES = 1500;

  /**
   * Dividir mensaje en partes si excede el límite
   */
  static dividirMensaje(mensaje) {
    if (mensaje.length <= this.MAX_CARACTERES) {
      return [mensaje];
    }

    const partes = [];
    let textoRestante = mensaje;

    while (textoRestante.length > 0) {
      if (textoRestante.length <= this.MAX_CARACTERES) {
        partes.push(textoRestante);
        break;
      }

      // Buscar el último salto de línea antes del límite
      let puntoCorte = textoRestante.lastIndexOf('\n', this.MAX_CARACTERES);

      // Si no hay salto de línea, buscar el último espacio
      if (puntoCorte === -1 || puntoCorte < this.MAX_CARACTERES * 0.7) {
        puntoCorte = textoRestante.lastIndexOf(' ', this.MAX_CARACTERES);
      }

      // Si no hay espacio, cortar en el límite
      if (puntoCorte === -1 || puntoCorte < this.MAX_CARACTERES * 0.7) {
        puntoCorte = this.MAX_CARACTERES;
      }

      partes.push(textoRestante.substring(0, puntoCorte).trim());
      textoRestante = textoRestante.substring(puntoCorte).trim();
    }

    return partes;
  }

  /**
   * Enviar mensaje de WhatsApp a un cliente
   * Si el mensaje es muy largo, lo divide automáticamente
   * Con reintentos automáticos en caso de fallo
   */
  static async enviarMensajeCliente(numeroDestino, mensaje, intentos = 3) {
    let ultimoError = null;
    
    for (let i = 0; i < intentos; i++) {
      try {
        // Modo de prueba: No enviar mensajes reales
        if (process.env.TWILIO_TEST_MODE === 'true') {
          logger.info(`[TEST MODE] Mensaje a cliente ${numeroDestino}: ${mensaje.substring(0, 100)}...`);
          return { success: true, messageSid: 'TEST_MODE', test: true };
        }

        // Asegurar formato de WhatsApp
        const numeroFormateado = numeroDestino.startsWith('whatsapp:')
          ? numeroDestino
          : `whatsapp:${numeroDestino}`;

        // Dividir mensaje si es necesario
        const partes = this.dividirMensaje(mensaje);
        const messageSids = [];

        // Enviar cada parte con un pequeño delay
        for (let j = 0; j < partes.length; j++) {
          const parte = partes[j];
          let mensajeConEncabezado = parte;

          // Agregar número de parte si hay múltiples
          if (partes.length > 1) {
            mensajeConEncabezado = `📱 *Parte ${j + 1}/${partes.length}*\n\n${parte}`;
          }

          const message = await twilioClient.messages.create({
            body: mensajeConEncabezado,
            from: config.twilio.whatsappClientes,
            to: numeroFormateado
          });

          messageSids.push(message.sid);
          logger.info(`Mensaje enviado a cliente ${numeroDestino} (parte ${j + 1}/${partes.length}): ${message.sid}`);

          // Pequeño delay entre mensajes para evitar sobrecarga
          if (j < partes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }

        return { success: true, messageSid: messageSids[0], messageSids, partes: partes.length };
        
      } catch (error) {
        ultimoError = error;
        logger.error(`❌ Intento ${i + 1}/${intentos} fallido para ${numeroDestino}:`, error.message);
        
        // Si es el último intento, devolver error
        if (i === intentos - 1) {
          break;
        }
        
        // Backoff exponencial: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, i);
        logger.info(`⏳ Esperando ${delay}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Todos los intentos fallaron
    logger.error(`❌ Todos los intentos fallaron para ${numeroDestino}`);
    return { 
      success: false, 
      error: ultimoError?.message || 'Error desconocido al enviar mensaje',
      code: ultimoError?.code 
    };
  }

  /**
   * Enviar mensaje de WhatsApp al administrador
   * Si el mensaje es muy largo, lo divide automáticamente
   */
  static async enviarMensajeAdmin(mensaje) {
    try {
      // Modo de prueba: No enviar mensajes reales
      if (process.env.TWILIO_TEST_MODE === 'true') {
        logger.info(`[TEST MODE] Mensaje a admin: ${mensaje.substring(0, 100)}...`);
        return { success: true, messageSid: 'TEST_MODE', test: true };
      }

      // Obtener número del admin y formatear
      const numeroAdmin = config.admin.phoneNumber;
      const numeroFormateado = numeroAdmin.startsWith('whatsapp:')
        ? numeroAdmin
        : `whatsapp:${numeroAdmin}`;

      // Dividir mensaje si es necesario
      const partes = this.dividirMensaje(mensaje);
      const messageSids = [];

      // Enviar cada parte
      for (let i = 0; i < partes.length; i++) {
        const parte = partes[i];
        let mensajeConEncabezado = parte;

        // Agregar número de parte si hay múltiples
        if (partes.length > 1) {
          mensajeConEncabezado = `📱 *Parte ${i + 1}/${partes.length}*\n\n${parte}`;
        }

        const message = await twilioClient.messages.create({
          body: mensajeConEncabezado,
          from: config.twilio.whatsappClientes,
          to: numeroFormateado
        });

        messageSids.push(message.sid);
        logger.info(`Mensaje enviado a admin ${numeroAdmin} (parte ${i + 1}/${partes.length}): ${message.sid}`);

        // Pequeño delay entre mensajes
        if (i < partes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      return { success: true, messageSid: messageSids[0], messageSids, partes: partes.length };
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

      logger.info(`📤 Enviando mensaje con imagen a ${numeroDestino}`);
      logger.info(`🖼️ URL de media original: ${mediaUrl}`);

      // Si la URL es de Twilio, necesitamos autenticarla
      let urlFinal = mediaUrl;
      if (mediaUrl.includes('api.twilio.com')) {
        // Crear URL con autenticación básica embebida
        const accountSid = config.twilio.accountSid;
        const authToken = config.twilio.authToken;

        // Extraer la parte de la URL después de "api.twilio.com"
        const urlParts = mediaUrl.split('api.twilio.com');
        if (urlParts.length > 1) {
          urlFinal = `https://${accountSid}:${authToken}@api.twilio.com${urlParts[1]}`;
          logger.info(`🔐 URL autenticada para Twilio`);
        }
      }

      const message = await twilioClient.messages.create({
        body: mensaje,
        from: config.twilio.whatsappClientes,
        to: numeroFormateado,
        mediaUrl: [urlFinal]
      });

      logger.info(`✅ Mensaje con imagen enviado exitosamente a ${numeroDestino}: ${message.sid}`);
      logger.info(`📊 Estado del mensaje: ${message.status}`);

      return { success: true, messageSid: message.sid };
    } catch (error) {
      logger.error(`❌ Error al enviar mensaje con imagen a ${numeroDestino}:`, error);
      logger.error(`📍 Detalles del error: ${error.message}`);
      logger.error(`🔍 Código de error: ${error.code}`);

      return { success: false, error: error.message, errorCode: error.code };
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
