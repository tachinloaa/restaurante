import express from 'express';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import customerRoutes from './customerRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import subcategoryRoutes from './subcategoryRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import authRoutes from './authRoutes.js';
import webhookController from '../controllers/webhookController.js';
import { publicApiLimiter, strictLimiter } from '../middlewares/rateLimiter.js';
import { authenticate } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/authorize.js';

const router = express.Router();

// Rate limiting para todas las rutas API
router.use(publicApiLimiter);

// Auth Routes (login, etc)
router.use('/auth', authRoutes);

// API Routes
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);

// Utility Routes
router.post('/whatsapp/send', authenticate, isAdmin, strictLimiter, webhookController.sendMessage.bind(webhookController));
router.get('/health', webhookController.health.bind(webhookController));
router.get('/health/ops', webhookController.healthOps.bind(webhookController));

export default router;
