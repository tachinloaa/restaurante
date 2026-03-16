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
    whatsappClientes: process.env.TWILIO_WHATSAPP_NUMBER_CLIENTES || process.env.TWILIO_WHATSAPP_NUMBER,
    templateNuevoPedido: process.env.TWILIO_TEMPLATE_NUEVO_PEDIDO || 'HXae10080ed88b39c890553c03c3b5bcb8',
    templateComprobantePago: process.env.TWILIO_TEMPLATE_COMPROBANTE_PAGO || 'HXa804d78cca892bf946f4b94e271d437a'
  },

  // Admin — respaldo fijo si la variable de entorno no está configurada
  admin: {
    phoneNumber: process.env.ADMIN_PHONE_NUMBER || '+5213349420820'
  },

  // Repartidor — opcional, configura REPARTIDOR_PHONE_NUMBER en Render si tienes uno
  repartidor: {
    phoneNumber: process.env.REPARTIDOR_PHONE_NUMBER || null
  },

  // Datos bancarios (seguridad)
  datosBancarios: {
    banco: process.env.BANCO_NOMBRE || 'BBVA',
    titular: process.env.BANCO_TITULAR || 'El Rinconcito SA de CV',
    cuenta: process.env.BANCO_CUENTA,
    clabe: process.env.BANCO_CLABE,
    referencia: process.env.BANCO_REFERENCIA || 'RINCONCITO'
  },

  // Redis (para sesiones en producción)
  redis: {
    url: process.env.REDIS_URL || null,
    enabled: process.env.REDIS_ENABLED === 'true' || process.env.NODE_ENV === 'production'
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Autenticación Admin
  auth: {
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.ADMIN_PASSWORD_HASH || null // Hash bcrypt
  },

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // URL pública del backend (para proxy de media)
  backendUrl: process.env.BACKEND_URL || 'https://el-rinconcito-backend.onrender.com',

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
    'TWILIO_AUTH_TOKEN',
    'ADMIN_PHONE_NUMBER'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
    console.error(`💡 Crea un archivo ${envFile} basado en .env.example`);
    process.exit(1);
  }
}

export default config;
