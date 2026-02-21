import api from './api';

const customerService = {
  getAll: async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    return await api.get(`/customers${params ? '?' + params : ''}`);
  },

  getById: async (id) => {
    return await api.get(`/customers/${id}`);
  },

  update: async (id, customerData) => {
    return await api.put(`/customers/${id}`, customerData);
  },

  getPedidos: async (id, limit = 10) => {
    return await api.get(`/customers/${id}/orders?limit=${limit}`);
  },

  getEstadisticas: async (id) => {
    return await api.get(`/customers/${id}/stats`);
  }
};

export default customerService;
