#!/usr/bin/env node

/**
 * Script de verificación pre-deployment
 * Ejecuta: node check-deployment.js
 */

import fs from 'fs';
import path from 'path';

const checks = [];
let errorCount = 0;
let warningCount = 0;

function error(message) {
  console.error(`❌ ${message}`);
  errorCount++;
  checks.push({ type: 'error', message });
}

function warning(message) {
  console.warn(`⚠️  ${message}`);
  warningCount++;
  checks.push({ type: 'warning', message });
}

function success(message) {
  console.log(`✅ ${message}`);
  checks.push({ type: 'success', message });
}

console.log('🔍 Verificando configuración para deployment...\n');

// ============================================
// 1. Verificar archivos esenciales
// ============================================
console.log('📁 Verificando archivos esenciales...');

const essentialFiles = [
  'package.json',
  'src/server.js',
  'src/config/environment.js',
  'src/config/database.js',
  '.env.example',
  'render.yaml',
  'Procfile'
];

essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    success(`${file} existe`);
  } else {
    error(`${file} no encontrado`);
  }
});

// ============================================
// 2. Verificar package.json
// ============================================
console.log('\n📦 Verificando package.json...');

try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (pkg.scripts && pkg.scripts.start) {
    success('Script "start" definido');
  } else {
    error('Falta script "start" en package.json');
  }
  
  if (pkg.engines && pkg.engines.node) {
    success(`Node version especificada: ${pkg.engines.node}`);
  } else {
    warning('Considera agregar "engines.node" en package.json');
  }
  
  // Dependencias críticas
  const criticalDeps = ['express', '@supabase/supabase-js', 'twilio', 'dotenv', 'cors'];
  criticalDeps.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      success(`Dependencia ${dep} instalada`);
    } else {
      error(`Falta dependencia crítica: ${dep}`);
    }
  });
} catch (err) {
  error(`Error leyendo package.json: ${err.message}`);
}

// ============================================
// 3. Verificar .env.example
// ============================================
console.log('\n🔐 Verificando .env.example...');

try {
  const envExample = fs.readFileSync('.env.example', 'utf8');
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'FRONTEND_URL'
  ];
  
  requiredVars.forEach(varName => {
    if (envExample.includes(varName)) {
      success(`${varName} documentado`);
    } else {
      error(`${varName} falta en .env.example`);
    }
  });
} catch (err) {
  error(`Error leyendo .env.example: ${err.message}`);
}

// ============================================
// 4. Verificar estructura de directorios
// ============================================
console.log('\n📂 Verificando estructura de directorios...');

const requiredDirs = [
  'src/config',
  'src/controllers',
  'src/routes',
  'src/services',
  'src/middlewares',
  'src/models'
];

requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    success(`${dir}/ existe`);
  } else {
    warning(`${dir}/ no encontrado (puede ser intencional)`);
  }
});

// ============================================
// 5. Verificar Procfile y render.yaml
// ============================================
console.log('\n⚙️  Verificando configuración de deployment...');

if (fs.existsSync('Procfile')) {
  const procfile = fs.readFileSync('Procfile', 'utf8');
  if (procfile.includes('node src/server.js') || procfile.includes('npm start')) {
    success('Procfile configurado correctamente');
  } else {
    warning('Procfile parece incorrecto, debería ejecutar src/server.js');
  }
}

if (fs.existsSync('render.yaml')) {
  const renderYaml = fs.readFileSync('render.yaml', 'utf8');
  if (renderYaml.includes('npm start')) {
    success('render.yaml configurado');
  } else {
    warning('render.yaml puede tener configuración incorrecta');
  }
}

// ============================================
// 6. Verificar .gitignore
// ============================================
console.log('\n🚫 Verificando .gitignore...');

if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const shouldIgnore = ['node_modules', '.env', '.env.development', '.env.production'];
  
  shouldIgnore.forEach(item => {
    if (gitignore.includes(item)) {
      success(`${item} está ignorado`);
    } else {
      error(`⚠️  ${item} NO está en .gitignore - ¡Peligro de seguridad!`);
    }
  });
} else {
  error('.gitignore no encontrado');
}

// ============================================
// RESUMEN
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE VERIFICACIÓN');
console.log('='.repeat(60));

const totalChecks = checks.length;
const successCount = checks.filter(c => c.type === 'success').length;

console.log(`\n✅ Exitosos: ${successCount}/${totalChecks}`);
console.log(`⚠️  Advertencias: ${warningCount}`);
console.log(`❌ Errores: ${errorCount}`);

if (errorCount === 0 && warningCount === 0) {
  console.log('\n🎉 ¡Todo listo para deployment!');
  console.log('📖 Sigue la guía en DEPLOY_PRODUCTION.md');
  process.exit(0);
} else if (errorCount === 0) {
  console.log('\n✅ Puedes hacer deployment, pero hay algunas advertencias.');
  console.log('📖 Revisa las advertencias arriba y sigue DEPLOY_PRODUCTION.md');
  process.exit(0);
} else {
  console.log('\n❌ Hay errores que debes corregir antes del deployment.');
  console.log('Corrige los problemas marcados con ❌ y vuelve a ejecutar este script.');
  process.exit(1);
}
