import supabase from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Modelo de Categoría
 */
class Category {
  /**
   * Obtener todas las categorías
   */
  static async getAll(incluirInactivas = false) {
    try {
      let query = supabase
        .from('categorias')
        .select('*')
        .order('orden', { ascending: true })
        .order('nombre', { ascending: true });

      if (!incluirInactivas) {
        query = query.eq('activo', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Error al obtener categorías:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener categoría por ID con sus subcategorías
   */
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select(`
          *,
          subcategorias (
            id,
            nombre,
            descripcion,
            orden,
            activo
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Error al obtener categoría ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crear categoría
   */
  static async create(categoriaData) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert([categoriaData])
        .select()
        .single();

      if (error) throw error;

      logger.info(`Categoría creada: ${data.nombre} (${data.id})`);
      return { success: true, data };
    } catch (error) {
      logger.error('Error al crear categoría:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar categoría
   */
  static async update(id, categoriaData) {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .update(categoriaData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Categoría actualizada: ${data.nombre} (${id})`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Error al actualizar categoría ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Eliminar categoría
   */
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info(`Categoría eliminada: ${id}`);
      return { success: true };
    } catch (error) {
      logger.error(`Error al eliminar categoría ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener productos de una categoría
   */
  static async getProductos(id) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('categoria_id', id)
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Error al obtener productos de categoría ${id}:`, error);
      return { success: false, error: error.message };
    }
  }
}

export default Category;
