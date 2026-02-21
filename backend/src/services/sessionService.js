import { BOT_STATES, SESSION_TIMEOUT, MAX_ITEMS_CARRITO, MAX_TIPOS_PRODUCTOS } from '../config/constants.js';
import logger from '../utils/logger.js';
import config from '../config/environment.js';

// Inicializar Redis solo si está habilitado
let redisClient = null;
let isRedisConnected = false;

if (config.redis.enabled && config.redis.url) {
  try {
    // Importación dinámica para evitar errores si redis no está instalado
    const redis = await import('redis');
    redisClient = redis.createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('❌ Redis: Máximo de reintentos alcanzado');
            return new Error('Redis: Máximo de reintentos alcanzado');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis Error:', err);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis conectado');
      isRedisConnected = true;
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis listo para usar');
      isRedisConnected = true;
    });

    redisClient.on('reconnecting', () => {
      logger.warn('⚠️ Redis reconectando...');
      isRedisConnected = false;
    });

    await redisClient.connect();
  } catch (error) {
    logger.warn('⚠️ Redis no disponible, usando memoria:', error.message);
    redisClient = null;
    isRedisConnected = false;
  }
}

/**
 * Servicio de gestión de sesiones de usuarios del bot
 * Soporta Redis (producción) y memoria (desarrollo)
 */
class SessionService {
  constructor() {
    // Almacén de sesiones en memoria (fallback si Redis no está disponible)
    this.sessions = new Map();
    
    // Limpiar sesiones expiradas cada 5 minutos
    setInterval(() => this.limpiarSesionesExpiradas(), 5 * 60 * 1000);
  }

  /**
   * Generar key para Redis
   */
  _getRedisKey(telefono) {
    return `session:${telefono}`;
  }

  /**
   * Obtener sesión de un usuario
   */
  async getSession(telefono) {
    try {
      // Intentar obtener de Redis si está disponible
      if (isRedisConnected && redisClient) {
        const key = this._getRedisKey(telefono);
        const data = await redisClient.get(key);
        
        if (data) {
          const session = JSON.parse(data);
          
          // Verificar si la sesión ha expirado
          const tiempoLimite = session.extendidaHasta || (session.lastActivity + SESSION_TIMEOUT);
          if (Date.now() > tiempoLimite) {
            await this.deleteSession(telefono);
            logger.info(`Sesión expirada para ${telefono}`);
            return null;
          }
          
          return session;
        }
        return null;
      }
    } catch (error) {
      logger.error('Error obteniendo sesión de Redis:', error);
      // Fallback a memoria
    }

    // Fallback a memoria
    const session = this.sessions.get(telefono);
    
    if (!session) {
      return null;
    }

    const tiempoLimite = session.extendidaHasta || (session.lastActivity + SESSION_TIMEOUT);
    
    if (Date.now() > tiempoLimite) {
      this.deleteSession(telefono);
      logger.info(`Sesión expirada para ${telefono}`);
      return null;
    }

    return session;
  }

  /**
   * Crear o actualizar sesión
   */
  async setSession(telefono, data = {}) {
    const existingSession = await this.getSession(telefono);
    
    const session = existingSession || {
      telefono,
      estado: BOT_STATES.INICIO,
      carrito: [],
      datos: {},
      createdAt: Date.now()
    };

    // Actualizar datos de la sesión
    Object.assign(session, data);
    session.lastActivity = Date.now();

    try {
      // Guardar en Redis si está disponible
      if (isRedisConnected && redisClient) {
        const key = this._getRedisKey(telefono);
        const ttl = Math.ceil(SESSION_TIMEOUT / 1000); // Convertir a segundos
        await redisClient.setEx(key, ttl, JSON.stringify(session));
      }
    } catch (error) {
      logger.error('Error guardando sesión en Redis:', error);
    }

    // Siempre guardar en memoria como fallback
    this.sessions.set(telefono, session);
    
    logger.debug(`Sesión actualizada para ${telefono}: ${session.estado}`);
    return session;
  }

  /**
   * Actualizar estado del bot
   */
  async updateEstado(telefono, nuevoEstado) {
    const session = (await this.getSession(telefono)) || (await this.setSession(telefono));
    session.estado = nuevoEstado;
    session.lastActivity = Date.now();
    
    await this.setSession(telefono, session);
    return session;
  }

  /**
   * Agregar producto al carrito
   */
  async agregarAlCarrito(telefono, producto) {
    const session = (await this.getSession(telefono)) || (await this.setSession(telefono));
    
    if (!session.carrito) {
      session.carrito = [];
    }

    // Validar límite de tipos diferentes de productos
    if (session.carrito.length >= MAX_TIPOS_PRODUCTOS) {
      return {
        error: true,
        mensaje: `No puedes agregar más de ${MAX_TIPOS_PRODUCTOS} tipos diferentes de productos`
      };
    }

    // Calcular items totales actuales
    const itemsTotales = session.carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    // Validar límite total de items
    if (itemsTotales + producto.cantidad > MAX_ITEMS_CARRITO) {
      return {
        error: true,
        mensaje: `No puedes agregar más de ${MAX_ITEMS_CARRITO} items en total. Actualmente tienes ${itemsTotales}`
      };
    }

    session.carrito.push(producto);
    session.lastActivity = Date.now();
    
    await this.setSession(telefono, session);
    logger.info(`Producto agregado al carrito de ${telefono}: ${producto.nombre}`);
    
    return { success: true, session };
  }

