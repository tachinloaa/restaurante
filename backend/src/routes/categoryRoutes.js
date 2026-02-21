import express from 'express';
import { body } from 'express-validator';
import categoryController from '../controllers/categoryController.js';
import validateRequest from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/authorize.js';

const router = express.Router();

const categoryValidation = [
  body('nombre').trim().notEmpty().withMessage('Nombre es requerido'),
  validateRequest
];

// Rutas públicas (GET)
router.get('/', categoryController.getAll.bind(categoryController));
router.get('/:id', categoryController.getById.bind(categoryController));
router.get('/:id/products', categoryController.getProductos.bind(categoryController));

// Rutas protegidas (POST/PUT/DELETE) - Solo admin
router.post('/', authenticate, isAdmin, categoryValidation, categoryController.create.bind(categoryController));
router.put('/:id', authenticate, isAdmin, categoryValidation, categoryController.update.bind(categoryController));
router.delete('/:id', authenticate, isAdmin, categoryController.delete.bind(categoryController));

export default router;
