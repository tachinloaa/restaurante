import Subcategory from '../models/Subcategory.js';
import { success, created, notFound, serverError } from '../utils/responses.js';
import logger from '../utils/logger.js';
import MenuService from '../services/menuService.js';

class SubcategoryController {
  async getAll(req, res) {
    try {
      const incluirInactivas = req.query.incluir_inactivas === 'true';
      const resultado = await Subcategory.getAll(incluirInactivas);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getAll subcategorías:', error);
      return serverError(res, 'Error al obtener subcategorías', error);
    }
  }

  async getByCategoria(req, res) {
    try {
      const { id } = req.params;
      const incluirInactivas = req.query.incluir_inactivas === 'true';
      const resultado = await Subcategory.getByCategoria(id, incluirInactivas);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getByCategoria:', error);
      return serverError(res, 'Error al obtener subcategorías', error);
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Subcategory.getById(id);

      if (!resultado.success) {
        return notFound(res, 'Subcategoría no encontrada');
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getById subcategoría:', error);
      return serverError(res, 'Error al obtener subcategoría', error);
    }
  }

  async create(req, res) {
    try {
      const resultado = await Subcategory.create(req.body);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      // Invalidar caché del menú
      MenuService.invalidarCache();

      return created(res, resultado.data);
    } catch (error) {
      logger.error('Error en create subcategoría:', error);
      return serverError(res, 'Error al crear subcategoría', error);
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Subcategory.update(id, req.body);

      if (!resultado.success) {
        return notFound(res, 'Subcategoría no encontrada');
      }

      // Invalidar caché del menú
      MenuService.invalidarCache();

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en update subcategoría:', error);
      return serverError(res, 'Error al actualizar subcategoría', error);
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Subcategory.delete(id);

      if (!resultado.success) {
        return notFound(res, 'Subcategoría no encontrada');
      }

      // Invalidar caché del menú
      MenuService.invalidarCache();

      return success(res, null, 'Subcategoría eliminada exitosamente');
    } catch (error) {
      logger.error('Error en delete subcategoría:', error);
      return serverError(res, 'Error al eliminar subcategoría', error);
    }
  }
}

export default new SubcategoryController();
