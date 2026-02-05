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
  const numeros = telefono.replace(/\D/g, '');
  
  if (numeros.length === 10) {
    return numeros.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  
  return telefono;
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
