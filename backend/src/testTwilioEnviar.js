import TwilioService from './services/twilioService.js';
import logger from './utils/logger.js';

/**
 * Script para enviar un mensaje de prueba a WhatsApp
 * Uso: node src/testTwilioEnviar.js +5215512345678
 */

console.log('\n📤 ENVIAR MENSAJE DE PRUEBA - WhatsApp\n');
console.log('='.repeat(50));

async function enviarMensajePrueba() {
  try {
    // Obtener número del argumento
    const numeroDestino = process.argv[2];

    if (!numeroDestino) {
      console.log('❌ Error: Debes proporcionar un número de teléfono');
      console.log('\n💡 Uso:');
      console.log('  node src/testTwilioEnviar.js +5215512345678');
      console.log('  node src/testTwilioEnviar.js whatsapp:+5215512345678');
      console.log('\n⚠️ Importante:');
      console.log('  - El número debe tener formato internacional con +');
      console.log('  - El número debe haber hecho "join" al Sandbox de Twilio');
      console.log('  - Ve a: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
      process.exit(1);
    }

    console.log(`\n📱 Enviando mensaje a: ${numeroDestino}`);
    console.log('⏳ Enviando...\n');

    // Crear mensaje de prueba
    const mensaje = `🌮 ¡Hola desde El Rinconcito! 🌮

Este es un mensaje de prueba del sistema de pedidos por WhatsApp.

✅ Tu integración con Twilio funciona correctamente.

Fecha: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}

¡Buen provecho! 🎉`;

    // Enviar mensaje
    const resultado = await TwilioService.enviarMensajeCliente(numeroDestino, mensaje);

    if (resultado.success) {
      console.log('✅ ¡Mensaje enviado exitosamente!');
      console.log(`\n📋 Detalles:`);
      console.log(`  Message SID: ${resultado.messageSid}`);
      console.log(`  Destinatario: ${numeroDestino}`);
      console.log('\n💡 Revisa tu WhatsApp para ver el mensaje');
      
      // Esperar un momento y verificar estado
      console.log('\n⏳ Verificando estado del mensaje en 3 segundos...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      const estado = await TwilioService.obtenerEstadoMensaje(resultado.messageSid);
      if (estado.success) {
        console.log(`\n📊 Estado del mensaje:`);
        console.log(`  Estado: ${estado.data.status}`);
        console.log(`  Fecha enviado: ${estado.data.dateSent || 'Pendiente'}`);
        if (estado.data.errorCode) {
          console.log(`  ⚠️ Error: ${estado.data.errorMessage} (${estado.data.errorCode})`);
        }
      }

    } else {
      console.log('❌ Error al enviar mensaje');
      console.log(`\nDetalles: ${resultado.error}`);
      console.log('\n💡 Posibles causas:');
      console.log('  1. El número no ha hecho "join" al Sandbox de Twilio');
      console.log('  2. El formato del número es incorrecto');
      console.log('  3. Credenciales de Twilio inválidas');
      console.log('  4. Problemas de conectividad');
    }

    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Error inesperado:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
enviarMensajePrueba();
