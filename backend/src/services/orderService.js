import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import SessionService from './sessionService.js';
import { formatearPrecio, limpiarNumeroWhatsApp } from '../utils/formatters.js';
import { TIPOS_PEDIDO, ESTADOS_PEDIDO } from '../config/constants.js';
import logger from '../utils/logger.js';

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
      const session = SessionService.getSession(telefono);
      
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
        numero_mesa: datosCliente.numero_mesa || null,
        numero_personas: datosCliente.numero_personas || null,
        notas: datosCliente.notas || null,
        productos: productosConDetalles.productos
      };

      const pedido = await Order.create(pedidoData);

      if (!pedido.success) {
        throw new Error('Error al crear pedido');
      }


      // Limpiar sesión
      SessionService.limpiarCarrito(telefono);
      SessionService.guardarDatos(telefono, { ultimo_pedido: pedido.data.numero_pedido });

      logger.info(`Pedido creado desde bot: #${pedido.data.numero_pedido}`);

      return {
        success: true,
        pedido: pedido.data,
        cliente: cliente.data
      };
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
    } else if (datos.tipo_pedido === TIPOS_PEDIDO.RESTAURANTE) {
      if (datos.numero_mesa) {
        resumen += `🪑 Mesa: ${datos.numero_mesa}\n`;
      }
      
      if (datos.numero_personas) {
        resumen += `👥 Personas: ${datos.numero_personas}\n`;
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
}

// Exportar instancia única (Singleton)
export default new OrderService();
