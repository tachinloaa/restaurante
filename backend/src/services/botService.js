import SessionService from './sessionService.js';
import MenuService from './menuService.js';
import OrderService from './orderService.js';
import NotificationService from './notificationService.js';
import TwilioService from './twilioService.js';
import { 
  BOT_STATES, 
  COMANDOS_BOT, 
  EMOJIS, 
  MENSAJES_BOT, 
  TIPOS_PEDIDO,
  TIEMPO_ENTREGA,
  MAX_CANTIDAD_POR_PRODUCTO
} from '../config/constants.js';
import { limpiarNumeroWhatsApp } from '../utils/formatters.js';
import logger from '../utils/logger.js';

/**
 * Servicio del Bot conversacional de WhatsApp
 * Maneja toda la lógica de la conversación con los clientes
 */
class BotService {
  /**
   * Procesar mensaje entrante del cliente
   */
  async procesarMensaje(from, body) {
    try {
      const telefono = limpiarNumeroWhatsApp(from);
      const mensajeLimpio = body.trim().toLowerCase();

      logger.info(`Mensaje recibido de ${telefono}: ${body}`);

      // Obtener o crear sesión del usuario
      let session = SessionService.getSession(telefono);

      // Si no hay sesión o es comando de inicio, iniciar conversación
      if (!session || this.esComandoInicio(mensajeLimpio)) {
        return await this.iniciarConversacion(telefono);
      }

      // Verificar comandos especiales
      if (this.esComandoCancelar(mensajeLimpio)) {
        return await this.cancelarProceso(telefono);
      }

      if (this.esComandoAyuda(mensajeLimpio)) {
        return await this.mostrarAyuda(telefono);
      }

      if (this.esComandoMenu(mensajeLimpio)) {
        return await this.mostrarMenuCompleto(telefono);
      }

      if (this.esComandoEstado(mensajeLimpio)) {
        return await this.mostrarEstadoPedido(telefono);
      }

      // Procesar según el estado actual del bot
      return await this.procesarSegunEstado(telefono, body, mensajeLimpio);
    } catch (error) {
      logger.error('Error al procesar mensaje:', error);
      return {
        success: false,
        mensaje: MENSAJES_BOT.ERROR_GENERAL
      };
    }
  }

  /**
   * Procesar mensaje según el estado actual de la conversación
   */
  async procesarSegunEstado(telefono, body, mensajeLimpio) {
    const session = SessionService.getSession(telefono);

    if (!session) {
      return await this.iniciarConversacion(telefono);
    }

    switch (session.estado) {
      case BOT_STATES.INICIO:
      case BOT_STATES.SELECCIONAR_TIPO:
        return await this.procesarSeleccionTipo(telefono, mensajeLimpio);

      case BOT_STATES.VER_MENU:
      case BOT_STATES.SELECCIONAR_PRODUCTO:
        return await this.procesarSeleccionProducto(telefono, body);

      case BOT_STATES.SELECCIONAR_CANTIDAD:
        return await this.procesarCantidad(telefono, mensajeLimpio);

      case BOT_STATES.CONFIRMAR_MAS_PRODUCTOS:
        return await this.procesarMasProductos(telefono, mensajeLimpio);

      case BOT_STATES.SOLICITAR_NOMBRE:
        return await this.procesarNombre(telefono, body);

      case BOT_STATES.SOLICITAR_DIRECCION:
        return await this.procesarDireccion(telefono, body);

      case BOT_STATES.SOLICITAR_TELEFONO:
        return await this.procesarTelefono(telefono, body);

      case BOT_STATES.SOLICITAR_REFERENCIAS:
        return await this.procesarReferencias(telefono, body);

      case BOT_STATES.SOLICITAR_NUM_PERSONAS:
        return await this.procesarNumPersonas(telefono, mensajeLimpio);

      case BOT_STATES.SOLICITAR_NUM_MESA:
        return await this.procesarNumMesa(telefono, mensajeLimpio);

      case BOT_STATES.CONFIRMAR_PEDIDO:
        return await this.procesarConfirmacion(telefono, mensajeLimpio);

      default:
        return await this.iniciarConversacion(telefono);
    }
  }

