import express from 'express';
import { body } from 'express-validator';
import orderController from '../controllers/orderController.js';
import validateRequest from '../middlewares/validateRequest.js';

const router = express.Router();

// Validaciones
const orderValidation = [
  body('cliente_id').notEmpty().withMessage('Cliente es requerido'),
  body('total').isFloat({ min: 0 }).withMessage('Total inválido'),
  body('tipo_pedido').isIn(['domicilio', 'para_llevar']).withMessage('Tipo de pedido inválido'),
  body('productos').isArray({ min: 1 }).withMessage('Productos son requeridos'),
  validateRequest
];

// Rutas
router.get('/', orderController.getAll.bind(orderController));
router.get('/stats', orderController.getEstadisticas.bind(orderController));
router.get('/recientes', orderController.getRecientes.bind(orderController));
router.get('/:id', orderController.getById.bind(orderController));
router.post('/', orderValidation, orderController.create.bind(orderController));
router.put('/:id/status', orderController.updateEstado.bind(orderController));
router.delete('/:id', orderController.cancelar.bind(orderController));

export default router;
