import TwilioService from './twilioService.js';
import { supabase } from '../config/database.js';
import { formatearPrecio, formatearHora, formatearTelefono, formatearNombreProducto } from '../utils/formatters.js';
import { EMOJIS, TIPOS_PEDIDO, DIRECCION_RESTAURANTE, COSTO_ENVIO } from '../config/constants.js';
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
        ? 'DOMICILIO 🏠'
        : 'RECOGER EN RESTAURANTE 🏪';

      const esEfectivo = pedido.metodo_pago === 'efectivo';
      const esTransferencia = pedido.metodo_pago === 'transferencia';
      const esDomicilio = pedido.tipo_pedido === TIPOS_PEDIDO.DOMICILIO;

      // Encabezado según método de pago
      const encabezado = esEfectivo
        ? `� *NUEVO PEDIDO - EFECTIVO - ${tipoPedido}*`
        : `🏦 *PEDIDO TRANSFERENCIA - ${tipoPedido}*`;

      let mensaje = `${EMOJIS.CAMPANA} ${encabezado}\n\n`;
      mensaje += `${EMOJIS.TICKET} Pedido: *#${pedido.numero_pedido}*\n`;
      mensaje += `${EMOJIS.RELOJ} Hora: ${formatearHora(pedido.created_at)}\n`;
      mensaje += `${EMOJIS.PERSONA} Cliente: *${cliente.nombre || 'Sin nombre'}*\n`;
      mensaje += `${EMOJIS.TELEFONO} Tel: https://wa.me/${cliente.telefono.replace('whatsapp:', '').replace('+', '')}\n`;

      // Datos según tipo de pedido
      if (esDomicilio) {
        mensaje += `${EMOJIS.UBICACION} Dirección: ${pedido.direccion_entrega || 'No especificada'}\n`;
        if (cliente.referencias || pedido.referencias) {
          mensaje += `🏠 Ref: ${cliente.referencias || pedido.referencias}\n`;
        }
      }

      mensaje += `\n${EMOJIS.CARRITO} *PRODUCTOS:*\n`;

      if (pedido.pedido_detalles && pedido.pedido_detalles.length > 0) {
        pedido.pedido_detalles.forEach(detalle => {
          const productoNombre = formatearNombreProducto({ nombre: detalle.productos?.nombre, subcategoria: detalle.productos?.subcategorias?.nombre });
          const subtotal = detalle.cantidad * detalle.precio_unitario;
          mensaje += `• ${detalle.cantidad}x ${productoNombre || 'Producto'} — ${formatearPrecio(subtotal)}\n`;
        });
      }

      if (esDomicilio) {
        mensaje += `🛵 Envío a domicilio: ${formatearPrecio(COSTO_ENVIO)}\n`;
      }
      mensaje += `\n${EMOJIS.DINERO} *TOTAL: ${formatearPrecio(pedido.total)}*\n`;

      // Sección de pago según método
      mensaje += `\n`;
      if (esEfectivo) {
        mensaje += `💵 *PAGO EN EFECTIVO*\n`;
        if (esDomicilio) {
          mensaje += `🛵 El repartidor cobrará *${formatearPrecio(pedido.total)}* al entregar\n`;
          mensaje += `💡 Lleva el cambio por si el cliente no tiene exacto\n`;
        } else {
          mensaje += `🏪 El cliente pagará al recoger su pedido\n`;
        }
      } else if (esTransferencia) {
        mensaje += `🏦 *PAGO POR TRANSFERENCIA*\n`;
        mensaje += `⚠️ Pendiente de verificación manual\n`;
        if (pedido.comprobante_pago || pedido.comprobante_url) {
          mensaje += `📸 Comprobante recibido — ver arriba\n`;
        }
      }

      // Comandos de acción según estado y tipo de pedido
      mensaje += `\n${'─'.repeat(30)}\n`;
      if (esEfectivo) {
        mensaje += `⚡ *ACCIONES:*\n`;
        mensaje += `• *preparando #${pedido.numero_pedido}* — Confirmar preparación 👨‍🍳\n`;
        if (esDomicilio) {
          mensaje += `• *ficha #${pedido.numero_pedido}* — Ver ficha de entrega 📋\n`;
        }
        mensaje += `• *entregado #${pedido.numero_pedido}* — ${esDomicilio ? 'Marcar en camino 🛵' : 'Listo para recoger 📦'}\n`;
        mensaje += `• *pagado #${pedido.numero_pedido}* — Confirmar cobro en efectivo 💵\n`;
        mensaje += `• *cancelar #${pedido.numero_pedido}* — Cancelar pedido\n`;
      } else {
        mensaje += `⚡ *VERIFICAR PAGO:*\n`;
        mensaje += `• *aprobar #${pedido.numero_pedido}* — Pago correcto ✅\n`;
        mensaje += `• *rechazar #${pedido.numero_pedido}* — Pago inválido ❌\n`;
      }

      // Pedidos de transferencia: enviar plantilla primero para abrir ventana 24h
      // Pedidos de efectivo: NO enviar plantilla (dice "aprobar/rechazar" que es incorrecto)
      if (esTransferencia) {
        try {
          const tipoPedidoTemplate = pedido.tipo_pedido === 'domicilio' ? 'domicilio' : 'para_llevar';
          const resultadoPlantilla = await TwilioService.enviarNotificacionAdminConPlantilla(
            pedido.numero_pedido,
            cliente.nombre || 'Sin nombre',
            cliente.telefono || 'N/A',
            `$${pedido.total}`,
            tipoPedidoTemplate
          );
          if (resultadoPlantilla.success) {
            logger.info(`✅ Plantilla enviada al admin para pedido #${pedido.numero_pedido}`);
          } else {
            logger.warn(`⚠️ Plantilla falló para pedido #${pedido.numero_pedido}: ${resultadoPlantilla.error}`);
          }
        } catch (templateError) {
          logger.warn(`⚠️ Error al enviar plantilla al admin: ${templateError.message}`);
        }
      }

      // Enviar detalle completo (freeform)
      const resultado = await TwilioService.enviarMensajeAdmin(mensaje);

      if (resultado.success) {
        logger.info(`Notificación de pedido #${pedido.numero_pedido} enviada al admin`);
      }

      // Para efectivo domicilio: enviar ficha de reparto automáticamente
      if (esEfectivo && esDomicilio) {
        try {
          const NL = '\n';
          let ficha = `🛵 *ENTREGA PARA REPARTIDOR* 📦${NL}`;
          ficha += `🆔 Pedido: *#${pedido.numero_pedido}*${NL}${NL}`;
          ficha += `👤 *Cliente:* ${cliente.nombre || 'Sin nombre'}${NL}`;
          ficha += `📞 *Tel:* https://wa.me/${(cliente.telefono || '').replace('whatsapp:', '').replace('+', '')}${NL}`;
          ficha += `📍 *Ubicación:* ${pedido.direccion_entrega || 'No especificada'}${NL}`;
          if (pedido.referencias || cliente.referencias) {
            ficha += `ℹ️ *Ref:* ${pedido.referencias || cliente.referencias}${NL}`;
          }
          ficha += `${NL}`;
          ficha += `💰 *COBRAR: ${formatearPrecio(pedido.total)}*${NL}`;
          ficha += `💳 *Método:* EFECTIVO${NL}`;
          ficha += `💡 *Nota:* El cliente paga todo al entregar (incluye $${COSTO_ENVIO} de envío)${NL}`;
          ficha += `${NL}`;
          ficha += `📋 *Productos:*${NL}`;
          if (pedido.pedido_detalles && pedido.pedido_detalles.length > 0) {
            pedido.pedido_detalles.forEach(d => {
              ficha += `• ${d.cantidad}x ${formatearNombreProducto({ nombre: d.productos?.nombre, subcategoria: d.productos?.subcategorias?.nombre }) || 'Producto'}${NL}`;
            });
          } else {
            ficha += `(Ver detalle en app)${NL}`;
          }
          ficha += `${NL}👉 *Reenvía este mensaje al repartidor*`;

          await TwilioService.enviarMensajeAdmin(ficha);
          logger.info(`✅ Ficha efectivo enviada al admin para pedido #${pedido.numero_pedido}`);
        } catch (fichaError) {
          logger.warn(`⚠️ Error al generar ficha efectivo: ${fichaError.message}`);
        }
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
   * ⚡ ULTRA OPTIMIZADO: Solo notifica cuando está ENTREGADO
   */
  async notificarEstadoPedido(pedido, cliente) {
    try {
      let mensaje = '';

      // ⚡ Solo notifica al cliente en estados: ENTREGADO y CANCELADO
      switch (pedido.estado) {
        case 'entregado':
          if (pedido.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
            mensaje = `${EMOJIS.MOTO} *¡Tu pedido #${pedido.numero_pedido} ya va en camino!*\n\n`;
            mensaje += `🛵 El repartidor está en camino a tu domicilio.\n\n`;
            mensaje += `¡Ya casi llega! ${EMOJIS.SALUDO}\n*El Rinconcito* ${EMOJIS.TACO}`;
          } else if (pedido.tipo_pedido === TIPOS_PEDIDO.PARA_LLEVAR) {
            mensaje = `${EMOJIS.CHECK} ¡Tu pedido *#${pedido.numero_pedido}* está listo!\n\n`;
            mensaje += `📦 *Puedes pasar a recogerlo*\n\n`;
            mensaje += `📍 *Dirección:*\n${DIRECCION_RESTAURANTE.TEXTO}\n${DIRECCION_RESTAURANTE.MAPS}\n\n`;
            mensaje += `Gracias por tu preferencia ${EMOJIS.SALUDO}\n*El Rinconcito* ${EMOJIS.TACO}`;
          }
          break;

        case 'cancelado':
          mensaje = `${EMOJIS.CRUZ} Tu pedido *#${pedido.numero_pedido}* ha sido cancelado.\n\n`;

          if (pedido.motivo_cancelacion) {
            mensaje += `Razón: ${pedido.motivo_cancelacion}\n\n`;
          }

          mensaje += `Si tienes dudas, contáctanos.`;
          break;

        // Estados que NO notifican al cliente
        case 'pendiente':
        case 'preparando':
        case 'listo':
          logger.info(`⏭️ Estado ${pedido.estado} no notifica al cliente`);
          return { success: true, skipped: true };

        case 'enviado':
          // Estado legacy — no notifica, todo se maneja con 'entregado'
          logger.info(`⏭️ Estado enviado ignorado (usar entregado)`);
          return { success: true, skipped: true };

        default:
          return { success: false, error: 'Estado no reconocido' };
      }

      // Si no hay mensaje, no enviar
      if (!mensaje) {
        return { success: true, skipped: true };
      }

      // Enviar mensaje al cliente
      const telefonoCliente = TwilioService.formatearNumeroWhatsApp(cliente.telefono);
      const resultado = await TwilioService.enviarMensajeCliente(
        telefonoCliente,
        mensaje
      );

      if (resultado.success) {
        logger.info(`📱 Notificación ENTREGADO enviada al cliente: #${pedido.numero_pedido} - ${pedido.tipo_pedido}`);
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
      mensaje += `${EMOJIS.TELEFONO} Teléfono: https://wa.me/${cliente.telefono.replace('whatsapp:', '').replace('+', '')}\n`;

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
   * Notificar al admin y al cliente cuando se registra un pago en efectivo
   */
  async notificarPagoEfectivoRecibido(pedido, cliente) {
    try {
      // ── Mensaje al ADMIN ──────────────────────────────────────
      const tipoPedido = pedido.tipo_pedido === TIPOS_PEDIDO.DOMICILIO
        ? 'domicilio 🏠'
        : 'para llevar 🏪';

      let msgAdmin = `💵 *PAGO EFECTIVO REGISTRADO*\n\n`;
      msgAdmin += `${EMOJIS.TICKET} Pedido: *#${pedido.numero_pedido}*\n`;
      msgAdmin += `${EMOJIS.PERSONA} Cliente: *${cliente.nombre || 'Sin nombre'}*\n`;
      msgAdmin += `${EMOJIS.TELEFONO} Tel: https://wa.me/${(cliente.telefono || '').replace('whatsapp:', '').replace('+', '')}\n`;
      msgAdmin += `${EMOJIS.DINERO} Total cobrado: *${formatearPrecio(pedido.total)}*\n`;
      msgAdmin += `📦 Tipo: ${tipoPedido}\n`;
      msgAdmin += `✅ Pago marcado como recibido desde el panel admin`;

      await TwilioService.enviarMensajeAdmin(msgAdmin);
      logger.info(`Notificación pago efectivo admin enviada: pedido #${pedido.numero_pedido}`);

      // ── Mensaje al CLIENTE ────────────────────────────────────
      try {
        const telefonoCliente = TwilioService.formatearNumeroWhatsApp(cliente.telefono);
        let msgCliente = `${EMOJIS.CHECK} *¡Pago recibido!*\n\n`;
        msgCliente += `Registramos el pago en efectivo de tu pedido *#${pedido.numero_pedido}*\n`;
        msgCliente += `${EMOJIS.DINERO} Total: *${formatearPrecio(pedido.total)}*\n\n`;
        msgCliente += `¡Gracias por tu preferencia! ${EMOJIS.SALUDO}\n`;
        msgCliente += `*El Rinconcito* ${EMOJIS.TACO}`;

        await TwilioService.enviarMensajeCliente(telefonoCliente, msgCliente);
        logger.info(`Confirmación pago efectivo enviada al cliente: #${pedido.numero_pedido}`);
      } catch (clienteError) {
        // No es crítico si falla el mensaje al cliente
        logger.warn(`⚠️ No se pudo notificar al cliente sobre pago efectivo: ${clienteError.message}`);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error en notificarPagoEfectivoRecibido:', error);
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
        : 'RECOGER EN RESTAURANTE';

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