  /**
   * Iniciar conversación
   */
  async iniciarConversacion(telefono) {
    SessionService.resetSession(telefono);
    
    return {
      success: true,
      mensaje: MENSAJES_BOT.BIENVENIDA
    };
  }

  /**
   * Procesar selección de tipo de pedido
   */
  async procesarSeleccionTipo(telefono, mensaje) {
    let tipoPedido = null;

    if (mensaje === '2' || COMANDOS_BOT.DOMICILIO.includes(mensaje)) {
      tipoPedido = TIPOS_PEDIDO.DOMICILIO;
    } else if (mensaje === '3' || COMANDOS_BOT.RESTAURANTE.includes(mensaje)) {
      tipoPedido = TIPOS_PEDIDO.RESTAURANTE;
    } else if (COMANDOS_BOT.PARA_LLEVAR.includes(mensaje)) {
      tipoPedido = TIPOS_PEDIDO.PARA_LLEVAR;
    } else if (mensaje === '1' || COMANDOS_BOT.MENU.includes(mensaje)) {
      return await this.mostrarMenuCompleto(telefono);
    } else if (mensaje === '4') {
      return await this.mostrarEstadoPedido(telefono);
    } else if (mensaje === '5') {
      return {
        success: true,
        mensaje: `En breve un asesor se comunicará contigo. ${EMOJIS.PERSONA}\n\nPuedes escribir *hola* para volver al menú principal.`
      };
    }

    if (!tipoPedido) {
      return {
        success: true,
        mensaje: MENSAJES_BOT.OPCION_INVALIDA
      };
    }

    // Guardar tipo de pedido
    SessionService.guardarDatos(telefono, { tipo_pedido: tipoPedido });
    SessionService.updateEstado(telefono, BOT_STATES.VER_MENU);

    // Mostrar menú
    return await this.mostrarMenuCompleto(telefono);
  }

  /**
   * Mostrar menú completo
   */
  async mostrarMenuCompleto(telefono) {
    const menu = await MenuService.getMenuCompleto();

    if (!menu) {
      return {
        success: false,
        mensaje: 'Lo siento, no pudimos cargar el menú. Intenta más tarde.'
      };
    }

    const session = SessionService.getSession(telefono);
    const datos = session?.datos || {};

    let mensaje = '';
    
    if (datos.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
      mensaje = `Perfecto! ${EMOJIS.MOTO} Haremos tu pedido a *DOMICILIO*.\n\n`;
    } else if (datos.tipo_pedido === TIPOS_PEDIDO.RESTAURANTE) {
      mensaje = `Perfecto! ${EMOJIS.RESTAURANTE} Haremos tu pedido para *COMER AQUÍ*.\n\n`;
    } else if (datos.tipo_pedido === TIPOS_PEDIDO.PARA_LLEVAR) {
      mensaje = `Perfecto! Haremos tu pedido *PARA LLEVAR*.\n\n`;
    }

    mensaje += menu.mensaje;

    SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_PRODUCTO);

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar selección de producto
   */
  async procesarSeleccionProducto(telefono, body) {
    const mensajeLimpio = body.trim();
    
    // Buscar por número o nombre
    let producto = null;

    if (/^\d+$/.test(mensajeLimpio)) {
      // Es un número
      producto = await MenuService.buscarPorNumero(parseInt(mensajeLimpio));
    } else {
      // Es un nombre
      producto = await MenuService.buscarPorNombre(mensajeLimpio);
    }

    if (!producto) {
      return {
        success: true,
        mensaje: `No encontramos ese producto. ${EMOJIS.CRUZ}\n\nPor favor intenta de nuevo o escribe *menu* para ver todas las opciones.`
      };
    }

    // Verificar stock
    if (producto.stock <= 0) {
      return {
        success: true,
        mensaje: `Lo sentimos, *${producto.nombre}* no está disponible en este momento. ${EMOJIS.CRUZ}\n\nPor favor elige otro producto.`
      };
    }

    // Guardar producto seleccionado temporalmente
    SessionService.guardarDatos(telefono, { producto_temporal: producto });
    SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_CANTIDAD);

