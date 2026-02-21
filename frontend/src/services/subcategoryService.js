import api from './api';

const subcategoryService = {
  getAll: async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    return await api.get(`/subcategories${params ? '?' + params : ''}`);
  },

  getById: async (id) => {
    return await api.get(`/subcategories/${id}`);
  },

  getByCategoria: async (categoriaId) => {
    return await api.get(`/subcategories/category/${categoriaId}`);
  },

  create: async (subcategoryData) => {
    return await api.post('/subcategories', subcategoryData);
  },

  update: async (id, subcategoryData) => {
    return await api.put(`/subcategories/${id}`, subcategoryData);
  },

  delete: async (id) => {
    return await api.delete(`/subcategories/${id}`);
  }
};

export default subcategoryService;
