import supabase from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Modelo de Producto
 */
class Product {
  /**
   * Obtener todos los productos
   */
  static async getAll(filtros = {}) {
    try {
      let query = supabase
        .from('productos')
        .select(`
          *,
          categorias(id, nombre),
          subcategorias(id, nombre)
        `)
        .order('nombre', { ascending: true });

      // Aplicar filtros
      if (filtros.categoria_id) {
        query = query.eq('categoria_id', filtros.categoria_id);
      }

      if (filtros.subcategoria_id) {
        query = query.eq('subcategoria_id', filtros.subcategoria_id);
      }

      if (filtros.activo !== undefined) {
        query = query.eq('activo', filtros.activo);
      }

      if (filtros.busqueda) {
        query = query.ilike('nombre', `%${filtros.busqueda}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Error al obtener productos:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener producto por ID
   */
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          categorias(id, nombre),
          subcategorias(id, nombre)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Error al obtener producto ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crear producto
   */
  static async create(productoData) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .insert([productoData])
        .select()
        .single();

      if (error) throw error;

      logger.info(`Producto creado: ${data.nombre} (${data.id})`);
      return { success: true, data };
    } catch (error) {
      logger.error('Error al crear producto:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar producto
   */
  static async update(id, productoData) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .update({ 
          ...productoData, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Producto actualizado: ${data.nombre} (${id})`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Error al actualizar producto ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Eliminar producto (soft delete)
   */
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Producto desactivado: ${id}`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Error al eliminar producto ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Eliminar permanentemente
   */
  static async hardDelete(id) {
    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info(`Producto eliminado permanentemente: ${id}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error al eliminar permanentemente producto ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener productos activos para el menú de WhatsApp
   */
  static async getActivosParaMenu() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          id,
          nombre,
          descripcion,
          precio,
          stock,
          categorias(id, nombre, orden),
          subcategorias(id, nombre, orden)
        `)
        .eq('activo', true)
        .gt('stock', 0)
        .order('nombre', { ascending: true });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Error al obtener productos activos:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar stock
   */
  static async updateStock(id, cantidad) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .update({ stock: cantidad })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Stock actualizado para producto ${id}: ${cantidad}`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Error al actualizar stock del producto ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Decrementar stock
   */
  static async decrementarStock(id, cantidad) {
    try {
      // Primero obtener el producto
      const producto = await this.getById(id);
      
      if (!producto.success) {
        throw new Error('Producto no encontrado');
      }

      const nuevoStock = producto.data.stock - cantidad;

      if (nuevoStock < 0) {
        throw new Error('Stock insuficiente');
      }

      return await this.updateStock(id, nuevoStock);
    } catch (error) {
      logger.error(`Error al decrementar stock del producto ${id}:`, error);
      return { success: false, error: error.message };
    }
  }
}

export default Product;
