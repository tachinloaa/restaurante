#!/usr/bin/env node

/**
 * Script de verificación pre-deployment - FRONTEND
 * Ejecuta: node check-deployment.js
 */

import fs from 'fs';

const checks = [];
let errorCount = 0;
let warningCount = 0;

function error(message) {
  console.error(`❌ ${message}`);
  errorCount++;
}

function warning(message) {
  console.warn(`⚠️  ${message}`);
  warningCount++;
}

function success(message) {
  console.log(`✅ ${message}`);
}

console.log('🔍 Verificando configuración para deployment (Frontend)...\n');

// ============================================
// 1. Verificar archivos esenciales
// ============================================
console.log('📁 Verificando archivos esenciales...');

const essentialFiles = [
  'package.json',
  'index.html',
  'vite.config.js',
  'netlify.toml',
  '.env.example',
  'src/main.jsx',
  'src/App.jsx'
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
  
  if (pkg.scripts && pkg.scripts.build) {
    success('Script "build" definido');
  } else {
    error('Falta script "build" en package.json');
  }
  
  if (pkg.scripts && pkg.scripts.preview) {
    success('Script "preview" definido');
  } else {
    warning('Considera agregar script "preview" para probar el build');
  }
  
  // Dependencias críticas
  const criticalDeps = ['react', 'react-dom', '@supabase/supabase-js', 'axios'];
  criticalDeps.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      success(`Dependencia ${dep} instalada`);
    } else {
      error(`Falta dependencia crítica: ${dep}`);
    }
  });
  
  if (pkg.devDependencies && pkg.devDependencies.vite) {
    success('Vite configurado');
  } else {
    error('Vite no encontrado en devDependencies');
  }
} catch (err) {
  error(`Error leyendo package.json: ${err.message}`);
}

// ============================================
// 3. Verificar netlify.toml
// ============================================
console.log('\n🌐 Verificando netlify.toml...');

try {
  const netlifyToml = fs.readFileSync('netlify.toml', 'utf8');
  
  if (netlifyToml.includes('npm run build')) {
    success('Build command configurado');
  } else {
    error('netlify.toml no tiene build command correcto');
  }
  
  if (netlifyToml.includes('publish = "dist"')) {
    success('Directorio de publicación correcto (dist)');
  } else {
    warning('Verifica que publish apunte a "dist"');
  }
  
  if (netlifyToml.includes('[[redirects]]')) {
    success('Redirects configurados para SPA');
  } else {
    error('Faltan redirects para React Router (SPA)');
  }
} catch (err) {
  error(`Error leyendo netlify.toml: ${err.message}`);
}

// ============================================
// 4. Verificar .env.example
// ============================================
console.log('\n🔐 Verificando .env.example...');

try {
  const envExample = fs.readFileSync('.env.example', 'utf8');
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_API_URL'
  ];
  
  requiredVars.forEach(varName => {
    if (envExample.includes(varName)) {
      success(`${varName} documentado`);
    } else {
      error(`${varName} falta en .env.example`);
    }
  });
  
  if (envExample.includes('VITE_')) {
    success('Variables usan prefijo VITE_ correcto');
  } else {
    error('Las variables de Vite DEBEN comenzar con VITE_');
  }
} catch (err) {
  error(`Error leyendo .env.example: ${err.message}`);
}

// ============================================
// 5. Verificar estructura de directorios
// ============================================
console.log('\n📂 Verificando estructura de directorios...');

const requiredDirs = [
  'src/components',
  'src/pages',
  'src/services',
  'src/config',
  'src/context'
];

requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    success(`${dir}/ existe`);
  } else {
    warning(`${dir}/ no encontrado (puede ser intencional)`);
  }
});

// ============================================
// 6. Verificar .gitignore
// ============================================
console.log('\n🚫 Verificando .gitignore...');

if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const shouldIgnore = ['node_modules', 'dist', '.env', '.env.local'];
  
  shouldIgnore.forEach(item => {
    if (gitignore.includes(item)) {
      success(`${item} está ignorado`);
    } else {
      error(`⚠️  ${item} NO está en .gitignore`);
    }
  });
} else {
  error('.gitignore no encontrado');
}

// ============================================
// 7. Verificar configuración de Supabase
// ============================================
console.log('\n🔐 Verificando configuración de Supabase...');

if (fs.existsSync('src/config/supabase.js')) {
  const supabaseConfig = fs.readFileSync('src/config/supabase.js', 'utf8');
  
  if (supabaseConfig.includes('import.meta.env.VITE_SUPABASE_URL')) {
    success('Supabase URL usa variable de entorno');
  } else {
    error('Supabase URL debe usar import.meta.env.VITE_SUPABASE_URL');
  }
  
  if (supabaseConfig.includes('import.meta.env.VITE_SUPABASE_ANON_KEY')) {
    success('Supabase key usa variable de entorno');
  } else {
    error('Supabase key debe usar import.meta.env.VITE_SUPABASE_ANON_KEY');
  }
} else {
  warning('src/config/supabase.js no encontrado');
}

// ============================================
// RESUMEN
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE VERIFICACIÓN');
console.log('='.repeat(60));

console.log(`\n⚠️  Advertencias: ${warningCount}`);
console.log(`❌ Errores: ${errorCount}`);

if (errorCount === 0 && warningCount === 0) {
  console.log('\n🎉 ¡Frontend listo para deployment!');
  console.log('📖 Sigue la guía en ../DEPLOY_PRODUCTION.md');
  process.exit(0);
} else if (errorCount === 0) {
  console.log('\n✅ Puedes hacer deployment del frontend.');
  console.log('📖 Revisa las advertencias y sigue ../DEPLOY_PRODUCTION.md');
  process.exit(0);
} else {
  console.log('\n❌ Hay errores que debes corregir antes del deployment.');
  console.log('Corrige los problemas marcados con ❌ y vuelve a ejecutar.');
  process.exit(1);
}
