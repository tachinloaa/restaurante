import supabase from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Modelo de Subcategoría
 */
class Subcategory {
  /**
   * Obtener todas las subcategorías
   */
  static async getAll(incluirInactivas = false) {
    try {
      let query = supabase
        .from('subcategorias')
        .select(`
          *,
          categorias(id, nombre)
        `)
        .order('orden', { ascending: true })
        .order('nombre', { ascending: true });

      if (!incluirInactivas) {
        query = query.eq('activo', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Error al obtener subcategorías:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener subcategorías de una categoría
   */
  static async getByCategoria(categoriaId, incluirInactivas = false) {
    try {
      let query = supabase
        .from('subcategorias')
        .select('*')
        .eq('categoria_id', categoriaId)
        .order('orden', { ascending: true })
        .order('nombre', { ascending: true });

      if (!incluirInactivas) {
        query = query.eq('activo', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Error al obtener subcategorías de categoría ${categoriaId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener subcategoría por ID
   */
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('subcategorias')
        .select(`
          *,
          categorias(id, nombre)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Error al obtener subcategoría ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crear subcategoría
   */
  static async create(subcategoriaData) {
    try {
      const { data, error } = await supabase
        .from('subcategorias')
        .insert([subcategoriaData])
        .select()
        .single();

      if (error) throw error;

      logger.info(`Subcategoría creada: ${data.nombre} (${data.id})`);
      return { success: true, data };
    } catch (error) {
      logger.error('Error al crear subcategoría:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar subcategoría
   */
  static async update(id, subcategoriaData) {
    try {
      const { data, error } = await supabase
        .from('subcategorias')
        .update(subcategoriaData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Subcategoría actualizada: ${data.nombre} (${id})`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Error al actualizar subcategoría ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Eliminar subcategoría
   */
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('subcategorias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info(`Subcategoría eliminada: ${id}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error al eliminar subcategoría ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener productos de una subcategoría
   */
  static async getProductos(id) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('subcategoria_id', id)
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Error al obtener productos de subcategoría ${id}:`, error);
      return { success: false, error: error.message };
    }
  }
}

export default Subcategory;
