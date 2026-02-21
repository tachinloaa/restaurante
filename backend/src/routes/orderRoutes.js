import express from 'express';
import { body } from 'express-validator';
import orderController from '../controllers/orderController.js';
import validateRequest from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/authorize.js';

const router = express.Router();

// Validaciones
const orderValidation = [
  body('cliente_id').notEmpty().withMessage('Cliente es requerido'),
  body('total').isFloat({ min: 0 }).withMessage('Total inválido'),
  body('tipo_pedido').isIn(['domicilio', 'para_llevar']).withMessage('Tipo de pedido inválido'),
  body('productos').isArray({ min: 1 }).withMessage('Productos son requeridos'),
  validateRequest
];

// Rutas protegidas - Solo admin
router.get('/', authenticate, isAdmin, orderController.getAll.bind(orderController));
router.get('/stats', authenticate, isAdmin, orderController.getEstadisticas.bind(orderController));
router.get('/recientes', authenticate, isAdmin, orderController.getRecientes.bind(orderController));

// 🚨 Rutas de cola de emergencia - Solo admin
router.get('/emergency-queue', authenticate, isAdmin, orderController.getEmergencyQueue.bind(orderController));
router.post('/emergency-queue/:emergencyId/retry', authenticate, isAdmin, orderController.retryEmergencyOrder.bind(orderController));
router.delete('/emergency-queue/:emergencyId', authenticate, isAdmin, orderController.deleteEmergencyOrder.bind(orderController));

// Rutas específicas - Solo admin
router.get('/:id', authenticate, isAdmin, orderController.getById.bind(orderController));
router.post('/', authenticate, isAdmin, orderValidation, orderController.create.bind(orderController));
router.put('/:id/status', authenticate, isAdmin, orderController.updateEstado.bind(orderController));
router.delete('/:id', authenticate, isAdmin, orderController.cancelar.bind(orderController));

export default router;
