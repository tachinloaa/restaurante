import Category from '../models/Category.js';
import { success, created, notFound, serverError } from '../utils/responses.js';
import logger from '../utils/logger.js';
import MenuService from '../services/menuService.js';

class CategoryController {
  async getAll(req, res) {
    try {
      const incluirInactivas = req.query.incluir_inactivas === 'true';
      const resultado = await Category.getAll(incluirInactivas);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getAll categorías:', error);
      return serverError(res, 'Error al obtener categorías', error);
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Category.getById(id);

      if (!resultado.success) {
        return notFound(res, 'Categoría no encontrada');
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getById categoría:', error);
      return serverError(res, 'Error al obtener categoría', error);
    }
  }

  async create(req, res) {
    try {
      const resultado = await Category.create(req.body);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      // Invalidar caché del menú
      MenuService.invalidarCache();

      return created(res, resultado.data);
    } catch (error) {
      logger.error('Error en create categoría:', error);
      return serverError(res, 'Error al crear categoría', error);
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Category.update(id, req.body);

      if (!resultado.success) {
        return notFound(res, 'Categoría no encontrada');
      }

      // Invalidar caché del menú
      MenuService.invalidarCache();

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en update categoría:', error);
      return serverError(res, 'Error al actualizar categoría', error);
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Category.delete(id);

      if (!resultado.success) {
        return notFound(res, 'Categoría no encontrada');
      }

      // Invalidar caché del menú
      MenuService.invalidarCache();

      return success(res, null, 'Categoría eliminada exitosamente');
    } catch (error) {
      logger.error('Error en delete categoría:', error);
      return serverError(res, 'Error al eliminar categoría', error);
    }
  }

  async getProductos(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Category.getProductos(id);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getProductos categoría:', error);
      return serverError(res, 'Error al obtener productos', error);
    }
  }
}

export default new CategoryController();
