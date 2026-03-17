/**
 * Constantes del sistema El Rinconcito
 */

// ================================================================
// 🔒 NÚMERO ADMIN FIJO — respaldo de pruebas/operación
// Todos los pedidos y notificaciones llegan a este número.
// Actúa como respaldo si ADMIN_PHONE_NUMBER no está en el entorno.
// ================================================================
export const ADMIN_PHONE_FIJO = '+525636399034';

// ================================================================
// 🛵 NÚMERO REPARTIDOR — Opcional
// Configura REPARTIDOR_PHONE_NUMBER en Render para envío automático
// de la ficha de reparto cuando se aprueba un pedido de domicilio.
// ================================================================
export const REPARTIDOR_PHONE_FIJO = null; // Cambiar si siempre es el mismo número

// Estados de pedidos
export const ESTADOS_PEDIDO = {
  PENDIENTE_PAGO: 'pendiente_pago', // Esperando verificación de pago por transferencia
  PENDIENTE: 'pendiente',
  PREPARANDO: 'preparando',
  LISTO: 'listo',
  ENVIADO: 'enviado',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado'
};

// Tipos de pedido
export const TIPOS_PEDIDO = {
  DOMICILIO: 'domicilio',
  PARA_LLEVAR: 'para_llevar'
};

// Métodos de pago
export const METODOS_PAGO = {
  EFECTIVO: 'efectivo',
  TRANSFERENCIA: 'transferencia'
};

// 🚫 DATOS BANCARIOS MOVIDOS A VARIABLES DE ENTORNO
// Ver config/environment.js - datosBancarios
// Configurar en Render: BANCO_CUENTA, BANCO_CLABE, etc.

// Dirección del restaurante
export const DIRECCION_RESTAURANTE = {
  TEXTO: 'El Rinconcito - Cupido, Jalisco',
  MAPS: 'https://maps.app.goo.gl/omUXw4XpzQioVwV77'
};

// Estados del bot conversacional
export const BOT_STATES = {
  INICIO: 'inicio',
  MENU_PRINCIPAL: 'menu_principal',
  SELECCIONAR_TIPO: 'seleccionar_tipo',
  VER_MENU: 'ver_menu',
  SELECCIONAR_CATEGORIA: 'seleccionar_categoria',
  SELECCIONAR_PRODUCTO: 'seleccionar_producto',
  SELECCIONAR_CANTIDAD: 'seleccionar_cantidad',
  CONFIRMAR_MAS_PRODUCTOS: 'confirmar_mas_productos',
  SOLICITAR_NOMBRE: 'solicitar_nombre',
  SOLICITAR_DIRECCION: 'solicitar_direccion',
  SOLICITAR_TELEFONO: 'solicitar_telefono',
  SOLICITAR_REFERENCIAS: 'solicitar_referencias',
  SELECCIONAR_METODO_PAGO: 'seleccionar_metodo_pago',
  ESPERANDO_COMPROBANTE: 'esperando_comprobante',
  CONFIRMAR_PEDIDO: 'confirmar_pedido',
  PEDIDO_COMPLETADO: 'pedido_completado',
  // Estados de edición
  EDITANDO_NOMBRE: 'editando_nombre',
  EDITANDO_DIRECCION: 'editando_direccion',
  EDITANDO_REFERENCIAS: 'editando_referencias',
  EDITANDO_CARRITO: 'editando_carrito',
  EDITANDO_ENTREGA: 'editando_entrega',
  EDITANDO_PAGO: 'editando_pago'
};

