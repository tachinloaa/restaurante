import Order from '../models/Order.js';
import Product from '../models/Product.js';
import supabase from '../config/database.js';
import { success, serverError } from '../utils/responses.js';
import logger from '../utils/logger.js';
import { getRangoFechas, formatearFechaMexico } from '../utils/dateHelpers.js';

class DashboardController {
  /**
   * Estadísticas generales del dashboard
   */
  async getStats(req, res) {
    try {
      // Usar zona horaria de México
      const rangoHoy = getRangoFechas('hoy');
      const rangoAyer = getRangoFechas('ayer');
      const rangoSemana = getRangoFechas('semana');
      const rangoMes = getRangoFechas('mes');

      // Estadísticas de pedidos de hoy y ayer
      const statsHoy = await Order.getEstadisticas({
        fecha_desde: rangoHoy.desde
      });

      const statsAyer = await Order.getEstadisticas({
        fecha_desde: rangoAyer.desde,
        fecha_hasta: rangoAyer.hasta
      });

      const statsSemana = await Order.getEstadisticas({
        fecha_desde: rangoSemana.desde
      });

      const statsMes = await Order.getEstadisticas({
        fecha_desde: rangoMes.desde
      });

      const statsTotal = await Order.getEstadisticas({});

      // Pedidos por estado
      const pedidosPendientes = await Order.getPendientes();

      // Calcular porcentajes de cambio vs ayer
      const ventasHoy = statsHoy.data?.totalVentas || 0;
      const ventasAyer = statsAyer.data?.totalVentas || 0;
      const pedidosHoy = statsHoy.data?.totalPedidos || 0;
      const pedidosAyer = statsAyer.data?.totalPedidos || 0;

      const calcularPorcentajeCambio = (hoy, ayer) => {
        if (ayer === 0) return hoy > 0 ? 100 : 0;
        return Math.round(((hoy - ayer) / ayer) * 100);
      };

      const cambioVentas = calcularPorcentajeCambio(ventasHoy, ventasAyer);
      const cambioPedidos = calcularPorcentajeCambio(pedidosHoy, pedidosAyer);

      return success(res, {
        hoy: statsHoy.data,
        ayer: statsAyer.data,
        semana: statsSemana.data,
        mes: statsMes.data,
        total: statsTotal.data,
        pedidosPendientes: pedidosPendientes.data?.length || 0,
        cambios: {
          ventas: cambioVentas,
          pedidos: cambioPedidos
        },
        timezone: 'America/Mexico_City'
      });
    } catch (error) {
      logger.error('Error en getStats:', error);
      return serverError(res, 'Error al obtener estadísticas', error);
    }
  }

