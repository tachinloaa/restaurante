/**
 * Script para verificar el despliegue en Render
 * Uso: node check-render.js https://tu-backend.onrender.com
 */

const https = require('https');

const RENDER_URL = process.argv[2] || 'https://el-rinconcito-backend.onrender.com';

console.log('🔍 Verificando despliegue en Render...\n');
console.log(`URL: ${RENDER_URL}\n`);

// Test 1: Health Check
function testHealth() {
  return new Promise((resolve, reject) => {
    console.log('1️⃣  Verificando /api/health...');
    
    https.get(`${RENDER_URL}/api/health`, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('   ✅ Health check OK');
          console.log(`   Status: ${res.statusCode}`);
          try {
            const json = JSON.parse(data);
            console.log(`   Response: ${JSON.stringify(json)}\n`);
          } catch (e) {
            console.log(`   Response: ${data}\n`);
          }
          resolve(true);
        } else {
          console.log(`   ❌ Error: Status ${res.statusCode}`);
          console.log(`   Response: ${data}\n`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      resolve(false);
    });
  });
}

// Test 2: API disponible
function testAPI() {
  return new Promise((resolve, reject) => {
    console.log('2️⃣  Verificando /api...');
    
    https.get(`${RENDER_URL}/api`, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        if (res.statusCode === 200 || res.statusCode === 404) {
          console.log('   ✅ API respondiendo');
        } else {
          console.log('   ⚠️  API responde pero con error');
        }
        console.log(`   Response: ${data.substring(0, 100)}...\n`);
        resolve(true);
      });
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      resolve(false);
    });
  });
}

// Test 3: Webhook endpoint
function testWebhook() {
  return new Promise((resolve, reject) => {
    console.log('3️⃣  Verificando /api/webhooks/whatsapp...');
    
    https.get(`${RENDER_URL}/api/webhooks/whatsapp`, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        // El webhook debe responder 405 (Method Not Allowed) en GET
        if (res.statusCode === 405 || res.statusCode === 403) {
          console.log('   ✅ Webhook endpoint existe (espera POST)');
        } else {
          console.log('   ⚠️  Webhook responde pero revisa configuración');
        }
        console.log(`   Response: ${data.substring(0, 100)}...\n`);
        resolve(true);
      });
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      resolve(false);
    });
  });
}

// Test 4: CORS
function testCORS() {
  return new Promise((resolve, reject) => {
    console.log('4️⃣  Verificando CORS...');
    
    const options = {
      method: 'OPTIONS',
      hostname: RENDER_URL.replace('https://', '').replace('http://', ''),
      path: '/api/health',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'GET'
      }
    };

    const req = https.request(options, (res) => {
      const corsHeader = res.headers['access-control-allow-origin'];
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   CORS Header: ${corsHeader || 'No configurado'}`);
      
      if (corsHeader) {
        console.log('   ✅ CORS configurado\n');
      } else {
        console.log('   ⚠️  CORS no configurado\n');
      }
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      resolve(false);
    });

    req.end();
  });
}

// Ejecutar todos los tests
async function runTests() {
  const results = {
    health: await testHealth(),
    api: await testAPI(),
    webhook: await testWebhook(),
    cors: await testCORS()
  };

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMEN DE VERIFICACIÓN\n');

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;

  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    console.log(`${icon} ${test}`);
  });

  console.log(`\n${passed}/${total} tests pasados`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (passed === total) {
    console.log('🎉 ¡Todo funcionando correctamente!\n');
    console.log('Siguiente paso:');
    console.log(`1. Configura el webhook en Twilio: ${RENDER_URL}/api/webhooks/whatsapp`);
    console.log('2. Actualiza VITE_API_URL en Netlify');
    console.log('3. Prueba el bot de WhatsApp\n');
  } else {
    console.log('⚠️  Hay problemas en el despliegue.\n');
    console.log('Revisa:');
    console.log('1. Los logs en Render');
    console.log('2. Las variables de entorno');
    console.log('3. Que el servicio esté corriendo\n');
  }

  // Información adicional
  console.log('💡 Tips:');
  console.log('- Los servicios gratuitos de Render se duermen después de 15 min');
  console.log('- La primera petición puede tardar ~30 segundos');
  console.log('- Usa UptimeRobot para mantener el servicio activo\n');
}

// Iniciar
console.log('⏳ Iniciando verificación...\n');
setTimeout(() => {
  runTests().catch(err => {
    console.error('❌ Error ejecutando tests:', err);
    process.exit(1);
  });
}, 1000);
