import { comparePassword } from '../utils/hash.js';
import { generateToken } from '../utils/jwt.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import { ROLES } from '../middlewares/authorize.js';

/**
 * Controller de autenticación
 */
class AuthController {
  /**
   * Login de administrador
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validar que vengan los datos
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      // Verificar credenciales del admin
      // En producción, esto debería venir de base de datos
      // Por ahora usamos variables de entorno
      const isValidEmail = email === config.auth.adminUsername;
      
      // Si no hay hash configurado, rechazar
      if (!config.auth.adminPassword) {
        logger.error('❌ ADMIN_PASSWORD_HASH no configurado en .env');
        return res.status(500).json({
          success: false,
          message: 'Autenticación no configurada correctamente'
        });
      }

      // Comparar password con hash
      const isValidPassword = await comparePassword(password, config.auth.adminPassword);

      if (!isValidEmail || !isValidPassword) {
        logger.warn(`❌ Intento de login fallido para: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Email o contraseña incorrectos'
        });
      }

      // Generar token JWT
      const token = generateToken({
        id: 'admin-1',
        email: config.auth.adminUsername,
        role: ROLES.ADMIN
      }, config.jwt.expiresIn);

      logger.info(`✅ Login exitoso para: ${email}`);

      return res.json({
        success: true,
        message: 'Autenticación exitosa',
        token,
        user: {
          email: config.auth.adminUsername,
          role: ROLES.ADMIN
        },
        expiresIn: config.jwt.expiresIn
      });
    } catch (error) {
      logger.error('Error en login:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor'
      });
    }
  }

  /**
   * Verificar token actual
   * GET /api/auth/verify
   */
  async verify(req, res) {
    try {
      // El middleware authenticate ya verificó el token
      // Solo devolvemos la info del usuario
      return res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      logger.error('Error en verify:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verificando token'
      });
    }
  }

  /**
   * Generar hash de password (solo para desarrollo)
   * POST /api/auth/hash-password
   * ⚠️ DESHABILITADO EN PRODUCCIÓN
   */
  async hashPassword(req, res) {
    // Solo permitir en desarrollo
    if (config.isProduction) {
      return res.status(403).json({
        success: false,
        message: 'No disponible en producción'
      });
    }

    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password requerido'
        });
      }

      const { hashPassword: hash } = await import('../utils/hash.js');
      const hashed = await hash(password);

      return res.json({
        success: true,
        message: 'Hash generado (copia esto a ADMIN_PASSWORD_HASH en .env)',
        data: {
          hash: hashed
        }
      });
    } catch (error) {
      logger.error('Error generando hash:', error);
      return res.status(500).json({
        success: false,
        message: 'Error generando hash'
      });
    }
  }
}

export default new AuthController();
