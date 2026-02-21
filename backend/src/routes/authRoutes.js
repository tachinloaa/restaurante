import express from 'express';
import { body } from 'express-validator';
import authController from '../controllers/authController.js';
import validateRequest from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/auth.js';
import { loginLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Validaciones para login
const loginValidation = [
  body('email').trim().notEmpty().isEmail().withMessage('Email válido es requerido'),
  body('password').notEmpty().withMessage('Contraseña es requerida'),
  validateRequest
];

/**
 * POST /api/auth/login
 * Login de administrador
 * Rate limit: 5 intentos por 15 minutos
 */
router.post('/login', loginLimiter, loginValidation, authController.login.bind(authController));

/**
 * GET /api/auth/verify
 * Verificar token actual (requiere autenticación)
 */
router.get('/verify', authenticate, authController.verify.bind(authController));

/**
 * POST /api/auth/hash-password
 * Generar hash de password (solo desarrollo)
 */
router.post('/hash-password', authController.hashPassword.bind(authController));

export default router;
