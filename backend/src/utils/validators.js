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
 * Validar que el nombre solo contenga letras, espacios y acentos
 */
export const esValidoNombre = (nombre) => {
  if (!nombre || nombre.trim().length < 3) return false;
  // Permitir letras (incluye acentos), espacios, ñ, apóstrofes
  const regex = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s']+$/;
  return regex.test(nombre.trim());
};

/**
 * Validar dirección (debe tener calle y número o S/N)
 */
export const esValidaDireccion = (direccion) => {
  if (!direccion || direccion.trim().length < 10) return false;

  const texto = direccion.toUpperCase();

  // Debe contener número O la palabra S/N (sin número)
  const tieneNumero = /\d+/.test(texto);
  const tieneSinNumero = /S\/N|SN|SIN\s*NUMERO|SIN\s*N[UÚ]MERO/.test(texto);

  return tieneNumero || tieneSinNumero;
};

/**
 * Sanitizar input del usuario (prevenir inyecciones y limpiar formato)
 */
export const sanitizarInput = (input) => {
  if (!input) return '';

  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remover scripts
    .replace(/<[^>]*>/g, '') // Remover HTML
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+=/gi, '') // Remover event handlers
    // Limpiar formato markdown que aparece al copiar/pegar
    .replace(/\*\*/g, '') // Remover negritas **
    .replace(/\*/g, '') // Remover asteriscos simples *
    .replace(/_/g, '') // Remover guiones bajos _
    .replace(/~/g, '') // Remover tildes ~
    .replace(/`/g, '') // Remover backticks `
    .substring(0, 500); // Limitar longitud
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
