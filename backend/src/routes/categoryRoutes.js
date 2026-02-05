import express from 'express';
import { body } from 'express-validator';
import categoryController from '../controllers/categoryController.js';
import validateRequest from '../middlewares/validateRequest.js';

const router = express.Router();

const categoryValidation = [
  body('nombre').trim().notEmpty().withMessage('Nombre es requerido'),
  validateRequest
];

router.get('/', categoryController.getAll.bind(categoryController));
router.get('/:id', categoryController.getById.bind(categoryController));
router.post('/', categoryValidation, categoryController.create.bind(categoryController));
router.put('/:id', categoryValidation, categoryController.update.bind(categoryController));
router.delete('/:id', categoryController.delete.bind(categoryController));
router.get('/:id/products', categoryController.getProductos.bind(categoryController));

export default router;
