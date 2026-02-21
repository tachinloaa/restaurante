import api from './api';

const categoryService = {
  getAll: async (incluirInactivas = false) => {
    return await api.get(`/categories?incluir_inactivas=${incluirInactivas}`);
  },

  getById: async (id) => {
    return await api.get(`/categories/${id}`);
  },

  create: async (categoryData) => {
    return await api.post('/categories', categoryData);
  },

  update: async (id, categoryData) => {
    return await api.put(`/categories/${id}`, categoryData);
  },

  delete: async (id) => {
    return await api.delete(`/categories/${id}`);
  },

  getProductos: async (id) => {
    return await api.get(`/categories/${id}/products`);
  }
};

export default categoryService;
