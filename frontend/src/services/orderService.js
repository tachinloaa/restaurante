import api from './api';

const orderService = {
  getAll: async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    return await api.get(`/orders${params ? '?' + params : ''}`);
  },

  getById: async (id) => {
    return await api.get(`/orders/${id}`);
  },

  create: async (orderData) => {
    return await api.post('/orders', orderData);
  },

  updateEstado: async (id, estado) => {
    return await api.put(`/orders/${id}/status`, { estado });
  },

  cancelar: async (id, razon) => {
    return await api.delete(`/orders/${id}`, { data: { razon } });
  },

  getEstadisticas: async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    return await api.get(`/orders/stats${params ? '?' + params : ''}`);
  },

  getRecientes: async (limit = 10) => {
    return await api.get(`/orders/recientes?limit=${limit}`);
  }
};

export default orderService;
