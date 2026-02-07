/**
 * Constantes del sistema El Rinconcito
 */

// Estados de pedidos
export const ESTADOS_PEDIDO = {
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

// Estados del bot conversacional
export const BOT_STATES = {
  INICIO: 'inicio',
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
  CONFIRMAR_PEDIDO: 'confirmar_pedido',
  PEDIDO_COMPLETADO: 'pedido_completado'
};

// Comandos del bot
export const COMANDOS_BOT = {
  HOLA: ['hola', 'hi', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches'],
  MENU: ['menu', 'menú', 'carta', 'ver menu'],
  PEDIR: ['pedir', 'ordenar', 'pedido', 'orden', 'quiero pedir'],
  DOMICILIO: ['domicilio', 'a domicilio', 'delivery', 'entrega'],
  RESTAURANTE: ['restaurante', 'comer aqui', 'comer aquí', 'mesa', 'en el local'],
  PARA_LLEVAR: ['para llevar', 'llevar', 'recoger'],
  ESTADO: ['estado', 'mi pedido', 'ver pedido', 'seguimiento'],
  CANCELAR: ['cancelar', 'cancelar pedido', 'quiero cancelar'],
  AYUDA: ['ayuda', 'help', 'opciones', '?'],
  SI: ['si', 'sí', 'yes', 'ok', 'vale', 'confirmar', 'correcto'],
  NO: ['no', 'nop', 'nope', 'negativo']
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

// Tiempo de sesión en milisegundos (15 minutos)
export const SESSION_TIMEOUT = 15 * 60 * 1000;

// Límite de productos por pedido
export const MAX_PRODUCTOS_POR_PEDIDO = 20;

// Límite de cantidad por producto
export const MAX_CANTIDAD_POR_PRODUCTO = 10;

// Tiempo estimado de entrega (minutos)
export const TIEMPO_ENTREGA = {
  DOMICILIO: { min: 30, max: 45 },
  RESTAURANTE: { min: 15, max: 20 },
  PARA_LLEVAR: { min: 10, max: 15 }
};

// Mensajes del bot
export const MENSAJES_BOT = {
  BIENVENIDA: `${EMOJIS.SALUDO} ¡Hola! Bienvenido a *El Rinconcito* ${EMOJIS.TACO}\n\nSomos un restaurante mexicano especializado en antojitos y comida casera.\n\n¿Cómo deseas recibir tu pedido?\n\n*1.* ${EMOJIS.CARRITO} Para llevar\n*2.* ${EMOJIS.MOTO} A domicilio\n*3.* ${EMOJIS.RESTAURANTE} Comer aquí\n\n💡 *Comandos útiles:*\n📦 Escribe *mis pedidos* para ver tus últimos pedidos\n❌ Escribe *cancelar pedido #X* para cancelar\n\nResponde con el número de tu opción.`,
  
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
  BOT_STATES,
  COMANDOS_BOT,
  EMOJIS,
  SESSION_TIMEOUT,
  MAX_PRODUCTOS_POR_PEDIDO,
  MAX_CANTIDAD_POR_PRODUCTO,
  TIEMPO_ENTREGA,
  MENSAJES_BOT,
  PAGINATION,
  HTTP_STATUS
};
