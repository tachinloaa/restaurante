import TwilioService from './twilioService.js';
import { supabase } from '../config/database.js';
import { formatearPrecio, formatearHora } from '../utils/formatters.js';
import { EMOJIS, TIPOS_PEDIDO } from '../config/constants.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

/**
 * Servicio para enviar notificaciones al administrador
 */
class NotificationService {
  /**
   * Notificar nuevo pedido al administrador
   */
  async notificarNuevoPedido(pedido, cliente) {
    try {
      const tipoPedido = pedido.tipo_pedido === TIPOS_PEDIDO.DOMICILIO 
        ? 'DOMICILIO' 
        : pedido.tipo_pedido === TIPOS_PEDIDO.RESTAURANTE
        ? 'RESTAURANTE'
        : 'PARA LLEVAR';

      let mensaje = `${EMOJIS.CAMPANA} *NUEVO PEDIDO - ${tipoPedido}*\n\n`;
      mensaje += `${EMOJIS.TICKET} Pedido: *#${pedido.numero_pedido}*\n`;
      mensaje += `${EMOJIS.RELOJ} Hora: ${formatearHora(pedido.created_at)}\n`;
      mensaje += `⏱️ *Estado: PENDIENTE - ATENDER DE INMEDIATO*\n`;
      mensaje += `${EMOJIS.PERSONA} Cliente: ${cliente.nombre || 'Sin nombre'}\n`;
      mensaje += `${EMOJIS.TELEFONO} Teléfono: ${cliente.telefono}\n`;

      // Datos según tipo de pedido
      if (pedido.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
        mensaje += `${EMOJIS.UBICACION} Dirección: ${pedido.direccion_entrega}\n`;
        
        if (cliente.referencias) {
          mensaje += `${EMOJIS.CASA} Referencias: ${cliente.referencias}\n`;
        }
      } else if (pedido.tipo_pedido === TIPOS_PEDIDO.RESTAURANTE) {
        if (pedido.numero_mesa) {
          mensaje += `🪑 Mesa: ${pedido.numero_mesa}\n`;
        }
        
        if (pedido.numero_personas) {
          mensaje += `${EMOJIS.GRUPO} Personas: ${pedido.numero_personas}\n`;
        }
      }

      mensaje += `\n${EMOJIS.CARRITO} *PRODUCTOS:*\n`;

      // Obtener detalles de productos
      if (pedido.pedido_detalles && pedido.pedido_detalles.length > 0) {
        pedido.pedido_detalles.forEach(detalle => {
          const productoNombre = detalle.productos?.nombre || 'Producto';
          const subtotal = detalle.cantidad * detalle.precio_unitario;
          mensaje += `${detalle.cantidad}x ${productoNombre} - ${formatearPrecio(subtotal)}\n`;
        });
      }

      mensaje += `\n${EMOJIS.DINERO} *TOTAL: ${formatearPrecio(pedido.total)}*\n\n`;

      // URL al dashboard - página de pedidos
      const dashboardUrl = `${config.frontendUrl}/pedidos`;
      mensaje += `${EMOJIS.FLECHA} Ver en dashboard: ${dashboardUrl}`;

      // Enviar mensaje al admin
      const resultado = await TwilioService.enviarMensajeAdmin(mensaje);

      if (resultado.success) {
        logger.info(`Notificación de pedido #${pedido.numero_pedido} enviada al admin`);
      }

      return resultado;
    } catch (error) {
      logger.error('Error al notificar nuevo pedido:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Notificar actualización de estado al cliente
   */
  async notificarEstadoPedido(pedido, cliente) {
    try {
      let mensaje = '';

      switch (pedido.estado) {
        case 'preparando':
          mensaje = `${EMOJIS.COCINERO} Tu pedido *#${pedido.numero_pedido}* está siendo preparado.\n\n`;
          mensaje += `Te notificaremos cuando esté listo.`;
          break;

        case 'listo':
          mensaje = `${EMOJIS.CHECK} ¡Tu pedido *#${pedido.numero_pedido}* está listo!\n\n`;
          
          if (pedido.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
            mensaje += `${EMOJIS.MOTO} Saldrá para entrega en breve.`;
          } else if (pedido.tipo_pedido === TIPOS_PEDIDO.PARA_LLEVAR) {
            mensaje += `Puedes pasar a recogerlo.`;
          } else {
            mensaje += `Lo llevaremos a tu mesa en un momento.`;
          }
          break;

        case 'enviado':
          mensaje = `${EMOJIS.MOTO} Tu pedido *#${pedido.numero_pedido}* está en camino.\n\n`;
          mensaje += `Llegará en breve a tu domicilio.`;
          break;

        case 'entregado':
          mensaje = `${EMOJIS.CHECK} ¡Tu pedido *#${pedido.numero_pedido}* ha sido entregado!\n\n`;
          mensaje += `Gracias por tu preferencia ${EMOJIS.SALUDO}\n`;
          mensaje += `*El Rinconcito* ${EMOJIS.TACO}`;
          break;

        case 'cancelado':
          mensaje = `${EMOJIS.CRUZ} Tu pedido *#${pedido.numero_pedido}* ha sido cancelado.\n\n`;
          
          if (pedido.notas) {
            mensaje += `Razón: ${pedido.notas}\n\n`;
          }
          
          mensaje += `Si tienes dudas, contáctanos.`;
          break;

        default:
          return { success: false, error: 'Estado no reconocido' };
      }

      // Enviar mensaje al cliente
      const telefonoCliente = TwilioService.formatearNumeroWhatsApp(cliente.telefono);
      const resultado = await TwilioService.enviarMensajeCliente(
        telefonoCliente,
        mensaje
      );

      if (resultado.success) {
        logger.info(`Notificación de estado enviada al cliente: #${pedido.numero_pedido}`);
      }

      return resultado;
    } catch (error) {
      logger.error('Error al notificar estado de pedido:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Notificar nuevo cliente al administrador
   */
  async notificarNuevoCliente(cliente) {
    try {
      let mensaje = `${EMOJIS.PERSONA} *NUEVO CLIENTE REGISTRADO*\n\n`;
      mensaje += `Nombre: ${cliente.nombre || 'Sin nombre'}\n`;
      mensaje += `${EMOJIS.TELEFONO} Teléfono: ${cliente.telefono}\n`;
      
      if (cliente.direccion) {
        mensaje += `${EMOJIS.UBICACION} Dirección: ${cliente.direccion}\n`;
      }

      const resultado = await TwilioService.enviarMensajeAdmin(mensaje);

      if (resultado.success) {
        logger.info(`Notificación de nuevo cliente enviada: ${cliente.telefono}`);
      }

      return resultado;
    } catch (error) {
      logger.error('Error al notificar nuevo cliente:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Notificar pedido cancelado al administrador
   */
  async notificarPedidoCancelado(pedido, razon) {
    try {
      let mensaje = `${EMOJIS.CRUZ} *PEDIDO CANCELADO*\n\n`;
      mensaje += `${EMOJIS.TICKET} Pedido: *#${pedido.numero_pedido}*\n`;
      mensaje += `${EMOJIS.DINERO} Total: ${formatearPrecio(pedido.total)}\n`;
      
      if (razon) {
        mensaje += `\nRazón: ${razon}`;
      }

      const resultado = await TwilioService.enviarMensajeAdmin(mensaje);

      if (resultado.success) {
        logger.info(`Notificación de cancelación enviada: #${pedido.numero_pedido}`);
      }

      return resultado;
    } catch (error) {
      logger.error('Error al notificar pedido cancelado:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar mensaje personalizado al cliente
   */
  async enviarMensajeCliente(telefono, mensaje) {
    try {
      const telefonoFormateado = TwilioService.formatearNumeroWhatsApp(telefono);
      const resultado = await TwilioService.enviarMensajeCliente(
        telefonoFormateado,
        mensaje
      );

      return resultado;
    } catch (error) {
      logger.error('Error al enviar mensaje al cliente:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar confirmación de pedido al cliente
   */
  async enviarConfirmacionPedido(pedido, cliente, tiempoEstimado) {
    try {
      let mensaje = `${EMOJIS.CHECK} *¡PEDIDO CONFIRMADO!*\n\n`;
      mensaje += `${EMOJIS.TICKET} Tu número de pedido es: *#${pedido.numero_pedido}*\n\n`;
      mensaje += `Tu pedido está siendo preparado ${EMOJIS.COCINERO}\n`;
      
      if (tiempoEstimado) {
        mensaje += `${EMOJIS.RELOJ} Tiempo estimado: ${tiempoEstimado.min}-${tiempoEstimado.max} minutos\n\n`;
      }
      
      mensaje += `Te enviaremos actualizaciones del estado de tu pedido.\n\n`;
      mensaje += `¡Gracias por tu preferencia! ${EMOJIS.SALUDO}\n`;
      mensaje += `*El Rinconcito* ${EMOJIS.TACO}`;

      const telefonoCliente = TwilioService.formatearNumeroWhatsApp(cliente.telefono);
      const resultado = await TwilioService.enviarMensajeCliente(
        telefonoCliente,
        mensaje
      );

      if (resultado.success) {
        logger.info(`Confirmación de pedido enviada: #${pedido.numero_pedido}`);
      }

      return resultado;
    } catch (error) {
      logger.error('Error al enviar confirmación de pedido:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Crea una notificación en la base de datos
   * @param {string} tipo - Tipo de notificación
   * @param {string} mensaje - Mensaje de la notificación
   * @param {Object} datosAdicionales - Datos adicionales (JSON)
   */
  async crearNotificacion(tipo, mensaje, datosAdicionales = null) {
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .insert({
          tipo,
          mensaje,
          datos_adicionales: datosAdicionales,
          leida: false
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`Notificación creada: ${tipo} - ${mensaje}`);
      return { success: true, data };
    } catch (error) {
      logger.error('Error creando notificación:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crea notificación de nuevo pedido
   */
  async notificarNuevoPedidoPanel(pedido, cliente) {
    try {
      const tipoPedido = pedido.tipo_pedido === TIPOS_PEDIDO.DOMICILIO 
        ? 'DOMICILIO' 
        : pedido.tipo_pedido === TIPOS_PEDIDO.RESTAURANTE
        ? 'RESTAURANTE'
        : 'PARA LLEVAR';

      const mensaje = `Nuevo pedido #${pedido.numero_pedido} - ${tipoPedido} - ${formatearPrecio(pedido.total)}`;
      
      await this.crearNotificacion('nuevo_pedido', mensaje, {
        order_id: pedido.id,
        numero_pedido: pedido.numero_pedido,
        tipo_pedido: tipoPedido,
        total: pedido.total,
        cliente: cliente.nombre
      });
    } catch (error) {
      logger.error('Error en notificarNuevoPedidoPanel:', error);
    }
  }

  /**
   * Crea notificación de cambio de estado de pedido
   */
  async notificarCambioEstadoPedido(pedido, estadoAnterior, estadoNuevo) {
    try {
      const estadosTexto = {
        pendiente: 'Pendiente',
        en_preparacion: 'En Preparación',
        listo: 'Listo',
        en_camino: 'En Camino',
        entregado: 'Entregado',
        cancelado: 'Cancelado'
      };

      let tipo = 'pedido_actualizado';
      let icono = '📦';

      if (estadoNuevo === 'entregado') {
        tipo = 'pedido_completado';
        icono = '✅';
      } else if (estadoNuevo === 'cancelado') {
        tipo = 'pedido_cancelado';
        icono = '❌';
      }

      const mensaje = `${icono} Pedido #${pedido.numero_pedido} cambió a: ${estadosTexto[estadoNuevo]}`;
      
      await this.crearNotificacion(tipo, mensaje, {
        order_id: pedido.id,
        numero_pedido: pedido.numero_pedido,
        estado_anterior: estadoAnterior,
        estado_nuevo: estadoNuevo
      });
    } catch (error) {
      logger.error('Error en notificarCambioEstadoPedido:', error);
    }
  }

  /**
   * Crea notificación de nuevo cliente
   */
  async notificarNuevoCliente(cliente) {
    try {
      const mensaje = `👤 Nuevo cliente registrado: ${cliente.nombre || cliente.telefono}`;
      
      await this.crearNotificacion('cliente_nuevo', mensaje, {
        customer_id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono
      });
    } catch (error) {
      logger.error('Error en notificarNuevoCliente:', error);
    }
  }

  /**
   * Crea notificación de sistema/alerta
   */
  async notificarSistema(mensaje, datosAdicionales = null, esAlerta = false) {
    try {
      const tipo = esAlerta ? 'alerta' : 'sistema';
      await this.crearNotificacion(tipo, mensaje, datosAdicionales);
    } catch (error) {
      logger.error('Error en notificarSistema:', error);
    }
  }
}

// Exportar instancia única (Singleton)
export default new NotificationService();
