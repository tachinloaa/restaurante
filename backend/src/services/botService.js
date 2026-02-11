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
  METODOS_PAGO,
  DATOS_BANCARIOS,
  ESTADOS_PEDIDO,
  TIEMPO_ENTREGA,
  MAX_CANTIDAD_POR_PRODUCTO,
  MAX_CAMBIO_REPARTIDOR
} from '../config/constants.js';
import { limpiarNumeroWhatsApp, formatearPrecio } from '../utils/formatters.js';
import { sanitizarInput, esValidoNombre, esValidaDireccion } from '../utils/validators.js';
import logger from '../utils/logger.js';

/**
 * Servicio del Bot conversacional de WhatsApp
 * Maneja toda la lógica de la conversación con los clientes
 */
class BotService {
  /**
   * Procesar mensaje entrante del cliente
   */
  async procesarMensaje(from, mensajeData) {
    try {
      const telefono = limpiarNumeroWhatsApp(from);

      // Extraer datos del mensaje
      const body = typeof mensajeData === 'string' ? mensajeData : mensajeData.body;
      const numMedia = mensajeData.numMedia || 0;
      const mediaUrl = mensajeData.mediaUrl || null;
      const mediaType = mensajeData.mediaType || null;

      // Sanitizar input del usuario
      const bodySanitizado = sanitizarInput(body);

      // Normalizar mensaje: minúsculas, sin espacios extras, sin acentos
      const mensajeLimpio = bodySanitizado
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/\s+/g, ' '); // Múltiples espacios a uno solo

      logger.info(`Mensaje recibido de ${telefono}: ${bodySanitizado}`);

      // Verificar si es admin
      const isAdmin = this.esAdmin(telefono);
      logger.info(`👤 Usuario: ${telefono} | Admin: ${isAdmin ? 'SÍ' : 'NO'}`);

      // Comandos especiales para admin
      if (isAdmin) {
        logger.info(`🔑 Comando de admin detectado: ${mensajeLimpio}`);

        if (mensajeLimpio === 'pedidos' || mensajeLimpio === 'pendientes') {
          return await this.mostrarPedidosPendientes();
        }
        if (mensajeLimpio.startsWith('ver pedido') || mensajeLimpio.startsWith('ver #')) {
          return await this.verDetallePedido(bodySanitizado);
        }
        if (mensajeLimpio.startsWith('estado')) {
          return await this.cambiarEstadoPedido(bodySanitizado);
        }
        if (mensajeLimpio.startsWith('aprobar')) {
          return await this.aprobarPedidoPendiente(bodySanitizado);
        }
        if (mensajeLimpio.startsWith('rechazar')) {
          return await this.rechazarPedidoPendiente(bodySanitizado);
        }

        // Comandos rápidos de cambio de estado
        if (mensajeLimpio.startsWith('preparando')) {
          return await this.cambiarEstadoRapido(bodySanitizado, ESTADOS_PEDIDO.PREPARANDO);
        }
        if (mensajeLimpio.startsWith('listo')) {
          return await this.cambiarEstadoRapido(bodySanitizado, ESTADOS_PEDIDO.LISTO);
        }
        if (mensajeLimpio.startsWith('enviado') || mensajeLimpio.startsWith('en camino')) {
          return await this.cambiarEstadoRapido(bodySanitizado, ESTADOS_PEDIDO.ENVIADO);
        }
        if (mensajeLimpio.startsWith('entregado')) {
          return await this.cambiarEstadoRapido(bodySanitizado, ESTADOS_PEDIDO.ENTREGADO);
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

      // Si escribe "menu" en cualquier momento, mostrar menú SOLO PARA VER
      if (this.esComandoMenu(mensajeLimpio)) {
        SessionService.updateEstado(telefono, BOT_STATES.MENU_PRINCIPAL);
        return await this.mostrarMenuSoloVer(telefono);
      }

      if (this.esComandoEstado(mensajeLimpio)) {
        return await this.mostrarEstadoPedido(telefono);
      }

      // Comandos de cliente
      if (this.esComandoMisPedidos(mensajeLimpio)) {
        return await this.mostrarPedidosCliente(telefono);
      }

      if (this.esComandoCancelarPedido(mensajeLimpio)) {
        return await this.procesarCancelacionPedido(telefono, bodySanitizado);
      }

      // Procesar según el estado actual del bot
      return await this.procesarSegunEstado(telefono, bodySanitizado, mensajeLimpio, { mediaUrl, numMedia });
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
  async procesarSegunEstado(telefono, body, mensajeLimpio, mediaData = {}) {
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

      case BOT_STATES.SELECCIONAR_CATEGORIA:
        return await this.procesarSeleccionCategoria(telefono, mensajeLimpio);

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

      case BOT_STATES.SELECCIONAR_METODO_PAGO:
        return await this.procesarMetodoPago(telefono, mensajeLimpio);

      case BOT_STATES.ESPERANDO_COMPROBANTE:
        return await this.procesarComprobante(telefono, body, mediaData);

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
    // Opción 1: Mostrar menú sin permitir ordenar (solo visual)
    if (mensaje === '1' || this.esComandoMenu(mensaje)) {
      return await this.mostrarMenuSoloVer(telefono);
    }

    // Opción 2: Iniciar proceso de pedido
    if (mensaje === '2' || this.esComandoPedir(mensaje)) {
      return await this.solicitarTipoPedido(telefono);
    }

    // Opción 3: Ver mis pedidos
    if (mensaje === '3' || this.esComandoMisPedidos(mensaje)) {
      return await this.mostrarPedidosCliente(telefono);
    }

    // Opción 4: Ver contacto
    if (mensaje === '4' || this.esComandoContacto(mensaje)) {
      return await this.mostrarContacto(telefono);
    }

    // Opción 5: Ver ayuda
    if (mensaje === '5' || this.esComandoAyuda(mensaje)) {
      return await this.mostrarAyuda(telefono);
    }

    // Si escribió un número de producto (6-99), recordarle que debe escribir "pedir" primero
    if (/^\d+$/.test(mensaje) && parseInt(mensaje) >= 6) {
      return {
        success: true,
        mensaje: `Para ordenar productos, primero escribe *pedir* (opción 2) 🛒\n\nLuego podrás seleccionar productos usando los números del menú.`
      };
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

    // Si hay un producto preseleccionado, moverlo a seleccionado
    const session = SessionService.getSession(telefono);
    if (session?.datos?.producto_preseleccionado) {
      SessionService.guardarDatos(telefono, {
        producto_seleccionado: session.datos.producto_preseleccionado,
        producto_preseleccionado: null
      });
    }

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

    // Mensaje especial para domicilio
    let mensajeTipo = '';
    if (tipoPedido === TIPOS_PEDIDO.DOMICILIO) {
      mensajeTipo = `✅ *Pedido a domicilio seleccionado*\n\n📍 *Entregas en zonas cercanas a Cupido*\n\n`;
    } else if (tipoPedido === TIPOS_PEDIDO.RESTAURANTE) {
      mensajeTipo = `Perfecto! ${EMOJIS.RESTAURANTE} Haremos tu pedido para *COMER AQUÍ*.\n\n`;
    } else if (tipoPedido === TIPOS_PEDIDO.PARA_LLEVAR) {
      mensajeTipo = `Perfecto! ${EMOJIS.CARRITO} Haremos tu pedido *PARA LLEVAR*.\n\n`;
    }

    // Verificar si ya hay un producto seleccionado previamente
    const session = SessionService.getSession(telefono);
    const productoSeleccionado = session?.datos?.producto_seleccionado;

    if (productoSeleccionado) {
      // Ya seleccionó producto antes, moverlo a producto_temporal y continuar con cantidad
      SessionService.guardarDatos(telefono, {
        producto_temporal: productoSeleccionado,
        producto_seleccionado: null
      });
      SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_CANTIDAD);
      return {
        success: true,
        mensaje: `${mensajeTipo}${EMOJIS.CHECK} *${productoSeleccionado.nombre}* agregado\n💰 Precio: ${formatearPrecio(productoSeleccionado.precio)}\n\n¿Cuántas ${productoSeleccionado.unidad || 'unidades'} deseas?\n\n${EMOJIS.FLECHA} Escribe un número (1-${MAX_CANTIDAD_POR_PRODUCTO})`
      };
    }

    // No hay producto seleccionado, mostrar categorías
    SessionService.updateEstado(telefono, BOT_STATES.VER_MENU);
    return await this.mostrarCategorias(telefono, mensajeTipo);
  }

  /**
   * Mostrar categorías disponibles
   */
  async mostrarCategorias(telefono, mensajeExtra = '') {
    const resultado = await MenuService.getCategorias();

    if (!resultado.success) {
      return {
        success: false,
        mensaje: 'Lo siento, no pudimos cargar las categorías. Intenta más tarde.'
      };
    }

    let mensaje = mensajeExtra;
    mensaje += `${EMOJIS.TICKET} *MENÚ DE EL RINCONCITO* ${EMOJIS.TACO}\n\n`;
    mensaje += `Selecciona una categoría:\n\n`;

    resultado.categorias.forEach((cat, index) => {
      mensaje += `*${index + 1}* ${cat.emoji} ${cat.nombre}\n`;
    });

    mensaje += `\n${EMOJIS.FLECHA} Escribe el *número* de la categoría\n`;
    mensaje += `O escribe *todo* para ver el menú completo`;

    SessionService.guardarDatos(telefono, { categorias: resultado.categorias });
    SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_CATEGORIA);

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar selección de categoría
   */
  async procesarSeleccionCategoria(telefono, mensaje) {
    const session = SessionService.getSession(telefono);
    const categorias = session?.datos?.categorias || [];

    // Si escribe "todo", mostrar menú completo
    if (mensaje === 'todo' || mensaje === 'completo' || mensaje === 'ver todo') {
      return await this.mostrarMenuCompletoDirecto(telefono);
    }

    // Validar que sea un número
    const numeroCategoria = parseInt(mensaje);
    if (isNaN(numeroCategoria) || numeroCategoria < 1 || numeroCategoria > categorias.length) {
      return {
        success: true,
        mensaje: `${EMOJIS.CRUZ} Opción inválida.\n\nEscribe un número del 1 al ${categorias.length}\nO escribe *todo* para ver el menú completo`
      };
    }

    // Obtener categoría seleccionada
    const categoriaSeleccionada = categorias[numeroCategoria - 1];
    const resultado = await MenuService.getMenuCategoria(categoriaSeleccionada.id);

    if (!resultado.success) {
      return {
        success: false,
        mensaje: resultado.mensaje || 'Error al cargar productos de esta categoría'
      };
    }

    // Preparar mensaje
    let mensajeFinal = resultado.mensaje;
    mensajeFinal += `\n${EMOJIS.FLECHA} Para ordenar, escribe el *número* del producto\n`;
    mensajeFinal += `\nO escribe:\n`;
    mensajeFinal += `• *menu* - Ver otras categorías\n`;
    mensajeFinal += `• *todo* - Ver menú completo`;

    // SIEMPRE cambiar a VER_MENU para que pueda seleccionar productos
    // El handler procesarSeleccionProducto manejará tanto ver como ordenar
    SessionService.updateEstado(telefono, BOT_STATES.VER_MENU);

    return {
      success: true,
      mensaje: mensajeFinal
    };
  }

  /**
   * Mostrar menú completo directamente (sin categorías)
   */
  async mostrarMenuCompletoDirecto(telefono) {
    const menu = await MenuService.getMenuCompleto();

    if (!menu) {
      return {
        success: false,
        mensaje: 'Lo siento, no pudimos cargar el menú. Intenta más tarde.'
      };
    }

    const session = SessionService.getSession(telefono);
    let mensaje = menu.mensaje;

    // Si ya inició pedido, permitir seleccionar
    if (session?.datos?.tipo_pedido) {
      mensaje += `\n\n${EMOJIS.FLECHA} Para ordenar, escribe el *número* del producto\n`;
      mensaje += `Ejemplo: "1" o "2, 5" (para varios productos)`;
      SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_PRODUCTO);
    } else {
      mensaje += `\n\n${EMOJIS.CARRITO} *¿Deseas hacer un pedido?*\nEscribe *pedir* para ordenar`;
    }

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Mostrar menú solo para ver (sin iniciar pedido) - Ahora muestra categorías
   */
  async mostrarMenuSoloVer(telefono) {
    return await this.mostrarCategorias(telefono);
  }

  /**
   * Procesar selección de producto
   */
  async procesarSeleccionProducto(telefono, body) {
    const mensajeLimpio = body.trim().toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Normalizar como en procesarMensaje

    // Verificar comandos especiales primero
    if (this.esComandoMenu(mensajeLimpio)) {
      return await this.mostrarMenuSoloVer(telefono);
    }

    if (mensajeLimpio === 'todo' || mensajeLimpio === 'completo' || mensajeLimpio === 'ver todo') {
      return await this.mostrarMenuCompletoDirecto(telefono);
    }

    if (this.esComandoPedir(mensajeLimpio)) {
      return await this.solicitarTipoPedido(telefono);
    }

    // Buscar por número o nombre
    let producto = null;

    if (/^\d+$/.test(body.trim())) {
      // Es un número
      producto = await MenuService.buscarPorNumero(parseInt(body.trim()));
    } else {
      // Es un nombre
      producto = await MenuService.buscarPorNombre(body.trim());
    }

    if (!producto) {
      return {
        success: true,
        mensaje: `No encontramos ese producto. ${EMOJIS.CRUZ}\n\nPor favor intenta de nuevo o escribe *menu* para ver todas las opciones.`
      };
    }

    // Verificar si ya inició pedido, si no, preguntar
    const session = SessionService.getSession(telefono);
    if (!session?.datos?.tipo_pedido) {
      // Guardar el producto seleccionado temporalmente
      SessionService.guardarDatos(telefono, { producto_preseleccionado: producto });

      return {
        success: true,
        mensaje: `${EMOJIS.CHECK} *${producto.nombre}* - ${formatearPrecio(producto.precio)}\n\n¿Deseas ordenar este producto?\n\nEscribe *pedir* para iniciar tu pedido o *menu* para seguir viendo.`
      };
    }

    // Si ya tiene tipo de pedido, continuar con la selección
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

    // Agregar al carrito con validación de límites
    const resultado = SessionService.agregarAlCarrito(telefono, {
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: cantidad
    });

    // Verificar si hubo error de límite
    if (resultado.error) {
      return {
        success: true,
        mensaje: `${EMOJIS.CRUZ} ${resultado.mensaje}\n\n¿Deseas finalizar tu pedido actual?\n\nResponde:\n• *SI* para continuar con tu pedido\n• *NO* para cancelar`
      };
    }

    // Limpiar producto temporal
    SessionService.guardarDatos(telefono, { producto_temporal: null });

    // Mostrar carrito y preguntar si quiere más
    const resumenCarrito = OrderService.generarResumenCarrito(resultado.session);

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
    const nombreLimpio = nombre.trim();

    if (!esValidoNombre(nombreLimpio)) {
      return {
        success: true,
        mensaje: 'Por favor escribe un nombre válido (solo letras, mínimo 3 caracteres)'
      };
    }

    SessionService.guardarDatos(telefono, {
      nombre: nombreLimpio,
      telefono: telefono
    });

    const session = SessionService.getSession(telefono);
    const tipoPedido = session.datos.tipo_pedido;

    if (tipoPedido === TIPOS_PEDIDO.DOMICILIO) {
      SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_DIRECCION);

      return {
        success: true,
        mensaje: `Gracias ${nombreLimpio} ${EMOJIS.PERSONA}\n\nAhora necesito tu *DIRECCIÓN COMPLETA* para la entrega.\n\nEjemplo: Calle 5 de Mayo #123, Col. Centro\nO si es sin número: Calle Morelos S/N, Col. Centro`
      };
    } else if (tipoPedido === TIPOS_PEDIDO.RESTAURANTE) {
      SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_NUM_PERSONAS);

      return {
        success: true,
        mensaje: `Gracias ${nombreLimpio} ${EMOJIS.PERSONA}\n\n¿Para cuántas personas es el pedido? ${EMOJIS.GRUPO}`
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
    const direccionLimpia = direccion.trim();

    if (!esValidaDireccion(direccionLimpia)) {
      return {
        success: true,
        mensaje: 'Por favor proporciona una dirección completa con calle y número (o S/N si es sin número).\n\nEjemplo: Calle 5 de Mayo #123, Col. Centro\nO: Av. Juárez S/N, Col. Centro'
      };
    }

    SessionService.guardarDatos(telefono, { direccion: direccionLimpia });
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

    // Si es domicilio, preguntar método de pago
    const session = SessionService.getSession(telefono);
    if (session.datos.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
      return await this.solicitarMetodoPago(telefono);
    }

    // Si no es domicilio, ir a confirmación
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
   * Solicitar método de pago (solo para domicilio)
   */
  async solicitarMetodoPago(telefono) {
    SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_METODO_PAGO);

    const total = SessionService.calcularTotalCarrito(telefono);

    let mensaje = `${EMOJIS.DINERO} *MÉTODO DE PAGO*\n\n`;
    mensaje += `Total a pagar: *${formatearPrecio(total)}*\n\n`;
    mensaje += `¿Cómo deseas pagar?\n\n`;
    mensaje += `*1* 💵 Efectivo (el repartidor lleva cambio)\n`;
    mensaje += `*2* 🏦 Transferencia bancaria\n\n`;
    mensaje += `Responde con el número de tu opción`;

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar método de pago seleccionado
   */
  async procesarMetodoPago(telefono, mensaje) {
    let metodoPago = null;

    if (mensaje === '1' || mensaje.includes('efectivo')) {
      metodoPago = METODOS_PAGO.EFECTIVO;
    } else if (mensaje === '2' || mensaje.includes('transferencia')) {
      metodoPago = METODOS_PAGO.TRANSFERENCIA;
    } else {
      return {
        success: true,
        mensaje: `Por favor elige una opción válida:\n\n*1* 💵 Efectivo\n*2* 🏦 Transferencia`
      };
    }

    SessionService.guardarDatos(telefono, { metodo_pago: metodoPago });

    // Si es efectivo, ir a confirmación
    if (metodoPago === METODOS_PAGO.EFECTIVO) {
      return await this.mostrarConfirmacion(telefono);
    }

    // Si es transferencia, mostrar datos bancarios
    return await this.solicitarComprobante(telefono);
  }

  /**
   * Solicitar comprobante de pago
   */
  async solicitarComprobante(telefono) {
    SessionService.updateEstado(telefono, BOT_STATES.ESPERANDO_COMPROBANTE);

    const total = SessionService.calcularTotalCarrito(telefono);

    let mensaje = `${EMOJIS.DINERO} *PAGO POR TRANSFERENCIA*\n\n`;
    mensaje += `Total a pagar: *${formatearPrecio(total)}*\n\n`;
    mensaje += `🏦 *DATOS BANCARIOS:*\n`;
    mensaje += `• Banco: *${DATOS_BANCARIOS.BANCO}*\n`;
    mensaje += `• Titular: *${DATOS_BANCARIOS.TITULAR}*\n`;
    mensaje += `• Cuenta: *${DATOS_BANCARIOS.CUENTA}*\n`;
    mensaje += `• CLABE: *${DATOS_BANCARIOS.CLABE}*\n`;
    mensaje += `• Referencia: *${DATOS_BANCARIOS.REFERENCIA}*\n\n`;
    mensaje += `⚠️ *IMPORTANTE:*\n`;
    mensaje += `• Realiza la transferencia bancaria por el monto exacto\n`;
    mensaje += `• Una vez realizada, *envía tu comprobante de pago* (foto o captura de pantalla)\n`;
    mensaje += `• Tu pedido será confirmado cuando verifiquemos el pago\n\n`;
    mensaje += `📸 *Envía tu comprobante ahora*`;

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar comprobante de pago recibido
   */
  async procesarComprobante(telefono, mensaje, mediaData = {}) {
    const { mediaUrl, numMedia } = mediaData;

    logger.info(`📥 Procesando comprobante de ${telefono}. NumMedia: ${numMedia}, MediaUrl: ${mediaUrl}`);

    // Verificar si recibió una imagen
    if (numMedia > 0 && mediaUrl) {
      // Guardar URL del comprobante
      SessionService.guardarDatos(telefono, {
        comprobante_recibido: true,
        comprobante_url: mediaUrl,
        comprobante_info: 'Imagen recibida'
      });

      logger.info(`✅ Comprobante guardado en sesión con URL: ${mediaUrl}`);

      // GENERAR RESUMEN ANTES DE QUE SE BORRE EL CARRITO
      const session = SessionService.getSession(telefono);

      // Verificar que la sesión tenga el comprobante guardado
      if (session && session.datos && session.datos.comprobante_url) {
        logger.info(`✅ Verificado: comprobante_url está en la sesión`);
      } else {
        logger.error(`❌ WARNING: comprobante_url NO está en la sesión después de guardar!`);
      }

      const resumenCarrito = OrderService.generarResumenCarrito(session);
      const resumenTexto = resumenCarrito ? resumenCarrito.resumen : null;

      // CREAR EL PEDIDO INMEDIATAMENTE con estado PENDIENTE_PAGO
      const resultado = await OrderService.crearPedidoDesdeBot(telefono);

      if (!resultado.success) {
        logger.error('Error al crear pedido con comprobante:', resultado.error);
        return {
          success: false,
          mensaje: `Lo sentimos, ocurrió un error al procesar tu pedido: ${resultado.error}\n\nPor favor intenta de nuevo.`
        };
      }

      const { pedido } = resultado;

      // Cambiar estado a PENDIENTE_PAGO
      await OrderService.cambiarEstado(pedido.id, ESTADOS_PEDIDO.PENDIENTE_PAGO);

      // Enviar notificación al admin con el comprobante y resumen
      logger.info(`📨 Enviando notificación al admin para pedido #${pedido.numero_pedido}`);
      await this.notificarAdminPedidoPendiente(telefono, pedido.numero_pedido, resumenTexto);

      // Mensaje al cliente
      let mensajeCliente = `✅ *COMPROBANTE RECIBIDO*\n\n`;
      mensajeCliente += `📝 Tu número de pedido es: *#${pedido.numero_pedido}*\n\n`;
      mensajeCliente += `⏳ *Estamos verificando tu pago*\n`;
      mensajeCliente += `Tu pedido será confirmado una vez que verifiquemos la transferencia.\n\n`;
      mensajeCliente += `📱 Te notificaremos cuando tu pago sea verificado y tu pedido esté en preparación.\n\n`;
      mensajeCliente += `¡Gracias por tu preferencia! ${EMOJIS.SALUDO}\n*El Rinconcito* ${EMOJIS.TACO}`;

      // Limpiar sesión DESPUÉS de enviar notificación
      SessionService.deleteSession(telefono);

      logger.info(`✅ Pedido #${pedido.numero_pedido} creado con comprobante, esperando aprobación`);

      return {
        success: true,
        mensaje: mensajeCliente
      };
    }

    // Si no recibió imagen pero envió texto (número de referencia)
    if (mensaje && mensaje.trim().length >= 5) {
      // Guardar que se recibió comprobante como texto
      SessionService.guardarDatos(telefono, {
        comprobante_recibido: true,
        comprobante_info: mensaje.substring(0, 100)
      });

      // GENERAR RESUMEN ANTES DE QUE SE BORRE EL CARRITO
      const session = SessionService.getSession(telefono);
      const resumenCarrito = OrderService.generarResumenCarrito(session);
      const resumenTexto = resumenCarrito ? resumenCarrito.resumen : null;

      // CREAR EL PEDIDO INMEDIATAMENTE con estado PENDIENTE_PAGO
      const resultado = await OrderService.crearPedidoDesdeBot(telefono);

      if (!resultado.success) {
        logger.error('Error al crear pedido con referencia:', resultado.error);
        return {
          success: false,
          mensaje: `Lo sentimos, ocurrió un error al procesar tu pedido: ${resultado.error}\n\nPor favor intenta de nuevo.`
        };
      }

      const { pedido } = resultado;

      // Cambiar estado a PENDIENTE_PAGO
      await OrderService.cambiarEstado(pedido.id, ESTADOS_PEDIDO.PENDIENTE_PAGO);

      // Enviar notificación al admin
      await this.notificarAdminPedidoPendiente(telefono, pedido.numero_pedido, resumenTexto);

      // Mensaje al cliente
      let mensajeCliente = `✅ *REFERENCIA RECIBIDA*\n\n`;
      mensajeCliente += `📝 Tu número de pedido es: *#${pedido.numero_pedido}*\n\n`;
      mensajeCliente += `⏳ *Estamos verificando tu pago*\n`;
      mensajeCliente += `Tu pedido será confirmado una vez que verifiquemos la transferencia.\n\n`;
      mensajeCliente += `📱 Te notificaremos cuando tu pago sea verificado y tu pedido esté en preparación.\n\n`;
      mensajeCliente += `¡Gracias por tu preferencia! ${EMOJIS.SALUDO}\n*El Rinconcito* ${EMOJIS.TACO}`;

      // Limpiar sesión
      SessionService.deleteSession(telefono);

      logger.info(`Pedido #${pedido.numero_pedido} creado con referencia, esperando aprobación`);

      return {
        success: true,
        mensaje: mensajeCliente
      };
    }

    // Si no envió nada válido
    return {
      success: true,
      mensaje: `Por favor envía tu comprobante de pago.\n\nPuede ser:\n• Foto del comprobante\n• Captura de pantalla\n• Número de referencia\n\n📸 Envía tu comprobante ahora`
    };
  }

  /**
   * Mostrar confirmación con pago pendiente de verificación
   */
  async mostrarConfirmacionConPagoPendiente(telefono) {
    const session = SessionService.getSession(telefono);
    const resumen = OrderService.generarResumenCompleto(session);

    if (!resumen) {
      return {
        success: false,
        mensaje: MENSAJES_BOT.ERROR_GENERAL
      };
    }

    const tiempoEstimado = TIEMPO_ENTREGA.DOMICILIO;

    let mensaje = `✅ *COMPROBANTE RECIBIDO*\n\n`;
    mensaje += resumen.resumen;
    mensaje += `\n\n💳 *Método de pago:* Transferencia bancaria`;
    mensaje += `\n\n⚠️ *Tu pedido será confirmado una vez que verifiquemos el pago*\n`;
    mensaje += `Esto puede tomar unos minutos.\n\n`;
    mensaje += `${EMOJIS.RELOJ} Tiempo estimado de preparación: ${tiempoEstimado.min}-${tiempoEstimado.max} minutos (después de confirmar el pago)\n\n`;
    mensaje += `¿Confirmas tu pedido?\n\nResponde:\n• *SI* para confirmar\n• *NO* para cancelar`;

    SessionService.updateEstado(telefono, BOT_STATES.CONFIRMAR_PEDIDO);

    return {
      success: true,
      mensaje
    };
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

    // Mostrar método de pago si es domicilio
    if (tipoPedido === TIPOS_PEDIDO.DOMICILIO) {
      const metodoPago = session.datos.metodo_pago;
      if (metodoPago === METODOS_PAGO.EFECTIVO) {
        mensaje += `\n\n${EMOJIS.DINERO} *Método de pago:* Efectivo`;
        mensaje += `\n💵 El repartidor lleva cambio máximo de $${MAX_CAMBIO_REPARTIDOR} pesos`;
      }
    }

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

    // GENERAR RESUMEN ANTES DE QUE SE BORRE EL CARRITO
    const resumenCarrito = OrderService.generarResumenCarrito(session);
    const resumenTexto = resumenCarrito ? resumenCarrito.resumen : null;

    // SIEMPRE crear el pedido en la base de datos
    const resultado = await OrderService.crearPedidoDesdeBot(telefono);

    if (!resultado.success) {
      logger.error('Error al crear pedido:', resultado.error);
      return {
        success: false,
        mensaje: `Lo sentimos, ocurrió un error al procesar tu pedido: ${resultado.error}\n\nPor favor intenta de nuevo o contacta a un asesor.`
      };
    }

    const { pedido, cliente } = resultado;

    // Obtener tiempo estimado
    const tipoPedido = session.datos.tipo_pedido;
    const tiempoEstimado = tipoPedido ? TIEMPO_ENTREGA[tipoPedido.toUpperCase()] : TIEMPO_ENTREGA.DOMICILIO;

    // Si es pago por transferencia, cambiar estado a PENDIENTE_PAGO
    if (session.datos.metodo_pago === METODOS_PAGO.TRANSFERENCIA && !session.datos.pago_verificado) {
      // Cambiar estado del pedido a PENDIENTE_PAGO
      await OrderService.cambiarEstado(pedido.id, ESTADOS_PEDIDO.PENDIENTE_PAGO);

      let mensaje = `✅ *PEDIDO REGISTRADO*\n\n`;
      mensaje += `${EMOJIS.TICKET} Tu número de pedido es: *#${pedido.numero_pedido}*\n\n`;
      mensaje += `⏳ *Estamos verificando tu pago*\n`;
      mensaje += `Tu pedido será confirmado una vez que verifiquemos la transferencia.\n\n`;
      mensaje += `📱 Te notificaremos cuando tu pedido esté confirmado y en preparación.\n\n`;
      mensaje += `${EMOJIS.RELOJ} Tiempo estimado después de confirmar: ${tiempoEstimado.min}-${tiempoEstimado.max} minutos\n\n`;
      mensaje += `¡Gracias por tu preferencia! ${EMOJIS.SALUDO}\n*El Rinconcito* ${EMOJIS.TACO}`;

      // Enviar notificación al admin con el comprobante y resumen
      await this.notificarAdminPedidoPendiente(telefono, pedido.numero_pedido, resumenTexto);

      // Limpiar sesión DESPUÉS de enviar notificación
      SessionService.deleteSession(telefono);

      return {
        success: true,
        mensaje,
        pedido
      };
    }

    // Si es efectivo o pago ya verificado, notificar normalmente
    await NotificationService.notificarNuevoPedido(pedido, cliente);

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
   * Notificar al admin sobre pedido pendiente de aprobación
   */
  async notificarAdminPedidoPendiente(telefono, numeroPedido, resumenTexto = null) {
    const session = SessionService.getSession(telefono);

    if (!session) {
      logger.error(`❌ No se encontró sesión para ${telefono} al notificar admin`);
      return;
    }

    const cliente = session.datos.nombre || 'Cliente';

    // Si no se proporcionó resumen, intentar generarlo
    if (!resumenTexto) {
      const resumenCarrito = OrderService.generarResumenCarrito(session);
      resumenTexto = resumenCarrito ? resumenCarrito.resumen : '⚠️ Detalles del pedido no disponibles';
    }

    let mensajeAdmin = `🔔 *NUEVO PEDIDO PENDIENTE DE APROBACIÓN*\n\n`;
    mensajeAdmin += `📝 Pedido: *#${numeroPedido}*\n`;
    mensajeAdmin += `👤 Cliente: *${cliente}*\n`;
    mensajeAdmin += `📞 Teléfono: ${telefono}\n`;
    mensajeAdmin += `📍 Dirección: ${session.datos.direccion || 'N/A'}\n`;

    if (session.datos.referencias) {
      mensajeAdmin += `🏠 Referencias: ${session.datos.referencias}\n`;
    }

    mensajeAdmin += `\n${resumenTexto}\n\n`;
    mensajeAdmin += `💳 *Método de pago:* Transferencia bancaria\n`;

    if (session.datos.comprobante_info) {
      mensajeAdmin += `📝 Info: ${session.datos.comprobante_info}\n`;
    }

    mensajeAdmin += `\n⏳ *ACCIÓN REQUERIDA:*\n`;
    mensajeAdmin += `Para aprobar este pedido, responde:\n`;
    mensajeAdmin += `*aprobar #${numeroPedido}*\n\n`;
    mensajeAdmin += `Para rechazar:\n`;
    mensajeAdmin += `*rechazar #${numeroPedido}*\n\n`;
    mensajeAdmin += `👉 También puedes gestionarlo desde el dashboard:\n`;
    mensajeAdmin += `${config.frontend?.url || 'https://el-rinconcito.pages.dev'}/pedidos`;

    try {
      // Si hay imagen del comprobante, enviarla
      if (session.datos.comprobante_url) {
        logger.info(`📸 Enviando comprobante al admin con URL: ${session.datos.comprobante_url}`);

        const resultado = await TwilioService.enviarMensajeConImagen(
          config.admin.phoneNumber,
          mensajeAdmin,
          session.datos.comprobante_url
        );

        if (resultado.success) {
          logger.info(`✅ Notificación de pedido #${numeroPedido} enviada al admin CON IMAGEN`);
        } else {
          logger.error(`❌ Error al enviar imagen del comprobante: ${resultado.error}`);
          // Enviar mensaje sin imagen como respaldo
          mensajeAdmin += `\n\n⚠️ El comprobante no pudo enviarse automáticamente`;
          await TwilioService.enviarMensajeAdmin(mensajeAdmin);
        }
      } else {
        logger.warn(`⚠️ No hay comprobante_url en la sesión de ${telefono}`);
        await TwilioService.enviarMensajeAdmin(mensajeAdmin);
        logger.info(`📨 Notificación de pedido #${numeroPedido} enviada al admin SIN IMAGEN`);
      }
    } catch (error) {
      logger.error(`❌ Error al notificar admin sobre pedido #${numeroPedido}:`, error);
      // Intentar enviar al menos el mensaje sin imagen
      try {
        await TwilioService.enviarMensajeAdmin(mensajeAdmin);
      } catch (e) {
        logger.error('💥 Error crítico al enviar notificación al admin:', e);
      }
    }
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
    // Solo "hola" reinicia la conversación, "pedir" NO debe reiniciar
    return COMANDOS_BOT.HOLA.includes(mensaje);
  }

  esComandoCancelar(mensaje) {
    return COMANDOS_BOT.CANCELAR.includes(mensaje);
  }

  esComandoAyuda(mensaje) {
    return COMANDOS_BOT.AYUDA.includes(mensaje);
  }

  esComandoMenu(mensaje) {
    return mensaje.includes('menu') ||
      mensaje.includes('carta') ||
      mensaje.includes('ver menu') ||
      mensaje.includes('productos') ||
      mensaje.includes('comida');
  }

  esComandoPedir(mensaje) {
    return mensaje.includes('pedir') ||
      mensaje.includes('ordenar') ||
      mensaje.includes('pedido') ||
      mensaje.includes('orden') ||
      mensaje.includes('comprar');
  }

  esComandoContacto(mensaje) {
    return mensaje.includes('contacto') ||
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
    return mensaje.includes('mis pedidos') ||
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
      const { data: pedido, error: fetchError } = await supabase
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
    if (!config.admin.phoneNumber) {
      logger.warn('⚠️ ADMIN_PHONE_NUMBER no está configurado en las variables de entorno');
      return false;
    }

    const adminPhone = config.admin.phoneNumber.replace(/\D/g, '');
    const userPhone = telefono.replace(/\D/g, '');

    logger.debug(`🔍 Verificación admin: User=${userPhone} | Admin=${adminPhone} | Match=${userPhone === adminPhone}`);

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
          numero_pedido,
          total,
          estado,
          tipo_pedido,
          created_at,
          clientes (
            nombre,
            telefono
          )
        `)
        .in('estado', ['pendiente', 'preparando', 'listo', 'enviado'])
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
          mensaje: '✅ *No hay pedidos activos*\n\nTodos los pedidos están completados o cancelados.'
        };
      }

      let mensaje = `📋 *PEDIDOS ACTIVOS* (${pedidos.length})\n${'='.repeat(35)}\n\n`;

      pedidos.forEach(pedido => {
        const estadoEmojis = {
          'pendiente': '🔴',
          'preparando': '👨‍🍳',
          'listo': '✅',
          'enviado': '🏍️'
        };

        const estadoTextos = {
          'pendiente': 'NUEVO',
          'preparando': 'PREPARANDO',
          'listo': 'LISTO',
          'enviado': 'EN CAMINO'
        };

        const estado = `${estadoEmojis[pedido.estado] || '⚪'} ${estadoTextos[pedido.estado] || pedido.estado.toUpperCase()}`;
        const tipo = pedido.tipo_pedido === 'domicilio' ? '🏠 Domicilio' : '🏪 Para llevar';
        const tiempo = new Date(pedido.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        mensaje += `*#${pedido.numero_pedido}* - ${estado}\n`;
        mensaje += `👤 ${pedido.clientes?.nombre || 'Sin nombre'}\n`;
        mensaje += `${tipo} | ${formatearPrecio(pedido.total)}\n`;
        mensaje += `🕐 ${tiempo}\n\n`;
      });

      if (pedidos.length > 0) {
        mensaje += `\n⚡ *COMANDOS RÁPIDOS:*\n`;
        mensaje += `• *preparando #${pedidos[0].numero_pedido}*\n`;
        mensaje += `• *listo #${pedidos[0].numero_pedido}*\n`;
        mensaje += `• *enviado #${pedidos[0].numero_pedido}*\n`;
        mensaje += `• *entregado #${pedidos[0].numero_pedido}*\n\n`;
        mensaje += `📝 Otros comandos:\n`;
        mensaje += `• *ver #${pedidos[0].numero_pedido}* - Ver detalles`;
      }

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

  /**
   * Aprobar pedido pendiente (solo admin)
   */
  async aprobarPedidoPendiente(mensaje) {
    // Extraer número de pedido del mensaje: "aprobar #2602106719" o "aprobar 2602106719"
    const partes = mensaje.trim().split(/\s+/);

    if (partes.length < 2) {
      return {
        success: false,
        mensaje: '❌ Formato incorrecto.\n\nUsa: *aprobar #2602106719*'
      };
    }

    let numeroPedido = partes[1].replace('#', '');

    // Buscar el pedido en la base de datos
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .select('*, clientes(*)')
      .eq('numero_pedido', numeroPedido)
      .eq('estado', ESTADOS_PEDIDO.PENDIENTE_PAGO)
      .single();

    if (error || !pedido) {
      return {
        success: false,
        mensaje: `❌ No se encontró pedido pendiente #${numeroPedido}\n\nVerifica que el número sea correcto y que el pedido esté pendiente de pago.`
      };
    }

    // Cambiar estado a PREPARANDO (más lógico que pendiente)
    const { error: errorUpdate } = await supabase
      .from('pedidos')
      .update({
        estado: ESTADOS_PEDIDO.PREPARANDO,
        pago_verificado: true,
        fecha_verificacion_pago: new Date().toISOString()
      })
      .eq('id', pedido.id);

    if (errorUpdate) {
      logger.error('Error al aprobar pedido:', errorUpdate);
      return {
        success: false,
        mensaje: `❌ Error al aprobar el pedido: ${errorUpdate.message}`
      };
    }

    // Notificar al administrador
    await NotificationService.notificarNuevoPedido(pedido, pedido.clientes);

    // Notificar al cliente con mensaje personalizado de aprobación
    const tiempoEstimado = TIEMPO_ENTREGA.DOMICILIO;

    // Usar variable explícita para evitar problemas de escape
    const NL = '\n';

    let mensajeCliente = `✅ *¡TU PAGO HA SIDO VERIFICADO!*${NL}${NL}`;
    mensajeCliente += `${EMOJIS.TICKET} Pedido: *#${pedido.numero_pedido}*${NL}${NL}`;
    mensajeCliente += `${EMOJIS.CHECK} Tu pedido ha sido *APROBADO* y ya está en preparación ${EMOJIS.COCINERO}${NL}${NL}`;
    mensajeCliente += `${EMOJIS.RELOJ} Tiempo estimado de entrega: ${tiempoEstimado.min}-${tiempoEstimado.max} minutos${NL}${NL}`;
    mensajeCliente += `${EMOJIS.MOTO} Tu pedido saldrá pronto a tu domicilio${NL}${NL}`;
    mensajeCliente += `¡Gracias por tu preferencia! ${EMOJIS.SALUDO}${NL}`;
    mensajeCliente += `*El Rinconcito* ${EMOJIS.TACO}`;

    await TwilioService.enviarMensajeCliente(pedido.clientes.telefono, mensajeCliente);

    logger.info(`Pedido #${numeroPedido} aprobado por admin`);

    return {
      success: true,
      mensaje: `✅ *PEDIDO APROBADO Y EN PREPARACIÓN*\n\n` +
        `📝 Pedido: #${pedido.numero_pedido}\n` +
        `👤 Cliente: ${pedido.clientes.nombre}\n` +
        `📞 Teléfono: ${pedido.clientes.telefono}\n` +
        `💰 Total: ${formatearPrecio(pedido.total)}\n\n` +
        `👨‍🍳 Estado actual: *PREPARANDO*\n\n` +
        `⚡ *COMANDOS RÁPIDOS:*\n` +
        `• *listo #${pedido.numero_pedido}* - Marcar como listo\n` +
        `• *enviado #${pedido.numero_pedido}* - Pedido en camino\n` +
        `• *entregado #${pedido.numero_pedido}* - Pedido entregado\n\n` +
        `✅ El cliente ha sido notificado automáticamente.`
    };
  }

  /**
   * Cambiar estado de pedido de forma rápida (solo admin)
   */
  async cambiarEstadoRapido(mensaje, nuevoEstado) {
    try {
      // Extraer número de pedido: "preparando #2602106719" o "listo 2602106719"
      const partes = mensaje.trim().split(/\s+/);

      if (partes.length < 2) {
        return {
          success: false,
          mensaje: '❌ Formato incorrecto.\n\nUsa: *preparando #2602106719*\nO: *listo #2602106719*\nO: *enviado #2602106719*\nO: *entregado #2602106719*'
        };
      }

      let numeroPedido = partes[1].replace('#', '');

      // Buscar el pedido en la base de datos por numero_pedido
      const { data: pedido, error } = await supabase
        .from('pedidos')
        .select('*, clientes(*)')
        .eq('numero_pedido', numeroPedido)
        .single();

      if (error || !pedido) {
        return {
          success: false,
          mensaje: `❌ No se encontró el pedido #${numeroPedido}\n\nVerifica que el número sea correcto.`
        };
      }

      // Actualizar estado
      const { error: errorUpdate } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', pedido.id);

      if (errorUpdate) {
        logger.error('Error al actualizar estado del pedido:', errorUpdate);
        return {
          success: false,
          mensaje: `❌ Error al actualizar el pedido #${numeroPedido}`
        };
      }

      // Notificar al cliente sobre el cambio de estado
      await NotificationService.notificarEstadoPedido(pedido, pedido.clientes);

      // Mensajes según el estado
      const estadoEmojis = {
        'preparando': '👨‍🍳',
        'listo': '✅',
        'enviado': '🏍️',
        'entregado': '🎉'
      };

      const estadoTextos = {
        'preparando': 'PREPARANDO',
        'listo': 'LISTO',
        'enviado': 'EN CAMINO',
        'entregado': 'ENTREGADO'
      };

      logger.info(`✅ Pedido #${numeroPedido} actualizado a estado: ${nuevoEstado} por admin`);

      return {
        success: true,
        mensaje: `${estadoEmojis[nuevoEstado] || '✅'} *PEDIDO ACTUALIZADO*\n\n` +
          `📝 Pedido: #${pedido.numero_pedido}\n` +
          `Estado: *${estadoTextos[nuevoEstado] || nuevoEstado.toUpperCase()}*\n\n` +
          `👤 Cliente: ${pedido.clientes?.nombre || 'Sin nombre'}\n` +
          `📞 Teléfono: ${pedido.clientes?.telefono}\n\n` +
          `✅ El cliente ha sido notificado automáticamente.`
      };
    } catch (error) {
      logger.error('Error al cambiar estado rápido:', error);
      return {
        success: false,
        mensaje: '❌ Error al cambiar el estado. Intenta nuevamente.'
      };
    }
  }

  /**
   * Rechazar pedido pendiente (solo admin)
   */
  async rechazarPedidoPendiente(mensaje) {
    // Extraer número de pedido del mensaje: "rechazar #2602106719" o "rechazar 2602106719"
    const partes = mensaje.trim().split(/\s+/);

    if (partes.length < 2) {
      return {
        success: false,
        mensaje: '❌ Formato incorrecto.\n\nUsa: *rechazar #2602106719*'
      };
    }

    let numeroPedido = partes[1].replace('#', '');

    // Buscar el pedido en la base de datos
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .select('*, clientes(*)')
      .eq('numero_pedido', numeroPedido)
      .eq('estado', ESTADOS_PEDIDO.PENDIENTE_PAGO)
      .single();

    if (error || !pedido) {
      return {
        success: false,
        mensaje: `❌ No se encontró pedido pendiente #${numeroPedido}\n\nVerifica que el número sea correcto y que el pedido esté pendiente de pago.`
      };
    }

    // Cambiar estado a CANCELADO
    const { error: errorUpdate } = await supabase
      .from('pedidos')
      .update({
        estado: ESTADOS_PEDIDO.CANCELADO,
        motivo_cancelacion: 'Pago no verificado por administrador',
        fecha_cancelacion: new Date().toISOString()
      })
      .eq('id', pedido.id);

    if (errorUpdate) {
      logger.error('Error al rechazar pedido:', errorUpdate);
      return {
        success: false,
        mensaje: `❌ Error al rechazar el pedido: ${errorUpdate.message}`
      };
    }

    // Notificar al cliente
    let mensajeCliente = `❌ *PEDIDO RECHAZADO*\n\n`;
    mensajeCliente += `Pedido #${pedido.numero_pedido}\n\n`;
    mensajeCliente += `Lo sentimos, no pudimos verificar tu pago.\n\n`;
    mensajeCliente += `Por favor contacta con nosotros para más información:\n`;
    mensajeCliente += `📞 ${config.admin.phoneNumber}\n\n`;
    mensajeCliente += `Si deseas hacer un nuevo pedido, escribe *hola*`;

    await TwilioService.enviarMensajeCliente(pedido.clientes.telefono, mensajeCliente);

    logger.info(`Pedido #${numeroPedido} rechazado por admin`);

    return {
      success: true,
      mensaje: `❌ *PEDIDO RECHAZADO*\n\n📝 Pedido #${pedido.numero_pedido}\n👤 Cliente: ${pedido.clientes.nombre}\n📞 Teléfono: ${pedido.clientes.telefono}\n\nEl cliente ha sido notificado.`
    };
  }
}

// Exportar instancia única (Singleton)
export default new BotService();