    const mensaje = `${EMOJIS.CHECK} Has seleccionado:\n*${producto.nombre}*\n${formatearPrecio(producto.precio)}\n\n¿Cuántos deseas?\nEscribe la cantidad (ejemplo: 2)`;

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar cantidad
   */
  async procesarCantidad(telefono, mensaje) {
    const cantidad = parseInt(mensaje);

    if (isNaN(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD_POR_PRODUCTO) {
      return {
        success: true,
        mensaje: `Por favor indica una cantidad válida (1-${MAX_CANTIDAD_POR_PRODUCTO})`
      };
    }

    const session = SessionService.getSession(telefono);
    const producto = session.datos.producto_temporal;
    
    if (!producto) {
      return await this.iniciarConversacion(telefono);
    }

    // Verificar stock suficiente
    if (cantidad > producto.stock) {
      return {
        success: true,
        mensaje: `Lo sentimos, solo tenemos ${producto.stock} disponibles de *${producto.nombre}*.\n\n¿Cuántos deseas?`
      };
    }

    // Agregar al carrito
    SessionService.agregarAlCarrito(telefono, {
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: cantidad
    });

    // Limpiar producto temporal
    SessionService.guardarDatos(telefono, { producto_temporal: null });

    // Mostrar carrito y preguntar si quiere más
    const resumenCarrito = OrderService.generarResumenCarrito(session);
    
    let mensajeRespuesta = `Perfecto!\n\n${resumenCarrito.resumen}\n\n¿Deseas agregar más productos?\n\nResponde:\n• *SI* para agregar más\n• *NO* para continuar con tu pedido`;

    SessionService.updateEstado(telefono, BOT_STATES.CONFIRMAR_MAS_PRODUCTOS);

    return {
      success: true,
      mensaje: mensajeRespuesta
    };
  }

  /**
   * Procesar si quiere más productos
   */
  async procesarMasProductos(telefono, mensaje) {
    if (COMANDOS_BOT.SI.includes(mensaje)) {
      SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_PRODUCTO);
      
      return {
        success: true,
        mensaje: '¿Qué más deseas ordenar?\nEscribe el número o nombre del producto.\n\nEscribe *menu* para ver todas las opciones.'
      };
    }

    if (COMANDOS_BOT.NO.includes(mensaje)) {
      return await this.solicitarDatosCliente(telefono);
    }

    return {
      success: true,
      mensaje: 'Por favor responde *SI* para agregar más productos o *NO* para continuar.'
    };
  }

  /**
   * Solicitar datos del cliente según tipo de pedido
   */
  async solicitarDatosCliente(telefono) {
    const session = SessionService.getSession(telefono);
    const tipoPedido = session.datos.tipo_pedido;

    // Si no hay tipo de pedido, solicitarlo primero
    if (!tipoPedido) {
      SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_TIPO);
      return {
        success: true,
        mensaje: `Antes de continuar, necesito saber cómo recibirás tu pedido:\n\n*2.* ${EMOJIS.DELIVERY} A domicilio\n*3.* ${EMOJIS.RESTAURANTE} Comer aquí\n\nResponde con el número de tu opción.`
      };
    }

    SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_NOMBRE);

    let mensaje = 'Excelente! Ahora necesito algunos datos.\n\n';
    mensaje += `Por favor, escribe tu *NOMBRE COMPLETO* ${EMOJIS.PERSONA}`;

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar nombre
   */
  async procesarNombre(telefono, nombre) {
    if (nombre.trim().length < 3) {
      return {
        success: true,
        mensaje: 'Por favor escribe tu nombre completo (mínimo 3 caracteres)'
      };
    }

    SessionService.guardarDatos(telefono, { 
      nombre: nombre.trim(),
      telefono: telefono 
    });

    const session = SessionService.getSession(telefono);
    const tipoPedido = session.datos.tipo_pedido;

    if (tipoPedido === TIPOS_PEDIDO.DOMICILIO) {
      SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_DIRECCION);
      
      return {
        success: true,
        mensaje: `Gracias ${nombre.trim()} ${EMOJIS.PERSONA}\n\nAhora necesito tu *DIRECCIÓN COMPLETA* para la entrega.\n\nEjemplo: Calle 5 de Mayo #123, Col. Centro, entre Juárez e Hidalgo`
      };
    } else if (tipoPedido === TIPOS_PEDIDO.RESTAURANTE) {
      SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_NUM_PERSONAS);
      
      return {
        success: true,
        mensaje: `Gracias ${nombre.trim()} ${EMOJIS.PERSONA}\n\n¿Para cuántas personas es el pedido? ${EMOJIS.GRUPO}`
      };
    } else {
      // Para llevar, ir directamente a confirmación
      return await this.mostrarConfirmacion(telefono);
    }
  }

  /**
   * Procesar dirección
   */
  async procesarDireccion(telefono, direccion) {
    if (direccion.trim().length < 10) {
      return {
        success: true,
        mensaje: 'Por favor proporciona una dirección completa y detallada.'
      };
    }

    SessionService.guardarDatos(telefono, { direccion: direccion.trim() });
    SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_REFERENCIAS);

    return {
      success: true,
      mensaje: `Perfecto! ${EMOJIS.UBICACION}\n\n¿Hay alguna *REFERENCIA* para encontrar tu domicilio más fácil?\n\nEjemplo: "Edificio azul", "Casa con portón negro", "Junto al Oxxo"\n\nSi no hay referencias, escribe *NO*`
    };
  }

  /**
   * Procesar referencias
   */
  async procesarReferencias(telefono, referencias) {
    if (!COMANDOS_BOT.NO.includes(referencias.toLowerCase())) {
      SessionService.guardarDatos(telefono, { referencias: referencias.trim() });
    }

    return await this.mostrarConfirmacion(telefono);
  }

  /**
   * Procesar número de personas
   */
  async procesarNumPersonas(telefono, mensaje) {
    const numeroPersonas = parseInt(mensaje);

    if (isNaN(numeroPersonas) || numeroPersonas < 1 || numeroPersonas > 20) {
      return {
        success: true,
        mensaje: 'Por favor indica un número válido de personas (1-20)'
      };
    }

    SessionService.guardarDatos(telefono, { numero_personas: numeroPersonas });
    SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_NUM_MESA);

    return {
      success: true,
      mensaje: `Perfecto! Para ${numeroPersonas} ${numeroPersonas === 1 ? 'persona' : 'personas'}. ${EMOJIS.GRUPO}\n\n¿En qué *NÚMERO DE MESA* te encuentras? 🪑\n\nSi aún no tienes mesa, escribe *SIN MESA*`
    };
  }

  /**
   * Procesar número de mesa
   */
  async procesarNumMesa(telefono, mensaje) {
    if (mensaje === 'sin mesa' || mensaje === 'sin') {
      SessionService.guardarDatos(telefono, { numero_mesa: null });
    } else {
      const numeroMesa = parseInt(mensaje);

      if (isNaN(numeroMesa) || numeroMesa < 1) {
        return {
          success: true,
          mensaje: 'Por favor indica un número de mesa válido o escribe *SIN MESA*'
        };
      }

      SessionService.guardarDatos(telefono, { numero_mesa: numeroMesa });
    }

    return await this.mostrarConfirmacion(telefono);
  }

  /**
   * Mostrar confirmación del pedido
   */
  async mostrarConfirmacion(telefono) {
    const session = SessionService.getSession(telefono);
    const resumen = OrderService.generarResumenCompleto(session);

    if (!resumen) {
      return {
        success: false,
        mensaje: MENSAJES_BOT.ERROR_GENERAL
      };
    }

    const tipoPedido = session.datos.tipo_pedido;
    const tiempoEstimado = tipoPedido ? TIEMPO_ENTREGA[tipoPedido.toUpperCase()] || TIEMPO_ENTREGA.DOMICILIO : TIEMPO_ENTREGA.DOMICILIO;

    let mensaje = resumen.resumen;
    mensaje += `\n\n${EMOJIS.RELOJ} Tiempo estimado: ${tiempoEstimado.min}-${tiempoEstimado.max} minutos`;
    mensaje += `\n\n¿Todo está correcto?\n\nResponde:\n• *SI* para confirmar tu pedido\n• *NO* para cancelar y empezar de nuevo`;

    SessionService.updateEstado(telefono, BOT_STATES.CONFIRMAR_PEDIDO);

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar confirmación final
   */
  async procesarConfirmacion(telefono, mensaje) {
    if (COMANDOS_BOT.SI.includes(mensaje)) {
      return await this.confirmarPedido(telefono);
    }

    if (COMANDOS_BOT.NO.includes(mensaje)) {
      return await this.cancelarProceso(telefono);
    }

    return {
      success: true,
      mensaje: 'Por favor responde *SI* para confirmar o *NO* para cancelar.'
    };
  }

  /**
   * Confirmar y crear pedido
   */
  async confirmarPedido(telefono) {
    const session = SessionService.getSession(telefono);
    
    // Crear pedido en la base de datos
    const resultado = await OrderService.crearPedidoDesdeBot(telefono);

    if (!resultado.success) {
      logger.error('Error al crear pedido:', resultado.error);
      return {
        success: false,
        mensaje: `Lo sentimos, ocurrió un error al procesar tu pedido: ${resultado.error}\n\nPor favor intenta de nuevo o contacta a un asesor.`
      };
    }

    const { pedido, cliente } = resultado;

    // Enviar notificación al administrador
    await NotificationService.notificarNuevoPedido(pedido, cliente);

    // Obtener tiempo estimado
    const tipoPedido = session.datos.tipo_pedido;
    const tiempoEstimado = tipoPedido ? TIEMPO_ENTREGA[tipoPedido.toUpperCase()] : TIEMPO_ENTREGA.DOMICILIO;

    // Enviar confirmación al cliente
    const mensaje = MENSAJES_BOT.PEDIDO_CONFIRMADO(
      pedido.numero_pedido,
      tiempoEstimado
    );

    // Limpiar sesión
    SessionService.deleteSession(telefono);

    return {
      success: true,
      mensaje,
      pedido
    };
  }

  /**
   * Cancelar proceso actual
   */
  async cancelarProceso(telefono) {
    SessionService.resetSession(telefono);
    
    return {
      success: true,
      mensaje: MENSAJES_BOT.PEDIDO_CANCELADO
    };
  }

  /**
   * Mostrar ayuda
   */
  async mostrarAyuda(telefono) {
    let mensaje = `${EMOJIS.SALUDO} *AYUDA - EL RINCONCITO*\n\n`;
    mensaje += `Comandos disponibles:\n\n`;
    mensaje += `• *hola* - Iniciar conversación\n`;
    mensaje += `• *menu* - Ver menú completo\n`;
    mensaje += `• *pedir* - Hacer un pedido\n`;
    mensaje += `• *domicilio* - Pedido a domicilio\n`;
    mensaje += `• *restaurante* - Pedido en local\n`;
    mensaje += `• *estado* - Ver estado de pedido\n`;
    mensaje += `• *cancelar* - Cancelar proceso actual\n`;
    mensaje += `• *ayuda* - Mostrar esta ayuda\n\n`;
    mensaje += `Para hacer un pedido, simplemente escribe *hola* y sigue las instrucciones.\n\n`;
    mensaje += `${EMOJIS.TELEFONO} ¿Necesitas ayuda? Un asesor puede atenderte.`;

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Mostrar estado del último pedido
   */
  async mostrarEstadoPedido(telefono) {
    const session = SessionService.getSession(telefono);
    const datos = session?.datos || {};

    if (!datos.ultimo_pedido) {
      return {
        success: true,
        mensaje: 'No encontramos pedidos recientes.\n\n¿Deseas hacer un pedido? Escribe *pedir*'
      };
    }

    // Aquí se podría consultar el estado real del pedido
    return {
      success: true,
      mensaje: `Tu último pedido es: *#${datos.ultimo_pedido}*\n\nPara más información, contacta con nosotros.`
    };
  }

  /**
   * Verificar comandos
   */
  esComandoInicio(mensaje) {
    return COMANDOS_BOT.HOLA.includes(mensaje) || COMANDOS_BOT.PEDIR.includes(mensaje);
  }

  esComandoCancelar(mensaje) {
    return COMANDOS_BOT.CANCELAR.includes(mensaje);
  }

  esComandoAyuda(mensaje) {
    return COMANDOS_BOT.AYUDA.includes(mensaje);
  }

  esComandoMenu(mensaje) {
    return COMANDOS_BOT.MENU.includes(mensaje);
  }

  esComandoEstado(mensaje) {
    return COMANDOS_BOT.ESTADO.includes(mensaje);
  }
}

// Función auxiliar de formateo
function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(precio);
}

// Exportar instancia única (Singleton)
export default new BotService();
