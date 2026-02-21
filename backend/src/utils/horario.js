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
  // Convertir a hora de México (UTC-6 o UTC-5 dependiendo del horario de verano)
  const opciones = { timeZone: 'America/Mexico_City', hour12: false };
  const horaMexico = fecha.toLocaleString('es-MX', opciones);
  const fechaMexico = new Date(horaMexico);
  
  const dia = fechaMexico.getDay();
  const horaActual = fechaMexico.getHours();
  const minutosActual = fechaMexico.getMinutes();
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
  HORARIO_ATENCION
};