// Comandos del bot (todos sin acentos porque se normalizan en procesarMensaje)
export const COMANDOS_BOT = {
  HOLA: ['hola', 'hi', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'inicio', 'empezar', 'comenzar'],
  MENU: ['menu', 'carta', 'ver menu', 'productos', 'comida'],
  PEDIR: ['pedir', 'ordenar', 'pedido', 'orden', 'quiero pedir', 'comprar', 'quiero', 'deseo'],
  DOMICILIO: ['domicilio', 'a domicilio', 'delivery', 'entrega', 'entregar', 'llevar a casa'],
  PARA_LLEVAR: ['para llevar', 'llevar', 'recoger', 'paso por el', 'recoger pedido', 'restaurante', 'recoger en restaurante'],
  ESTADO: ['estado', 'mi pedido', 'ver pedido', 'seguimiento', 'donde esta', 'rastreo'],
  CANCELAR: ['cancelar', 'cancelar pedido', 'quiero cancelar', 'salir', 'ya no'],
  AYUDA: ['ayuda', 'help', 'opciones', '?', 'comandos', 'que puedo hacer'],
  SI: ['si', 'yes', 'ok', 'vale', 'confirmar', 'correcto', 'sep', 'simon', 'dale', 'va'],
  NO: ['no', 'nop', 'nope', 'negativo', 'nel', 'nanai', 'mejor no'],
  // Comandos de edición
  EDITAR_NOMBRE: ['editar nombre', 'cambiar nombre', 'corregir nombre', 'modificar nombre'],
  EDITAR_DIRECCION: ['editar direccion', 'cambiar direccion', 'corregir direccion', 'modificar direccion'],
  EDITAR_REFERENCIAS: ['editar referencias', 'cambiar referencias', 'corregir referencias'],
  EDITAR_CARRITO: ['editar carrito', 'editar pedido', 'cambiar productos', 'modificar pedido', 'agregar producto', 'quitar producto'],
  EDITAR_ENTREGA: ['editar entrega', 'cambiar entrega', 'cambiar tipo', 'modificar entrega', 'editar tipo'],
  EDITAR_PAGO: ['editar pago', 'cambiar pago', 'cambiar metodo', 'modificar pago', 'otro metodo']
};

// Emojis del sistema
export const EMOJIS = {
  SALUDO: '👋',
  TACO: '🌮',
  HAMBURGUESA: '🍔',
  HOTDOG: '🌭',
  SOPA: '🥘',
  BEBIDA: '🥤',
  JUGO: '🍹',
  CARRITO: '🛒',
  CASA: '🏠',
  RESTAURANTE: '🍽️',
  RELOJ: '⏰',
  DINERO: '💰',
  TELEFONO: '📞',
  UBICACION: '📍',
  PERSONA: '👤',
  GRUPO: '👥',
  CHECK: '✅',
  CRUZ: '❌',
  CAMPANA: '🔔',
  FLECHA: '👉',
  GRAFICO: '📊',
  TROFEO: '🏆',
  COCINERO: '👨‍🍳',
  TICKET: '📝',
  MOTO: '🛵'
};

// Tiempo de sesión en milisegundos (120 minutos - tolera cortes de internet sin perder progreso)
export const SESSION_TIMEOUT = 120 * 60 * 1000;

// Tiempo extendido para esperar comprobante (15 minutos)
export const COMPROBANTE_TIMEOUT = 15 * 60 * 1000;

// Límite de productos por pedido
export const MAX_PRODUCTOS_POR_PEDIDO = 20;

// Límite de cantidad por producto
export const MAX_CANTIDAD_POR_PRODUCTO = 10;

// Límite total de items en el carrito (suma de todas las cantidades)
export const MAX_ITEMS_CARRITO = 50;

// Límite de tipos diferentes de productos
export const MAX_TIPOS_PRODUCTOS = 15;

// 🔒 ANTI-SPAM: Configuración de bloqueo por cancelaciones
// Solo se cuentan cancelaciones de pedidos YA CONFIRMADOS (no abandonos de carrito)
export const MAX_CANCELACIONES_PARA_BLOQUEO = 3;
export const DIAS_BLOQUEO = 7;

// Cambio máximo que lleva el repartidor
export const MAX_CAMBIO_REPARTIDOR = 50;

