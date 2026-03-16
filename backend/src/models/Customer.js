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

  /**
   * 🔒 ANTI-SPAM: Incrementar contador de cancelaciones
   */
  static async incrementarCancelaciones(telefono) {
    try {
      const {error} = await supabase.rpc('incrementar_cancelacion', {
        telefono_param: telefono
      });

      if (error) throw error;

      logger.info(`📊 Cancelación registrada para: ${telefono}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error al incrementar cancelaciones para ${telefono}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔒 ANTI-SPAM: Bloquear cliente temporalmente
   */
  static async bloquear(telefono, dias = 7) {
    try {
      const { error } = await supabase.rpc('bloquear_cliente', {
        telefono_param: telefono,
        dias_param: dias
      });

      if (error) throw error;

      logger.warn(`🚫 Cliente bloqueado por ${dias} días: ${telefono}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error al bloquear cliente ${telefono}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔒 ANTI-SPAM: Desbloquear cliente
   */
  static async desbloquear(telefono) {
    try {
      const { error } = await supabase.rpc('desbloquear_cliente', {
        telefono_param: telefono
      });

      if (error) throw error;

      logger.info(`✅ Cliente desbloqueado: ${telefono}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error al desbloquear cliente ${telefono}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔒 ANTI-SPAM: Verificar si cliente está bloqueado
   * Si el bloqueo ya expiró, resetea el contador automáticamente
   */
  static async estaBloqueado(telefono) {
    try {
      const { data, error } = await supabase.rpc('cliente_esta_bloqueado', {
        telefono_param: telefono
      });

      if (error) throw error;

      const bloqueado = data || false;

      // Si NO está bloqueado, verificar si tenía bloqueo expirado para resetear contador
      if (!bloqueado) {
        try {
          const cliente = await this.getCancelaciones(telefono);
          if (cliente.bloqueado_hasta && new Date(cliente.bloqueado_hasta) < new Date()) {
            // Bloqueo expiró → resetear contador y fecha para dar oportunidad limpia
            await supabase
              .from('clientes')
              .update({ cancelaciones_count: 0, bloqueado_hasta: null })
              .eq('telefono', telefono);
            logger.info(`🔓 Contador de cancelaciones reseteado para ${telefono} (bloqueo expirado)`);
          }
        } catch (resetError) {
          logger.error(`Error al resetear contador post-bloqueo de ${telefono}:`, resetError);
        }
      }

      return { success: true, bloqueado };
    } catch (error) {
      logger.error(`Error al verificar bloqueo de ${telefono}:`, error);
      return { success: false, bloqueado: false };
    }
  }

  /**
   * 🔒 ANTI-SPAM: Obtener contador de cancelaciones
   */
  static async getCancelaciones(telefono) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('cancelaciones_count, bloqueado_hasta')
        .eq('telefono', telefono)
        .maybeSingle();

      if (error) throw error;

      return {
        success: true,
        cancelaciones: data?.cancelaciones_count || 0,
        bloqueado_hasta: data?.bloqueado_hasta || null
      };
    } catch (error) {
      logger.error(`Error al obtener cancelaciones de ${telefono}:`, error);
      return { success: false, cancelaciones: 0 };
    }
  }
}

export default Customer;

