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
  DIRECCION_RESTAURANTE,
  ESTADOS_PEDIDO,
  TIEMPO_ENTREGA,
  MAX_CANTIDAD_POR_PRODUCTO,
  MAX_CAMBIO_REPARTIDOR,
  COSTO_ENVIO,
  COMPROBANTE_TIMEOUT
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
      const latitude = mensajeData.latitude || null;
      const longitude = mensajeData.longitude || null;

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

        // Comando de ayuda admin
        if (mensajeLimpio === 'ayuda' || mensajeLimpio === 'help' || mensajeLimpio === 'comandos') {
          return await this.mostrarAyudaAdmin();
        }

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

        // Comando rápido SOLO para entregado
        if (mensajeLimpio.startsWith('entregado')) {
          return await this.cambiarEstadoRapido(bodySanitizado, ESTADOS_PEDIDO.ENTREGADO);
        }

        // Si el admin envió algo no reconocido, mostrar ayuda
        logger.warn(`⚠️ Comando de admin no reconocido: ${mensajeLimpio}`);
        return await this.mostrarAyudaAdmin();
      }

      // Obtener o crear sesión del usuario
      let session = await SessionService.getSession(telefono);

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

      // Comandos directos de acción (pedir, domicilio, para llevar)
      if (this.esComandoPedir(mensajeLimpio)) {
        return await this.solicitarTipoPedido(telefono);
      }

      if (COMANDOS_BOT.DOMICILIO.some(cmd => mensajeLimpio.includes(cmd))) {
        // Forzar selección de domicilio
        await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_TIPO);
        return await this.procesarSeleccionTipo(telefono, '2');
      }

      if (COMANDOS_BOT.PARA_LLEVAR.some(cmd => mensajeLimpio.includes(cmd))) {
        // Forzar selección de comer ahí
        await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_TIPO);
        return await this.procesarSeleccionTipo(telefono, '3');
      }

      if (COMANDOS_BOT.PARA_LLEVAR.some(cmd => mensajeLimpio.includes(cmd))) {
        // Forzar selección de para llevar
        await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_TIPO);
        return await this.procesarSeleccionTipo(telefono, '1');
      }

      // Procesar según el estado actual del bot
      return await this.procesarSegunEstado(telefono, bodySanitizado, mensajeLimpio, { mediaUrl, numMedia, latitude, longitude });
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
    const session = await SessionService.getSession(telefono);

    if (!session) {
      return await this.iniciarConversacion(telefono);
    }

    // Estados donde NO se deben procesar comandos globales (el usuario está dando datos)
    const estadosSolicitandoDatos = [
      BOT_STATES.SOLICITAR_NOMBRE,
      BOT_STATES.SOLICITAR_DIRECCION,
      BOT_STATES.SOLICITAR_REFERENCIAS,
      BOT_STATES.SELECCIONAR_CANTIDAD,
      BOT_STATES.ESPERANDO_COMPROBANTE
    ];

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
        return await this.procesarDireccion(telefono, body, mediaData);

      case BOT_STATES.SOLICITAR_TELEFONO:
        return await this.procesarTelefono(telefono, body);

      case BOT_STATES.SOLICITAR_REFERENCIAS:
        return await this.procesarReferencias(telefono, body);

      case BOT_STATES.SELECCIONAR_METODO_PAGO:
        return await this.procesarMetodoPago(telefono, mensajeLimpio);

      case BOT_STATES.ESPERANDO_COMPROBANTE:
        return await this.procesarComprobante(telefono, body, mediaData);

      case BOT_STATES.CONFIRMAR_PEDIDO:
        return await this.procesarConfirmacion(telefono, mensajeLimpio);

      // Estados de edición
      case BOT_STATES.EDITANDO_NOMBRE:
        return await this.procesarEdicionNombre(telefono, body);

      case BOT_STATES.EDITANDO_DIRECCION:
        return await this.procesarEdicionDireccion(telefono, body);

      case BOT_STATES.EDITANDO_REFERENCIAS:
        return await this.procesarEdicionReferencias(telefono, body);

      case BOT_STATES.EDITANDO_CARRITO:
        return await this.procesarEdicionCarrito(telefono, mensajeLimpio);

      case BOT_STATES.EDITANDO_ENTREGA:
        return await this.procesarEdicionEntrega(telefono, mensajeLimpio);

      case BOT_STATES.EDITANDO_PAGO:
        return await this.procesarEdicionPago(telefono, mensajeLimpio);

      default:
        return await this.iniciarConversacion(telefono);
    }
  }

  /**
   * Iniciar conversación
   */
  async iniciarConversacion(telefono) {
    await SessionService.resetSession(telefono);
    await SessionService.updateEstado(telefono, BOT_STATES.MENU_PRINCIPAL);

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
    // 🔒 VALIDACIÓN 1: Verificar si el cliente está bloqueado
    try {
      const bloqueado = await Customer.estaBloqueado(telefono);
      if (bloqueado) {
        const cancelaciones = await Customer.getCancelaciones(telefono);
        const fechaDesbloqueo = cancelaciones.bloqueado_hasta 
          ? new Date(cancelaciones.bloqueado_hasta).toLocaleString('es-MX', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'indefinido';
        
        return {
          success: true,
          mensaje: `🚫 *CLIENTE BLOQUEADO TEMPORALMENTE*\n\n` +
            `Has cancelado ${cancelaciones.cancelaciones_count} pedidos recientemente.\n\n` +
            `⏰ Podrás hacer pedidos nuevamente el:\n*${fechaDesbloqueo}*\n\n` +
            `Para más información, contacta con el restaurante.`
        };
      }
    } catch (error) {
      // Si falla la validación de bloqueo, continuar (no bloquear el flujo)
      logger.error('Error al verificar bloqueo del cliente:', error);
    }

    // 🔒 VALIDACIÓN 2: Verificar pedidos pendientes (máximo 2)
    const { data: pedidosPendientes, error } = await supabase
      .from('pedidos')
      .select('id, numero_pedido, total, estado')
      .eq('telefono_cliente', telefono)
      .in('estado', ['pendiente', 'en_proceso', 'pendiente_pago'])
      .order('created_at', { ascending: false });

    if (!error && pedidosPendientes && pedidosPendientes.length >= 2) {
      let mensaje = `⚠️ *LÍMITE DE PEDIDOS ALCANZADO*\n\n`;
      mensaje += `Tienes *${pedidosPendientes.length} pedidos pendientes*.\n\n`;
      mensaje += `Por favor completa o cancela los anteriores antes de crear uno nuevo:\n\n`;
      
      pedidosPendientes.slice(0, 2).forEach((pedido, index) => {
        mensaje += `${index + 1}. Pedido *#${pedido.numero_pedido}*\n`;
        mensaje += `   💰 Total: ${formatearPrecio(pedido.total)}\n`;
        mensaje += `   📊 Estado: ${pedido.estado}\n\n`;
      });
      
      mensaje += `📞 Para más información sobre tus pedidos, escribe *mis pedidos*`;
      
      return {
        success: true,
        mensaje
      };
    }

    await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_TIPO);

    // Si hay un producto preseleccionado, moverlo a seleccionado
    const session = await SessionService.getSession(telefono);
    if (session?.datos?.producto_preseleccionado) {
      await SessionService.guardarDatos(telefono, {
        producto_seleccionado: session.datos.producto_preseleccionado,
        producto_preseleccionado: null
      });
    }

    return {
      success: true,
      mensaje: `¿Cómo deseas recibir tu pedido?\n\n*1.* ${EMOJIS.CARRITO} Para llevar\n*2.* ${EMOJIS.MOTO} A domicilio\n\nResponde con el número de tu opción.`
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
    }

    if (!tipoPedido) {
      const textoMostrar = (mensajeOriginal || mensaje).substring(0, 20);
      return {
        success: true,
        mensaje: `❌ Opción inválida "${textoMostrar}"\n\nPor favor elige:\n\n*1* ${EMOJIS.CARRITO} Para llevar\n*2* ${EMOJIS.MOTO} A domicilio\n\nResponde con el número (1 o 2)`
      };
    }

    // Guardar tipo de pedido
    await SessionService.guardarDatos(telefono, { tipo_pedido: tipoPedido });

    // Mensaje especial para domicilio
    let mensajeTipo = '';
    if (tipoPedido === TIPOS_PEDIDO.DOMICILIO) {
      mensajeTipo = `✅ *Pedido a domicilio seleccionado*\n\n📍 *Entregas en zonas cercanas a Cupido*\n\n`;
    } else if (tipoPedido === TIPOS_PEDIDO.PARA_LLEVAR) {
      mensajeTipo = `Perfecto! ${EMOJIS.CARRITO} Haremos tu pedido *PARA LLEVAR*.\n\n`;
    }

    // Verificar si ya hay un producto seleccionado previamente
    const session = await SessionService.getSession(telefono);
    const productoSeleccionado = session?.datos?.producto_seleccionado;

    if (productoSeleccionado) {
      // Ya seleccionó producto antes, moverlo a producto_temporal y continuar con cantidad
      await SessionService.guardarDatos(telefono, {
        producto_temporal: productoSeleccionado,
        producto_seleccionado: null
      });
      await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_CANTIDAD);
      return {
        success: true,
        mensaje: `${mensajeTipo}${EMOJIS.CHECK} *${productoSeleccionado.nombre}* agregado\n💰 Precio: ${formatearPrecio(productoSeleccionado.precio)}\n\n¿Cuántas ${productoSeleccionado.unidad || 'unidades'} deseas?\n\n${EMOJIS.FLECHA} Escribe un número (1-${MAX_CANTIDAD_POR_PRODUCTO})`
      };
    }

    // No hay producto seleccionado, mostrar categorías
    await SessionService.updateEstado(telefono, BOT_STATES.VER_MENU);
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

    mensaje += `\n👉 Escribe el *número* de la categoría\n`;
    mensaje += `O escribe *todo* para ver el menú completo\n`;
    mensaje += `❌ Escribe *salir* para cancelar`;

    await SessionService.guardarDatos(telefono, { categorias: resultado.categorias });
    await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_CATEGORIA);

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar selección de categoría
   */
  async procesarSeleccionCategoria(telefono, mensaje) {
    const session = await SessionService.getSession(telefono);
    const categorias = session?.datos?.categorias || [];

    // Si escribe "todo", mostrar menú completo
    if (mensaje === 'todo' || mensaje === 'completo' || mensaje === 'ver todo') {
      return await this.mostrarMenuCompletoDirecto(telefono);
    }

    // Si escribe "salir"
    if (this.esComandoCancelar(mensaje)) {
      return await this.cancelarProceso(telefono);
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
    await SessionService.updateEstado(telefono, BOT_STATES.VER_MENU);

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

    const session = await SessionService.getSession(telefono);
    let mensaje = menu.mensaje;

    // Si ya inició pedido, permitir seleccionar
    if (session?.datos?.tipo_pedido) {
      mensaje += `\n\n${EMOJIS.FLECHA} Para ordenar, escribe el *número* del producto\n`;
      mensaje += `Ejemplo: "1" o "2, 5" (para varios productos)`;
      await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_PRODUCTO);
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

    // Detectar si hay múltiples números (separados por comas, espacios, o ambos)
    const numerosMatch = body.trim().match(/\d+/g);

    if (numerosMatch && numerosMatch.length > 1) {
      // Selección múltiple
      return await this.procesarSeleccionMultiple(telefono, numerosMatch);
    }

    // Buscar por número o nombre (selección individual)
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
    const session = await SessionService.getSession(telefono);
    if (!session?.datos?.tipo_pedido) {
      // Guardar el producto seleccionado temporalmente
      await SessionService.guardarDatos(telefono, { producto_preseleccionado: producto });

      return {
        success: true,
        mensaje: `${EMOJIS.CHECK} *${producto.nombre}* - ${formatearPrecio(producto.precio)}\n\n¿Deseas ordenar este producto?\n\nEscribe *pedir* para iniciar tu pedido o *menu* para seguir viendo.`
      };
    }

    // Si ya tiene tipo de pedido, continuar con la selección
    await SessionService.guardarDatos(telefono, { producto_temporal: producto });
    await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_CANTIDAD);

    const mensaje = `${EMOJIS.CHECK} Has seleccionado:\n*${producto.nombre}*\n${formatearPrecio(producto.precio)}\n\n¿Cuántos deseas?\nEscribe la cantidad (ejemplo: 2)`;

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar selección múltiple de productos
   */
  async procesarSeleccionMultiple(telefono, numeros) {
    const session = await SessionService.getSession(telefono);

    // Verificar si ya inició pedido
    if (!session?.datos?.tipo_pedido) {
      return {
        success: true,
        mensaje: `Para ordenar múltiples productos, primero escribe *pedir* para iniciar tu pedido. ${EMOJIS.CARRITO}`
      };
    }

    const productosEncontrados = [];
    const productosNoEncontrados = [];

    // Buscar cada producto
    for (const num of numeros) {
      const producto = await MenuService.buscarPorNumero(parseInt(num));
      if (producto) {
        productosEncontrados.push(producto);
      } else {
        productosNoEncontrados.push(num);
      }
    }

    if (productosEncontrados.length === 0) {
      return {
        success: true,
        mensaje: `No encontramos ninguno de esos productos. ${EMOJIS.CRUZ}\n\nPor favor verifica los números e intenta de nuevo.`
      };
    }

    // Agregar todos los productos al carrito con cantidad 1
    for (const producto of productosEncontrados) {
      await SessionService.agregarAlCarrito(telefono, {
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1
      });
    }

    // Construir mensaje de confirmación
    let mensaje = `${EMOJIS.CHECK} *Productos agregados al carrito:*\n\n`;

    productosEncontrados.forEach(p => {
      mensaje += `• 1x ${p.nombre} - ${formatearPrecio(p.precio)}\n`;
    });

    if (productosNoEncontrados.length > 0) {
      mensaje += `\n⚠️ No encontrados: ${productosNoEncontrados.join(', ')}\n`;
    }

    const carrito = (await SessionService.getSession(telefono))?.carrito || [];
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    mensaje += `\n💰 *Subtotal:* ${formatearPrecio(total)}\n\n`;
    mensaje += `¿Deseas agregar más productos?\n\n`;
    mensaje += `*Sí* - Agregar más\n`;
    mensaje += `*No* - Continuar con el pedido`;

    await SessionService.updateEstado(telefono, BOT_STATES.CONFIRMAR_MAS_PRODUCTOS);

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

    const session = await SessionService.getSession(telefono);
    const producto = session.datos.producto_temporal;

    if (!producto) {
      return await this.iniciarConversacion(telefono);
    }

    // No validar stock

    // Agregar al carrito con validación de límites
    const resultado = await SessionService.agregarAlCarrito(telefono, {
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
    await SessionService.guardarDatos(telefono, { producto_temporal: null });

    // Mostrar carrito y preguntar si quiere más
    const resumenCarrito = OrderService.generarResumenCarrito(resultado.session);

    let mensajeRespuesta = `Perfecto!\n\n${resumenCarrito.resumen}\n\n¿Deseas agregar más productos?\n\nResponde:\n• *SI* para agregar más\n• *NO* para continuar con tu pedido`;

    await SessionService.updateEstado(telefono, BOT_STATES.CONFIRMAR_MAS_PRODUCTOS);

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
      await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_PRODUCTO);

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
    const session = await SessionService.getSession(telefono);
    const tipoPedido = session.datos.tipo_pedido;

    // Si no hay tipo de pedido, solicitarlo primero
    if (!tipoPedido) {
      await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_TIPO);
      return {
        success: true,
        mensaje: `Antes de continuar, necesito saber cómo recibirás tu pedido:\n\n*1.* ${EMOJIS.CARRITO} Para llevar\n*2.* ${EMOJIS.MOTO} A domicilio\n\nResponde con el número de tu opción.`
      };
    }

    await SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_NOMBRE);

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
    // Detectar comandos de edición si ya tiene nombre guardado
    const session = await SessionService.getSession(telefono);
    if (session.datos.nombre && COMANDOS_BOT.EDITAR_NOMBRE.some(cmd => nombre.toLowerCase().includes(cmd))) {
      // Ya está editando, este es el estado correcto
    }

    const nombreLimpio = nombre.trim();

    if (!esValidoNombre(nombreLimpio)) {
      return {
        success: true,
        mensaje: 'Por favor escribe un nombre válido (solo letras, mínimo 3 caracteres)'
      };
    }

    await SessionService.guardarDatos(telefono, {
      nombre: nombreLimpio,
      telefono: telefono
    });

    const sessionActualizada = await SessionService.getSession(telefono);
    const tipoPedido = sessionActualizada.datos.tipo_pedido;

    // Mostrar confirmación con opción de editar
    let mensaje = `✅ *Nombre guardado:* ${nombreLimpio}\n\n`;
    mensaje += `📝 Si necesitas corregirlo, escribe: *EDITAR NOMBRE*\n\n`;

    if (tipoPedido === TIPOS_PEDIDO.DOMICILIO) {
      await SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_DIRECCION);
      mensaje += `Ahora necesito tu *DIRECCIÓN COMPLETA* para la entrega.\n\n`;
      mensaje += `Puedes:\n`;
      mensaje += `📍 *Enviar tu UBICACIÓN* (Recomendado)\n`;
      mensaje += `(Toca el clip 📎 → Ubicación)\n\n`;
      mensaje += `✍️ O escribirla:\n`;
      mensaje += `Ejemplo: Calle 5 de Mayo #123, Col. Centro`;
    } else {
      // Para llevar, solicitar método de pago
      return await this.solicitarMetodoPago(telefono);
    }

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar dirección
   */
  async procesarDireccion(telefono, direccion, mediaData = {}) {
    // Detectar comandos de edición
    const session = await SessionService.getSession(telefono);
    
    if (COMANDOS_BOT.EDITAR_NOMBRE.some(cmd => direccion.toLowerCase().includes(cmd))) {
      return await this.iniciarEdicionNombre(telefono);
    }

    if (session.datos.direccion && COMANDOS_BOT.EDITAR_DIRECCION.some(cmd => direccion.toLowerCase().includes(cmd))) {
      // Ya está editando dirección, este es el estado correcto
    }

    // Si enviaron ubicación (mapa)
    if (mediaData.latitude && mediaData.longitude) {
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mediaData.latitude},${mediaData.longitude}`;

      await SessionService.guardarDatos(telefono, {
        direccion: mapsLink,
        es_ubicacion: true
      });

      const sessionActualizada = await SessionService.getSession(telefono);
      await SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_REFERENCIAS);

      let mensaje = `✅ *Ubicación recibida!* 📍\n\n`;
      mensaje += `👤 Nombre: ${sessionActualizada.datos.nombre}\n`;
      mensaje += `📍 Dirección: Ubicación GPS guardada\n\n`;
      mensaje += `📝 Para corregir escribe:\n`;
      mensaje += `• *EDITAR NOMBRE*\n`;
      mensaje += `• *EDITAR DIRECCION*\n\n`;
      mensaje += `¿Hay alguna *REFERENCIA* adicional?\n`;
      mensaje += `Ejemplo: "Portón blanco", "Casa azul"\n\n`;
      mensaje += `Si no, escribe *NO*`;

      return {
        success: true,
        mensaje
      };
    }

    const direccionLimpia = direccion.trim();

    if (!esValidaDireccion(direccionLimpia)) {
      return {
        success: true,
        mensaje: 'Por favor proporciona una dirección completa con calle y número (o S/N si es sin número).\n\nEjemplo: Calle 5 de Mayo #123, Col. Centro\nO: Av. Juárez S/N, Col. Centro'
      };
    }

    await SessionService.guardarDatos(telefono, { direccion: direccionLimpia });
    const sessionActualizada = await SessionService.getSession(telefono);
    await SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_REFERENCIAS);

    let mensaje = `✅ *Dirección guardada!* ${EMOJIS.UBICACION}\n\n`;
    mensaje += `👤 Nombre: ${sessionActualizada.datos.nombre}\n`;
    mensaje += `📍 Dirección: ${direccionLimpia}\n\n`;
    mensaje += `📝 Para corregir escribe:\n`;
    mensaje += `• *EDITAR NOMBRE*\n`;
    mensaje += `• *EDITAR DIRECCION*\n\n`;
    mensaje += `¿Hay alguna *REFERENCIA* para encontrar tu domicilio?\n`;
    mensaje += `Ejemplo: "Edificio azul", "Junto al Oxxo"\n\n`;
    mensaje += `Si no, escribe *NO*`;

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar referencias
   */
  async procesarReferencias(telefono, referencias) {
    const session = await SessionService.getSession(telefono);
    const refLimpia = referencias.toLowerCase().trim();

    // Detectar comandos de edición
    if (COMANDOS_BOT.EDITAR_NOMBRE.some(cmd => refLimpia.includes(cmd))) {
      return await this.iniciarEdicionNombre(telefono);
    }

    if (COMANDOS_BOT.EDITAR_DIRECCION.some(cmd => refLimpia.includes(cmd))) {
      return await this.iniciarEdicionDireccion(telefono);
    }

    if (session.datos.referencias && COMANDOS_BOT.EDITAR_REFERENCIAS.some(cmd => refLimpia.includes(cmd))) {
      // Ya está editando referencias
    }

    // Guardar referencias si no es NO
    if (!COMANDOS_BOT.NO.includes(refLimpia)) {
      await SessionService.guardarDatos(telefono, { referencias: referencias.trim() });
    }

    // Mostrar resumen antes de solicitar método de pago
    const sessionActualizada = await SessionService.getSession(telefono);
    let mensaje = `✅ *Datos de entrega confirmados*\n\n`;
    mensaje += `👤 Nombre: ${sessionActualizada.datos.nombre}\n`;
    mensaje += `📍 Dirección: ${sessionActualizada.datos.es_ubicacion ? 'Ubicación GPS' : sessionActualizada.datos.direccion}\n`;
    if (sessionActualizada.datos.referencias) {
      mensaje += `📝 Referencias: ${sessionActualizada.datos.referencias}\n`;
    }
    mensaje += `\n✏️ Para corregir escribe:\n`;
    mensaje += `• *EDITAR NOMBRE*\n`;
    mensaje += `• *EDITAR DIRECCION*\n`;
    mensaje += `• *EDITAR REFERENCIAS*\n\n`;
    mensaje += `Si todo está correcto, continuemos...\n\n`;

    // Solicitar método de pago
    const pagoMensaje = await this.solicitarMetodoPago(telefono);
    
    return {
      success: true,
      mensaje: mensaje + pagoMensaje.mensaje
    };
  }

  /**
   * Solicitar método de pago (domicilio y para llevar)
   */
  async solicitarMetodoPago(telefono) {
    await SessionService.updateEstado(telefono, BOT_STATES.SELECCIONAR_METODO_PAGO);

    const total = await SessionService.calcularTotalCarrito(telefono);
    const session = await SessionService.getSession(telefono);
    const tipoPedido = session.datos.tipo_pedido;

    let mensaje = `${EMOJIS.DINERO} *MÉTODO DE PAGO*\n\n`;
    mensaje += `Total a pagar: *${formatearPrecio(total)}*\n\n`;
    mensaje += `¿Cómo deseas pagar?\n\n`;

    if (tipoPedido === TIPOS_PEDIDO.DOMICILIO) {
      mensaje += `*1* 💵 Efectivo (el repartidor lleva cambio)\n`;
    } else {
      mensaje += `*1* 💵 Efectivo\n`;
    }

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
    const session = await SessionService.getSession(telefono);
    const msgLimpia = mensaje.toLowerCase().trim();

    // Detectar comandos de edición
    if (COMANDOS_BOT.EDITAR_NOMBRE.some(cmd => msgLimpia.includes(cmd))) {
      return await this.iniciarEdicionNombre(telefono);
    }

    if (COMANDOS_BOT.EDITAR_DIRECCION.some(cmd => msgLimpia.includes(cmd)) && session.datos.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
      return await this.iniciarEdicionDireccion(telefono);
    }

    if (COMANDOS_BOT.EDITAR_REFERENCIAS.some(cmd => msgLimpia.includes(cmd)) && session.datos.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
      return await this.iniciarEdicionReferencias(telefono);
    }

    if (COMANDOS_BOT.EDITAR_ENTREGA.some(cmd => msgLimpia.includes(cmd))) {
      return await this.iniciarEdicionEntrega(telefono);
    }

    if (COMANDOS_BOT.EDITAR_CARRITO.some(cmd => msgLimpia.includes(cmd))) {
      return await this.iniciarEdicionCarrito(telefono);
    }

    let metodoPago = null;

    if (mensaje === '1' || mensaje.includes('efectivo')) {
      metodoPago = METODOS_PAGO.EFECTIVO;
    } else if (mensaje === '2' || mensaje.includes('transferencia')) {
      metodoPago = METODOS_PAGO.TRANSFERENCIA;
    } else {
      return {
        success: true,
        mensaje: `Por favor elige una opción válida:\n\n*1* 💵 Efectivo\n*2* 🏦 Transferencia\n\nO escribe *EDITAR* + lo que quieras corregir`
      };
    }

    await SessionService.guardarDatos(telefono, { metodo_pago: metodoPago });

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
    await SessionService.updateEstado(telefono, BOT_STATES.ESPERANDO_COMPROBANTE);

    // Extender tiempo de sesión para dar tiempo de hacer la transferencia
    await SessionService.extenderSesion(telefono, COMPROBANTE_TIMEOUT);
    logger.info(`⏰ Sesión extendida para ${telefono} - Esperando comprobante por ${COMPROBANTE_TIMEOUT / 60000} minutos`);

    const total = await SessionService.calcularTotalCarrito(telefono);

    let mensaje = `${EMOJIS.DINERO} *PAGO POR TRANSFERENCIA*\n\n`;
    mensaje += `Total a pagar: *${formatearPrecio(total)}*\n\n`;
    mensaje += `🏦 *DATOS BANCARIOS:*\n`;
    mensaje += `• Banco: *${config.datosBancarios.banco}*\n`;
    mensaje += `• Titular: *${config.datosBancarios.titular}*\n`;
    mensaje += `• Cuenta: *${config.datosBancarios.cuenta}*\n`;
    mensaje += `• Referencia: *${config.datosBancarios.referencia}*\n\n`;
    mensaje += `⚠️ *IMPORTANTE:*\n`;
    mensaje += `• Realiza la transferencia bancaria por el monto exacto\n`;
    mensaje += `• Una vez realizada, *envía tu comprobante de pago* (foto o captura de pantalla)\n`;
    mensaje += `• Tu pedido será confirmado cuando verifiquemos el pago\n\n`;
    mensaje += `⏰ *Tienes ${COMPROBANTE_TIMEOUT / 60000} minutos* para enviar el comprobante\n`;
    mensaje += `💡 *Tip:* Puedes tomarte tu tiempo para hacer la transferencia\n\n`;
    mensaje += `📸 *Envía tu comprobante cuando esté listo*`;

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

    // PRIMERO: Verificar que la sesión aún exista
    let session = await SessionService.getSession(telefono);
    if (!session) {
      logger.error(`❌ ERROR: Sesión expirada para ${telefono} al intentar procesar comprobante`);
      return {
        success: false,
        mensaje: `⏰ *Tu sesión ha expirado*\n\n` +
          `Lo sentimos, tu sesión expiró mientras esperábamos el comprobante.\n\n` +
          `Por favor inicia un nuevo pedido escribiendo *pedir*.\n\n` +
          `💡 *Tip:* Envía el comprobante lo antes posible después de seleccionar transferencia.`
      };
    }

    // SEGUNDO: Renovar actividad de sesión y extenderla nuevamente
    await SessionService.renovarActividad(telefono);
    await SessionService.extenderSesion(telefono, COMPROBANTE_TIMEOUT);
    logger.info(`� Sesión renovada y extendida para ${telefono} - ${COMPROBANTE_TIMEOUT / 60000} minutos más`);

    // Verificar si recibió una imagen
    if (numMedia > 0 && mediaUrl) {
      // Guardar URL del comprobante
      await SessionService.guardarDatos(telefono, {
        comprobante_recibido: true,
        comprobante_url: mediaUrl,
        comprobante_info: 'Imagen recibida'
      });

      logger.info(`✅ Comprobante guardado en sesión con URL: ${mediaUrl}`);

      // GENERAR RESUMEN ANTES DE QUE SE BORRE EL CARRITO
      session = await SessionService.getSession(telefono);

      // Verificar que la sesión tenga el comprobante guardado
      if (session && session.datos && session.datos.comprobante_url) {
        logger.info(`✅ Verificado: comprobante_url está en la sesión`);
      } else {
        logger.error(`❌ WARNING: comprobante_url NO está en la sesión después de guardar!`);
      }

      const resumenCarrito = OrderService.generarResumenCarrito(session);
      const resumenTexto = resumenCarrito ? resumenCarrito.resumen : null;

      // Verificar que el carrito tenga productos
      if (!session.carrito || session.carrito.length === 0) {
        logger.error(`❌ ERROR: Carrito vacío para ${telefono} al crear pedido`);
        return {
          success: false,
          mensaje: `❌ *Error al procesar tu pedido*\n\n` +
            `Tu carrito está vacío. Por favor inicia un nuevo pedido escribiendo *pedir*.`
        };
      }

      // CREAR EL PEDIDO INMEDIATAMENTE con estado PENDIENTE_PAGO
      const resultado = await OrderService.crearPedidoDesdeBot(telefono);

      if (!resultado.success) {
        logger.error('Error al crear pedido con comprobante:', resultado.error);
        return {
          success: false,
          mensaje: `❌ *Error al procesar tu pedido*\n\n` +
            `${resultado.error || 'Error desconocido'}\n\n` +
            `Por favor intenta de nuevo o contacta con nosotros.`
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
      await SessionService.deleteSession(telefono);

      logger.info(`✅ Pedido #${pedido.numero_pedido} creado con comprobante, esperando aprobación`);

      return {
        success: true,
        mensaje: mensajeCliente
      };
    }

    // Si no recibió imagen pero envió texto (número de referencia)
    if (mensaje && mensaje.trim().length >= 5) {
      // Guardar que se recibió comprobante como texto
      await SessionService.guardarDatos(telefono, {
        comprobante_recibido: true,
        comprobante_info: mensaje.substring(0, 100)
      });

      // GENERAR RESUMEN ANTES DE QUE SE BORRE EL CARRITO
      const session = await SessionService.getSession(telefono);
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
      await SessionService.deleteSession(telefono);

      logger.info(`Pedido #${pedido.numero_pedido} creado con referencia, esperando aprobación`);

      return {
        success: true,
        mensaje: mensajeCliente
      };
    }

    // Si no envió nada válido, extender sesión nuevamente para darle más tiempo
    await SessionService.extenderSesion(telefono, COMPROBANTE_TIMEOUT);
    logger.info(`⏰ Sesión extendida nuevamente para ${telefono} - esperando comprobante válido`);

    return {
      success: true,
      mensaje: `⚠️ *No recibimos un comprobante válido*\n\n` +
        `Por favor envía:\n` +
        `📸 Foto del comprobante\n` +
        `📱 Captura de pantalla\n` +
        `🔢 Número de referencia (mínimo 5 caracteres)\n\n` +
        `⏰ Tienes ${COMPROBANTE_TIMEOUT / 60000} minutos para enviarlo.\n\n` +
        `� *Tip:* Si ya realizaste la transferencia, envía la captura ahora.`
    };
  }

  /**
   * Mostrar confirmación con pago pendiente de verificación
   */
  async mostrarConfirmacionConPagoPendiente(telefono) {
    const session = await SessionService.getSession(telefono);
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
    mensaje += `🔒 *Para confirmar, escribe:*\n\n*SI CONFIRMO*\n\nPara cancelar, escribe: *NO*`;

    await SessionService.updateEstado(telefono, BOT_STATES.CONFIRMAR_PEDIDO);

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Mostrar confirmación del pedido
   */
  async mostrarConfirmacion(telefono) {
    const session = await SessionService.getSession(telefono);
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

    mensaje += `\n\n¿Todo está correcto?\n\n`;
    mensaje += `🔒 *Para confirmar, escribe:* *SI CONFIRMO*\n`;
    mensaje += `❌ *Para cancelar, escribe:* *NO*\n\n`;
    mensaje += `📝 *O si necesitas corregir algo:*\n`;
    mensaje += `• *EDITAR NOMBRE*\n`;
    mensaje += `• *EDITAR ENTREGA* (cambiar entre domicilio/recoger)\n`;
    
    if (tipoPedido === TIPOS_PEDIDO.DOMICILIO) {
      mensaje += `• *EDITAR DIRECCION*\n`;
      mensaje += `• *EDITAR REFERENCIAS*\n`;
    }
    
    mensaje += `• *EDITAR PAGO* (cambiar entre efectivo/transferencia)\n`;
    mensaje += `• *EDITAR CARRITO*`;

    await SessionService.updateEstado(telefono, BOT_STATES.CONFIRMAR_PEDIDO);

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar confirmación final
   */
  async procesarConfirmacion(telefono, mensaje) {
    // Detectar comandos de edición
    if (COMANDOS_BOT.EDITAR_NOMBRE.some(cmd => mensaje.includes(cmd))) {
      return await this.iniciarEdicionNombre(telefono);
    }

    if (COMANDOS_BOT.EDITAR_DIRECCION.some(cmd => mensaje.includes(cmd))) {
      return await this.iniciarEdicionDireccion(telefono);
    }

    if (COMANDOS_BOT.EDITAR_REFERENCIAS.some(cmd => mensaje.includes(cmd))) {
      return await this.iniciarEdicionReferencias(telefono);
    }

    if (COMANDOS_BOT.EDITAR_CARRITO.some(cmd => mensaje.includes(cmd))) {
      return await this.iniciarEdicionCarrito(telefono);
    }

    if (COMANDOS_BOT.EDITAR_ENTREGA.some(cmd => mensaje.includes(cmd))) {
      return await this.iniciarEdicionEntrega(telefono);
    }

    if (COMANDOS_BOT.EDITAR_PAGO.some(cmd => mensaje.includes(cmd))) {
      return await this.iniciarEdicionPago(telefono);
    }

    // Confirmación o cancelación
    if (COMANDOS_BOT.SI.includes(mensaje) || mensaje.includes('si confirmo') || mensaje.includes('confirmo')) {
      // 🔒 CONFIRMACIÓN EXPLÍCITA: Verificar que sea "SI CONFIRMO"
      if (mensaje.includes('si confirmo') || mensaje.includes('confirmo')) {
        return await this.confirmarPedido(telefono);
      }
      
      // Si solo escribió "SI", pedir confirmación explícita
      return {
        success: true,
        mensaje: `⚠️ *CONFIRMACIÓN REQUERIDA*\n\n` +
          `Para confirmar tu pedido, escribe exactamente:\n\n` +
          `*SI CONFIRMO*\n\n` +
          `O escribe *NO* para cancelar`
      };
    }

    if (COMANDOS_BOT.NO.includes(mensaje)) {
      return await this.cancelarProceso(telefono);
    }

    return {
      success: true,
      mensaje: '⚠️ Para confirmar tu pedido, escribe:\n\n*SI CONFIRMO*\n\nPara cancelar, escribe:\n*NO*\n\nO puedes *EDITAR* algo antes de confirmar'
    };
  }

  /**
   * Confirmar y crear pedido
   */
  async confirmarPedido(telefono) {
    const session = await SessionService.getSession(telefono);

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
      await SessionService.deleteSession(telefono);

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
      tiempoEstimado,
      tipoPedido
    );

    // Limpiar sesión
    await SessionService.deleteSession(telefono);

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
    const session = await SessionService.getSession(telefono);

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

    // Mostrar dirección solo para domicilio, tipo de pedido para llevar
    if (session.datos.tipo_pedido === 'domicilio') {
      mensajeAdmin += `📍 Dirección: ${session.datos.direccion || 'N/A'}\n`;
      if (session.datos.referencias) {
        mensajeAdmin += `🏠 Referencias: ${session.datos.referencias}\n`;
      }
    } else {
      mensajeAdmin += `📦 Tipo: *PARA LLEVAR*\n`;
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
    await SessionService.resetSession(telefono);

    return {
      success: true,
      mensaje: MENSAJES_BOT.PEDIDO_CANCELADO
    };
  }

  // ============================================
  // FUNCIONES DE EDICIÓN
  // ============================================

  /**
   * Iniciar edición de nombre
   * ⚡ NO envía mensaje para ahorrar créditos de Twilio
   */
  async iniciarEdicionNombre(telefono) {
    const session = await SessionService.getSession(telefono);
    
    // Guardar el estado actual para volver después
    await SessionService.guardarDatos(telefono, { estado_antes_edicion: session.estado });
    await SessionService.updateEstado(telefono, BOT_STATES.EDITANDO_NOMBRE);

    return {
      success: true,
      mensaje: '✏️ *EDITAR NOMBRE*\n\nEscribe el nuevo nombre completo:\nEjemplo: Juan Pérez\n\n❌ Escribe *cancelar* para volver'
    };
  }

  /**
   * Procesar nueva información de nombre
   */
  async procesarEdicionNombre(telefono, nombre) {
    if (this.esComandoCancelar(nombre.toLowerCase())) {
      return await this.volverEstadoAnterior(telefono);
    }

    if (!esValidoNombre(nombre)) {
      return {
        success: false,
        mensaje: '❌ Nombre inválido. Debe tener al menos 2 caracteres.\n\nIntenta de nuevo o escribe *cancelar*'
      };
    }

    // Actualizar nombre en la sesión
    await SessionService.guardarDatos(telefono, { nombre });

    let mensaje = `✅ *Nombre actualizado a:* ${nombre}\n\n`;

    // Volver al estado donde estaba antes de editar
    const continuacion = await this.volverEstadoAnterior(telefono);
    
    return {
      success: true,
      mensaje: mensaje + (continuacion.mensaje || '')
    };
  }

  /**
   * Iniciar edición de dirección
   * ⚡ NO envía mensaje para ahorrar créditos de Twilio
   */
  async iniciarEdicionDireccion(telefono) {
    const session = await SessionService.getSession(telefono);
    
    // Guardar el estado actual para volver después
    await SessionService.guardarDatos(telefono, { estado_antes_edicion: session.estado });
    await SessionService.updateEstado(telefono, BOT_STATES.EDITANDO_DIRECCION);

    return {
      success: true,
      mensaje: '✏️ *EDITAR DIRECCIÓN*\n\nEscribe la nueva dirección completa:\nEjemplo: Calle 5 de Mayo #123, Col. Centro\n\n📍 O envía tu ubicación\n❌ Escribe *cancelar* para volver'
    };
  }

  /**
   * Procesar nueva dirección
   */
  async procesarEdicionDireccion(telefono, direccion) {
    if (this.esComandoCancelar(direccion.toLowerCase())) {
      return await this.volverEstadoAnterior(telefono);
    }

    if (!esValidaDireccion(direccion)) {
      return {
        success: false,
        mensaje: '❌ Dirección inválida. Debe tener al menos 10 caracteres.\n\nEjemplo: Calle Morelos #123, Centro\n\nIntenta de nuevo o escribe *cancelar*'
      };
    }

    // Actualizar dirección en la sesión
    await SessionService.guardarDatos(telefono, { direccion });

    let mensaje = `✅ *Dirección actualizada*\n\n`;

    // Volver al estado donde estaba
    const continuacion = await this.volverEstadoAnterior(telefono);
    
    return {
      success: true,
      mensaje: mensaje + (continuacion.mensaje || '')
    };
  }

  /**
   * Iniciar edición de referencias
   */
  async iniciarEdicionReferencias(telefono) {
    const session = await SessionService.getSession(telefono);
    
    // Guardar el estado actual para volver después
    await SessionService.guardarDatos(telefono, { estado_antes_edicion: session.estado });
    await SessionService.updateEstado(telefono, BOT_STATES.EDITANDO_REFERENCIAS);

    return {
      success: true,
      mensaje: '✏️ *EDITAR REFERENCIAS*\n\nEscribe las nuevas referencias:\nEjemplo: Casa azul frente al parque\n\n❌ Escribe *cancelar* para volver'
    };
  }

  /**
   * Procesar nuevas referencias
   */
  async procesarEdicionReferencias(telefono, referencias) {
    if (this.esComandoCancelar(referencias.toLowerCase())) {
      return await this.volverEstadoAnterior(telefono);
    }

    // Actualizar referencias en la sesión
    await SessionService.guardarDatos(telefono, { referencias });

    let mensaje = `✅ *Referencias actualizadas*\n\n`;

    // Volver al estado donde estaba
    const continuacion = await this.volverEstadoAnterior(telefono);
    
    return {
      success: true,
      mensaje: mensaje + (continuacion.mensaje || '')
    };
  }

  /**
   * Iniciar edición de carrito
   */
  async iniciarEdicionCarrito(telefono) {
    const session = await SessionService.getSession(telefono);
    const carrito = session.carrito || [];

    if (carrito.length === 0) {
      return {
        success: false,
        mensaje: '❌ Tu carrito está vacío'
      };
    }

    let mensaje = `🛒 *EDITAR CARRITO*\n\n`;
    mensaje += `Productos actuales:\n\n`;

    carrito.forEach((item, index) => {
      mensaje += `${index + 1}. ${item.nombre} x${item.cantidad} - ${formatearPrecio(item.precio * item.cantidad)}\n`;
    });

    mensaje += `\n¿Qué deseas hacer?\n\n`;
    mensaje += `• Escribe el *número* del producto que quieres quitar\n`;
    mensaje += `• Escribe *agregar* para añadir más productos\n`;
    mensaje += `• Escribe *listo* cuando termines\n`;
    mensaje += `• Escribe *cancelar* para volver`;

    await SessionService.updateEstado(telefono, BOT_STATES.EDITANDO_CARRITO);

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Procesar edición de carrito
   */
  async procesarEdicionCarrito(telefono, mensaje) {
    const session = await SessionService.getSession(telefono);

    if (this.esComandoCancelar(mensaje)) {
      return await this.mostrarConfirmacion(telefono);
    }

    if (mensaje === 'listo') {
      if (!session.carrito || session.carrito.length === 0) {
        return {
          success: false,
          mensaje: '❌ No puedes confirmar con el carrito vacío\n\nAgrega al menos un producto o escribe *cancelar*'
        };
      }
      return await this.mostrarConfirmacion(telefono);
    }

    if (mensaje === 'agregar') {
      // Volver al menú para agregar productos
      await SessionService.updateEstado(telefono, BOT_STATES.VER_MENU);
      return await this.mostrarMenu(telefono);
    }

    // Verificar si es un número para quitar producto
    const numero = parseInt(mensaje);
    if (!isNaN(numero) && numero > 0 && numero <= session.carrito.length) {
      const productoEliminado = session.carrito[numero - 1];
      await SessionService.quitarDelCarrito(telefono, numero - 1);

      let respuesta = `✅ *Producto eliminado*\n\n`;
      respuesta += `${productoEliminado.nombre} - ${formatearPrecio(productoEliminado.precio * productoEliminado.cantidad)}\n\n`;

      const sessionActualizada = await SessionService.getSession(telefono);
      const carritoActualizado = sessionActualizada.carrito || [];
      
      if (carritoActualizado.length === 0) {
        respuesta += `Tu carrito está vacío.\n\nEscribe *agregar* para añadir productos`;
      } else {
        respuesta += `Carrito actualizado:\n\n`;
        carritoActualizado.forEach((item, index) => {
          respuesta += `${index + 1}. ${item.nombre} x${item.cantidad}\n`;
        });
        respuesta += `\n¿Qué más deseas hacer?\n• *Número* para quitar\n• *agregar* para añadir\n• *listo* para continuar`;
      }

      return {
        success: true,
        mensaje: respuesta
      };
    }

    return {
      success: false,
      mensaje: '❌ Opción inválida\n\nEscribe:\n• El *número* del producto a quitar\n• *agregar* para añadir más\n• *listo* para terminar\n• *cancelar* para volver'
    };
  }

  /**
   * Iniciar edición de método de entrega (domicilio/recoger)
   */
  async iniciarEdicionEntrega(telefono) {
    const session = await SessionService.getSession(telefono);
    
    // Guardar el estado actual para volver después
    await SessionService.guardarDatos(telefono, { estado_antes_edicion: session.estado });
    await SessionService.updateEstado(telefono, BOT_STATES.EDITANDO_ENTREGA);
    
    return {
      success: true,
      mensaje: '✏️ *EDITAR TIPO DE ENTREGA*\n\n' +
        '¿Cómo deseas recibir tu pedido?\n\n' +
        '1️⃣ 🏠 *Domicilio* - Te lo llevamos\n' +
        '2️⃣ 🍽️ *Recoger* - Pasas por él\n\n' +
        'Escribe *1* o *2*\n' +
        '❌ Escribe *cancelar* para volver'
    };
  }

  /**
   * Procesar edición de método de entrega
   */
  async procesarEdicionEntrega(telefono, mensaje) {
    const session = await SessionService.getSession(telefono);

    if (this.esComandoCancelar(mensaje)) {
      return await this.volverEstadoAnterior(telefono);
    }

    let nuevoTipo = null;
    
    if (mensaje === '1' || mensaje.includes('domicilio')) {
      nuevoTipo = TIPOS_PEDIDO.DOMICILIO;
    } else if (mensaje === '2' || mensaje.includes('recoger') || mensaje.includes('llevar')) {
      nuevoTipo = TIPOS_PEDIDO.PARA_LLEVAR;
    } else {
      return {
        success: false,
        mensaje: '❌ Opción inválida\n\nEscribe:\n• *1* para Domicilio\n• *2* para Recoger\n• *cancelar* para volver'
      };
    }

    const tipoAnterior = session.datos.tipo_pedido;
    
    // Actualizar tipo de entrega
    await SessionService.guardarDatos(telefono, { tipo_pedido: nuevoTipo });

    let respuesta = `✅ *Tipo de entrega actualizado*\n\n`;
    respuesta += `Anterior: ${tipoAnterior === TIPOS_PEDIDO.DOMICILIO ? '🏠 Domicilio' : '🍽️ Recoger'}\n`;
    respuesta += `Nuevo: ${nuevoTipo === TIPOS_PEDIDO.DOMICILIO ? '🏠 Domicilio' : '🍽️ Recoger'}\n\n`;

    // Si cambió a domicilio, necesitamos pedir dirección y referencias si no las tiene
    if (nuevoTipo === TIPOS_PEDIDO.DOMICILIO && !session.datos.direccion) {
      await SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_DIRECCION);
      respuesta += 'Ahora necesitamos tu dirección de entrega:\n\n';
      respuesta += '📍 Envía tu dirección completa\n';
      respuesta += '🗺️ O comparte tu ubicación de WhatsApp';
      return {
        success: true,
        mensaje: respuesta
      };
    }

    // Si cambió a recoger, limpiar dirección y referencias
    if (nuevoTipo === TIPOS_PEDIDO.PARA_LLEVAR) {
      await SessionService.guardarDatos(telefono, { 
        direccion: null, 
        referencias: null,
        metodo_pago: METODOS_PAGO.EFECTIVO // Forzar efectivo para recoger
      });
      respuesta += '📍 Puedes recoger tu pedido en:\n';
      respuesta += `${DIRECCION_RESTAURANTE.TEXTO}\n`;
      respuesta += `${DIRECCION_RESTAURANTE.MAPS}\n\n`;
    }

    // Mostrar confirmación actualizada
    const confirmacion = await this.volverEstadoAnterior(telefono);
    
    return {
      success: true,
      mensaje: respuesta + '\n' + (confirmacion.mensaje || '')
    };
  }

  /**
   * Iniciar edición de método de pago (efectivo/transferencia)
   */
  async iniciarEdicionPago(telefono) {
    const session = await SessionService.getSession(telefono);
    
    // Si es para recoger, solo permite efectivo
    if (session.datos.tipo_pedido === TIPOS_PEDIDO.PARA_LLEVAR) {
      return {
        success: false,
        mensaje: '❌ *Para pedidos para recoger solo aceptamos efectivo*\n\n' +
          'Si deseas pagar con transferencia, cambia a *EDITAR ENTREGA* y elige domicilio.'
      };
    }

    // Guardar el estado actual para volver después
    await SessionService.guardarDatos(telefono, { estado_antes_edicion: session.estado });
    await SessionService.updateEstado(telefono, BOT_STATES.EDITANDO_PAGO);
    
    return {
      success: true,
      mensaje: '✏️ *EDITAR MÉTODO DE PAGO*\n\n' +
        '¿Cómo deseas pagar?\n\n' +
        '1️⃣ 💵 *Efectivo* - Pagas al recibir\n' +
        '2️⃣ 💳 *Transferencia* - Pagas ahora\n\n' +
        'Escribe *1* o *2*\n' +
        '❌ Escribe *cancelar* para volver'
    };
  }

  /**
   * Procesar edición de método de pago
   */
  async procesarEdicionPago(telefono, mensaje) {
    const session = await SessionService.getSession(telefono);

    if (this.esComandoCancelar(mensaje)) {
      return await this.volverEstadoAnterior(telefono);
    }

    let nuevoMetodo = null;
    
    if (mensaje === '1' || mensaje.includes('efectivo')) {
      nuevoMetodo = METODOS_PAGO.EFECTIVO;
    } else if (mensaje === '2' || mensaje.includes('transferencia')) {
      nuevoMetodo = METODOS_PAGO.TRANSFERENCIA;
    } else {
      return {
        success: false,
        mensaje: '❌ Opción inválida\n\nEscribe:\n• *1* para Efectivo\n• *2* para Transferencia\n• *cancelar* para volver'
      };
    }

    const metodoAnterior = session.datos.metodo_pago;
    
    // Actualizar método de pago
    await SessionService.guardarDatos(telefono, { metodo_pago: nuevoMetodo });

    let respuesta = `✅ *Método de pago actualizado*\n\n`;
    respuesta += `Anterior: ${metodoAnterior === METODOS_PAGO.EFECTIVO ? '💵 Efectivo' : '💳 Transferencia'}\n`;
    respuesta += `Nuevo: ${nuevoMetodo === METODOS_PAGO.EFECTIVO ? '💵 Efectivo' : '💳 Transferencia'}\n\n`;

    // Si cambió a transferencia, pedir comprobante
    if (nuevoMetodo === METODOS_PAGO.TRANSFERENCIA && !session.datos.comprobante_url) {
      return await this.solicitarComprobante(telefono);
    }

    // Si cambió a efectivo, limpiar comprobante
    if (nuevoMetodo === METODOS_PAGO.EFECTIVO) {
      await SessionService.guardarDatos(telefono, { 
        comprobante_url: null,
        pago_verificado: false 
      });
      respuesta += '💵 Pagarás en efectivo al recibir tu pedido\n';
      respuesta += `💸 El repartidor lleva cambio máximo de $${MAX_CAMBIO_REPARTIDOR} pesos\n\n`;
    }

    // Mostrar confirmación actualizada
    const confirmacion = await this.volverEstadoAnterior(telefono);
    
    return {
      success: true,
      mensaje: respuesta + '\n' + (confirmacion.mensaje || '')
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
    mensaje += `• *domicilio* - Pedido a domicilio\n`;
    mensaje += `• *estado* - Ver estado de pedido\n`;
    mensaje += `• *cancelar* - Cancelar proceso actual\n`;
    mensaje += `• *ayuda* - Mostrar esta ayuda\n\n`;
    mensaje += `Para hacer un pedido, simplemente escribe *hola* o *pedir* y sigue las instrucciones.\n\n`;
    mensaje += `📞 ¿Necesitas ayuda personalizada? Un asesor humano puede atenderte pronto en otro número.`;

    return {
      success: true,
      mensaje
    };
  }

  /**
   * Mostrar estado del último pedido
   */
  async mostrarEstadoPedido(telefono) {
    const session = await SessionService.getSession(telefono);
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

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================

  /**
   * Volver al estado anterior después de editar
   * Esta función restaura el flujo al punto donde estaba antes de editar
   */
  async volverEstadoAnterior(telefono) {
    const session = await SessionService.getSession(telefono);
    const estadoAnterior = session.datos.estado_antes_edicion || BOT_STATES.CONFIRMAR_PEDIDO;

    // Limpiar el marcador de estado anterior
    await SessionService.guardarDatos(telefono, { estado_antes_edicion: null });

    // Según el estado anterior, restaurar y continuar
    switch (estadoAnterior) {
      case BOT_STATES.SOLICITAR_NOMBRE:
        // Estaba ingresando nombre, continuar a dirección (si es domicilio)
        if (session.datos.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
          await SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_DIRECCION);
          return {
            success: true,
            mensaje: `Ahora necesito tu *DIRECCIÓN COMPLETA* para la entrega.\n\n` +
              `Puedes:\n📍 *Enviar tu UBICACIÓN* (Recomendado)\n` +
              `(Toca el clip 📎 → Ubicación)\n\n` +
              `✍️ O escribirla:\nEjemplo: Calle 5 de Mayo #123, Col. Centro`
          };
        } else {
          return await this.solicitarMetodoPago(telefono);
        }

      case BOT_STATES.SOLICITAR_DIRECCION:
        // Estaba ingresando dirección, volver a pedir dirección
        await SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_DIRECCION);
        return {
          success: true,
          mensaje: `Continuemos con tu *DIRECCIÓN*.\n\n` +
            `📍 *Envía tu ubicación* o escríbela:\n` +
            `Ejemplo: Calle 5 de Mayo #123, Col. Centro\n\n` +
            `✏️ O escribe *EDITAR NOMBRE* para corregir tu nombre`
        };

      case BOT_STATES.SOLICITAR_REFERENCIAS:
        // Estaba ingresando referencias, volver a pedir referencias
        await SessionService.updateEstado(telefono, BOT_STATES.SOLICITAR_REFERENCIAS);
        
        let mensaje = `Datos actuales:\n`;
        mensaje += `👤 Nombre: ${session.datos.nombre}\n`;
        mensaje += `📍 Dirección: ${session.datos.es_ubicacion ? 'Ubicación GPS' : session.datos.direccion}\n\n`;
        mensaje += `¿Hay alguna *REFERENCIA* adicional?\n`;
        mensaje += `Ejemplo: "Portón blanco", "Casa azul"\n\n`;
        mensaje += `Si no, escribe *NO*\n\n`;
        mensaje += `✏️ O escribe *EDITAR* + lo que necesites corregir`;
        
        return {
          success: true,
          mensaje
        };

      case BOT_STATES.SELECCIONAR_METODO_PAGO:
        // Estaba seleccionando método de pago, volver a mostrar opciones
        return await this.solicitarMetodoPago(telefono);

      case BOT_STATES.CONFIRMAR_PEDIDO:
      default:
        // Estaba en confirmación final, volver a mostrar confirmación
        return await this.mostrarConfirmacion(telefono);
    }
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
      // Primero buscar el cliente por su teléfono
      const { data: cliente, error: errorCliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefono', telefono)
        .single();

      if (errorCliente || !cliente) {
        return {
          success: true,
          mensaje: '📦 No tienes pedidos registrados.\n\nEscribe *pedir* para hacer tu primer pedido.'
        };
      }

      // Buscar pedidos del cliente con productos
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          total,
          estado,
          tipo_pedido,
          metodo_pago,
          created_at,
          direccion_entrega
        `)
        .eq('cliente_id', cliente.id)
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

        // Formatear tiempo transcurrido
        let tiempoTexto;
        if (minutosTranscurridos < 60) {
          tiempoTexto = `${minutosTranscurridos} min`;
        } else if (minutosTranscurridos < 1440) {
          const horas = Math.floor(minutosTranscurridos / 60);
          tiempoTexto = `${horas}h`;
        } else {
          const dias = Math.floor(minutosTranscurridos / 1440);
          tiempoTexto = `${dias}d`;
        }

        const estadoEmoji = {
          'pendiente_pago': '⏳',
          'pendiente': '⏳',
          'preparando': '👨‍🍳',
          'listo': '✅',
          'enviado': '🛵',
          'entregado': '✅',
          'cancelado': '❌'
        };

        const estadoTexto = {
          'pendiente_pago': 'Verificando pago',
          'pendiente': 'Pendiente',
          'preparando': 'Preparando',
          'listo': 'Listo',
          'enviado': 'En camino',
          'entregado': 'Entregado',
          'cancelado': 'Cancelado'
        };

        const tipoEmoji = pedido.tipo_pedido === 'domicilio' ? '🛵' : '🛒';

        mensaje += `${estadoEmoji[pedido.estado] || '📦'} *#${pedido.numero_pedido}*\n`;
        mensaje += `├ ${estadoTexto[pedido.estado] || pedido.estado}\n`;
        mensaje += `├ ${tipoEmoji} ${pedido.tipo_pedido === 'domicilio' ? 'Domicilio' : 'Para llevar'}\n`;
        mensaje += `├ 💰 ${formatearPrecio(pedido.total)}\n`;
        mensaje += `└ 🕐 Hace ${tiempoTexto}\n\n`;
      }

      mensaje += `${EMOJIS.FLECHA} Para hacer un nuevo pedido, escribe *pedir*`;

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

      // 🔒 ANTI-SPAM: Incrementar contador de cancelaciones
      try {
        await Customer.incrementarCancelaciones(telefono);
        
        // Verificar si debe bloquearse automáticamente (3 cancelaciones)
        const cancelaciones = await Customer.getCancelaciones(telefono);
        if (cancelaciones.cancelaciones_count >= 3) {
          await Customer.bloquear(telefono, 7); // Bloquear por 7 días
          logger.warn(`🚫 Cliente ${telefono} bloqueado automáticamente por ${cancelaciones.cancelaciones_count} cancelaciones`);
          
          // Notificar al admin
          const adminPhone = config.admin.phoneNumber;
          if (adminPhone) {
            await TwilioService.enviarMensajeAdmin(
              `🚫 *CLIENTE BLOQUEADO AUTOMÁTICAMENTE*\n\n` +
              `📱 Cliente: ${telefono}\n` +
              `❌ Cancelaciones: ${cancelaciones.cancelaciones_count}\n` +
              `⏰ Bloqueado por: 7 días\n\n` +
              `El cliente ha cancelado múltiples pedidos.`
            );
          }
        }
      } catch (trackingError) {
        // No afectar el flujo si falla el tracking
        logger.error('Error en tracking de cancelación:', trackingError);
      }

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
   * Mostrar ayuda para administradores
   */
  async mostrarAyudaAdmin() {
    let mensaje = `🔑 *PANEL DE ADMINISTRADOR*\n`;
    mensaje += `*El Rinconcito - Sistema de Pedidos*\n\n`;
    
    mensaje += `💡 *Comandos disponibles:*\n\n`;
    
    mensaje += `📋 *GESTIÓN DE PEDIDOS*\n`;
    mensaje += `• *pedidos* - Ver pedidos pendientes\n`;
    mensaje += `• *aprobar #123* - Aprobar pedido\n`;
    mensaje += `• *rechazar #123* - Rechazar pedido\n`;
    mensaje += `• *ver pedido #123* - Ver detalle completo\n\n`;
    
    mensaje += `✅ *MARCAR COMO ENTREGADO*\n`;
    mensaje += `• *entregado #123* - Marcar pedido como entregado\n\n`;
    
    mensaje += `ℹ️ *OTROS*\n`;
    mensaje += `• *ayuda* - Mostrar esta ayuda\n\n`;
    
    mensaje += `👉 *Tip:* También puedes gestionar pedidos desde:\n`;
    mensaje += `${config.frontend?.url || 'https://el-rinconcito.pages.dev'}/pedidos\n\n`;
    
    mensaje += `⌨️ Escribe un comando para empezar.`;

    return {
      success: true,
      mensaje
    };
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
        mensaje += `\n⚡ *COMANDO RÁPIDO:*\n`;
        mensaje += `• *entregado #${pedidos[0].numero_pedido}* - Marcar como entregado\n\n`;
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
          direccion_entrega,
          referencias,
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
      .select(`
        *,
        clientes(
          id,
          nombre,
          telefono,
          direccion,
          referencias
        )
      `)
      .eq('numero_pedido', numeroPedido)
      .eq('estado', ESTADOS_PEDIDO.PENDIENTE_PAGO)
      .single();

    if (error || !pedido) {
      return {
        success: false,
        mensaje: `❌ No se encontró pedido pendiente #${numeroPedido}\n\nVerifica que el número sea correcto y que el pedido esté pendiente de pago.`
      };
    }

    // Log para debug - verificar que traiga el método de pago
    logger.info(`📋 Pedido #${numeroPedido} - Método de pago: ${pedido.metodo_pago || 'NO DEFINIDO'}`);

    // Si no tiene método de pago definido, usar efectivo por defecto
    if (!pedido.metodo_pago) {
      logger.warn(`⚠️ Pedido #${numeroPedido} sin método de pago, usando 'efectivo' por defecto`);
      pedido.metodo_pago = 'efectivo';
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

    // Notificar al cliente que su pago fue verificado
    const tiempoEstimado = pedido.tipo_pedido === TIPOS_PEDIDO.DOMICILIO
      ? TIEMPO_ENTREGA.DOMICILIO
      : TIEMPO_ENTREGA.PARA_LLEVAR;

    const NL = '\n';

    let mensajeCliente = `✅ *¡TU PAGO HA SIDO VERIFICADO!*${NL}${NL}`;
    mensajeCliente += `${EMOJIS.TICKET} Pedido: *#${pedido.numero_pedido}*${NL}${NL}`;
    mensajeCliente += `${EMOJIS.CHECK} Tu pedido ha sido *APROBADO* y ya está en preparación ${EMOJIS.COCINERO}${NL}${NL}`;
    mensajeCliente += `${EMOJIS.RELOJ} Tiempo estimado: ${tiempoEstimado.min}-${tiempoEstimado.max} minutos${NL}${NL}`;

    if (pedido.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
      mensajeCliente += `${EMOJIS.MOTO} Tu pedido saldrá pronto a tu domicilio${NL}${NL}`;
    } else {
      mensajeCliente += `📦 *Puedes pasar a recogerlo en:*${NL}`;
      mensajeCliente += `${DIRECCION_RESTAURANTE.TEXTO}${NL}`;
      mensajeCliente += `${DIRECCION_RESTAURANTE.MAPS}${NL}${NL}`;
    }

    mensajeCliente += `¡Gracias por tu preferencia! ${EMOJIS.SALUDO}${NL}`;
    mensajeCliente += `*El Rinconcito* ${EMOJIS.TACO}`;

    await TwilioService.enviarMensajeCliente(pedido.clientes.telefono, mensajeCliente);

    logger.info(`Pedido #${numeroPedido} aprobado por admin - Cliente notificado`);

    // Generar Ficha de Reparto para reenviar al repartidor (solo si es domicilio)
    if (pedido.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
      const NL = '\n';
      let fichaReparto = `🛵 *ENTREGA PARA REPARTIDOR* 📦${NL}`;
      fichaReparto += `🆔 Pedido: *#${pedido.numero_pedido}*${NL}${NL}`;

      fichaReparto += `👤 *Cliente:* ${pedido.clientes.nombre}${NL}`;
      fichaReparto += `📞 *Tel:* wa.me/${pedido.clientes.telefono.replace('whatsapp:', '').replace('+', '')}${NL}`;
      fichaReparto += `📍 *Ubicación:* ${pedido.direccion_entrega || 'No especificada'}${NL}`;
      if (pedido.referencias) fichaReparto += `ℹ️ *Ref:* ${pedido.referencias}${NL}`;
      fichaReparto += `${NL}`;

      // Si el pago fue por transferencia, el repartidor solo cobra el envío
      const montoCobrar = pedido.metodo_pago === METODOS_PAGO.TRANSFERENCIA
        ? COSTO_ENVIO
        : pedido.total;

      fichaReparto += `💰 *COBRAR:* ${formatearPrecio(montoCobrar)}${NL}`;
      fichaReparto += `💳 *Método:* ${pedido.metodo_pago ? pedido.metodo_pago.toUpperCase() : 'EFECTIVO'}${NL}`;

      if (pedido.metodo_pago === METODOS_PAGO.TRANSFERENCIA) {
        fichaReparto += `📝 *Nota:* Comida pagada por transferencia, solo cobrar envío${NL}`;
      }

      fichaReparto += `${NL}`;

      fichaReparto += `📋 *Productos:*${NL}`;

      // Obtener productos en consulta separada para evitar errores de relación
      const { data: productosData } = await supabase
        .from('pedidos_productos')
        .select('cantidad, productos(nombre)')
        .eq('pedido_id', pedido.id);

      if (productosData && productosData.length > 0) {
        productosData.forEach(p => {
          fichaReparto += `• ${p.cantidad}x ${p.productos.nombre}${NL}`;
        });
      } else {
        fichaReparto += `(Ver detalle en app)${NL}`;
      }

      fichaReparto += `${NL}👉 *Reenvía este mensaje al repartidor*`;

      // Enviar ficha al admin
      await TwilioService.enviarMensajeAdmin(fichaReparto);
    }

    return {
      success: true,
      mensaje: `✅ *PEDIDO APROBADO Y EN PREPARACIÓN*\n\n` +
        `📝 Pedido: #${pedido.numero_pedido}\n` +
        `👤 Cliente: ${pedido.clientes.nombre}\n` +
        `📞 Teléfono: ${pedido.clientes.telefono}\n` +
        `💰 Total: ${formatearPrecio(pedido.total)}\n\n` +
        `👨‍🍳 Estado actual: *PREPARANDO*\n\n` +
        `⚡ *COMANDO RÁPIDO:*\n` +
        `• *entregado #${pedido.numero_pedido}* - Pedido listo para entregar\n\n` +
        `✅ El cliente ya fue notificado de la aprobación del pago.`
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

      // Obtener pedido actualizado con el nuevo estado
      const { data: pedidoActualizado, error: errorGet } = await supabase
        .from('pedidos')
        .select('*, clientes(*)')
        .eq('id', pedido.id)
        .single();

      if (errorGet || !pedidoActualizado) {
        logger.error('Error al obtener pedido actualizado:', errorGet);
        // Continuar con el pedido original si falla
      }

      // Notificar al cliente SOLO cuando esté entregado o cancelado (optimización de costos Twilio)
      // Los estados 'preparando', 'listo' y 'enviado' se actualizan sin enviar WhatsApp
      let notificacionEnviada = false;
      if (['entregado', 'cancelado'].includes(nuevoEstado)) {
        // Usar pedido actualizado para que tenga el estado correcto
        await NotificationService.notificarEstadoPedido(
          pedidoActualizado || { ...pedido, estado: nuevoEstado },
          pedido.clientes
        );
        notificacionEnviada = true;
      }

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
          `${notificacionEnviada ? '✅ El cliente ha sido notificado por WhatsApp.' : '📝 Estado actualizado (sin notificación WhatsApp).'}`
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

    // 🔒 ANTI-SPAM: Incrementar contador de cancelaciones
    try {
      await Customer.incrementarCancelaciones(pedido.clientes.telefono);
      
      // Verificar si debe bloquearse automáticamente (3 cancelaciones)
      const cancelaciones = await Customer.getCancelaciones(pedido.clientes.telefono);
      if (cancelaciones.cancelaciones_count >= 3) {
        await Customer.bloquear(pedido.clientes.telefono, 7); // Bloquear por 7 días
        logger.warn(`🚫 Cliente ${pedido.clientes.telefono} bloqueado automáticamente por ${cancelaciones.cancelaciones_count} cancelaciones (rechazo admin)`);
      }
    } catch (trackingError) {
      // No afectar el flujo si falla el tracking
      logger.error('Error en tracking de cancelación (rechazo admin):', trackingError);
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

  /**
   * Calcular similitud entre dos strings (Levenshtein distance simplificado)
   */
  calcularSimilitud(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;

    // Si la diferencia de longitud es muy grande, no son similares
    const diffLongitud = Math.abs(s1.length - s2.length);
    if (diffLongitud > 3) return 0;

    if (s1.includes(s2) || s2.includes(s1)) return 0.9;

    // Contar caracteres en común en el mismo orden
    let comunes = 0;
    const minLen = Math.min(s1.length, s2.length);
    for (let i = 0; i < minLen; i++) {
      if (s1[i] === s2[i]) comunes++;
    }

    return comunes / Math.max(s1.length, s2.length);
  }

  /**
   * Verificar si es comando "menu" con tolerancia
   */
  esComandoMenu(mensaje) {
    const comandos = ['menu', 'menú', 'carta', 'productos'];
    const msg = mensaje.toLowerCase().trim();

    // Coincidencia exacta
    if (comandos.includes(msg)) return true;

    // Fuzzy matching MUY ESTRICTO
    for (let cmd of comandos) {
      if (this.calcularSimilitud(msg, cmd) >= 0.85) return true;
    }

    return false;
  }

  /**
   * Verificar si es comando "pedir" con tolerancia
   */
  esComandoPedir(mensaje) {
    const comandos = ['pedir', 'ordenar', 'comprar', 'orden', 'pedido'];
    const msg = mensaje.toLowerCase().trim();

    // Coincidencia exacta
    if (comandos.includes(msg)) return true;

    // Fuzzy matching
    for (let cmd of comandos) {
      if (this.calcularSimilitud(msg, cmd) >= 0.7) return true;
    }

    return false;
  }

  /**
   * Verificar si es comando "mis pedidos" con tolerancia
   */
  esComandoMisPedidos(mensaje) {
    const comandos = ['mis pedidos', 'pedidos', 'mispedidos', 'historial', 'ordenes'];
    const msg = mensaje.toLowerCase().trim();

    // Coincidencia exacta
    if (comandos.includes(msg)) return true;

    // Fuzzy matching
    for (let cmd of comandos) {
      if (this.calcularSimilitud(msg, cmd) >= 0.6) return true;
    }

    return false;
  }

  /**
   * Verificar si es comando "contacto" con tolerancia
   */
  esComandoContacto(mensaje) {
    const comandos = ['contacto', 'telefono', 'teléfono', 'llamar', 'ubicacion', 'ubicación', 'direccion', 'dirección'];
    const msg = mensaje.toLowerCase().trim();

    // Coincidencia exacta
    if (comandos.includes(msg)) return true;

    // Fuzzy matching
    for (let cmd of comandos) {
      if (this.calcularSimilitud(msg, cmd) >= 0.7) return true;
    }

    return false;
  }

  /**
   * Verificar si es comando "ayuda" con tolerancia
   */
  esComandoAyuda(mensaje) {
    const comandos = ['ayuda', 'help', 'info', 'información', 'informacion', 'comandos'];
    const msg = mensaje.toLowerCase().trim();

    // Coincidencia exacta
    if (comandos.includes(msg)) return true;

    // Fuzzy matching
    for (let cmd of comandos) {
      if (this.calcularSimilitud(msg, cmd) >= 0.7) return true;
    }

    return false;
  }
}

// Exportar instancia única (Singleton)
export default new BotService();
