import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno según el ambiente (solo si el archivo existe)
// En producción (Render, Railway, etc), las variables se configuran en el dashboard
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

// Intentar cargar del archivo, pero no fallar si no existe (para Render/Railway)
try {
  dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });
} catch (error) {
  // En plataformas como Render, las variables ya están en process.env
  console.log('📌 Variables de entorno cargadas desde el sistema');
}

/**
 * Configuración de entorno de la aplicación
 */
const config = {
  // Entorno
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  },

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappClientes: process.env.TWILIO_WHATSAPP_NUMBER_CLIENTES || process.env.TWILIO_WHATSAPP_NUMBER
  },

  // Admin
  admin: {
    phoneNumber: process.env.ADMIN_PHONE_NUMBER || '+5215519060013'
  },

  // Información bancaria para pagos por transferencia
  datosBancarios: {
    banco: process.env.BANCO_NOMBRE || 'BBVA',
    titular: process.env.BANCO_TITULAR || 'El Rinconcito',
    cuenta: process.env.BANCO_CUENTA || '1234567890',
    clabe: process.env.BANCO_CLABE || '012345678901234567',
    referencia: process.env.BANCO_REFERENCIA || 'PEDIDO'
  },

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Sesiones
  sessionSecret: process.env.SESSION_SECRET,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Zona horaria
  timezone: 'America/Mexico_City'
};

// Validar variables requeridas en desarrollo
// En producción, Render/Railway las verifica automáticamente
if (config.isDevelopment) {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
    console.error(`💡 Crea un archivo ${envFile} basado en .env.example`);
    process.exit(1);
  }
}

export default config;
