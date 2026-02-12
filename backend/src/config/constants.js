/**
 * Constantes del sistema El Rinconcito
 */

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
  RESTAURANTE: 'restaurante',
  PARA_LLEVAR: 'para_llevar'
};

// Métodos de pago
export const METODOS_PAGO = {
  EFECTIVO: 'efectivo',
  TRANSFERENCIA: 'transferencia'
};

// Datos bancarios para transferencias
export const DATOS_BANCARIOS = {
  BANCO: 'BBVA',
  TITULAR: 'El Rinconcito SA de CV',
  CUENTA: '0123456789',
  CLABE: '012180001234567890',
  REFERENCIA: 'RINCONCITO'
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
  SOLICITAR_NUM_PERSONAS: 'solicitar_num_personas',
  SOLICITAR_NUM_MESA: 'solicitar_num_mesa',
  SELECCIONAR_METODO_PAGO: 'seleccionar_metodo_pago',
  ESPERANDO_COMPROBANTE: 'esperando_comprobante',
  CONFIRMAR_PEDIDO: 'confirmar_pedido',
  PEDIDO_COMPLETADO: 'pedido_completado'
};

// Comandos del bot (todos sin acentos porque se normalizan en procesarMensaje)
export const COMANDOS_BOT = {
  HOLA: ['hola', 'hi', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'inicio', 'empezar', 'comenzar'],
  MENU: ['menu', 'carta', 'ver menu', 'productos', 'comida'],
  PEDIR: ['pedir', 'ordenar', 'pedido', 'orden', 'quiero pedir', 'comprar', 'quiero', 'deseo'],
  DOMICILIO: ['domicilio', 'a domicilio', 'delivery', 'entrega', 'entregar', 'llevar a casa'],
  RESTAURANTE: ['restaurante', 'comer aqui', 'mesa', 'en el local', 'ahi', 'local', 'comer'],
  PARA_LLEVAR: ['para llevar', 'llevar', 'recoger', 'paso por el', 'recoger pedido'],
  ESTADO: ['estado', 'mi pedido', 'ver pedido', 'seguimiento', 'donde esta', 'rastreo'],
  CANCELAR: ['cancelar', 'cancelar pedido', 'quiero cancelar', 'salir', 'ya no'],
  AYUDA: ['ayuda', 'help', 'opciones', '?', 'comandos', 'que puedo hacer'],
  SI: ['si', 'yes', 'ok', 'vale', 'confirmar', 'correcto', 'sep', 'simon', 'dale', 'va'],
  NO: ['no', 'nop', 'nope', 'negativo', 'nel', 'nanai', 'mejor no']
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

// Tiempo de sesión en milisegundos (30 minutos)
export const SESSION_TIMEOUT = 30 * 60 * 1000;

// Límite de productos por pedido
export const MAX_PRODUCTOS_POR_PEDIDO = 20;

// Límite de cantidad por producto
export const MAX_CANTIDAD_POR_PRODUCTO = 10;

// Límite total de items en el carrito (suma de todas las cantidades)
export const MAX_ITEMS_CARRITO = 50;

// Límite de tipos diferentes de productos
export const MAX_TIPOS_PRODUCTOS = 15;

// Cambio máximo que lleva el repartidor
export const MAX_CAMBIO_REPARTIDOR = 50;

// Tiempo estimado de entrega (minutos)
export const TIEMPO_ENTREGA = {
  DOMICILIO: { min: 30, max: 45 },
  RESTAURANTE: { min: 15, max: 20 },
  PARA_LLEVAR: { min: 10, max: 15 }
};

// Mensajes del bot
export const MENSAJES_BOT = {
  BIENVENIDA: `¡Hola! ${EMOJIS.SALUDO} Bienvenido a *El Rinconcito* ${EMOJIS.RESTAURANTE}\n\n⚠️ *IMPORTANTE*: Este número (+1 570 707-7315) es exclusivo para *PEDIDOS AUTOMÁTICOS*, no recibe llamadas.\n📞 Si tienes alguna duda, puedes llamar al: *55-XXXX-XXXX*\n\n¿En qué puedo ayudarte hoy?\n\n📋 *menú* - Ver productos disponibles\n${EMOJIS.CARRITO} *pedir* - Hacer un pedido\n📦 *mis pedidos* - Ver mis pedidos recientes\n${EMOJIS.TELEFONO} *contacto* - Información de contacto\nℹ️ *ayuda* - Ver comandos disponibles\n\nEscribe una opción para comenzar.`,

  ERROR_GENERAL: 'Lo siento, ocurrió un error. Por favor intenta de nuevo o escribe *ayuda* para ver las opciones.',

  OPCION_INVALIDA: 'No entiendo tu respuesta. Por favor elige una opción válida o escribe *ayuda*.',

  SESSION_TIMEOUT: 'Tu sesión ha expirado por inactividad. Escribe *hola* para comenzar de nuevo.',

  PEDIDO_CONFIRMADO: (numeroPedido, tiempo) =>
    `${EMOJIS.CHECK} *¡PEDIDO CONFIRMADO!*\n\n${EMOJIS.TICKET} Tu número de pedido es: *#${numeroPedido}*\n\nTu pedido está siendo preparado ${EMOJIS.COCINERO}\n${EMOJIS.RELOJ} Llegará en aproximadamente ${tiempo.min}-${tiempo.max} minutos\n\nTe enviaremos actualizaciones del estado de tu pedido.\n\n¡Gracias por tu preferencia! ${EMOJIS.SALUDO}\n*El Rinconcito* ${EMOJIS.TACO}`,

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
  DATOS_BANCARIOS,
  BOT_STATES,
  COMANDOS_BOT,
  EMOJIS,
  SESSION_TIMEOUT,
  MAX_PRODUCTOS_POR_PEDIDO,
  MAX_CANTIDAD_POR_PRODUCTO,
  MAX_ITEMS_CARRITO,
  MAX_TIPOS_PRODUCTOS,
  MAX_CAMBIO_REPARTIDOR,
  TIEMPO_ENTREGA,
  MENSAJES_BOT,
  PAGINATION,
  HTTP_STATUS
};
