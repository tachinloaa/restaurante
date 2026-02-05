import supabase from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Modelo de Cliente
 */
class Customer {
  /**
   * Obtener todos los clientes
   */
  static async getAll(filtros = {}) {
    try {
      let query = supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (filtros.busqueda) {
        query = query.or(`nombre.ilike.%${filtros.busqueda}%,telefono.ilike.%${filtros.busqueda}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Error al obtener clientes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener cliente por ID
   */
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Error al obtener cliente ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener cliente por teléfono
   */
  static async getByTelefono(telefono) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefono', telefono)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no encontrado
        throw error;
      }

      return { success: true, data: data || null };
    } catch (error) {
      logger.error(`Error al obtener cliente por teléfono ${telefono}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crear cliente
   */
  static async create(clienteData) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([clienteData])
        .select()
        .single();

      if (error) throw error;

      logger.info(`Cliente creado: ${data.nombre} - ${data.telefono} (${data.id})`);
      return { success: true, data };
    } catch (error) {
      logger.error('Error al crear cliente:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar cliente
   */
  static async update(id, clienteData) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .update(clienteData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Cliente actualizado: ${data.nombre} (${id})`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Error al actualizar cliente ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Eliminar cliente
   */
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info(`Cliente eliminado: ${id}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error al eliminar cliente ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener pedidos de un cliente
   */
  static async getPedidos(id, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Error al obtener pedidos del cliente ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crear o actualizar cliente por teléfono
   */
  static async upsertByTelefono(clienteData) {
    try {
      // Primero intentar obtener el cliente
      const clienteExistente = await this.getByTelefono(clienteData.telefono);

      if (clienteExistente.data) {
        // Cliente existe, actualizar
        return await this.update(clienteExistente.data.id, clienteData);
      } else {
        // Cliente no existe, crear
        return await this.create(clienteData);
      }
    } catch (error) {
      logger.error('Error al upsert de cliente:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener estadísticas de un cliente
   */
  static async getEstadisticas(id) {
    try {
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('total, estado')
        .eq('cliente_id', id);

      if (error) throw error;

      const totalPedidos = pedidos.length;
      const totalGastado = pedidos.reduce((sum, pedido) => sum + parseFloat(pedido.total), 0);
      const pedidosCompletados = pedidos.filter(p => p.estado === 'entregado').length;
      const pedidosCancelados = pedidos.filter(p => p.estado === 'cancelado').length;

      return {
        success: true,
        data: {
          totalPedidos,
          totalGastado,
          pedidosCompletados,
          pedidosCancelados,
          promedioGasto: totalPedidos > 0 ? totalGastado / totalPedidos : 0
        }
      };
    } catch (error) {
      logger.error(`Error al obtener estadísticas del cliente ${id}:`, error);
      return { success: false, error: error.message };
    }
  }
}

export default Customer;
