import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticate } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/authorize.js';

const router = express.Router();

// Todas las rutas de analytics requieren autenticación de admin
router.use(authenticate, isAdmin);

/**
 * @route   GET /api/analytics/kpis
 * @desc    Obtiene KPIs principales del período
 * @query   periodo - 'dia', 'semana', 'mes', 'año'
 * @access  Private (Admin)
 */
router.get('/kpis', analyticsController.getKPIs);

/**
 * @route   GET /api/analytics/ingresos-semana
 * @desc    Obtiene ingresos agrupados por día de la semana
 * @query   periodo - 'dia', 'semana', 'mes', 'año'
 * @access  Private
 */
router.get('/ingresos-semana', analyticsController.getIngresosSemana);

/**
 * @route   GET /api/analytics/top-productos
 * @desc    Obtiene productos más vendidos
 * @query   periodo - 'dia', 'semana', 'mes', 'año'
 * @query   limit - Cantidad de productos (default: 5)
 * @access  Private
 */
router.get('/top-productos', analyticsController.getTopProductos);

/**
 * @route   GET /api/analytics/bajo-rendimiento
 * @desc    Obtiene productos con bajo rendimiento (pérdidas)
 * @query   periodo - 'dia', 'semana', 'mes', 'año'
 * @access  Private
 */
router.get('/bajo-rendimiento', analyticsController.getProductosBajoRendimiento);

/**
 * @route   GET /api/analytics/tipo-pedido
 * @desc    Obtiene análisis por tipo de pedido
 * @query   periodo - 'dia', 'semana', 'mes', 'año'
 * @access  Private
 */
router.get('/tipo-pedido', analyticsController.getAnalisisTipoPedido);

/**
 * @route   GET /api/analytics/horarios-pico
 * @desc    Obtiene horarios pico de actividad
 * @query   periodo - 'dia', 'semana', 'mes', 'año'
 * @access  Private
 */
router.get('/horarios-pico', analyticsController.getHorariosPico);

/**
 * @route   GET /api/analytics/completas
 * @desc    Obtiene todas las estadísticas en una sola llamada
 * @query   periodo - 'dia', 'semana', 'mes', 'año'
 * @access  Private
 */
router.get('/completas', analyticsController.getEstadisticasCompletas);

export default router;
