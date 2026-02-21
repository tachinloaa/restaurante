import express from 'express';
import { body } from 'express-validator';
import subcategoryController from '../controllers/subcategoryController.js';
import validateRequest from '../middlewares/validateRequest.js';
import { authenticate } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/authorize.js';

const router = express.Router();

const subcategoryValidation = [
  body('nombre').trim().notEmpty().withMessage('Nombre es requerido'),
  body('categoria_id').notEmpty().withMessage('Categoría es requerida'),
  validateRequest
];

// Rutas públicas (GET)
router.get('/', subcategoryController.getAll.bind(subcategoryController));
router.get('/category/:id', subcategoryController.getByCategoria.bind(subcategoryController));
router.get('/:id', subcategoryController.getById.bind(subcategoryController));

// Rutas protegidas (POST/PUT/DELETE) - Solo admin
router.post('/', authenticate, isAdmin, subcategoryValidation, subcategoryController.create.bind(subcategoryController));
router.put('/:id', authenticate, isAdmin, subcategoryValidation, subcategoryController.update.bind(subcategoryController));
router.delete('/:id', authenticate, isAdmin, subcategoryController.delete.bind(subcategoryController));

export default router;
