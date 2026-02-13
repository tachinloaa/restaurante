import { BOT_STATES, SESSION_TIMEOUT, MAX_ITEMS_CARRITO, MAX_TIPOS_PRODUCTOS } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Servicio de gestión de sesiones de usuarios del bot
 * Mantiene el contexto de la conversación activa
 */
class SessionService {
  constructor() {
    // Almacén de sesiones en memoria (en producción usar Redis)
    this.sessions = new Map();
    
    // Limpiar sesiones expiradas cada 5 minutos
    setInterval(() => this.limpiarSesionesExpiradas(), 5 * 60 * 1000);
  }

  /**
   * Obtener sesión de un usuario
   */
  getSession(telefono) {
    const session = this.sessions.get(telefono);
    
    if (!session) {
      return null;
    }

    // Si la sesión tiene extensión activa, verificar el tiempo extendido
    const tiempoLimite = session.extendidaHasta || (session.lastActivity + SESSION_TIMEOUT);
    
    // Verificar si la sesión ha expirado
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
  setSession(telefono, data = {}) {
    const session = this.sessions.get(telefono) || {
      telefono,
      estado: BOT_STATES.INICIO,
      carrito: [],
      datos: {},
      createdAt: Date.now()
    };

    // Actualizar datos de la sesión
    Object.assign(session, data);
    session.lastActivity = Date.now();

    this.sessions.set(telefono, session);
    
    logger.debug(`Sesión actualizada para ${telefono}: ${session.estado}`);
    return session;
  }

  /**
   * Actualizar estado del bot
   */
  updateEstado(telefono, nuevoEstado) {
    const session = this.getSession(telefono) || this.setSession(telefono);
    session.estado = nuevoEstado;
    session.lastActivity = Date.now();
    
    this.sessions.set(telefono, session);
    return session;
  }

  /**
   * Agregar producto al carrito
   */
  agregarAlCarrito(telefono, producto) {
    const session = this.getSession(telefono) || this.setSession(telefono);
    
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
    
    this.sessions.set(telefono, session);
    logger.info(`Producto agregado al carrito de ${telefono}: ${producto.nombre}`);
    
    return { success: true, session };
  }

  /**
   * Obtener carrito del usuario
   */
  getCarrito(telefono) {
    const session = this.getSession(telefono);
    return session ? session.carrito || [] : [];
  }

  /**
   * Limpiar carrito
   */
  limpiarCarrito(telefono) {
    const session = this.getSession(telefono);
    
    if (session) {
      session.carrito = [];
      session.lastActivity = Date.now();
      this.sessions.set(telefono, session);
    }
    
    return session;
  }

  /**
   * Guardar datos del usuario
   */
  guardarDatos(telefono, datos) {
    const session = this.getSession(telefono) || this.setSession(telefono);
    
    if (!session.datos) {
      session.datos = {};
    }

    Object.assign(session.datos, datos);
    session.lastActivity = Date.now();
    
    this.sessions.set(telefono, session);
    return session;
  }

  /**
   * Obtener datos guardados
   */
  getDatos(telefono) {
    const session = this.getSession(telefono);
    return session ? session.datos || {} : {};
  }

  /**
   * Eliminar sesión
   */
  deleteSession(telefono) {
    const deleted = this.sessions.delete(telefono);
    
    if (deleted) {
      logger.info(`Sesión eliminada para ${telefono}`);
    }
    
    return deleted;
  }

  /**
   * Reiniciar sesión (mantener usuario pero limpiar datos)
   */
  resetSession(telefono) {
    const session = {
      telefono,
      estado: BOT_STATES.INICIO,
      carrito: [],
      datos: {},
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.sessions.set(telefono, session);
    logger.info(`Sesión reiniciada para ${telefono}`);
    
    return session;
  }

  /**
   * Limpiar sesiones expiradas
   */
  limpiarSesionesExpiradas() {
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
      logger.info(`${contadorEliminados} sesiones expiradas eliminadas`);
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
  calcularTotalCarrito(telefono) {
    const carrito = this.getCarrito(telefono);
    
    return carrito.reduce((total, item) => {
      return total + (item.precio * item.cantidad);
    }, 0);
  }

  /**
   * Renovar actividad de la sesión (actualizar timestamp)
   */
  renovarActividad(telefono) {
    const session = this.sessions.get(telefono);
    if (session) {
      session.lastActivity = Date.now();
      this.sessions.set(telefono, session);
      logger.debug(`🔄 Actividad renovada para ${telefono}`);
    }
    return session;
  }

  /**
   * Extender sesión por un tiempo adicional
   */
  extenderSesion(telefono, tiempoExtra) {
    const session = this.sessions.get(telefono);
    if (session) {
      // Marcar cuándo expira la extensión
      session.extendidaHasta = Date.now() + tiempoExtra;
      session.lastActivity = Date.now();
      this.sessions.set(telefono, session);
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