  /**
   * Obtener carrito del usuario
   */
  async getCarrito(telefono) {
    const session = await this.getSession(telefono);
    return session ? session.carrito || [] : [];
  }

  /**
   * Limpiar carrito
   */
  async limpiarCarrito(telefono) {
    const session = await this.getSession(telefono);
    
    if (session) {
      session.carrito = [];
      session.lastActivity = Date.now();
      await this.setSession(telefono, session);
    }
    
    return session;
  }

  /**
   * Quitar producto del carrito por índice
   */
  async quitarDelCarrito(telefono, indice) {
    const session = await this.getSession(telefono);
    
    if (session && session.carrito && session.carrito.length > indice) {
      session.carrito.splice(indice, 1);
      session.lastActivity = Date.now();
      await this.setSession(telefono, session);
      logger.info(`Producto eliminado del carrito de ${telefono} en índice ${indice}`);
    }
    
    return session;
  }

  /**
   * Guardar datos del usuario
   */
  async guardarDatos(telefono, datos) {
    const session = (await this.getSession(telefono)) || (await this.setSession(telefono));
    
    if (!session.datos) {
      session.datos = {};
    }

    Object.assign(session.datos, datos);
    session.lastActivity = Date.now();
    
    await this.setSession(telefono, session);
    return session;
  }

  /**
   * Obtener datos guardados
   */
  async getDatos(telefono) {
    const session = await this.getSession(telefono);
    return session ? session.datos || {} : {};
  }

  /**
   * Eliminar sesión
   */
  async deleteSession(telefono) {
    try {
      // Eliminar de Redis si está disponible
      if (isRedisConnected && redisClient) {
        const key = this._getRedisKey(telefono);
        await redisClient.del(key);
      }
    } catch (error) {
      logger.error('Error eliminando sesión de Redis:', error);
    }

    const deleted = this.sessions.delete(telefono);
    
    if (deleted) {
      logger.info(`Sesión eliminada para ${telefono}`);
    }
    
    return deleted;
  }

  /**
   * Reiniciar sesión (mantener usuario pero limpiar datos)
   */
  async resetSession(telefono) {
    const session = {
      telefono,
      estado: BOT_STATES.INICIO,
      carrito: [],
      datos: {},
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    await this.setSession(telefono, session);
    logger.info(`Sesión reiniciada para ${telefono}`);
    
    return session;
  }

  /**
   * Limpiar sesiones expiradas (solo en memoria, Redis maneja TTL automático)
   */
  async limpiarSesionesExpiradas() {
    const ahora = Date.now();
    let contadorEliminados = 0;

    for (const [telefono, session] of this.sessions.entries()) {
      const tiempoLimite = session.extendidaHasta || (session.lastActivity + SESSION_TIMEOUT);
      
      if (ahora > tiempoLimite) {
        this.sessions.delete(telefono);
        contadorEliminados++;
      }
    }

    if (contadorEliminados > 0) {
      logger.info(`${contadorEliminados} sesiones expiradas eliminadas de memoria`);
    }
  }

  /**
   * Obtener estadísticas de sesiones
   */
  getEstadisticas() {
    return {
      total: this.sessions.size,
      activas: Array.from(this.sessions.values()).filter(
        s => Date.now() - s.lastActivity < SESSION_TIMEOUT
      ).length
    };
  }

  /**
   * Calcular total del carrito
   */
  async calcularTotalCarrito(telefono) {
    const carrito = await this.getCarrito(telefono);
    
    return carrito.reduce((total, item) => {
      return total + (item.precio * item.cantidad);
    }, 0);
  }

  /**
   * Renovar actividad de la sesión (actualizar timestamp)
   */
  async renovarActividad(telefono) {
    const session = await this.getSession(telefono);
    if (session) {
      session.lastActivity = Date.now();
      await this.setSession(telefono, session);
      logger.debug(`🔄 Actividad renovada para ${telefono}`);
    }
    return session;
  }

  /**
   * Extender sesión por un tiempo adicional
   */
  async extenderSesion(telefono, tiempoExtra) {
    const session = await this.getSession(telefono);
    if (session) {
      // Marcar cuándo expira la extensión
      session.extendidaHasta = Date.now() + tiempoExtra;
      session.lastActivity = Date.now();
      await this.setSession(telefono, session);
      logger.info(`⏰ Sesión extendida para ${telefono} por ${tiempoExtra / 60000} minutos`);
    }
    return session;
  }

  /**
   * Obtener todas las sesiones (admin)
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

// Exportar instancia única (Singleton)
export default new SessionService();
