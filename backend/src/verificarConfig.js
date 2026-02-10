/**
 * Script para verificar la configuración de variables de entorno
 */
import config from './config/environment.js';
import logger from './utils/logger.js';

console.log('\n🔍 ========== VERIFICACIÓN DE CONFIGURACIÓN ==========\n');

// Verificar Supabase
console.log('📊 SUPABASE:');
console.log(`   URL: ${config.supabase.url ? '✅ Configurado' : '❌ NO configurado'}`);
console.log(`   Key: ${config.supabase.key ? '✅ Configurado' : '❌ NO configurado'}`);

if (config.supabase.url) {
  console.log(`   Valor: ${config.supabase.url}`);
}

// Verificar Twilio
console.log('\n📱 TWILIO:');
console.log(`   Account SID: ${config.twilio.accountSid ? '✅ Configurado' : '❌ NO configurado'}`);
console.log(`   Auth Token: ${config.twilio.authToken ? '✅ Configurado' : '❌ NO configurado'}`);
console.log(`   WhatsApp Number: ${config.twilio.whatsappClientes ? '✅ Configurado' : '❌ NO configurado'}`);

if (config.twilio.accountSid) {
  console.log(`   Account SID: ${config.twilio.accountSid}`);
}

if (config.twilio.whatsappClientes) {
  console.log(`   WhatsApp: ${config.twilio.whatsappClientes}`);
  
  // Verificar formato
  if (!config.twilio.whatsappClientes.startsWith('whatsapp:')) {
    console.log('   ⚠️  WARNING: El número debe empezar con "whatsapp:" (e.g., whatsapp:+14155238886)');
  }
}

// Verificar Admin
console.log('\n👤 ADMIN:');
console.log(`   Phone Number: ${config.admin.phoneNumber ? '✅ Configurado' : '❌ NO configurado'}`);

if (config.admin.phoneNumber) {
  console.log(`   Valor: ${config.admin.phoneNumber}`);
  
  // Verificar formato
  if (!config.admin.phoneNumber.startsWith('+')) {
    console.log('   ⚠️  WARNING: El número debe incluir código de país con + (e.g., +521234567890)');
  }
  
  if (config.admin.phoneNumber.startsWith('whatsapp:')) {
    console.log('   ⚠️  WARNING: NO incluyas "whatsapp:" en ADMIN_PHONE_NUMBER');
  }
}

// Verificar Frontend
console.log('\n🌐 FRONTEND:');
console.log(`   URL: ${config.frontendUrl}`);

// Verificar Entorno
console.log('\n⚙️  ENTORNO:');
console.log(`   NODE_ENV: ${config.env}`);
console.log(`   Puerto: ${config.port}`);
console.log(`   Log Level: ${config.logLevel}`);

// Resumen
console.log('\n📋 RESUMEN:');

const checks = [
  { name: 'Supabase URL', value: config.supabase.url },
  { name: 'Supabase Key', value: config.supabase.key },
  { name: 'Twilio Account SID', value: config.twilio.accountSid },
  { name: 'Twilio Auth Token', value: config.twilio.authToken },
  { name: 'Twilio WhatsApp', value: config.twilio.whatsappClientes },
  { name: 'Admin Phone', value: config.admin.phoneNumber }
];

const passed = checks.filter(c => c.value).length;
const total = checks.length;

console.log(`   Configuradas: ${passed}/${total}`);

if (passed === total) {
  console.log('   ✅ Todas las variables críticas están configuradas\n');
} else {
  console.log('   ⚠️  Algunas variables no están configuradas\n');
  
  const missing = checks.filter(c => !c.value);
  console.log('   Variables faltantes:');
  missing.forEach(m => {
    console.log(`   - ${m.name}`);
  });
  console.log();
}

// Instrucciones
console.log('📝 INSTRUCCIONES:');
console.log('   1. Copia .env.example a .env.development');
console.log('   2. Completa todas las variables con tus credenciales');
console.log('   3. Para Twilio WhatsApp, usa el número del sandbox (whatsapp:+14155238886)');
console.log('   4. Para ADMIN_PHONE_NUMBER, usa tu número con código de país (+52...)');
console.log('   5. Ejecuta: node src/testComprobanteAdmin.js para probar');

console.log('\n========== FIN DE LA VERIFICACIÓN ==========\n');
