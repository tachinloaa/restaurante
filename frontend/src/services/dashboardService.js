import api from './api';

const dashboardService = {
  getStats: async () => {
    return await api.get('/dashboard/stats');
  },

  getSalesChart: async (dias = 7) => {
    return await api.get(`/dashboard/sales-chart?dias=${dias}`);
  },

  getTopProducts: async (limit = 5) => {
    return await api.get(`/dashboard/top-products?limit=${limit}`);
  },

  getRecentOrders: async (limit = 10) => {
    return await api.get(`/dashboard/recent-orders?limit=${limit}`);
  },

  getLoyalCustomers: async (limit = 10, periodo = 'ultimos30dias') => {
    return await api.get(`/dashboard/loyal-customers?limit=${limit}&periodo=${periodo}`);
  },

  getAdvancedStats: async () => {
    return await api.get('/dashboard/advanced-stats');
  }
};

export default dashboardService;
