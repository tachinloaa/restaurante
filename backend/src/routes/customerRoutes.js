import express from 'express';
import customerController from '../controllers/customerController.js';
import { authenticate } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/authorize.js';

const router = express.Router();

// Todas las rutas de clientes requieren autenticación de admin
router.use(authenticate, isAdmin);

router.get('/', customerController.getAll.bind(customerController));
router.get('/:id', customerController.getById.bind(customerController));
router.put('/:id', customerController.update.bind(customerController));
router.get('/:id/orders', customerController.getPedidos.bind(customerController));
router.get('/:id/stats', customerController.getEstadisticas.bind(customerController));

export default router;
