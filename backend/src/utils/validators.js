/**
 * Validadores personalizados
 */

/**
 * Validar teléfono mexicano
 */
export const esValidoTelefono = (telefono) => {
  const regex = /^(\+?52)?[1-9]\d{9}$/;
  const limpio = telefono.replace(/\D/g, '');
  return regex.test(limpio);
};

/**
 * Validar email
 */
export const esValidoEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validar UUID
 */
export const esValidoUUID = (uuid) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

/**
 * Validar precio
 */
export const esValidoPrecio = (precio) => {
  return Number(precio) > 0 && Number(precio) < 100000;
};

/**
 * Validar cantidad
 */
export const esValidaCantidad = (cantidad) => {
  return Number.isInteger(cantidad) && cantidad > 0 && cantidad <= 100;
};

/**
 * Sanitizar texto
 */
export const sanitizarTexto = (texto) => {
  if (!texto) return '';
  return texto.trim().replace(/<[^>]*>/g, ''); // Remover HTML
};

/**
 * Validar longitud de texto
 */
export const esValidaLongitud = (texto, min, max) => {
  const longitud = texto.trim().length;
  return longitud >= min && longitud <= max;
};

export default {
  esValidoTelefono,
  esValidoEmail,
  esValidoUUID,
  esValidoPrecio,
  esValidaCantidad,
  sanitizarTexto,
  esValidaLongitud
};
