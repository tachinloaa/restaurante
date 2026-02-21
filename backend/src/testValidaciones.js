/**
 * Script de prueba de las nuevas validaciones
 * Ejecutar: node backend/src/testValidaciones.js
 */

import { 
  esValidoTelefonoInternacional, 
  formatearTelefonoWhatsApp,
  esTelefonoMexicano,
  esTelefonoUSA,
  esValidoPrecioMXN,
  formatearPrecioMXN,
  esUrlMediaValida,
  esTipoMediaValido
} from './utils/validators.js';

console.log('🧪 Probando validaciones...\n');

// ===== TELÉFONOS =====
console.log('📱 VALIDACIÓN DE TELÉFONOS INTERNACIONALES');
console.log('='.repeat(50));

const telefonos = [
  '+5215512345678',     // México
  '5512345678',         // México sin +52
  '+14155551234',       // USA
  '+50360001234',       // Costa Rica
  '+573001234567',      // Colombia
  '0012345678',         // Inválido (empieza con 0)
  '123',                // Muy corto
];

telefonos.forEach(tel => {
  const valido = esValidoTelefonoInternacional(tel);
  const formato = valido ? formatearTelefonoWhatsApp(tel) : 'N/A';
  const esMX = valido ? esTelefonoMexicano(tel) : false;
  const esUS = valido ? esTelefonoUSA(tel) : false;
  
  console.log(`${tel.padEnd(20)} -> ${valido ? '✅' : '❌'} ${formato || ''}`);
  if (valido) {
    console.log(`   País: ${esMX ? '🇲🇽 México' : esUS ? '🇺🇸 USA' : '🌎 Otro'}`);
  }
});

console.log('\n');

// ===== PRECIOS =====
console.log('💵 VALIDACIÓN DE PRECIOS MXN');
console.log('='.repeat(50));

const precios = [
  150.50,      // Válido
  1,           // Mínimo válido
  99999.99,    // Máximo válido
  0.50,        // Muy bajo
  100000,      // Muy alto
  150.555,     // Demasiados decimales
  -50,         // Negativo
];

precios.forEach(precio => {
  const resultado = esValidoPrecioMXN(precio);
  console.log(`$${precio.toString().padEnd(12)} -> ${resultado.valido ? '✅' : '❌'}`);
  if (resultado.valido) {
    console.log(`   Formateado: ${formatearPrecioMXN(precio)}`);
  } else {
    console.log(`   Error: ${resultado.error}`);
  }
});

console.log('\n');

// ===== URLs DE MEDIA =====
console.log('🔗 VALIDACIÓN DE URLs DE MEDIA');
console.log('='.repeat(50));

const urls = [
  'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages/MM456/Media/ME789',
  'https://media.twiliocdn.com/image.jpg',
  'https://evil.com/fake.jpg',
  'http://api.twilio.com/image.jpg', // HTTP en lugar de HTTPS
  null,
];

urls.forEach(url => {
  const resultado = esUrlMediaValida(url);
  console.log(`${(url || 'null').substring(0, 60).padEnd(60)} -> ${resultado.valido ? '✅' : '❌'}`);
  if (!resultado.valido) {
    console.log(`   Error: ${resultado.error}`);
  }
});

console.log('\n');

// ===== TIPOS DE MEDIA =====
console.log('📄 VALIDACIÓN DE TIPOS DE MEDIA');
console.log('='.repeat(50));

const tipos = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'image/gif', // No permitido
  'video/mp4', // No permitido
];

tipos.forEach(tipo => {
  const resultado = esTipoMediaValido(tipo);
  console.log(`${tipo.padEnd(25)} -> ${resultado.valido ? '✅' : '❌'}`);
  if (!resultado.valido) {
    console.log(`   Error: ${resultado.error}`);
  }
});

console.log('\n✅ Pruebas completadas\n');
