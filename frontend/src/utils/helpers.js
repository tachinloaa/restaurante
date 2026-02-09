/**
 * Formatear precio como moneda mexicana
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
    minute: '2-digit'
  }).format(new Date(fecha));
};

/**
 * Formatear fecha corta
 */
export const formatearFechaCorta = (fecha) => {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(fecha));
};

/**
 * Formatear hora
 */
export const formatearHora = (fecha) => {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(fecha));
};

/**
 * Formatear teléfono
 */
export const formatearTelefono = (telefono) => {
  if (!telefono) return '';
  
  // Eliminar todos los caracteres no numéricos
  const numeros = telefono.replace(/\D/g, '');
  
  // Si tiene el prefijo +521 o +52 (13 o 12 dígitos), tomar los últimos 10
  let numeroLocal = numeros;
  if (numeros.length >= 12) {
    // Asumimos que los primeros 2 o 3 dígitos son el código de país (52 o 521)
    numeroLocal = numeros.slice(-10);
  }
  
  // Formatear solo si tenemos 10 dígitos
  if (numeroLocal.length === 10) {
    return numeroLocal.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  
  // Si no tiene 10 dígitos, devolver los últimos 10 sin formato
  return numeroLocal.length > 10 ? numeroLocal.slice(-10) : numeroLocal;
};

/**
 * Obtener fecha de hace X días
 */
export const obtenerFechaHaceDias = (dias) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString();
};

export default {
  formatearPrecio,
  formatearFecha,
  formatearFechaCorta,
  formatearHora,
  formatearTelefono,
  obtenerFechaHaceDias
};
