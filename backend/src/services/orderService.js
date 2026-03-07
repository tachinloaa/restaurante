import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import SessionService from './sessionService.js';
import TwilioService from './twilioService.js';
import { formatearPrecio, limpiarNumeroWhatsApp } from '../utils/formatters.js';
import { TIPOS_PEDIDO, ESTADOS_PEDIDO } from '../config/constants.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * 🚨 COLA DE EMERGENCIA PARA PEDIDOS
 * Si Supabase falla, los pedidos se guardan aquí temporalmente
 */
const pendingOrders = [];
const EMERGENCY_QUEUE_FILE = path.join(process.cwd(), 'emergency_orders.json');

// Cargar pedidos pendientes al iniciar (si existen)
try {
  if (fs.existsSync(EMERGENCY_QUEUE_FILE)) {
    const data = fs.readFileSync(EMERGENCY_QUEUE_FILE, 'utf8');
    const savedOrders = JSON.parse(data);
    pendingOrders.push(...savedOrders);
    logger.info(`📦 ${pendingOrders.length} pedidos cargados de la cola de emergencia`);
  }
} catch (error) {
  logger.error('Error cargando cola de emergencia:', error);
}

// Guardar cola en archivo cada 30 segundos
setInterval(() => {
  if (pendingOrders.length > 0) {
    try {
      fs.writeFileSync(EMERGENCY_QUEUE_FILE, JSON.stringify(pendingOrders, null, 2));
      logger.info(`💾 Cola de emergencia guardada: ${pendingOrders.length} pedidos`);
    } catch (error) {
      logger.error('Error guardando cola de emergencia:', error);
    }
  }
}, 30000);

/**
 * Servicio para procesar pedidos
 */
