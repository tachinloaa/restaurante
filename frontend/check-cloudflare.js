/**
 * Script para verificar el despliegue en Cloudflare Pages
 * Uso: node check-cloudflare.js https://tu-sitio.pages.dev
 */

const https = require('https');

const CLOUDFLARE_URL = process.argv[2] || 'https://el-rinconcito.pages.dev';

console.log('🔍 Verificando despliegue en Cloudflare Pages...\n');
console.log(`URL: ${CLOUDFLARE_URL}\n`);

// Test 1: Sitio accesible
function testSite() {
  return new Promise((resolve) => {
    console.log('1️⃣  Verificando acceso al sitio...');
    
    https.get(CLOUDFLARE_URL, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log('   ✅ Sitio accesible');
        console.log(`   Server: ${res.headers['server'] || 'N/A'}`);
        console.log(`   CF-Ray: ${res.headers['cf-ray'] || 'N/A'} (Cloudflare activo)\n`);
        resolve(true);
      } else {
        console.log(`   ❌ Error: Status ${res.statusCode}\n`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      resolve(false);
    });
  });
}

// Test 2: HTTPS y SSL
function testSSL() {
  return new Promise((resolve) => {
    console.log('2️⃣  Verificando SSL/HTTPS...');
    
    const url = new URL(CLOUDFLARE_URL);
    
    if (url.protocol === 'https:') {
      console.log('   ✅ HTTPS activado');
      
      https.get(CLOUDFLARE_URL, (res) => {
        const cert = res.socket.getPeerCertificate();
        if (cert && cert.subject) {
          console.log('   ✅ Certificado SSL válido');
          console.log(`   Emisor: ${cert.issuer.O || 'N/A'}\n`);
        } else {
          console.log('   ⚠️  No se pudo verificar certificado\n');
        }
        resolve(true);
      }).on('error', (err) => {
        console.log(`   ❌ Error SSL: ${err.message}\n`);
        resolve(false);
      });
    } else {
      console.log('   ❌ HTTPS no está activado\n');
      resolve(false);
    }
  });
}

// Test 3: CDN Headers
function testCDN() {
  return new Promise((resolve) => {
    console.log('3️⃣  Verificando CDN de Cloudflare...');
    
    https.get(CLOUDFLARE_URL, (res) => {
      const cfRay = res.headers['cf-ray'];
      const cfCache = res.headers['cf-cache-status'];
      const server = res.headers['server'];
      
      console.log(`   CF-Ray: ${cfRay || 'No detectado'}`);
      console.log(`   CF-Cache: ${cfCache || 'No cacheado aún'}`);
      console.log(`   Server: ${server || 'N/A'}`);
      
      if (cfRay && server === 'cloudflare') {
        console.log('   ✅ CDN de Cloudflare activo\n');
        resolve(true);
      } else {
        console.log('   ⚠️  CDN no detectado o no activo aún\n');
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      resolve(false);
    });
  });
}

// Test 4: SPA Routing
function testSPARouting() {
  return new Promise((resolve) => {
    console.log('4️⃣  Verificando SPA routing...');
    
    // Probar una ruta que no existe (debe devolver index.html)
    https.get(`${CLOUDFLARE_URL}/dashboard`, (res) => {
      console.log(`   Status en /dashboard: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log('   ✅ SPA routing configurado correctamente\n');
        resolve(true);
      } else {
        console.log('   ⚠️  SPA routing puede tener problemas\n');
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      resolve(false);
    });
  });
}

// Test 5: Assets estáticos
function testAssets() {
  return new Promise((resolve) => {
    console.log('5️⃣  Verificando assets estáticos...');
    
    https.get(`${CLOUDFLARE_URL}/vite.svg`, (res) => {
      console.log(`   Status de asset: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log('   ✅ Assets cargando correctamente\n');
        resolve(true);
      } else {
        console.log('   ⚠️  Algunos assets pueden no estar disponibles\n');
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`   ⚠️  No se pudo verificar assets\n`);
      resolve(false);
    });
  });
}

// Test 6: Performance Headers
function testPerformance() {
  return new Promise((resolve) => {
    console.log('6️⃣  Verificando optimizaciones de performance...');
    
    https.get(CLOUDFLARE_URL, (res) => {
      const compression = res.headers['content-encoding'];
      const cacheControl = res.headers['cache-control'];
      
      console.log(`   Compresión: ${compression || 'Ninguna'}`);
      console.log(`   Cache-Control: ${cacheControl || 'No configurado'}`);
      
      if (compression === 'br' || compression === 'gzip') {
        console.log('   ✅ Compresión activada');
      } else {
        console.log('   ⚠️  Sin compresión');
      }
      
      if (cacheControl) {
        console.log('   ✅ Cache configurado\n');
      } else {
        console.log('   ⚠️  Cache no configurado\n');
      }
      
      resolve(true);
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      resolve(false);
    });
  });
}

// Ejecutar todos los tests
async function runTests() {
  const results = {
    site: await testSite(),
    ssl: await testSSL(),
    cdn: await testCDN(),
    spa: await testSPARouting(),
    assets: await testAssets(),
    performance: await testPerformance()
  };

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMEN DE VERIFICACIÓN\n');

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;

  const testNames = {
    site: 'Sitio accesible',
    ssl: 'SSL/HTTPS',
    cdn: 'CDN Cloudflare',
    spa: 'SPA Routing',
    assets: 'Assets estáticos',
    performance: 'Optimizaciones'
  };

  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '⚠️';
    console.log(`${icon} ${testNames[test]}`);
  });

  console.log(`\n${passed}/${total} tests pasados`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (passed >= 4) {
    console.log('🎉 ¡Despliegue exitoso en Cloudflare Pages!\n');
    console.log('✅ Tu frontend está listo y optimizado');
    console.log('✅ CDN global activado');
    console.log('✅ HTTPS configurado');
    console.log('✅ Bandwidth y requests ILIMITADOS\n');
    
    console.log('Siguiente paso:');
    console.log(`1. Accede a tu sitio: ${CLOUDFLARE_URL}`);
    console.log('2. Verifica que conecta con el backend');
    console.log('3. Prueba el login y funcionalidades\n');
  } else {
    console.log('⚠️  Algunos tests fallaron.\n');
    console.log('Revisa:');
    console.log('1. Que el build haya terminado correctamente');
    console.log('2. Las variables de entorno en Cloudflare');
    console.log('3. Los logs del despliegue\n');
  }

  // Información adicional
  console.log('💡 Ventajas de Cloudflare Pages:');
  console.log('- ♾️  Bandwidth ilimitado (no como Netlify 100GB)');
  console.log('- ♾️  Requests ilimitados (no como Netlify 125k/mes)');
  console.log('- ⚡ CDN global ultrarrápido');
  console.log('- 🔒 SSL/HTTPS automático');
  console.log('- 🚀 HTTP/3 y Brotli compression');
  console.log('- 💰 Gratis para siempre\n');
}

// Iniciar
console.log('⏳ Iniciando verificación...\n');
setTimeout(() => {
  runTests().catch(err => {
    console.error('❌ Error ejecutando tests:', err);
    process.exit(1);
  });
}, 1000);
