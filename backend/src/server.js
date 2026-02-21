import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import config from './config/environment.js';
import { testConnection } from './config/database.js';
import { testTwilioConnection } from './config/twilio.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import httpLogger from './middlewares/logger.js';
import logger from './utils/logger.js';
import reminderService from './services/reminderService.js';

/**
 * Servidor Express para El Rinconcito
 */
const app = express();

// Confiar en proxies (Railway, Heroku, etc.)
app.set('trust proxy', true);

// ════════════════════════════════════════════════════════════
// MIDDLEWARES GLOBALES
// ════════════════════════════════════════════════════════════

// Seguridad
app.use(helmet());

// CORS - Permitir múltiples orígenes
const allowedOrigins = config.isDevelopment 
  ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000']
  : config.frontendUrl.split(',').map(url => url.trim());

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (mobile apps, postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`❌ CORS bloqueó request desde: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parsing de body con UTF-8
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));

// Middleware para asegurar UTF-8 en todas las respuestas
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Compresión
app.use(compression());

// Logging HTTP
app.use(httpLogger);

// ════════════════════════════════════════════════════════════
// RUTAS
// ════════════════════════════════════════════════════════════

// Webhook de Twilio (fuera de /api para que sea /webhook directo)
import webhookRoutes from './routes/webhookRoutes.js';
app.use('/webhook', webhookRoutes);

// Rutas de API
app.use('/api', routes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API de El Rinconcito - Sistema de Pedidos',
    version: '1.0.0',
    environment: config.env
  });
});

// ════════════════════════════════════════════════════════════
// MANEJO DE ERRORES
// ════════════════════════════════════════════════════════════

app.use(notFoundHandler);
app.use(errorHandler);

// ════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ════════════════════════════════════════════════════════════

const startServer = async () => {
  try {
    logger.info('🚀 Iniciando servidor...');
    logger.info(`📝 Entorno: ${config.env}`);
    
    // Verificar conexión a Supabase
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('❌ No se pudo conectar a Supabase');
      process.exit(1);
    }

    // Verificar conexión a Twilio
    const twilioConnected = await testTwilioConnection();
    if (!twilioConnected) {
      logger.warn('⚠️  No se pudo verificar conexión a Twilio');
    }

    // Iniciar sistema de recordatorios automáticos
    reminderService.iniciarVerificacionPeriodica();

    // Iniciar servidor
    app.listen(config.port, () => {
      logger.info(`✅ Servidor corriendo en puerto ${config.port}`);
      logger.info(`🌐 URL: http://localhost:${config.port}`);
      logger.info(`📱 Frontend URL: ${config.frontendUrl}`);
      logger.info('═══════════════════════════════════════════');
      logger.info('🌮 El Rinconcito - Sistema de Pedidos');
      logger.info('═══════════════════════════════════════════');
    });
  } catch (error) {
    logger.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar servidor
startServer();

export default app;
