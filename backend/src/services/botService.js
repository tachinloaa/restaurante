import SessionService from './sessionService.js';
import MenuService from './menuService.js';
import OrderService from './orderService.js';
import NotificationService from './notificationService.js';
import TwilioService from './twilioService.js';
import { supabase } from '../config/database.js';
import config from '../config/environment.js';
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
      
      // Normalizar mensaje: minúsculas, sin espacios extras, sin acentos
      const mensajeLimpio = body
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/\s+/g, ' '); // Múltiples espacios a uno solo

      logger.info(`Mensaje recibido de ${telefono}: ${body}`);

      // Verificar si es admin
      const isAdmin = this.esAdmin(telefono);
      
      // Comandos especiales para admin
      if (isAdmin) {
        if (mensajeLimpio === 'pedidos' || mensajeLimpio === 'pendientes') {
          return await this.mostrarPedidosPendientes();
        }
        if (mensajeLimpio.startsWith('ver pedido') || mensajeLimpio.startsWith('ver #')) {
          return await this.verDetallePedido(body);
        }
        if (mensajeLimpio.startsWith('estado')) {
          return await this.cambiarEstadoPedido(body);
        }
      }

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

      // Comandos de cliente
      if (this.esComandoMisPedidos(mensajeLimpio)) {
        return await this.mostrarPedidosCliente(telefono);
      }

      if (this.esComandoCancelarPedido(mensajeLimpio)) {
        return await this.procesarCancelacionPedido(telefono, body);
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
      case BOT_STATES.MENU_PRINCIPAL:
        return await this.procesarMenuPrincipal(telefono, mensajeLimpio, body);

      case BOT_STATES.SELECCIONAR_TIPO:
        return await this.procesarSeleccionTipo(telefono, mensajeLimpio, body);

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
    SessionService.updateEstado(telefono, BOT_STATES.MENU_PRINCIPAL);
    
    return {
      success: true,
      mensaje: MENSAJES_BOT.BIENVENIDA
    };
  }

  /**
   * Procesar menú principal
   */
  async procesarMenuPrincipal(telefono, mensaje, mensajeOriginal = '') {
    // Aceptar números 1-5 para opciones rápidas
    if (mensaje === '1' || this.esComandoMenu(mensaje)) {
      return await this.mostrarMenuCompleto(telefono);
    }

    if (mensaje === '2' || this.esComandoPedir(mensaje)) {
      return await this.solicitarTipoPedido(telefono);
    }

    if (mensaje === '3' || this.esComandoMisPedidos(mensaje)) {
      return await this.mostrarPedidosCliente(telefono);
    }

    if (mensaje === '4' || this.esComandoContacto(mensaje)) {
      return await this.mostrarContacto(telefono);
    }

    if (mensaje === '5' || this.esComandoAyuda(mensaje)) {
      return await this.mostrarAyuda(telefono);
    }

    // Mensaje más amigable para opciones inválidas
    const textoMostrar = (mensajeOriginal || mensaje).substring(0, 30);
    return {
      success: true,
      mensaje: `❌ No entendí "${textoMostrar}${textoMostrar.length >= 30 ? '...' : ''}"\n\nPor favor elige una opción:\n\n*1* 📋 Ver menú\n*2* 🛒 Hacer pedido\n*3* 📦 Mis pedidos\n*4* 📞 Contacto\n*5* ℹ️ Ayuda\n\nO escribe: *menu*, *pedir*, *contacto*, etc.`
    };
  }

  /**
   * Solicitar tipo de pedido
   */
  async solicitarTipoPedido(telefono) {
    SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_TIPO);
    
    return {
      success: true,
      mensaje: `¿Cómo deseas recibir tu pedido?\n\n*1.* ${EMOJIS.CARRITO} Para llevar\n*2.* ${EMOJIS.MOTO} A domicilio\n*3.* ${EMOJIS.RESTAURANTE} Comer aquí\n\nResponde con el número de tu opción.`
    };
  }

  /**
   * Procesar selección de tipo de pedido
   */
  async procesarSeleccionTipo(telefono, mensaje, mensajeOriginal = '') {
    let tipoPedido = null;

    // Aceptar número o texto
    if (mensaje === '1' || COMANDOS_BOT.PARA_LLEVAR.some(cmd => mensaje.includes(cmd))) {
      tipoPedido = TIPOS_PEDIDO.PARA_LLEVAR;
    } else if (mensaje === '2' || COMANDOS_BOT.DOMICILIO.some(cmd => mensaje.includes(cmd))) {
      tipoPedido = TIPOS_PEDIDO.DOMICILIO;
    } else if (mensaje === '3' || COMANDOS_BOT.RESTAURANTE.some(cmd => mensaje.includes(cmd))) {
      tipoPedido = TIPOS_PEDIDO.RESTAURANTE;
    }

    if (!tipoPedido) {
      const textoMostrar = (mensajeOriginal || mensaje).substring(0, 20);
      return {
        success: true,
        mensaje: `❌ Opción inválida "${textoMostrar}"\n\nPor favor elige:\n\n*1* ${EMOJIS.CARRITO} Para llevar\n*2* ${EMOJIS.MOTO} A domicilio\n*3* ${EMOJIS.RESTAURANTE} Comer aquí\n\nResponde con el número (1, 2 o 3)`
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
      mensaje = `Perfecto! ${EMOJIS.CARRITO} Haremos tu pedido *PARA LLEVAR*.\n\n`;
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

    // No validar stock

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
        mensaje: `Antes de continuar, necesito saber cómo recibirás tu pedido:\n\n*1.* ${EMOJIS.CARRITO} Para llevar\n*2.* ${EMOJIS.MOTO} A domicilio\n*3.* ${EMOJIS.RESTAURANTE} Comer aquí\n\nResponde con el número de tu opción.`
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
    return mensaje === '1' || 
           mensaje.includes('menu') || 
           mensaje.includes('carta') || 
           mensaje.includes('ver menu') ||
           mensaje.includes('productos');
  }

  esComandoPedir(mensaje) {
    return mensaje === '2' ||
           mensaje.includes('pedir') || 
           mensaje.includes('ordenar') ||
           mensaje.includes('pedido') ||
           mensaje.includes('orden') ||
           mensaje.includes('comprar');
  }

  esComandoContacto(mensaje) {
    return mensaje === '4' ||
           mensaje.includes('contacto') || 
           mensaje.includes('info') ||
           mensaje.includes('telefono') ||
           mensaje.includes('ubicacion') ||
           mensaje.includes('direccion');
  }

  esComandoEstado(mensaje) {
    return COMANDOS_BOT.ESTADO.includes(mensaje);
  }

  /**
   * Verificar si es comando para ver pedidos
   */
  esComandoMisPedidos(mensaje) {
    return mensaje === '3' ||
           mensaje.includes('mis pedidos') || 
           mensaje.includes('pedidos recientes') || 
           mensaje === 'pedidos' ||
           mensaje.includes('ver pedidos') ||
           mensaje.includes('historial');
  }

  /**
   * Verificar si es comando para cancelar pedido
   */
  esComandoCancelarPedido(mensaje) {
    return mensaje.includes('cancelar pedido');
  }

  /**
   * Mostrar pedidos recientes del cliente
   */
  async mostrarPedidosCliente(telefono) {
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('telefono', telefono)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !pedidos || pedidos.length === 0) {
        return {
          success: true,
          mensaje: '📦 No tienes pedidos registrados.\n\nEscribe *pedir* para hacer tu primer pedido.'
        };
      }

      let mensaje = `📋 *Tus Últimos Pedidos*\n\n`;

      for (const pedido of pedidos) {
        const fecha = new Date(pedido.created_at);
        const ahora = new Date();
        const minutosTranscurridos = Math.floor((ahora - fecha) / 60000);

        const estadoEmoji = {
          pendiente: '⏳',
          preparando: '👨‍🍳',
          en_camino: '🚚',
          entregado: '✅',
          cancelado: '❌'
        };

        mensaje += `${estadoEmoji[pedido.estado] || '📦'} *Pedido #${pedido.id}*\n`;
        mensaje += `   Estado: ${pedido.estado}\n`;
        mensaje += `   Total: $${pedido.total.toFixed(2)} MXN\n`;
        mensaje += `   Hace: ${minutosTranscurridos} minutos\n`;

        // Mostrar si puede cancelar (solo pendientes dentro de 20 min)
        if (pedido.estado === 'pendiente' && minutosTranscurridos <= 20) {
          mensaje += `   ⚠️ Puedes cancelar\n`;
        }

        mensaje += `\n`;
      }

      mensaje += `💡 Para cancelar un pedido pendiente:\n`;
      mensaje += `"cancelar pedido #X"\n\n`;
      mensaje += `⚠️ Solo puedes cancelar pedidos pendientes dentro de los primeros 20 minutos.`;

      return {
        success: true,
        mensaje
      };
    } catch (error) {
      logger.error('Error al mostrar pedidos del cliente:', error);
      return {
        success: true,
        mensaje: '❌ Error al cargar tus pedidos. Intenta nuevamente.'
      };
    }
  }

  /**
   * Mostrar información de contacto
   */
  async mostrarContacto(telefono) {
    const mensaje = `${EMOJIS.TELEFONO} *Información de Contacto*\n\n` +
      `📱 WhatsApp: Este número\n` +
      `${EMOJIS.RELOJ} Horario: Lunes a Domingo 10:00 - 22:00\n` +
      `${EMOJIS.UBICACION} Ubicación: Unidad Habitacional los Héroes Chalco\n` +
      `   Mz 17 Lt 17 planta baja el cupido C.P 56644\n` +
      `   (enfrente glorieta el oasis)\n\n` +
      `¿Necesitas algo más? Escribe *hola* para ver el menú.`;

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar cancelación de pedido
   */
  async procesarCancelacionPedido(telefono, mensaje) {
    try {
      // Extraer ID del pedido del mensaje
      const match = mensaje.match(/#(\d+)/);
      
      if (!match) {
        return {
          success: true,
          mensaje: '❌ Formato incorrecto.\n\nUsa: "cancelar pedido #123"'
        };
      }

      const pedidoId = parseInt(match[1]);

      // Buscar el pedido
      const {data: pedido, error: fetchError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', pedidoId)
        .eq('telefono', telefono)
        .single();

      if (fetchError || !pedido) {
        return {
          success: true,
          mensaje: `❌ No se encontró el pedido #${pedidoId} o no te pertenece.`
        };
      }

      // Verificar si ya está cancelado o completado
      if (pedido.estado === 'cancelado') {
        return {
          success: true,
          mensaje: `ℹ️ El pedido #${pedidoId} ya está cancelado.`
        };
      }

      if (pedido.estado === 'entregado') {
        return {
          success: true,
          mensaje: `❌ El pedido #${pedidoId} ya fue entregado y no puede ser cancelado.`
        };
      }

      // Verificar tiempo transcurrido (20 minutos)
      const fecha = new Date(pedido.created_at);
      const ahora = new Date();
      const minutosTranscurridos = Math.floor((ahora - fecha) / 60000);

      if (minutosTranscurridos > 20) {
        return {
          success: true,
          mensaje: `❌ El pedido #${pedidoId} ya no puede ser cancelado.\n\n` +
                  `Han pasado ${minutosTranscurridos} minutos desde que fue creado.\n` +
                  `Solo puedes cancelar dentro de los primeros 20 minutos.\n\n` +
                  `Para más información, contáctanos.`
        };
      }

      // Cancelar el pedido
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({ estado: 'cancelado' })
        .eq('id', pedidoId);

      if (updateError) {
        logger.error('Error al cancelar pedido del cliente:', updateError);
        return {
          success: true,
          mensaje: `❌ Error al cancelar el pedido #${pedidoId}. Intenta nuevamente.`
        };
      }

      logger.info(`✅ Pedido #${pedidoId} cancelado por el cliente ${telefono} (${minutosTranscurridos} min)`);

      return {
        success: true,
        mensaje: `✅ *Pedido #${pedidoId} cancelado exitosamente*\n\n` +
                `Total: $${pedido.total} MXN\n\n` +
                `Tu pedido ha sido cancelado. Esperamos verte pronto! 😊`
      };
    } catch (error) {
      logger.error('Error al procesar cancelación del cliente:', error);
      return {
        success: true,
        mensaje: `❌ Error al procesar la cancelación. Por favor intenta nuevamente.`
      };
    }
  }

  /**
   * Verificar si el número es admin
   */
  esAdmin(telefono) {
    const adminPhone = config.admin.phoneNumber.replace(/\D/g, '');
    const userPhone = telefono.replace(/\D/g, '');
    return userPhone === adminPhone;
  }

  /**
   * Mostrar pedidos pendientes (solo admin)
   */
  async mostrarPedidosPendientes() {
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          total,
          estado,
          tipo_pedido,
          created_at,
          clientes (
            nombre,
            telefono
          )
        `)
        .in('estado', ['pendiente', 'en_proceso'])
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error al obtener pedidos pendientes:', error);
        return {
          success: true,
          mensaje: '❌ Error al obtener los pedidos pendientes.'
        };
      }

      if (!pedidos || pedidos.length === 0) {
        return {
          success: true,
          mensaje: '✅ *No hay pedidos pendientes*\n\nTodos los pedidos están completados o cancelados.'
        };
      }

      let mensaje = `📋 *PEDIDOS PENDIENTES* (${pedidos.length})\n${'='.repeat(35)}\n\n`;

      pedidos.forEach(pedido => {
        const estado = pedido.estado === 'pendiente' ? '🔴 NUEVO' : '🟡 EN PROCESO';
        const tipo = pedido.tipo_pedido === 'domicilio' ? '🏠 Domicilio' : '🏪 Para llevar';
        const tiempo = new Date(pedido.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        
        mensaje += `*#${pedido.id}* - ${estado}\n`;
        mensaje += `👤 ${pedido.clientes?.nombre || 'Sin nombre'}\n`;
        mensaje += `${tipo} | ${formatearPrecio(pedido.total)}\n`;
        mensaje += `🕐 ${tiempo}\n\n`;
      });

      mensaje += `\n📝 Comandos:\n`;
      mensaje += `• *ver #${pedidos[0].id}* - Ver detalles\n`;
      mensaje += `• *estado #${pedidos[0].id} en_proceso* - Cambiar estado\n`;
      mensaje += `• *estado #${pedidos[0].id} completado* - Marcar completado\n`;
      mensaje += `• *estado #${pedidos[0].id} cancelado* - Cancelar pedido`;

      return {
        success: true,
        mensaje
      };
    } catch (error) {
      logger.error('Error al mostrar pedidos pendientes:', error);
      return {
        success: true,
        mensaje: '❌ Error al obtener los pedidos. Intenta nuevamente.'
      };
    }
  }

  /**
   * Ver detalle de un pedido (solo admin)
   */
  async verDetallePedido(mensaje) {
    try {
      const match = mensaje.match(/\d+/);
      if (!match) {
        return {
          success: true,
          mensaje: '⚠️ Usa el formato: *ver pedido #123* o *ver #123*'
        };
      }

      const pedidoId = parseInt(match[0]);

      const { data: pedido, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          total,
          estado,
          tipo_pedido,
          direccion_entrega,
          referencias,
          numero_personas,
          created_at,
          clientes (
            nombre,
            telefono
          ),
          pedido_productos (
            cantidad,
            precio_unitario,
            notas,
            productos (
              nombre,
              descripcion
            )
          )
        `)
        .eq('id', pedidoId)
        .single();

      if (error || !pedido) {
        return {
          success: true,
          mensaje: `❌ No se encontró el pedido #${pedidoId}`
        };
      }

      let respuesta = `📋 *PEDIDO #${pedido.id}*\n${'='.repeat(35)}\n\n`;
      
      // Estado y tipo
      const estadoEmoji = {
        'pendiente': '🔴',
        'en_proceso': '🟡',
        'completado': '✅',
        'cancelado': '❌'
      };
      respuesta += `${estadoEmoji[pedido.estado] || '⚪'} *Estado:* ${pedido.estado.toUpperCase()}\n`;
      respuesta += `${pedido.tipo_pedido === 'domicilio' ? '🏠' : '🏪'} *Tipo:* ${pedido.tipo_pedido}\n\n`;

      // Cliente
      respuesta += `👤 *CLIENTE*\n`;
      respuesta += `Nombre: ${pedido.clientes?.nombre || 'Sin nombre'}\n`;
      respuesta += `Teléfono: ${pedido.clientes?.telefono || 'Sin teléfono'}\n\n`;

      // Dirección (si es domicilio)
      if (pedido.tipo_pedido === 'domicilio' && pedido.direccion_entrega) {
        respuesta += `📍 *DIRECCIÓN*\n${pedido.direccion_entrega}\n`;
        if (pedido.referencias) {
          respuesta += `Referencias: ${pedido.referencias}\n`;
        }
        respuesta += `\n`;
      }

      // Número de personas (si es para llevar)
      if (pedido.tipo_pedido === 'llevar' && pedido.numero_personas) {
        respuesta += `👥 Para ${pedido.numero_personas} personas\n\n`;
      }

      // Productos
      respuesta += `🍽️ *PRODUCTOS*\n`;
      pedido.pedido_productos.forEach(item => {
        respuesta += `• ${item.productos?.nombre} x${item.cantidad}\n`;
        respuesta += `  ${formatearPrecio(item.precio_unitario)} c/u = ${formatearPrecio(item.cantidad * item.precio_unitario)}\n`;
        if (item.notas) {
          respuesta += `  📝 ${item.notas}\n`;
        }
      });

      respuesta += `\n💰 *TOTAL: ${formatearPrecio(pedido.total)}*\n\n`;
      respuesta += `🕐 ${new Date(pedido.created_at).toLocaleString('es-MX')}\n\n`;

      respuesta += `📝 Cambiar estado:\n`;
      respuesta += `• *estado #${pedido.id} en_proceso*\n`;
      respuesta += `• *estado #${pedido.id} completado*\n`;
      respuesta += `• *estado #${pedido.id} cancelado*`;

      return {
        success: true,
        mensaje: respuesta
      };
    } catch (error) {
      logger.error('Error al ver detalle de pedido:', error);
      return {
        success: true,
        mensaje: '❌ Error al obtener los detalles del pedido.'
      };
    }
  }

  /**
   * Cambiar estado de un pedido (solo admin)
   */
  async cambiarEstadoPedido(mensaje) {
    try {
      // Formato: "estado #123 completado" o "estado 123 en_proceso"
      const match = mensaje.match(/estado\s+#?(\d+)\s+(pendiente|en_proceso|completado|cancelado)/i);
      
      if (!match) {
        return {
          success: true,
          mensaje: '⚠️ Usa el formato: *estado #123 completado*\n\n' +
                  'Estados disponibles:\n' +
                  '• pendiente\n' +
                  '• en_proceso\n' +
                  '• completado\n' +
                  '• cancelado'
        };
      }

      const pedidoId = parseInt(match[1]);
      const nuevoEstado = match[2].toLowerCase();

      // Verificar que el pedido existe
      const { data: pedido, error: fetchError } = await supabase
        .from('pedidos')
        .select('id, estado, clientes(nombre, telefono)')
        .eq('id', pedidoId)
        .single();

      if (fetchError || !pedido) {
        return {
          success: true,
          mensaje: `❌ No se encontró el pedido #${pedidoId}`
        };
      }

      // Actualizar estado
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', pedidoId);

      if (updateError) {
        logger.error('Error al actualizar estado del pedido:', updateError);
        return {
          success: true,
          mensaje: `❌ Error al actualizar el pedido #${pedidoId}`
        };
      }

      logger.info(`✅ Pedido #${pedidoId} actualizado a estado: ${nuevoEstado}`);

      const estadoEmoji = {
        'pendiente': '🔴',
        'en_proceso': '🟡',
        'completado': '✅',
        'cancelado': '❌'
      };

      return {
        success: true,
        mensaje: `${estadoEmoji[nuevoEstado]} *Pedido #${pedidoId} actualizado*\n\n` +
                `Estado: *${nuevoEstado.toUpperCase()}*\n\n` +
                `Cliente: ${pedido.clientes?.nombre || 'Sin nombre'}`
      };
    } catch (error) {
      logger.error('Error al cambiar estado de pedido:', error);
      return {
        success: true,
        mensaje: '❌ Error al cambiar el estado. Intenta nuevamente.'
      };
    }
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