class OrderService {
  /**
   * Crear pedido desde el bot de WhatsApp
   */
  async crearPedidoDesdeBot(telefono) {
    try {
      // Obtener datos de la sesión
      const session = await SessionService.getSession(telefono);
      
      if (!session || !session.carrito || session.carrito.length === 0) {
        throw new Error('No hay productos en el carrito');
      }

      // Validar y obtener/crear cliente
      const telefonoLimpio = limpiarNumeroWhatsApp(telefono);
      const datosCliente = session.datos;

      let cliente = await Customer.getByTelefono(telefonoLimpio);

      if (!cliente.data) {
        // Crear nuevo cliente
        const nuevoCliente = await Customer.create({
          telefono: telefonoLimpio,
          nombre: datosCliente.nombre,
          direccion: datosCliente.direccion || null,
          referencias: datosCliente.referencias || null
        });

        if (!nuevoCliente.success) {
          throw new Error('Error al crear cliente');
        }

        cliente = nuevoCliente;
      } else {
        // Actualizar datos del cliente existente si es necesario
        if (datosCliente.nombre || datosCliente.direccion) {
          await Customer.update(cliente.data.id, {
            nombre: datosCliente.nombre || cliente.data.nombre,
            direccion: datosCliente.direccion || cliente.data.direccion,
            referencias: datosCliente.referencias || cliente.data.referencias
          });
        }
      }

      // Preparar productos del pedido
      const productosConDetalles = await this.validarProductosCarrito(session.carrito);

      if (!productosConDetalles.success) {
        throw new Error(productosConDetalles.error);
      }

      // Calcular total
      const total = productosConDetalles.productos.reduce(
        (sum, p) => sum + (p.precio_unitario * p.cantidad),
        0
      );

      // Crear pedido
      const pedidoData = {
        cliente_id: cliente.data.id,
        total,
        tipo_pedido: datosCliente.tipo_pedido || TIPOS_PEDIDO.DOMICILIO,
        estado: ESTADOS_PEDIDO.PENDIENTE,
        direccion_entrega: datosCliente.direccion || null,
        notas: datosCliente.notas || null,
        metodo_pago: datosCliente.metodo_pago || 'efectivo',
        pago_verificado: datosCliente.metodo_pago === 'transferencia' ? false : true,
        comprobante_pago: datosCliente.comprobante_info || null,
        productos: productosConDetalles.productos
      };

      // 🛡️ INTENTAR CREAR PEDIDO CON MANEJO DE FALLOS
      let pedido;
      try {
        pedido = await Order.create(pedidoData);

        if (!pedido.success) {
          throw new Error('Error al crear pedido en Supabase');
        }

        // Limpiar sesión
        await SessionService.limpiarCarrito(telefono);
        await SessionService.guardarDatos(telefono, { ultimo_pedido: pedido.data.numero_pedido });

        logger.info(`✅ Pedido creado desde bot: #${pedido.data.numero_pedido}`);

        return {
          success: true,
          pedido: pedido.data,
          cliente: cliente.data
        };
      } catch (dbError) {
        // 🚨 SUPABASE FALLÓ - GUARDAR EN COLA DE EMERGENCIA
        logger.error('💥 Error crítico al crear pedido en Supabase:', dbError);
        
        const pedidoEmergencia = {
          id: `EMERGENCY_${Date.now()}`,
          telefono: telefonoLimpio,
          cliente: {
            id: cliente.data?.id,
            nombre: datosCliente.nombre,
            telefono: telefonoLimpio
          },
          datos: pedidoData,
          timestamp: new Date().toISOString(),
          intentos: 0
        };

        pendingOrders.push(pedidoEmergencia);
        
        // Guardar inmediatamente en archivo
        try {
          fs.writeFileSync(EMERGENCY_QUEUE_FILE, JSON.stringify(pendingOrders, null, 2));
        } catch (fileError) {
          logger.error('Error guardando en archivo de emergencia:', fileError);
        }

        logger.warn(`📦 Pedido guardado en cola de emergencia: ${pedidoEmergencia.id}`);

        // 🚨 NOTIFICAR AL ADMIN URGENTE (siempre, sin condición)
        try {
          const mensajeAdmin = `🚨 *PEDIDO EN COLA DE EMERGENCIA*\n\n` +
            `❌ Supabase falló al guardar pedido\n` +
            `👤 Cliente: ${datosCliente.nombre}\n` +
            `📞 Tel: ${telefonoLimpio}\n` +
            `💰 Total: ${formatearPrecio(total)}\n` +
            `📦 ID Emergencia: ${pedidoEmergencia.id}\n\n` +
            `⚠️ El pedido está guardado en cola.\n` +
            `Revisa emergency_orders.json`;
          
          await TwilioService.enviarMensajeAdmin(mensajeAdmin);
        } catch (notifError) {
          logger.error('Error notificando al admin:', notifError);
        }

        // Limpiar sesión de todas formas
        await SessionService.limpiarCarrito(telefono);
        await SessionService.guardarDatos(telefono, { ultimo_pedido_emergencia: pedidoEmergencia.id });

        return {
          success: true,
          queued: true,
          emergencyId: pedidoEmergencia.id,
          pedido: {
            numero_pedido: pedidoEmergencia.id,
            total: total,
            estado: 'PENDIENTE_CONFIRMACION'
          },
          cliente: cliente.data,
          warning: 'Pedido guardado en cola de emergencia'
        };
      }
    } catch (error) {
      logger.error('Error al crear pedido desde bot:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validar productos del carrito
   */
  async validarProductosCarrito(carrito) {
    try {
      const productosValidados = [];

      for (const item of carrito) {
        // Obtener producto actualizado de BD
        const producto = await Product.getById(item.id);

        if (!producto.success || !producto.data) {
          return {
            success: false,
            error: `Producto no encontrado: ${item.nombre}`
          };
        }

        // Validar disponibilidad
        if (!producto.data.activo) {
          return {
            success: false,
            error: `Producto no disponible: ${item.nombre}`
          };
        }

        productosValidados.push({
          producto_id: producto.data.id,
          cantidad: item.cantidad,
          precio_unitario: producto.data.precio
        });
      }

      return {
        success: true,
        productos: productosValidados
      };
    } catch (error) {
      logger.error('Error al validar productos del carrito:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generar resumen del carrito para confirmación
   */
  generarResumenCarrito(session) {
    if (!session || !session.carrito || session.carrito.length === 0) {
      return null;
    }

    let resumen = '🛒 *TU PEDIDO:*\n\n';
    let total = 0;

    session.carrito.forEach(item => {
      const subtotal = item.precio * item.cantidad;
      total += subtotal;
      resumen += `${item.cantidad}x ${item.nombre} = ${formatearPrecio(subtotal)}\n`;
    });

    resumen += `\n💰 *TOTAL: ${formatearPrecio(total)}*`;

    return {
      resumen,
      total,
      cantidadProductos: session.carrito.length
    };
  }

  /**
   * Obtener resumen completo para confirmación de pedido
   */
  generarResumenCompleto(session) {
    if (!session) {
      return null;
    }

    const carritoResumen = this.generarResumenCarrito(session);
    
    if (!carritoResumen) {
      return null;
    }

    const datos = session.datos;
    let resumen = '📋 *CONFIRMACIÓN DE PEDIDO*\n\n';

    // Datos del cliente
    if (datos.nombre) {
      resumen += `👤 Cliente: ${datos.nombre}\n`;
    }

    if (datos.telefono) {
      resumen += `📞 Teléfono: ${datos.telefono}\n`;
    }

    // Datos según tipo de pedido
    if (datos.tipo_pedido === TIPOS_PEDIDO.DOMICILIO) {
      resumen += `📍 Dirección: ${datos.direccion}\n`;
      
      if (datos.referencias) {
        resumen += `🏠 Referencias: ${datos.referencias}\n`;
      }
    }

    resumen += '\n' + carritoResumen.resumen;

    return {
      resumen,
      total: carritoResumen.total,
      cantidadProductos: carritoResumen.cantidadProductos
    };
  }

  /**
   * Cambiar estado de pedido
   */
  async cambiarEstado(pedidoId, nuevoEstado) {
    try {
      const resultado = await Order.updateEstado(pedidoId, nuevoEstado);
      
      if (!resultado.success) {
        throw new Error('Error al actualizar estado');
      }

      logger.info(`Estado de pedido ${pedidoId} cambiado a: ${nuevoEstado}`);

      return {
        success: true,
        pedido: resultado.data
      };
    } catch (error) {
      logger.error(`Error al cambiar estado del pedido ${pedidoId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancelar pedido
   */
  async cancelarPedido(pedidoId, razon = null) {
    try {
      // Obtener pedido
      const pedido = await Order.getById(pedidoId);
      
      if (!pedido.success) {
        throw new Error('Pedido no encontrado');
      }

      // Verificar que se pueda cancelar
      if (['entregado', 'cancelado'].includes(pedido.data.estado)) {
        throw new Error('El pedido no se puede cancelar');
      }

      // Cancelar pedido
      const resultado = await Order.cancelar(pedidoId, razon);

      if (!resultado.success) {
        throw new Error('Error al cancelar pedido');
      }

      logger.info(`Pedido cancelado: ${pedidoId} - Razón: ${razon}`);

      // 🔒 ANTI-SPAM: Incrementar contador de cancelaciones (solo si hay teléfono)
      if (pedido.data.clientes?.telefono) {
        try {
          await Customer.incrementarCancelaciones(pedido.data.clientes.telefono);
          
          // Verificar si debe bloquearse automáticamente (3 cancelaciones)
          const cancelaciones = await Customer.getCancelaciones(pedido.data.clientes.telefono);
          if (cancelaciones.cancelaciones_count >= 3) {
            await Customer.bloquear(pedido.data.clientes.telefono, 7); // Bloquear por 7 días
            logger.warn(`🚫 Cliente ${pedido.data.clientes.telefono} bloqueado automáticamente por ${cancelaciones.cancelaciones_count} cancelaciones (panel admin)`);
          }
        } catch (trackingError) {
          // No afectar el flujo si falla el tracking
          logger.error('Error en tracking de cancelación desde panel:', trackingError);
        }
      }

      return {
        success: true,
        pedido: resultado.data
      };
    } catch (error) {
      logger.error(`Error al cancelar pedido ${pedidoId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📦 Obtener pedidos en cola de emergencia
   */
  obtenerColaEmergencia() {
    return {
      success: true,
      cantidad: pendingOrders.length,
      pedidos: pendingOrders
    };
  }

  /**
   * 🔄 Reintentar guardar un pedido de la cola de emergencia
   */
  async reintentarPedidoEmergencia(emergencyId) {
    try {
      const index = pendingOrders.findIndex(p => p.id === emergencyId);
      
      if (index === -1) {
        return {
          success: false,
          error: 'Pedido no encontrado en cola de emergencia'
        };
      }

      const pedidoEmergencia = pendingOrders[index];
      pedidoEmergencia.intentos++;

      logger.info(`🔄 Reintentando pedido de emergencia: ${emergencyId} (intento ${pedidoEmergencia.intentos})`);

      // Intentar crear el pedido en Supabase
      const pedido = await Order.create(pedidoEmergencia.datos);

      if (pedido.success) {
        // ✅ Pedido creado exitosamente, eliminar de la cola
        pendingOrders.splice(index, 1);
        
        // Actualizar archivo
        if (pendingOrders.length > 0) {
          fs.writeFileSync(EMERGENCY_QUEUE_FILE, JSON.stringify(pendingOrders, null, 2));
        } else {
          // Eliminar archivo si ya no hay pedidos
          if (fs.existsSync(EMERGENCY_QUEUE_FILE)) {
            fs.unlinkSync(EMERGENCY_QUEUE_FILE);
          }
        }

        logger.info(`✅ Pedido de emergencia guardado exitosamente: #${pedido.data.numero_pedido}`);

        // Notificar al admin
        try {
          await TwilioService.enviarMensajeAdmin(
            `✅ *PEDIDO DE COLA RECUPERADO*\n\n` +
            `📋 Pedido: #${pedido.data.numero_pedido}\n` +
            `🆔 ID Emergencia: ${emergencyId}\n` +
            `✔️ Guardado exitosamente en Supabase`
          );
        } catch (notifError) {
          logger.error('Error notificando recuperación al admin:', notifError);
        }

        return {
          success: true,
          pedido: pedido.data,
          message: 'Pedido guardado exitosamente'
        };
      } else {
        // ❌ Aún falló, actualizar intentos en el archivo
        fs.writeFileSync(EMERGENCY_QUEUE_FILE, JSON.stringify(pendingOrders, null, 2));
        
        return {
          success: false,
          error: 'Supabase aún no disponible',
          intentos: pedidoEmergencia.intentos
        };
      }
    } catch (error) {
      logger.error('Error reintentando pedido de emergencia:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🗑️ Eliminar pedido de la cola de emergencia (cancelar)
   */
  async eliminarPedidoEmergencia(emergencyId, motivo = '') {
    try {
      const index = pendingOrders.findIndex(p => p.id === emergencyId);
      
      if (index === -1) {
        return {
          success: false,
          error: 'Pedido no encontrado en cola de emergencia'
        };
      }

      const pedido = pendingOrders.splice(index, 1)[0];
      
      // Actualizar archivo
      if (pendingOrders.length > 0) {
        fs.writeFileSync(EMERGENCY_QUEUE_FILE, JSON.stringify(pendingOrders, null, 2));
      } else {
        // Eliminar archivo si ya no hay pedidos
        if (fs.existsSync(EMERGENCY_QUEUE_FILE)) {
          fs.unlinkSync(EMERGENCY_QUEUE_FILE);
        }
      }

      logger.info(`🗑️ Pedido de emergencia eliminado: ${emergencyId} - Motivo: ${motivo}`);

      // Notificar al admin
      try {
        await TwilioService.enviarMensajeAdmin(
          `🗑️ *PEDIDO DE COLA ELIMINADO*\n\n` +
          `🆔 ID: ${emergencyId}\n` +
          `📱 Cliente: ${pedido.telefono}\n` +
          `📝 Motivo: ${motivo || 'No especificado'}`
        );
      } catch (notifError) {
        logger.error('Error notificando eliminación al admin:', notifError);
      }

      return {
        success: true,
        message: 'Pedido eliminado de la cola de emergencia'
      };
    } catch (error) {
      logger.error('Error eliminando pedido de emergencia:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Exportar instancia única (Singleton)
export default new OrderService();
