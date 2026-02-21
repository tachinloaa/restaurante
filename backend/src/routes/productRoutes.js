import express from 'express';
import { body } from 'express-validator';
import productController from '../controllers/productController.js';
import validateRequest from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/authorize.js';

const router = express.Router();

// Validaciones
const productValidation = [
  body('nombre').trim().notEmpty().withMessage('Nombre es requerido'),
  body('precio').isFloat({ min: 0 }).withMessage('Precio debe ser mayor a 0'),
  body('categoria_id').notEmpty().withMessage('Categoría es requerida'),
  validateRequest
];

// Rutas públicas (GET) - No requieren autenticación
router.get('/', productController.getAll.bind(productController));
router.get('/:id', productController.getById.bind(productController));
router.get('/category/:id', productController.getByCategory.bind(productController));
router.get('/subcategory/:id', productController.getBySubcategory.bind(productController));

// Rutas protegidas (POST/PUT/DELETE) - Solo admin
router.post('/', authenticate, isAdmin, productValidation, productController.create.bind(productController));
router.put('/:id', authenticate, isAdmin, productValidation, productController.update.bind(productController));
router.delete('/:id', authenticate, isAdmin, productController.delete.bind(productController));

export default router;
