import supabase from '../config/database.js';
import logger from '../utils/logger.js';
import { generarNumeroPedido } from '../utils/formatters.js';

/**
 * Modelo de Pedido
 */
class Order {
  /**
   * Obtener todos los pedidos con filtros
   */
  static async getAll(filtros = {}) {
    try {
      let query = supabase
        .from('pedidos')
        .select(`
          *,
          clientes(
            id,
            nombre,
            telefono,
            direccion
          )
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros.estados && Array.isArray(filtros.estados)) {
        // Filtrar por múltiples estados
        query = query.in('estado', filtros.estados);
      } else if (filtros.estado) {
        // Filtrar por un solo estado
        query = query.eq('estado', filtros.estado);
      }

      if (filtros.tipo_pedido) {
        query = query.eq('tipo_pedido', filtros.tipo_pedido);
      }

      if (filtros.cliente_id) {
        query = query.eq('cliente_id', filtros.cliente_id);
      }

      if (filtros.fecha_desde) {
        query = query.gte('created_at', filtros.fecha_desde);
      }

      if (filtros.fecha_hasta) {
        query = query.lte('created_at', filtros.fecha_hasta);
      }

      // Paginación
      if (filtros.limit) {
        query = query.limit(filtros.limit);
      }

      if (filtros.offset) {
        query = query.range(filtros.offset, filtros.offset + (filtros.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Error al obtener pedidos:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener pedido por ID con detalles
   */
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          clientes(
            id,
            nombre,
            telefono,
            direccion,
            referencias
          ),
          pedido_detalles(
            id,
            cantidad,
            precio_unitario,
            subtotal,
            productos(
              id,
              nombre,
              descripcion
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Error al obtener pedido ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener pedido por número de pedido
   */
  static async getByNumeroPedido(numeroPedido) {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          clientes(
            id,
            nombre,
            telefono,
            direccion
          ),
          pedido_detalles(
            id,
            cantidad,
            precio_unitario,
            subtotal,
            productos(
              id,
              nombre,
              descripcion
            )
          )
        `)
        .eq('numero_pedido', numeroPedido)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Error al obtener pedido ${numeroPedido}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crear pedido completo (con detalles)
   */
  static async create(pedidoData) {
    try {
      // Generar número de pedido único
      const numeroPedido = generarNumeroPedido();

      // Crear el pedido principal
      const { data: pedido, error: errorPedido } = await supabase
        .from('pedidos')
        .insert([{
          numero_pedido: numeroPedido,
          cliente_id: pedidoData.cliente_id,
          total: pedidoData.total,
          tipo_pedido: pedidoData.tipo_pedido,
          estado: pedidoData.estado || 'pendiente',
          direccion_entrega: pedidoData.direccion_entrega || null,
          notas: pedidoData.notas || null,
          metodo_pago: pedidoData.metodo_pago || 'efectivo',
          pago_verificado: pedidoData.pago_verificado !== undefined ? pedidoData.pago_verificado : true,
          comprobante_pago: pedidoData.comprobante_pago || null
        }])
        .select()
        .single();

      if (errorPedido) throw errorPedido;

      // Crear los detalles del pedido
      const detalles = pedidoData.productos.map(producto => ({
        pedido_id: pedido.id,
        producto_id: producto.producto_id,
        cantidad: producto.cantidad,
        precio_unitario: producto.precio_unitario,
        subtotal: producto.cantidad * producto.precio_unitario
      }));

      const { error: errorDetalles } = await supabase
        .from('pedido_detalles')
        .insert(detalles);

      if (errorDetalles) throw errorDetalles;

      logger.info(`Pedido creado: #${numeroPedido} (${pedido.id})`);

      // Retornar pedido completo
      return await this.getById(pedido.id);
    } catch (error) {
      logger.error('Error al crear pedido:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar estado del pedido
   */
  static async updateEstado(id, nuevoEstado) {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .update({
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Estado del pedido ${id} actualizado a: ${nuevoEstado}`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Error al actualizar estado del pedido ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar pedido
   */
  static async update(id, pedidoData) {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .update({
          ...pedidoData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Pedido actualizado: ${id}`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Error al actualizar pedido ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancelar pedido
   */
  static async cancelar(id, razon = null) {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .update({
          estado: 'cancelado',
          notas: razon ? `Cancelado: ${razon}` : 'Cancelado',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Pedido cancelado: ${id} - Razón: ${razon}`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Error al cancelar pedido ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener estadísticas de pedidos (optimizado)
   */
  static async getEstadisticas(filtros = {}) {
    try {
      let query = supabase
        .from('pedidos')
        .select('total, estado, tipo_pedido, created_at, cliente_id')
        .limit(5000); // Limitar para mejor rendimiento

      if (filtros.fecha_desde) {
        query = query.gte('created_at', filtros.fecha_desde);
      }

      if (filtros.fecha_hasta) {
        query = query.lte('created_at', filtros.fecha_hasta);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calcular estadísticas de forma eficiente
      const totalPedidos = data.length;
      const pedidosValidos = data.filter(p => p.estado !== 'cancelado');
      const totalVentas = pedidosValidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);

      const pedidosPorEstado = {};
      const pedidosPorTipo = {};

      data.forEach(p => {
        pedidosPorEstado[p.estado] = (pedidosPorEstado[p.estado] || 0) + 1;
        pedidosPorTipo[p.tipo_pedido] = (pedidosPorTipo[p.tipo_pedido] || 0) + 1;
      });

      return {
        success: true,
        data: {
          totalPedidos,
          totalVentas,
          promedioVenta: totalPedidos > 0 ? totalVentas / totalPedidos : 0,
          pedidosPorEstado,
          pedidosPorTipo,
          totalClientes: new Set(data.map(p => p.cliente_id).filter(Boolean)).size
        }
      };
    } catch (error) {
      logger.error('Error al obtener estadísticas de pedidos:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener últimos pedidos recientes
   */
  static async getRecientes(limit = 10) {
    return await this.getAll({ limit, offset: 0 });
  }

  /**
   * Obtener pedidos pendientes
   */
  static async getPendientes() {
    return await this.getAll({
      estado: 'pendiente',
      limit: 50
    });
  }
}

export default Order;
