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
import { publicApiLimiter } from '../middlewares/rateLimiter.js';

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
router.post('/whatsapp/send', webhookController.sendMessage.bind(webhookController));
router.get('/health', webhookController.health.bind(webhookController));

export default router;
