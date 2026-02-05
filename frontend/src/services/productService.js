import api from './api';

/**
 * Servicio para productos
 */
const productService = {
  /**
   * Obtener todos los productos
   */
  getAll: async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    return await api.get(`/products${params ? '?' + params : ''}`);
  },

  /**
   * Obtener producto por ID
   */
  getById: async (id) => {
    return await api.get(`/products/${id}`);
  },

  /**
   * Crear producto
   */
  create: async (productoData) => {
    return await api.post('/products', productoData);
  },

  /**
   * Actualizar producto
   */
  update: async (id, productoData) => {
    return await api.put(`/products/${id}`, productoData);
  },

  /**
   * Eliminar producto
   */
  delete: async (id) => {
    return await api.delete(`/products/${id}`);
  },

  /**
   * Actualizar stock
   */
  updateStock: async (id, stock) => {
    return await api.patch(`/products/${id}/stock`, { stock });
  },

  /**
   * Obtener productos por categoría
   */
  getByCategory: async (categoriaId) => {
    return await api.get(`/api/products/category/${categoriaId}`);
  },

  /**
   * Obtener productos por subcategoría
   */
  getBySubcategory: async (subcategoriaId) => {
    return await api.get(`/api/products/subcategory/${subcategoriaId}`);
  }
};

export default productService;
