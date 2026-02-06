import api from './api';

/**
 * Servicio para obtener estadísticas y análisis
 */
const analyticsService = {
  /**
   * Obtiene los KPIs principales del período
   * @param {string} periodo - 'dia', 'semana', 'mes', 'año'
   * @returns {Promise<Object>}
   */
  async getKPIs(periodo = 'mes') {
    const response = await api.get(`/analytics/kpis?periodo=${periodo}`);
    return response.data;
  },

  /**
   * Obtiene ingresos agrupados por día de la semana
   * @param {string} periodo - 'dia', 'semana', 'mes', 'año'
   * @returns {Promise<Array>}
   */
  async getIngresosSemana(periodo = 'mes') {
    const response = await api.get(`/analytics/ingresos-semana?periodo=${periodo}`);
    return response.data;
  },

  /**
   * Obtiene los productos más vendidos
   * @param {string} periodo - 'dia', 'semana', 'mes', 'año'
   * @param {number} limit - Cantidad de productos a retornar
   * @returns {Promise<Array>}
   */
  async getTopProductos(periodo = 'mes', limit = 5) {
    const response = await api.get(`/analytics/top-productos?periodo=${periodo}&limit=${limit}`);
    return response.data;
  },

  /**
   * Obtiene productos con bajo rendimiento (pérdidas)
   * @param {string} periodo - 'dia', 'semana', 'mes', 'año'
   * @returns {Promise<Array>}
   */
  async getProductosBajoRendimiento(periodo = 'mes') {
    const response = await api.get(`/analytics/bajo-rendimiento?periodo=${periodo}`);
    return response.data;
  },

  /**
   * Obtiene análisis por tipo de pedido
   * @param {string} periodo - 'dia', 'semana', 'mes', 'año'
   * @returns {Promise<Array>}
   */
  async getAnalisisTipoPedido(periodo = 'mes') {
    const response = await api.get(`/analytics/tipo-pedido?periodo=${periodo}`);
    return response.data;
  },

  /**
   * Obtiene los horarios pico de actividad
   * @param {string} periodo - 'dia', 'semana', 'mes', 'año'
   * @returns {Promise<Array>}
   */
  async getHorariosPico(periodo = 'mes') {
    const response = await api.get(`/analytics/horarios-pico?periodo=${periodo}`);
    return response.data;
  },

  /**
   * Obtiene todas las estadísticas en una sola llamada
   * @param {string} periodo - 'dia', 'semana', 'mes', 'año'
   * @returns {Promise<Object>}
   */
  async getEstadisticasCompletas(periodo = 'mes') {
    const response = await api.get(`/analytics/completas?periodo=${periodo}`);
    return response.data;
  }
};

export default analyticsService;
