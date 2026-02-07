import Product from '../models/Product.js';
import { success, created, notFound, serverError } from '../utils/responses.js';
import logger from '../utils/logger.js';
import MenuService from '../services/menuService.js';

/**
 * Controlador de Productos
 */
class ProductController {
  /**
   * Obtener todos los productos
   * GET /api/products
   */
  async getAll(req, res) {
    try {
      const filtros = {
        categoria_id: req.query.categoria_id,
        subcategoria_id: req.query.subcategoria_id,
        activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
        busqueda: req.query.busqueda
      };

      const resultado = await Product.getAll(filtros);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data, 'Productos obtenidos exitosamente');
    } catch (error) {
      logger.error('Error en getAll productos:', error);
      return serverError(res, 'Error al obtener productos', error);
    }
  }

  /**
   * Obtener producto por ID
   * GET /api/products/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Product.getById(id);

      if (!resultado.success) {
        return notFound(res, 'Producto no encontrado');
      }

      return success(res, resultado.data, 'Producto obtenido exitosamente');
    } catch (error) {
      logger.error('Error en getById producto:', error);
      return serverError(res, 'Error al obtener producto', error);
    }
  }

  /**
   * Crear producto
   * POST /api/products
   */
  async create(req, res) {
    try {
      const productoData = {
        nombre: req.body.nombre,
        descripcion: req.body.descripcion,
        precio: req.body.precio,
        categoria_id: req.body.categoria_id,
        subcategoria_id: req.body.subcategoria_id || null,
        activo: req.body.activo !== undefined ? req.body.activo : true
      };

      const resultado = await Product.create(productoData);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      // Invalidar caché del menú
      MenuService.invalidarCache();

      return created(res, resultado.data, 'Producto creado exitosamente');
    } catch (error) {
      logger.error('Error en create producto:', error);
      return serverError(res, 'Error al crear producto', error);
    }
  }

  /**
   * Actualizar producto
   * PUT /api/products/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const productoData = {
        nombre: req.body.nombre,
        descripcion: req.body.descripcion,
        precio: req.body.precio,
        categoria_id: req.body.categoria_id,
        subcategoria_id: req.body.subcategoria_id,
        activo: req.body.activo
      };

      // Eliminar campos undefined
      Object.keys(productoData).forEach(key => 
        productoData[key] === undefined && delete productoData[key]
      );

      const resultado = await Product.update(id, productoData);

      if (!resultado.success) {
        return notFound(res, 'Producto no encontrado');
      }

      // Invalidar caché del menú
      MenuService.invalidarCache();

      return success(res, resultado.data, 'Producto actualizado exitosamente');
    } catch (error) {
      logger.error('Error en update producto:', error);
      return serverError(res, 'Error al actualizar producto', error);
    }
  }

  /**
   * Eliminar producto (soft delete)
   * DELETE /api/products/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Product.delete(id);

      if (!resultado.success) {
        return notFound(res, 'Producto no encontrado');
      }

      // Invalidar caché del menú
      MenuService.invalidarCache();

      return success(res, null, 'Producto eliminado exitosamente');
    } catch (error) {
      logger.error('Error en delete producto:', error);
      return serverError(res, 'Error al eliminar producto', error);
    }
  }

  /**
   * Obtener productos por categoría
   * GET /api/products/category/:id
   */
  async getByCategory(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Product.getAll({ categoria_id: id, activo: true });

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data, 'Productos obtenidos exitosamente');
    } catch (error) {
      logger.error('Error en getByCategory:', error);
      return serverError(res, 'Error al obtener productos', error);
    }
  }

  /**
   * Obtener productos por subcategoría
   * GET /api/products/subcategory/:id
   */
  async getBySubcategory(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Product.getAll({ subcategoria_id: id, activo: true });

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data, 'Productos obtenidos exitosamente');
    } catch (error) {
      logger.error('Error en getBySubcategory:', error);
      return serverError(res, 'Error al obtener productos', error);
    }
  }
}

export default new ProductController();
