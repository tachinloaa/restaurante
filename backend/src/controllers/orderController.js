import Order from '../models/Order.js';
import OrderService from '../services/orderService.js';
import NotificationService from '../services/notificationService.js';
import { success, created, notFound, serverError } from '../utils/responses.js';
import logger from '../utils/logger.js';

class OrderController {
  async getAll(req, res) {
    try {
      const filtros = {
        estado: req.query.estado,
        tipo_pedido: req.query.tipo_pedido,
        cliente_id: req.query.cliente_id,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const resultado = await Order.getAll(filtros);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getAll pedidos:', error);
      return serverError(res, 'Error al obtener pedidos', error);
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const resultado = await Order.getById(id);

      if (!resultado.success) {
        return notFound(res, 'Pedido no encontrado');
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getById pedido:', error);
      return serverError(res, 'Error al obtener pedido', error);
    }
  }

  async create(req, res) {
    try {
      const resultado = await Order.create(req.body);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      // Enviar notificación WhatsApp al admin
      await NotificationService.notificarNuevoPedido(resultado.data, req.body.cliente);
      
      // Crear notificación en el panel
      await NotificationService.notificarNuevoPedidoPanel(resultado.data, req.body.cliente);

      return created(res, resultado.data);
    } catch (error) {
      logger.error('Error en create pedido:', error);
      return serverError(res, 'Error al crear pedido', error);
    }
  }

  async updateEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!estado) {
        return serverError(res, 'Estado requerido');
      }

      // Obtener el pedido actual para tener el estado anterior
      const pedidoActual = await Order.getById(id);
      if (!pedidoActual.success) {
        return notFound(res, 'Pedido no encontrado');
      }
      
      const estadoAnterior = pedidoActual.data.estado;

      const resultado = await OrderService.cambiarEstado(id, estado);

      if (!resultado.success) {
        return notFound(res, 'Pedido no encontrado');
      }

      // Notificar al cliente si es necesario
      if (['preparando', 'listo', 'enviado', 'entregado'].includes(estado)) {
        const pedido = await Order.getById(id);
        if (pedido.success && pedido.data.clientes) {
          await NotificationService.notificarEstadoPedido(pedido.data, pedido.data.clientes);
        }
      }
      
      // Crear notificación en el panel
      await NotificationService.notificarCambioEstadoPedido(resultado.pedido, estadoAnterior, estado);

      return success(res, resultado.pedido);
    } catch (error) {
      logger.error('Error en updateEstado pedido:', error);
      return serverError(res, 'Error al actualizar estado', error);
    }
  }

  async cancelar(req, res) {
    try {
      const { id } = req.params;
      const { razon } = req.body;

      const resultado = await OrderService.cancelarPedido(id, razon);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      // Notificar al admin
      await NotificationService.notificarPedidoCancelado(resultado.pedido, razon);

      return success(res, resultado.pedido);
    } catch (error) {
      logger.error('Error en cancelar pedido:', error);
      return serverError(res, 'Error al cancelar pedido', error);
    }
  }

  async getEstadisticas(req, res) {
    try {
      const filtros = {
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta
      };

      const resultado = await Order.getEstadisticas(filtros);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getEstadisticas pedidos:', error);
      return serverError(res, 'Error al obtener estadísticas', error);
    }
  }

  async getRecientes(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const resultado = await Order.getRecientes(limit);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getRecientes:', error);
      return serverError(res, 'Error al obtener pedidos recientes', error);
    }
  }
}

export default new OrderController();
