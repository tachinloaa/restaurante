/**
 * Validadores personalizados
 */

/**
 * Validar número de teléfono internacional (incluye foráneos)
 * Acepta: México (+52), USA (+1), Centroamérica, Sudamérica, etc.
 */
export const esValidoTelefonoInternacional = (telefono) => {
  if (!telefono) return false;
  
  // Limpiar el número (quitar todo excepto dígitos y +)
  const limpio = telefono.replace(/[^\d+]/g, '');
  
  // Debe tener al menos 10 dígitos (sin contar el +)
  const digitos = limpio.replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 15) {
    return false;
  }
  
  // Si tiene +, debe estar al inicio
  if (limpio.includes('+') && !limpio.startsWith('+')) {
    return false;
  }
  
  // Validar que no empiece con 0 (números inválidos)
  const primerDigito = digitos[0];
  if (primerDigito === '0') {
    return false;
  }
  
  return true;
};

/**
 * Formatear número de teléfono para WhatsApp
 * Maneja números mexicanos, foráneos, con o sin +
 */
export const formatearTelefonoWhatsApp = (telefono) => {
  if (!telefono) return null;
  
  // Si ya tiene el prefijo whatsapp:, retornarlo
  if (telefono.startsWith('whatsapp:')) {
    return telefono;
  }
  
  // Limpiar el número
  let limpio = telefono.replace(/[^\d+]/g, '');
  
  // Si no tiene +, asumir que es mexicano y agregar +52
  if (!limpio.startsWith('+')) {
    // Si empieza con 52 y tiene 12 dígitos, ya tiene lada
    if (limpio.startsWith('52') && limpio.length === 12) {
      limpio = '+' + limpio;
    } else {
      // Agregar +52 (México)
      limpio = '+52' + limpio;
    }
  }
  
  return `whatsapp:${limpio}`;
};

/**
 * Detectar si es número mexicano
 */
export const esTelefonoMexicano = (telefono) => {
  const limpio = telefono.replace(/[^\d+]/g, '');
  return limpio.startsWith('+52') || limpio.startsWith('52');
};

/**
 * Detectar si es número de USA/Canadá
 */
export const esTelefonoUSA = (telefono) => {
  const limpio = telefono.replace(/[^\d+]/g, '');
  return limpio.startsWith('+1') || (limpio.length === 10 && !limpio.startsWith('52'));
};

/**
 * Validar teléfono mexicano (legacy - mantener compatibilidad)
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
 * Validar precio en Pesos Mexicanos (MXN)
 * Reglas:
 * - Mínimo: $1.00
 * - Máximo: $99,999.99
 * - Máximo 2 decimales (centavos)
 * - No aceptar valores negativos
 */
export const esValidoPrecioMXN = (precio) => {
  // Convertir a número
  const num = Number(precio);
  
  // Debe ser un número válido
  if (isNaN(num) || !isFinite(num)) {
    return { valido: false, error: 'El precio no es un número válido' };
  }
  
  // No negativos
  if (num < 0) {
    return { valido: false, error: 'El precio no puede ser negativo' };
  }
  
  // Mínimo $1.00
  if (num < 1) {
    return { valido: false, error: 'El precio mínimo es $1.00' };
  }
  
  // Máximo $99,999.99
  if (num > 99999.99) {
    return { valido: false, error: 'El precio máximo es $99,999.99' };
  }
  
  // Validar máximo 2 decimales
  const decimales = (num.toString().split('.')[1] || '').length;
  if (decimales > 2) {
    return { valido: false, error: 'El precio solo puede tener hasta 2 decimales (centavos)' };
  }
  
  return { valido: true, valor: Math.round(num * 100) / 100 };
};

/**
 * Formatear precio en formato mexicano
 * Ejemplo: 1500.50 -> $1,500.50
 */
export const formatearPrecioMXN = (precio) => {
  const num = Number(precio);
  if (isNaN(num)) return '$0.00';
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
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

/**
 * Validar URL de media (comprobantes de pago)
 * Solo permitir URLs de Twilio
 */
export const esUrlMediaValida = (url) => {
  if (!url || typeof url !== 'string') {
    return { valido: false, error: 'URL no proporcionada' };
  }
  
  try {
    const parsed = new URL(url);
    
    // Solo permitir URLs de Twilio
    const dominiosPermitidos = [
      'api.twilio.com',
      'media.twiliocdn.com'
    ];
    
    if (!dominiosPermitidos.includes(parsed.hostname)) {
      return { 
        valido: false, 
        error: 'URL no válida. Solo se aceptan comprobantes de Twilio.' 
      };
    }
    
    // Verificar que use HTTPS
    if (parsed.protocol !== 'https:') {
      return { valido: false, error: 'La URL debe usar HTTPS' };
    }
    
    return { valido: true };
  } catch (error) {
    return { valido: false, error: 'URL malformada' };
  }
};

/**
 * Validar tipo de archivo de media
 */
export const esTipoMediaValido = (contentType) => {
  const tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/pdf'
  ];
  
  if (!contentType) return { valido: false, error: 'Tipo de archivo no especificado' };
  
  if (!tiposPermitidos.includes(contentType)) {
    return { 
      valido: false, 
      error: `Tipo de archivo no permitido: ${contentType}. Solo se aceptan imágenes (JPG, PNG) y PDF.` 
    };
  }
  
  return { valido: true };
};

export default {
  esValidoTelefono,
  esValidoTelefonoInternacional,
  formatearTelefonoWhatsApp,
  esTelefonoMexicano,
  esTelefonoUSA,
  esValidoEmail,
  esValidoUUID,
  esValidoPrecio,
  esValidoPrecioMXN,
  formatearPrecioMXN,
  esValidaCantidad,
  sanitizarTexto,
  esValidaLongitud,
  esValidoNombre,
  esValidaDireccion,
  sanitizarInput,
  esUrlMediaValida,
  esTipoMediaValido
};
