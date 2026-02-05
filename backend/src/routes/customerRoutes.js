import express from 'express';
import customerController from '../controllers/customerController.js';

const router = express.Router();

router.get('/', customerController.getAll.bind(customerController));
router.get('/:id', customerController.getById.bind(customerController));
router.put('/:id', customerController.update.bind(customerController));
router.get('/:id/orders', customerController.getPedidos.bind(customerController));
router.get('/:id/stats', customerController.getEstadisticas.bind(customerController));

export default router;
