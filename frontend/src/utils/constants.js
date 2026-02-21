/**
 * Constantes de la aplicación
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

// Colores para estados
export const COLORES_ESTADO = {
  [ESTADOS_PEDIDO.PENDIENTE]: 'bg-yellow-100 text-yellow-800',
  [ESTADOS_PEDIDO.PREPARANDO]: 'bg-blue-100 text-blue-800',
  [ESTADOS_PEDIDO.LISTO]: 'bg-purple-100 text-purple-800',
  [ESTADOS_PEDIDO.ENVIADO]: 'bg-indigo-100 text-indigo-800',
  [ESTADOS_PEDIDO.ENTREGADO]: 'bg-green-100 text-green-800',
  [ESTADOS_PEDIDO.CANCELADO]: 'bg-red-100 text-red-800'
};

// Etiquetas de estados
export const ETIQUETAS_ESTADO = {
  [ESTADOS_PEDIDO.PENDIENTE]: 'Pendiente',
  [ESTADOS_PEDIDO.PREPARANDO]: 'Preparando',
  [ESTADOS_PEDIDO.LISTO]: 'Listo',
  [ESTADOS_PEDIDO.ENVIADO]: 'Enviado',
  [ESTADOS_PEDIDO.ENTREGADO]: 'Entregado',
  [ESTADOS_PEDIDO.CANCELADO]: 'Cancelado'
};

// Tipos de pedido
export const TIPOS_PEDIDO = {
  DOMICILIO: 'domicilio',
  RESTAURANTE: 'restaurante',
  PARA_LLEVAR: 'para_llevar'
};

// Iconos para tipos
export const ICONOS_TIPO = {
  [TIPOS_PEDIDO.DOMICILIO]: '🏠',
  [TIPOS_PEDIDO.RESTAURANTE]: '🍽️',
  [TIPOS_PEDIDO.PARA_LLEVAR]: '🛍️'
};

// API Base URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Configuración de paginación
export const ITEMS_PER_PAGE = 20;

export default {
  ESTADOS_PEDIDO,
  COLORES_ESTADO,
  ETIQUETAS_ESTADO,
  TIPOS_PEDIDO,
  ICONOS_TIPO,
  API_URL,
  ITEMS_PER_PAGE
};
