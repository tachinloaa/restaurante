import express from 'express';
import { body } from 'express-validator';
import productController from '../controllers/productController.js';
import validateRequest from '../middlewares/validateRequest.js';

const router = express.Router();

// Validaciones
const productValidation = [
  body('nombre').trim().notEmpty().withMessage('Nombre es requerido'),
  body('precio').isFloat({ min: 0 }).withMessage('Precio debe ser mayor a 0'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock debe ser mayor o igual a 0'),
  body('categoria_id').notEmpty().withMessage('Categoría es requerida'),
  validateRequest
];

// Rutas
router.get('/', productController.getAll.bind(productController));
router.get('/:id', productController.getById.bind(productController));
router.post('/', productValidation, productController.create.bind(productController));
router.put('/:id', productValidation, productController.update.bind(productController));
router.delete('/:id', productController.delete.bind(productController));
router.get('/category/:id', productController.getByCategory.bind(productController));
router.get('/subcategory/:id', productController.getBySubcategory.bind(productController));
router.patch('/:id/stock', productController.updateStock.bind(productController));

export default router;