  /**
   * Datos para gráfico de ventas
   */
  async getSalesChart(req, res) {
    try {
      const dias = parseInt(req.query.dias) || 7;
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - dias);

      const resultado = await Order.getAll({
        fecha_desde: fechaInicio.toISOString(),
        limit: 1000
      });

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      // Agrupar ventas por día
      const ventasPorDia = {};
      
      resultado.data.forEach(pedido => {
        if (pedido.estado !== 'cancelado') {
          const fecha = new Date(pedido.created_at).toLocaleDateString('es-MX');
          
          if (!ventasPorDia[fecha]) {
            ventasPorDia[fecha] = {
              fecha,
              total: 0,
              pedidos: 0
            };
          }

          ventasPorDia[fecha].total += parseFloat(pedido.total);
          ventasPorDia[fecha].pedidos += 1;
        }
      });

      const datosGrafico = Object.values(ventasPorDia).sort((a, b) => 
        new Date(a.fecha) - new Date(b.fecha)
      );

      return success(res, datosGrafico);
    } catch (error) {
      logger.error('Error en getSalesChart:', error);
      return serverError(res, 'Error al obtener datos del gráfico', error);
    }
  }

  /**
   * Productos más vendidos
   */
  async getTopProducts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      
      // Esta consulta debería optimizarse en producción con una vista o query directa
      const pedidos = await Order.getAll({ limit: 1000 });

      if (!pedidos.success) {
        return serverError(res, pedidos.error);
      }

      // Contar productos vendidos
      const productosVendidos = {};

      for (const pedido of pedidos.data) {
        if (pedido.estado !== 'cancelado') {
          const detalles = await Order.getById(pedido.id);
          
          if (detalles.success && detalles.data.pedido_detalles) {
            detalles.data.pedido_detalles.forEach(detalle => {
              const productoId = detalle.productos.id;
              
              if (!productosVendidos[productoId]) {
                productosVendidos[productoId] = {
                  id: productoId,
                  nombre: detalle.productos.nombre,
                  cantidadVendida: 0,
                  totalVentas: 0
                };
              }

              productosVendidos[productoId].cantidadVendida += detalle.cantidad;
              productosVendidos[productoId].totalVentas += parseFloat(detalle.subtotal);
            });
          }
        }
      }

      // Ordenar por cantidad vendida
      const topProductos = Object.values(productosVendidos)
        .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
        .slice(0, limit);

      return success(res, topProductos);
    } catch (error) {
      logger.error('Error en getTopProducts:', error);
      return serverError(res, 'Error al obtener productos más vendidos', error);
    }
  }

  /**
   * Pedidos recientes
   */
  async getRecentOrders(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const resultado = await Order.getRecientes(limit);

      if (!resultado.success) {
        return serverError(res, resultado.error);
      }

      return success(res, resultado.data);
    } catch (error) {
      logger.error('Error en getRecentOrders:', error);
      return serverError(res, 'Error al obtener pedidos recientes', error);
    }
  }

  /**
   * Clientes leales/frecuentes
   */
  async getLoyalCustomers(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const periodo = req.query.periodo || 'ultimos30dias';
      const rango = getRangoFechas(periodo);

      // Consultar clientes con más pedidos
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          cliente_id,
          clientes(id, nombre, telefono),
          total,
          created_at
        `)
        .gte('created_at', rango.desde)
        .neq('estado', 'cancelado');

      if (error) throw error;

      // Agrupar por cliente
      const clientesMap = {};

      data.forEach(pedido => {
        const clienteId = pedido.cliente_id;
        if (!clienteId) return;

        if (!clientesMap[clienteId]) {
          clientesMap[clienteId] = {
            id: clienteId,
            nombre: pedido.clientes?.nombre || 'Cliente sin nombre',
            telefono: pedido.clientes?.telefono,
            totalPedidos: 0,
            totalGastado: 0,
            ultimoPedido: null
          };
        }

        clientesMap[clienteId].totalPedidos += 1;
        clientesMap[clienteId].totalGastado += parseFloat(pedido.total || 0);
        
        if (!clientesMap[clienteId].ultimoPedido || 
            new Date(pedido.created_at) > new Date(clientesMap[clienteId].ultimoPedido)) {
          clientesMap[clienteId].ultimoPedido = pedido.created_at;
        }
      });

      // Ordenar por total de pedidos
      const clientesLeales = Object.values(clientesMap)
        .sort((a, b) => b.totalPedidos - a.totalPedidos)
        .slice(0, limit)
        .map(cliente => ({
          ...cliente,
          promedioTicket: cliente.totalGastado / cliente.totalPedidos
        }));

      return success(res, clientesLeales);
    } catch (error) {
      logger.error('Error en getLoyalCustomers:', error);
      return serverError(res, 'Error al obtener clientes leales', error);
    }
  }

  /**
   * Estadísticas avanzadas (optimizado)
   */
  async getAdvancedStats(req, res) {
    try {
      // Ejecutar consultas en paralelo para mejor rendimiento
      const [topProducts, loyalCustomers, tasaCompletacion] = await Promise.all([
        this._getTopProductsData(5),
        this._getLoyalCustomersData(5),
        this._getTasaCompletacion()
      ]);

      // Distribución por tipo de pedido
      const { data: pedidos, error: errorPedidos } = await supabase
        .from('pedidos')
        .select('tipo_pedido, total')
        .neq('estado', 'cancelado');

      if (errorPedidos) throw errorPedidos;

      const distribucionTipos = {
        domicilio: { cantidad: 0, total: 0 },
        para_llevar: { cantidad: 0, total: 0 }
      };

      pedidos.forEach(pedido => {
        const tipo = pedido.tipo_pedido;
        if (distribucionTipos[tipo]) {
          distribucionTipos[tipo].cantidad += 1;
          distribucionTipos[tipo].total += parseFloat(pedido.total || 0);
        }
      });

      return success(res, {
        productosPopulares: topProducts,
        clientesLeales: loyalCustomers,
        distribucionTipos,
        tasaCompletacion
      });
    } catch (error) {
      logger.error('Error en getAdvancedStats:', error);
      return serverError(res, 'Error al obtener estadísticas avanzadas', error);
    }
  }

  /**
   * Métodos auxiliares privados
   */
  async _getTopProductsData(limit) {
    try {
      // Intentar usar la función RPC optimizada
      let { data, error } = await supabase.rpc('get_top_products', { 
        p_limit: limit 
      });

      // Si el RPC falla, usar fallback con consulta manual
      if (error) {
        const fallbackResult = await supabase
          .from('pedido_detalles')
          .select(`
            producto_id,
            cantidad,
            subtotal,
            productos!inner(id, nombre, precio)
          `)
          .limit(1000);

        if (fallbackResult.error) throw fallbackResult.error;

        const productosMap = {};
        fallbackResult.data.forEach(detalle => {
          const prodId = detalle.producto_id;
          if (!productosMap[prodId]) {
            productosMap[prodId] = {
              id: prodId,
              nombre: detalle.productos?.nombre || 'Producto',
              cantidadVendida: 0,
              totalVentas: 0
            };
          }
          productosMap[prodId].cantidadVendida += detalle.cantidad;
          productosMap[prodId].totalVentas += parseFloat(detalle.subtotal || 0);
        });

        data = Object.values(productosMap)
          .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
          .slice(0, limit);
      }

      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.error('Error en _getTopProductsData:', error);
      return [];
    }
  }

  async _getLoyalCustomersData(limit) {
    try {
      const rango = getRangoFechas('ultimos30dias');
      const { data, error } = await supabase
        .from('pedidos')
        .select('cliente_id, total, clientes!inner(nombre, telefono)')
        .gte('created_at', rango.desde)
        .neq('estado', 'cancelado')
        .not('cliente_id', 'is', null)
        .limit(500); // Limitar para mejor rendimiento

      if (error) throw error;

      const clientesMap = {};
      data.forEach(pedido => {
        const id = pedido.cliente_id;
        if (!id) return;
        if (!clientesMap[id]) {
          clientesMap[id] = {
            nombre: pedido.clientes?.nombre || 'Cliente',
            telefono: pedido.clientes?.telefono,
            totalPedidos: 0,
            totalGastado: 0
          };
        }
        clientesMap[id].totalPedidos += 1;
        clientesMap[id].totalGastado += parseFloat(pedido.total || 0);
      });

      return Object.values(clientesMap)
        .map(cliente => ({
          ...cliente,
          promedioTicket: cliente.totalGastado / cliente.totalPedidos
        }))
        .sort((a, b) => b.totalPedidos - a.totalPedidos)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error en _getLoyalCustomersData:', error);
      return [];
    }
  }

  async _getTasaCompletacion() {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('estado')
        .gte('created_at', getRangoFechas('mes').desde);

      if (error) throw error;

      const total = data.length;
      const completados = data.filter(p => 
        p.estado === 'entregado' || p.estado === 'listo'
      ).length;
      const cancelados = data.filter(p => p.estado === 'cancelado').length;

      return {
        total,
        completados,
        cancelados,
        porcentajeCompletacion: total > 0 ? (completados / total * 100).toFixed(1) : 0,
        porcentajeCancelacion: total > 0 ? (cancelados / total * 100).toFixed(1) : 0
      };
    } catch (error) {
      logger.error('Error en _getTasaCompletacion:', error);
      return { total: 0, completados: 0, cancelados: 0 };
    }
  }
}

export default new DashboardController();
