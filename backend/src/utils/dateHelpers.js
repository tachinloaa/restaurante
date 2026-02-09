import config from '../config/environment.js';

/**
 * Utilidades para manejo de fechas con zona horaria de México
 */

/**
 * Obtener fecha actual en zona horaria de México
 */
export const getFechaMexico = () => {
  return new Date().toLocaleString('es-MX', {
    timeZone: config.timezone
  });
};

/**
 * Formatear fecha para zona horaria de México
 */
export const formatearFechaMexico = (fecha) => {
  const date = fecha instanceof Date ? fecha : new Date(fecha);
  
  return date.toLocaleString('es-MX', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * Obtener inicio del día actual en México
 */
export const getInicioDiaMexico = () => {
  const ahora = new Date();
  const fechaMexico = new Date(ahora.toLocaleString('en-US', { timeZone: config.timezone }));
  fechaMexico.setHours(0, 0, 0, 0);
  return fechaMexico;
};

/**
 * Obtener inicio de la semana actual en México
 */
export const getInicioSemanaMexico = () => {
  const inicio = getInicioDiaMexico();
  const dia = inicio.getDay();
  inicio.setDate(inicio.getDate() - dia);
  return inicio;
};

/**
 * Obtener inicio del mes actual en México
 */
export const getInicioMesMexico = () => {
  const ahora = new Date();
  const fechaMexico = new Date(ahora.toLocaleString('en-US', { timeZone: config.timezone }));
  return new Date(fechaMexico.getFullYear(), fechaMexico.getMonth(), 1);
};

/**
 * Convertir fecha UTC a zona horaria de México
 */
export const utcToMexico = (fechaUtc) => {
  const date = new Date(fechaUtc);
  return new Date(date.toLocaleString('en-US', { timeZone: config.timezone }));
};

/**
 * Obtener rango de fechas (desde-hasta) para consultas
 */
export const getRangoFechas = (tipo = 'hoy') => {
  const ahora = new Date();
  let desde, hasta;

  switch (tipo) {
    case 'hoy':
      desde = getInicioDiaMexico();
      hasta = new Date(desde);
      hasta.setHours(23, 59, 59, 999);
      break;

    case 'ayer':
      desde = getInicioDiaMexico();
      desde.setDate(desde.getDate() - 1);
      hasta = new Date(desde);
      hasta.setHours(23, 59, 59, 999);
      break;

    case 'semana':
      desde = getInicioSemanaMexico();
      hasta = new Date();
      break;

    case 'mes':
      desde = getInicioMesMexico();
      hasta = new Date();
      break;

    case 'ultimos7dias':
      desde = getInicioDiaMexico();
      desde.setDate(desde.getDate() - 7);
      hasta = new Date();
      break;

    case 'ultimos30dias':
      desde = getInicioDiaMexico();
      desde.setDate(desde.getDate() - 30);
      hasta = new Date();
      break;

    default:
      desde = getInicioDiaMexico();
      hasta = new Date();
  }

  return {
    desde: desde.toISOString(),
    hasta: hasta.toISOString()
  };
};

/**
 * Formatear duración en formato legible
 */
export const formatearDuracion = (minutos) => {
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
};

export default {
  getFechaMexico,
  formatearFechaMexico,
  getInicioDiaMexico,
  getInicioSemanaMexico,
  getInicioMesMexico,
  utcToMexico,
  getRangoFechas,
  formatearDuracion
};
