import twilioClient from './config/twilio.js';
import { testTwilioConnection } from './config/twilio.js';
import config from './config/environment.js';
import logger from './utils/logger.js';
import TwilioService from './services/twilioService.js';

/**
 * Script para probar la conexión y funcionalidad de Twilio
 */

console.log('\n🔍 PRUEBA DE TWILIO - WhatsApp Integration\n');
console.log('='.repeat(50));

async function probarTwilio() {
  try {
    // 1. Mostrar configuración actual
    console.log('\n📋 Configuración actual:');
    console.log('  Account SID:', config.twilio.accountSid);
    console.log('  Auth Token:', config.twilio.authToken ? '✅ Configurado' : '❌ No configurado');
    console.log('  WhatsApp From:', config.twilio.whatsappClientes);
    console.log('  WhatsApp Admin:', config.twilio.whatsappAdmin);

    // 2. Verificar conexión
    console.log('\n🔌 Verificando conexión con Twilio...');
    const connected = await testTwilioConnection();

    if (!connected) {
      console.log('\n❌ No se pudo conectar con Twilio.');
      console.log('\n💡 Verifica que:');
      console.log('  1. TWILIO_ACCOUNT_SID está configurado correctamente');
      console.log('  2. TWILIO_AUTH_TOKEN es válido');
      console.log('  3. Tienes conexión a internet');
      process.exit(1);
    }

    // 3. Listar mensajes recientes (últimos 5)
    console.log('\n📨 Obteniendo últimos 5 mensajes...');
    const messages = await twilioClient.messages.list({ limit: 5 });
    
    if (messages.length === 0) {
      console.log('  No hay mensajes en la cuenta aún');
    } else {
      messages.forEach((msg, index) => {
        console.log(`\n  Mensaje #${index + 1}:`);
        console.log(`    SID: ${msg.sid}`);
        console.log(`    De: ${msg.from}`);
        console.log(`    Para: ${msg.to}`);
        console.log(`    Estado: ${msg.status}`);
        console.log(`    Fecha: ${msg.dateCreated}`);
        console.log(`    Cuerpo: ${msg.body.substring(0, 50)}...`);
      });
    }

    // 4. Verificar el Sandbox de WhatsApp
    console.log('\n\n📱 WhatsApp Sandbox:');
    console.log('  Para probar WhatsApp, necesitas conectar tu teléfono al Sandbox:');
    console.log('\n  1. Abre WhatsApp');
    console.log('  2. Crea un chat con: +1 (415) 523-8886');
    console.log('  3. Envía: join <tu-código-sandbox>');
    console.log('  4. Espera confirmación de Twilio');
    console.log('\n  🔗 Ve a: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');

    // 5. Preguntar si desea enviar un mensaje de prueba
    console.log('\n\n🚀 ¿Deseas enviar un mensaje de prueba?');
    console.log('\nPara enviar un mensaje de prueba, ejecuta:');
    console.log('  node src/testTwilioEnviar.js +5215512345678');
    console.log('\nReemplaza +5215512345678 con tu número (debe tener join activo)');

    console.log('\n' + '='.repeat(50));
    console.log('✅ Prueba de conexión completada\n');

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error.message);
    console.error('\nDetalles del error:', error);
    process.exit(1);
  }
}

// Ejecutar prueba
probarTwilio();
