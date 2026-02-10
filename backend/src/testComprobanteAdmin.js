/**
 * Script de prueba para verificar el envío de comprobante al admin
 */
import TwilioService from './services/twilioService.js';
import config from './config/environment.js';
import logger from './utils/logger.js';

async function testEnviarComprobanteAdmin() {
  console.log('\n🧪 ========== TEST: ENVÍO DE COMPROBANTE AL ADMIN ==========\n');

  // URL de imagen de prueba
  const urlImagenPrueba = 'https://picsum.photos/400/600';

  const mensaje = `🔔 *NUEVO PEDIDO PENDIENTE DE APROBACIÓN*

📝 Pedido: *#TEST123456*
👤 Cliente: *Cliente de Prueba*
📞 Teléfono: +52xxxxxxxxxx
📍 Dirección: Calle de prueba 123

🛒 *TU PEDIDO:*

2x Tacos al Pastor = $60.00
1x Refresco = $25.00

💰 *TOTAL: $85.00*

💳 *Método de pago:* Transferencia bancaria
📝 Info: Imagen recibida

⏳ *ACCIÓN REQUERIDA:*
Para aprobar este pedido, responde:
*aprobar #TEST123456*

Para rechazar:
*rechazar #TEST123456*

👉 También puedes gestionarlo desde el dashboard`;

  try {
    console.log('📤 Enviando mensaje con imagen al admin...');
    console.log(`📱 Admin: ${config.admin.phoneNumber}`);
    console.log(`🖼️ URL de imagen: ${urlImagenPrueba}\n`);

    const resultado = await TwilioService.enviarMensajeConImagen(
      config.admin.phoneNumber,
      mensaje,
      urlImagenPrueba
    );

    if (resultado.success) {
      console.log('✅ Mensaje enviado exitosamente');
      console.log(`📊 Message SID: ${resultado.messageSid}\n`);
      
      // Esperar un momento y verificar el estado
      console.log('⏳ Esperando 3 segundos para verificar estado...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const estado = await TwilioService.obtenerEstadoMensaje(resultado.messageSid);
      
      if (estado.success) {
        console.log('📊 Estado del mensaje:');
        console.log(`   - Status: ${estado.data.status}`);
        console.log(`   - Error Code: ${estado.data.errorCode || 'N/A'}`);
        console.log(`   - Error Message: ${estado.data.errorMessage || 'N/A'}`);
        console.log(`   - Date Sent: ${estado.data.dateSent || 'N/A'}\n`);
      }
      
      console.log('✅ TEST COMPLETADO EXITOSAMENTE\n');
      console.log('🔍 Verifica tu WhatsApp del admin para confirmar que recibiste:');
      console.log('   1. El mensaje con el texto del pedido');
      console.log('   2. La imagen del comprobante\n');
    } else {
      console.error('❌ Error al enviar mensaje:', resultado.error);
      console.error(`🔍 Código de error: ${resultado.errorCode || 'N/A'}\n`);
      
      console.log('\n📋 POSIBLES SOLUCIONES:');
      console.log('1. Verifica que TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN sean correctos');
      console.log('2. Verifica que TWILIO_WHATSAPP_CLIENTES esté configurado (ej: whatsapp:+14155238886)');
      console.log('3. Verifica que ADMIN_PHONE_NUMBER incluya código de país (ej: +521234567890)');
      console.log('4. Asegúrate de que el sandbox de Twilio esté activo y conectado');
      console.log('5. Revisa los logs de Twilio en: https://console.twilio.com/\n');
    }
  } catch (error) {
    console.error('💥 Error crítico:', error);
    console.error(error.stack);
  }

  console.log('========== FIN DEL TEST ==========\n');
  process.exit();
}

// Ejecutar test
testEnviarComprobanteAdmin().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
