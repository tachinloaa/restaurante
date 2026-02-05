import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno según el ambiente
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

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
    whatsappClientes: process.env.TWILIO_WHATSAPP_NUMBER,
    whatsappAdmin: process.env.TWILIO_WHATSAPP_NUMBER
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

// Validar variables requeridas
const required = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'SESSION_SECRET'
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
  console.error(`💡 Crea un archivo ${envFile} basado en ${envFile}.example`);
  process.exit(1);
}

export default config;
