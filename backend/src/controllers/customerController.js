import Customer from '../models/Customer.js';
import { success, created, notFound, serverError } from '../utils/responses.js';
import logger from '../utils/logger.js';

class CustomerController {
  async getAll(req, res) {
    try {
      const filtros = {
        busqueda: req.query.busqueda
      };

      const resultado = await Customer.getAll(filtros);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getAll clientes:', error);
      return serverError(res, 'Error al obtener clientes', error);
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Customer.getById(id);

      if (!resultado.success) {
        return notFound(res, 'Cliente no encontrado');
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getById cliente:', error);
      return serverError(res, 'Error al obtener cliente', error);
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Customer.update(id, req.body);

      if (!resultado.success) {
        return notFound(res, 'Cliente no encontrado');
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en update cliente:', error);
      return serverError(res, 'Error al actualizar cliente', error);
    }
  }

  async getPedidos(req, res) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 10;
      const resultado = await Customer.getPedidos(id, limit);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getPedidos cliente:', error);
      return serverError(res, 'Error al obtener pedidos', error);
    }
  }

  async getEstadisticas(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Customer.getEstadisticas(id);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getEstadisticas cliente:', error);
      return serverError(res, 'Error al obtener estadísticas', error);
    }
  }
}

export default new CustomerController();
