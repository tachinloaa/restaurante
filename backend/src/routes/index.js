import express from 'express';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import customerRoutes from './customerRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import subcategoryRoutes from './subcategoryRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import webhookController from '../controllers/webhookController.js';

const router = express.Router();

// API Routes
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/dashboard', dashboardRoutes);

// Webhook Routes
router.use('/webhook', webhookRoutes);

// Utility Routes
router.post('/whatsapp/send', webhookController.sendMessage.bind(webhookController));
router.get('/health', webhookController.health.bind(webhookController));

export default router;
