import express from 'express';
import dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats', dashboardController.getStats.bind(dashboardController));
router.get('/sales-chart', dashboardController.getSalesChart.bind(dashboardController));
router.get('/top-products', dashboardController.getTopProducts.bind(dashboardController));
router.get('/recent-orders', dashboardController.getRecentOrders.bind(dashboardController));
router.get('/loyal-customers', dashboardController.getLoyalCustomers.bind(dashboardController));
router.get('/advanced-stats', dashboardController.getAdvancedStats.bind(dashboardController));

export default router;
