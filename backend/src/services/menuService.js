import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Subcategory from '../models/Subcategory.js';
import { formatearPrecio } from '../utils/formatters.js';
import { EMOJIS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Servicio para generar menús formateados para WhatsApp
 */
class MenuService {
  /**
   * Caché del menú (actualizar cada 5 minutos o cuando cambie)
   */
  constructor() {
    this.menuCache = null;
    this.lastUpdate = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Obtener menú completo formateado para WhatsApp
   */
  async getMenuCompleto() {
    try {
      // Usar caché si está disponible y no ha expirado
      if (this.menuCache && this.lastUpdate && 
          (Date.now() - this.lastUpdate) < this.CACHE_DURATION) {
        return this.menuCache;
      }

      // Obtener datos de la base de datos
      const categorias = await Category.getAll();
      const productos = await Product.getActivosParaMenu();

      if (!categorias.success || !productos.success) {
        throw new Error('Error al cargar datos del menú');
      }

      // Agrupar productos por categoría
      const menuPorCategoria = this.agruparPorCategoria(
        categorias.data,
        productos.data
      );

      // Formatear menú para WhatsApp
      const menuFormateado = this.formatearMenuWhatsApp(menuPorCategoria);

      // Actualizar caché
      this.menuCache = menuFormateado;
      this.lastUpdate = Date.now();

      logger.info('Menú actualizado y cacheado');
      return menuFormateado;
    } catch (error) {
      logger.error('Error al generar menú completo:', error);
      return null;
    }
  }

  /**
   * Agrupar productos por categoría y subcategoría
   */
  agruparPorCategoria(categorias, productos) {
    const menuAgrupado = [];

    for (const categoria of categorias) {
      const productosCategoria = productos.filter(
        p => p.categorias?.id === categoria.id
      );

      if (productosCategoria.length > 0) {
        // Agrupar por subcategoría si existen
        const subcategorias = {};
        const sinSubcategoria = [];

        for (const producto of productosCategoria) {
          if (producto.subcategorias) {
            const subcatId = producto.subcategorias.id;
            if (!subcategorias[subcatId]) {
              subcategorias[subcatId] = {
                ...producto.subcategorias,
                productos: []
              };
            }
            subcategorias[subcatId].productos.push(producto);
          } else {
            sinSubcategoria.push(producto);
          }
        }

        menuAgrupado.push({
          categoria,
          subcategorias: Object.values(subcategorias),
          productosSinSubcategoria: sinSubcategoria
        });
      }
    }

    return menuAgrupado;
  }

  /**
   * Formatear menú para mensajes de WhatsApp
   */
  formatearMenuWhatsApp(menuAgrupado) {
    let mensaje = `${EMOJIS.TICKET} *MENÚ DE EL RINCONCITO* ${EMOJIS.TACO}\n\n`;
    let contador = 1;
    const productos = [];

    for (const grupo of menuAgrupado) {
      // Emoji de categoría
      const emojiCategoria = this.getEmojiCategoria(grupo.categoria.nombre);
      mensaje += `${emojiCategoria} *${grupo.categoria.nombre.toUpperCase()}*\n\n`;

      // Si hay subcategorías
      if (grupo.subcategorias.length > 0) {
        for (const subcat of grupo.subcategorias) {
          mensaje += `  _${subcat.nombre}_\n`;
          
          for (const producto of subcat.productos) {
            mensaje += `${contador}. ${producto.nombre}`;
            
            if (producto.descripcion) {
              mensaje += ` - ${producto.descripcion}`;
            }
            
            mensaje += ` - ${formatearPrecio(producto.precio)}\n`;
            
            productos.push({
              numero: contador,
              id: producto.id,
              nombre: producto.nombre,
              precio: producto.precio,
              descripcion: producto.descripcion,
              categoria: grupo.categoria.nombre,
              subcategoria: subcat.nombre
            });
            
            contador++;
          }
          mensaje += '\n';
        }
      }

      // Productos sin subcategoría
      if (grupo.productosSinSubcategoria.length > 0) {
        for (const producto of grupo.productosSinSubcategoria) {
          mensaje += `${contador}. ${producto.nombre}`;
          
          if (producto.descripcion) {
            mensaje += ` - ${producto.descripcion}`;
          }
          
          mensaje += ` - ${formatearPrecio(producto.precio)}\n`;
          
          productos.push({
            numero: contador,
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            descripcion: producto.descripcion,
            categoria: grupo.categoria.nombre
          });
          
          contador++;
        }
        mensaje += '\n';
      }
    }

    // NO incluir instrucciones de ordenar aquí - se agregan en botService según contexto
    return {
      mensaje,
      productos,
      totalProductos: productos.length
    };
  }

  /**
   * Obtener emoji según categoría
   */
  getEmojiCategoria(nombreCategoria) {
    const nombre = nombreCategoria.toLowerCase();
    
    const emojis = {
      'antojitos': EMOJIS.TACO,
      'guisados': '🍲',
      'hamburguesas': EMOJIS.HAMBURGUESA,
      'hot dogs': EMOJIS.HOTDOG,
      'hotdogs': EMOJIS.HOTDOG,
      'caldos': EMOJIS.SOPA,
      'sopas': EMOJIS.SOPA,
      'bebidas': EMOJIS.BEBIDA,
      'jugos': EMOJIS.JUGO,
      'postres': '🍰',
      'desayunos': '🍳',
      'comidas': '🍽️',
      'paquetes': '📦',
      'paquete': '📦',
      'promos': '🎁',
      'promociones': '🎁'
    };

    for (const [key, emoji] of Object.entries(emojis)) {
      if (nombre.includes(key)) {
        return emoji;
      }
    }

    return '📋';
  }

  /**
   * Buscar producto por número
   */
  async buscarPorNumero(numero) {
    const menu = await this.getMenuCompleto();
    
    if (!menu) {
      return null;
    }

    const producto = menu.productos.find(p => p.numero === parseInt(numero));
    return producto || null;
  }

  /**
   * Buscar producto por nombre (búsqueda flexible)
   */
  async buscarPorNombre(nombre) {
    const menu = await this.getMenuCompleto();
    
    if (!menu) {
      return null;
    }

    const nombreLower = nombre.toLowerCase();
    
    // Buscar coincidencia exacta
    let producto = menu.productos.find(
      p => p.nombre.toLowerCase() === nombreLower
    );

    // Si no hay coincidencia exacta, buscar que contenga el texto
    if (!producto) {
      producto = menu.productos.find(
        p => p.nombre.toLowerCase().includes(nombreLower)
      );
    }

    return producto || null;
  }

  /**
   * Invalidar caché (llamar cuando se actualice el menú)
   */
  invalidarCache() {
    this.menuCache = null;
    this.lastUpdate = null;
    logger.info('Caché de menú invalidado');
  }

  /**
   * Obtener lista de categorías disponibles
   */
  async getCategorias() {
    try {
      const categorias = await Category.getAll();
      const productos = await Product.getActivosParaMenu();

      if (!categorias.success || !productos.success) {
        throw new Error('Error al cargar categorías');
      }

      // Filtrar solo categorías que tengan productos
      const categoriasConProductos = categorias.data.filter(cat => 
        productos.data.some(prod => prod.categorias?.id === cat.id)
      );

      return {
        success: true,
        categorias: categoriasConProductos.map(cat => ({
          id: cat.id,
          nombre: cat.nombre,
          emoji: this.getEmojiCategoria(cat.nombre)
        }))
      };
    } catch (error) {
      logger.error('Error al obtener categorías:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener menú de una categoría específica
   */
  async getMenuCategoria(categoriaId) {
    try {
      const productos = await Product.getActivosParaMenu();
      if (!productos.success) {
        throw new Error('Error al cargar productos');
      }

      // Obtener info de la categoría
      const categoriaResult = await Category.getById(categoriaId);
      if (!categoriaResult.success) {
        throw new Error('Categoría no encontrada');
      }

      const categoria = categoriaResult.data;
      const productosCategoria = productos.data.filter(
        p => p.categorias?.id === categoriaId
      );

      if (productosCategoria.length === 0) {
        return {
          success: false,
          mensaje: 'Esta categoría no tiene productos disponibles'
        };
      }

      // Formatear mensaje
      const emoji = this.getEmojiCategoria(categoria.nombre);
      let mensaje = `${emoji} *${categoria.nombre.toUpperCase()}*\n\n`;
      
      const productosFormateados = [];
      const menuCompleto = await this.getMenuCompleto();
      
      productosCategoria.forEach(producto => {
        // Buscar el número del producto en el menú completo
        const productoConNumero = menuCompleto.productos.find(p => p.id === producto.id);
        if (productoConNumero) {
          mensaje += `${productoConNumero.numero}. ${producto.nombre}`;
          
          if (producto.descripcion) {
            mensaje += ` - ${producto.descripcion}`;
          }
          
          mensaje += ` - ${formatearPrecio(producto.precio)}\n`;
          
          productosFormateados.push({
            numero: productoConNumero.numero,
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio
          });
        }
      });

      return {
        success: true,
        mensaje,
        productos: productosFormateados,
        categoria: categoria.nombre
      };
    } catch (error) {
      logger.error('Error al generar menú de categoría:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Invalidar caché del menú (llamar cuando se modifica el menú)
   */
  invalidarCache() {
    this.menuCache = null;
    this.lastUpdate = null;
    logger.info('Caché del menú invalidado - se actualizará en la próxima consulta');
  }
}

// Exportar instancia única (Singleton)
export default new MenuService();