// Costo de envío a domicilio
export const COSTO_ENVIO = 15;

// Tiempo estimado de entrega (minutos)
export const TIEMPO_ENTREGA = {
  DOMICILIO: { min: 30, max: 45 },
  PARA_LLEVAR: { min: 30, max: 45 }
};

// Mensajes del bot
export const MENSAJES_BOT = {
  BIENVENIDA: `¡Hola! ${EMOJIS.SALUDO} Bienvenido a *El Rinconcito* ${EMOJIS.TACO}\n\n⚠️ *IMPORTANTE*: Este número (+1 570 707-7315) es exclusivo para *PEDIDOS AUTOMÁTICOS*, no recibe llamadas.\n📞 Si tienes alguna duda, quejas o sugerencias, puedes llamar al: *563-639-9034*\n\n¿En qué puedo ayudarte hoy?\n\n📋 *menú* - Ver productos disponibles\n${EMOJIS.CARRITO} *pedir* - Hacer un pedido\n📦 *mis pedidos* - Ver mis pedidos recientes\n${EMOJIS.TELEFONO} *contacto* - Información de contacto\nℹ️ *ayuda* - Ver comandos disponibles\n\nEscribe una opción para comenzar.`,

  ERROR_GENERAL: 'Lo siento, ocurrió un error. Por favor intenta de nuevo o escribe *ayuda* para ver las opciones.',

  OPCION_INVALIDA: 'No entiendo tu respuesta. Por favor elige una opción válida o escribe *ayuda*.',

  SESSION_TIMEOUT: 'Tu sesión ha expirado por inactividad. Escribe *hola* para comenzar de nuevo.',

  PEDIDO_CONFIRMADO: (numeroPedido, tiempo, tipoPedido = 'domicilio') => {
    let mensaje = `${EMOJIS.CHECK} *¡PEDIDO CONFIRMADO!*\n\n${EMOJIS.TICKET} Tu número de pedido es: *#${numeroPedido}*\n\nTu pedido está siendo preparado ${EMOJIS.COCINERO}\n${EMOJIS.RELOJ} Estará listo en aproximadamente ${tiempo.min}-${tiempo.max} minutos\n\n`;
    
    if (tipoPedido === 'para_llevar') {
      mensaje += `📍 *Recoge tu pedido en:*\n${DIRECCION_RESTAURANTE.TEXTO}\n${DIRECCION_RESTAURANTE.MAPS}\n\n`;
      mensaje += `📲 *Te avisaremos cuando tu pedido esté listo para recoger.*\n\n`;
    } else {
      mensaje += `📲 *Te avisaremos cuando tu pedido esté en camino.*\n\n`;
    }
    
    mensaje += `¡Gracias por tu preferencia! ${EMOJIS.SALUDO}\n*El Rinconcito* ${EMOJIS.TACO}`;
    
    return mensaje;
  },

  PEDIDO_CANCELADO: 'Tu pedido ha sido cancelado. Si deseas hacer un nuevo pedido, escribe *pedir*.'
};

// Paginación
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100
};

// Códigos HTTP
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
};

export default {
  ESTADOS_PEDIDO,
  TIPOS_PEDIDO,
  METODOS_PAGO,
  DIRECCION_RESTAURANTE,
  BOT_STATES,
  COMANDOS_BOT,
  EMOJIS,
  SESSION_TIMEOUT,
  COMPROBANTE_TIMEOUT,
  MAX_PRODUCTOS_POR_PEDIDO,
  MAX_CANTIDAD_POR_PRODUCTO,
  MAX_ITEMS_CARRITO,
  MAX_TIPOS_PRODUCTOS,
  MAX_CAMBIO_REPARTIDOR,
  COSTO_ENVIO,
  TIEMPO_ENTREGA,
  MENSAJES_BOT,
  PAGINATION,
  HTTP_STATUS,
  MAX_CANCELACIONES_PARA_BLOQUEO,
  DIAS_BLOQUEO
};
