import config from '../config/environment.js';

const TZ = 'America/Mexico_City';

/**
 * Utilidades para formatear datos
 */

/**
 * Formatear precio a moneda mexicana
 */
export const formatearPrecio = (precio) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(precio);
};

/**
 * Formatear fecha
 */
export const formatearFecha = (fecha) => {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ
  }).format(new Date(fecha));
};

/**
 * Formatear fecha corta
 */
export const formatearFechaCorta = (fecha) => {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ
  }).format(new Date(fecha));
};

/**
 * Formatear hora
 */
export const formatearHora = (fecha) => {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ
  }).format(new Date(fecha));
};

/**
 * Formatear número de teléfono
 */
export const formatearTelefono = (telefono) => {
  if (!telefono) return '';
  
  // Eliminar caracteres no numéricos
  const numeros = telefono.replace(/\D/g, '');
  
  // Si tiene el prefijo +521 o +52 (13 o 12 dígitos), tomar los últimos 10
  let numeroLocal = numeros;
  if (numeros.length >= 12) {
    numeroLocal = numeros.slice(-10);
  }
  
  // Formatear si tenemos 10 dígitos
  if (numeroLocal.length === 10) {
    return numeroLocal.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  
  // Devolver los últimos 10 sin formato
  return numeroLocal.length > 10 ? numeroLocal.slice(-10) : numeroLocal;
};

/**
 * Generar número de pedido único
 */
export const generarNumeroPedido = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const año = (parts.find(p => p.type === 'year')?.value ?? '').slice(-2);
  const mes = parts.find(p => p.type === 'month')?.value ?? '00';
  const dia = parts.find(p => p.type === 'day')?.value ?? '00';
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `${año}${mes}${dia}${random}`;
};

/**
 * Limpiar número de WhatsApp
 */
export const limpiarNumeroWhatsApp = (numero) => {
  // Remover prefijo whatsapp:
  let limpio = numero.replace('whatsapp:', '');
  
  // Remover caracteres especiales
  limpio = limpio.replace(/[^\d+]/g, '');
  
  return limpio;
};

/**
 * Capitalizar primera letra
 */
export const capitalizar = (texto) => {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

/**
 * Truncar texto
 */
export const truncarTexto = (texto, longitud = 50) => {
  if (texto.length <= longitud) return texto;
  return texto.substring(0, longitud) + '...';
};

/**
 * Pluralizar palabra
 */
export const pluralizar = (cantidad, singular, plural) => {
  return cantidad === 1 ? singular : plural;
};

/**
 * Formatear nombre de producto combinando subcategoría + nombre.
 * Elimina la palabra "General" que no aporta contexto.
 * Acepta tanto un objeto producto como {nombre, subcategoria}.
 */
export const formatearNombreProducto = (producto) => {
  if (!producto) return '';
  const nombre = String(producto.nombre || '').trim();
  let subcategoria = String(producto.subcategoria || '').trim().replace(/\bgeneral\b/gi, '').trim();
  if (!subcategoria) return nombre;
  if (nombre.toLowerCase().includes(subcategoria.toLowerCase())) return nombre;
  return `${subcategoria} - ${nombre}`;
};

export default {
  formatearPrecio,
  formatearFecha,
  formatearFechaCorta,
  formatearHora,
  formatearTelefono,
  generarNumeroPedido,
  limpiarNumeroWhatsApp,
  capitalizar,
  truncarTexto,
  pluralizar,
  formatearNombreProducto
};
