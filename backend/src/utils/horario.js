import logger from './logger.js';

/**
 * Configuración del horario de atención
 * El Rinconcito: 7:00 AM - 10:00 PM todos los días
 */
export const HORARIO_ATENCION = {
  // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  0: { abierto: true, inicio: '07:00', fin: '22:00' },
  1: { abierto: true, inicio: '07:00', fin: '22:00' },
  2: { abierto: true, inicio: '07:00', fin: '22:00' },
  3: { abierto: true, inicio: '07:00', fin: '22:00' },
  4: { abierto: true, inicio: '07:00', fin: '22:00' },
  5: { abierto: true, inicio: '07:00', fin: '22:00' },
  6: { abierto: true, inicio: '07:00', fin: '22:00' },
};

/**
 * Verificar si el restaurante está abierto
 * @param {Date} fecha - Fecha a verificar (default: ahora)
 * @returns {Object} - { abierto: boolean, mensaje: string, proximaApertura: Date|null }
 */
export const verificarHorario = (fecha = new Date()) => {
  // Extraer componentes de hora en México usando formatToParts (evita bug de new Date(localeString))
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(fecha);

  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dia = weekdayMap[parts.find(p => p.type === 'weekday')?.value] ?? new Date().getDay();
  const horaActual = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const minutosActual = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
  const minutosTotales = horaActual * 60 + minutosActual;
  
  const horario = HORARIO_ATENCION[dia];
  
  if (!horario || !horario.abierto) {
    return {
      abierto: false,
      mensaje: '⛔ Estamos cerrados hoy.',
      proximaApertura: calcularProximaApertura(fecha, dia)
    };
  }
  
  const [horaInicio, minInicio] = horario.inicio.split(':').map(Number);
  const [horaFin, minFin] = horario.fin.split(':').map(Number);
  
  const minutosInicio = horaInicio * 60 + minInicio;
  const minutosFin = horaFin * 60 + minFin;
  
  const estaAbierto = minutosTotales >= minutosInicio && minutosTotales < minutosFin;
  
  if (estaAbierto) {
    const minutosRestantes = minutosFin - minutosTotales;
    const horasRestantes = Math.floor(minutosRestantes / 60);
    const minsRestantes = minutosRestantes % 60;
    
    return {
      abierto: true,
      mensaje: `✅ Estamos abiertos. Cerramos a las ${horario.fin} (${horasRestantes}h ${minsRestantes}m restantes)`,
      cierraEn: { horas: horasRestantes, minutos: minsRestantes }
    };
  }
  
  // Está cerrado
  if (minutosTotales < minutosInicio) {
    // Aún no abre hoy
    const minutosHastaApertura = minutosInicio - minutosTotales;
    const horasHasta = Math.floor(minutosHastaApertura / 60);
    const minsHasta = minutosHastaApertura % 60;
    
    return {
      abierto: false,
      mensaje: `⏰ Aún no abrimos. Abrimos a las ${horario.inicio} (${horasHasta}h ${minsHasta}m)`,
      proximaApertura: new Date(fecha.setHours(horaInicio, minInicio, 0, 0))
    };
  }
  
  // Ya cerró, calcular siguiente día
  return {
    abierto: false,
    mensaje: `⛔ Ya cerramos. Abrimos mañana a las 07:00 AM`,
    proximaApertura: calcularProximaApertura(fecha, dia)
  };
};

/**
 * Calcular cuándo abre el siguiente día
 */
const calcularProximaApertura = (fecha, diaActual) => {
  const siguienteDia = new Date(fecha);
  siguienteDia.setDate(siguienteDia.getDate() + 1);
  siguienteDia.setHours(7, 0, 0, 0);
  return siguienteDia;
};

/**
 * Mensaje para cliente cuando está cerrado
 */
/**
 * Obtener componentes de fecha/hora en zona horaria de México.
 * Usar en lugar de new Date().getDay() o new Date(localeString) para evitar bugs de timezone.
 */
export const getMexicoDateParts = (fecha = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
  }).formatToParts(fecha);

  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dayOfWeek: weekdayMap[parts.find(p => p.type === 'weekday')?.value] ?? 0,
    year: parts.find(p => p.type === 'year')?.value ?? '',
    month: parts.find(p => p.type === 'month')?.value ?? '',
    day: parts.find(p => p.type === 'day')?.value ?? '',
    hour: parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10),
    minute: parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
  };
};

export const getMensajeCerrado = (infoHorario) => {
  const horaApertura = infoHorario.proximaApertura 
    ? infoHorario.proximaApertura.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    : '07:00 AM';
  
  return `🕐 *Estamos cerrados*\n\n` +
    `${infoHorario.mensaje}\n\n` +
    `⏰ *Nuestro horario:*\n` +
    `Todos los días: 7:00 AM - 10:00 PM\n\n` +
    `¡Te esperamos cuando abramos! 🌮`;
};

export default {
  verificarHorario,
  getMensajeCerrado,
  getMexicoDateParts,
  HORARIO_ATENCION
};
