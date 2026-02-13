/**
 * Página Orders - Gestión de Pedidos
 * 
 * Funcionalidades:
 * - Listado de todos los pedidos
 * - Filtrado por estado (pendiente, preparando, listo, etc.)
 * - Cambio de estado de pedidos
 * - Vista responsive para móviles y tablets
 * - Soporte para dark mode
 * - Sistema de alertas por tiempo transcurrido
 * 
 * Estados de pedidos:
 * - pendiente: Pedido recién creado
 * - preparando: En preparación
 * - listo: Listo para entregar/servir
 * - enviado: En camino al cliente
 * - entregado: Completado
 * - cancelado: Cancelado por cliente o restaurante
 */
import { useState, useEffect } from 'react';
import { ShoppingCart, Filter, Clock, AlertTriangle } from 'lucide-react';
import Card from '../components/Common/Card';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';
import { formatearPrecio, formatearFecha, formatearTelefono } from '../utils/helpers';
import { ICONOS_TIPO } from '../utils/constants';

function Orders() {
  // Estados del componente
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState('activos');

  /**
   * Calcular tiempo transcurrido desde la creación del pedido
   */
  const calcularTiempoTranscurrido = (fechaCreacion) => {
    const ahora = new Date();
    const creacion = new Date(fechaCreacion);
    const diffMinutos = Math.floor((ahora - creacion) / 1000 / 60);
    
    if (diffMinutos < 60) {
      return { minutos: diffMinutos, texto: `${diffMinutos} min` };
    }
    
    const horas = Math.floor(diffMinutos / 60);
    const mins = diffMinutos % 60;
    return { minutos: diffMinutos, texto: `${horas}h ${mins}min` };
  };

  /**
   * Determinar nivel de urgencia del pedido
   */
  const getNivelUrgencia = (estado, minutos) => {
    // Sin alertas para pedidos finalizados o ya enviados
    if (estado === 'entregado' || estado === 'cancelado' || estado === 'enviado') {
      return 'normal';
    }
    
    // Tiempos iguales para TODOS (domicilio, restaurante, para llevar)
    if (estado === 'pendiente') {
      if (minutos >= 10) return 'critico';
      if (minutos >= 8) return 'urgente';
      if (minutos >= 5) return 'atencion';
    }
    
    if (estado === 'preparando') {
      if (minutos >= 35) return 'critico';
      if (minutos >= 25) return 'urgente';
      if (minutos >= 15) return 'atencion';
    }
    
    // Solo "listo" necesita alerta (esperando ser recogido/entregado)
    if (estado === 'listo') {
      if (minutos >= 20) return 'urgente';
      if (minutos >= 10) return 'atencion';
    }
    
    return 'normal';
  };

  /**
   * Cargar pedidos cuando cambia el filtro de estado
   */
  useEffect(() => {
    loadOrders();
    
    // Actualizar cada minuto para refrescar tiempos
    const interval = setInterval(() => {
      setOrders(prev => [...prev]); // Force re-render para actualizar tiempos
    }, 60000);
    
    return () => clearInterval(interval);
  }, [estadoFiltro]);

  /**
   * Obtiene la lista de pedidos del servidor
   */
  const loadOrders = async () => {
    try {
      setLoading(true);
      let filtros = {};
      
      if (estadoFiltro && estadoFiltro !== '') {
        filtros = { estado: estadoFiltro };
      }
      
      const response = await orderService.getAll(filtros);
      
      if (response.success) {
        // Ordenar por prioridad y tiempo
        const ordenados = response.data.sort((a, b) => {
          // Prioridad por estado
          const prioridadEstado = {
            'pendiente': 1,
            'preparando': 2,
            'listo': 3,
            'enviado': 4,
            'entregado': 5,
            'cancelado': 6
          };
          
          const prioA = prioridadEstado[a.estado] || 999;
          const prioB = prioridadEstado[b.estado] || 999;
          
          if (prioA !== prioB) return prioA - prioB;
          
          // Si mismo estado, más antiguos primero
          return new Date(a.created_at) - new Date(b.created_at);
        });
        
        setOrders(ordenados);
      }
    } catch (error) {
      toast.error('Error al cargar pedidos');
      console.error('Error cargando pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cambia el estado de un pedido
   * @param {string} orderId - ID del pedido
   * @param {string} nuevoEstado - Nuevo estado del pedido
   */
  const handleCambiarEstado = async (orderId, nuevoEstado) => {
    try {
      await orderService.updateEstado(orderId, nuevoEstado);
      toast.success('Estado actualizado correctamente');
      loadOrders(); // Recargar lista
    } catch (error) {
      toast.error('Error al actualizar estado');
      console.error('Error actualizando estado:', error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-gray-900 dark:text-gray-100">
            Pedidos
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
            Gestiona los pedidos en tiempo real
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex items-center gap-3 sm:gap-4">
          <Filter size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <select
            className="input text-sm sm:text-base"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="activos">🔥 Activos (Pendientes/Preparando)</option>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="preparando">Preparando</option>
            <option value="listo">Listo</option>
            <option value="enviado">Enviado</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </Card>

      {/* Lista de pedidos */}
      {loading ? (
        <LoadingSpinner text="Cargando pedidos..." />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {orders.map((order) => {
            const tiempo = calcularTiempoTranscurrido(order.created_at);
            const urgencia = getNivelUrgencia(order.estado, tiempo.minutos);
            
            // Colores según urgencia
            const bordeBgClasses = {
              'critico': 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10',
              'urgente': 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/10',
              'atencion': 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
              'normal': ''
            };
            
            return (
              <Card key={order.id} className={`hover:shadow-md transition-shadow ${bordeBgClasses[urgencia]}`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Información del pedido */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
                      <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-gray-100">
                        {ICONOS_TIPO[order.tipo_pedido]} Pedido #{order.numero_pedido}
                      </h3>
                      <Badge estado={order.estado} />
                      
                      {/* Alerta de tiempo */}
                      {urgencia !== 'normal' && (
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                          urgencia === 'critico' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          urgencia === 'urgente' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {urgencia === 'critico' && <AlertTriangle size={14} />}
                          <Clock size={14} />
                          {tiempo.texto}
                          {urgencia === 'critico' && ' - ¡URGENTE!'}
                          {urgencia === 'urgente' && ' - Atender pronto'}
                        </span>
                      )}
                    </div>

                    {/* Detalles del cliente */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span className="truncate">
                        Cliente: {order.clientes?.nombre || 'Sin nombre'}
                      </span>
                      <span>📞 {formatearTelefono(order.clientes?.telefono || '')}</span>
                      <span>🕒 {formatearFecha(order.created_at)}</span>
                    </div>

                    {/* Dirección de entrega */}
                    {order.direccion_entrega && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        📍 {order.direccion_entrega}
                      </p>
                    )}
                  </div>

                  {/* Total y acciones */}
                  <div className="flex justify-between lg:justify-end lg:flex-col items-center lg:items-end gap-3 lg:text-right">
                    <p className="text-xl sm:text-2xl font-bold text-primary dark:text-primary-400">
                      {formatearPrecio(order.total)}
                    </p>
                    
                    {/* Botones de cambio de estado */}
                    <div className="flex gap-2">
                      {order.estado === 'pendiente' && (
                        <button
                          onClick={() => handleCambiarEstado(order.id, 'preparando')}
                          className="btn btn-primary text-xs sm:text-sm"
                          aria-label="Marcar como preparando"
                        >
                          ✅ Preparar
                        </button>
                      )}
                      {order.estado === 'preparando' && (
                        <button
                          onClick={() => handleCambiarEstado(order.id, 'listo')}
                          className="btn btn-secondary text-xs sm:text-sm"
                          aria-label="Marcar como listo"
                        >
                          🍽️ Listo
                        </button>
                      )}
                      {order.estado === 'listo' && order.tipo_pedido === 'domicilio' && (
                        <button
                          onClick={() => handleCambiarEstado(order.id, 'enviado')}
                          className="btn btn-secondary text-xs sm:text-sm"
                          aria-label="Marcar como enviado"
                        >
                          🚗 Enviado
                        </button>
                      )}
                      {order.estado === 'enviado' && (
                        <button
                          onClick={() => handleCambiarEstado(order.id, 'entregado')}
                          className="btn btn-success text-xs sm:text-sm"
                          aria-label="Marcar como entregado"
                        >
                          ✅ Entregado
                        </button>
                      )}
                      {order.estado === 'listo' && order.tipo_pedido === 'para_llevar' && (
                        <button
                          onClick={() => handleCambiarEstado(order.id, 'entregado')}
                          className="btn btn-success text-xs sm:text-sm"
                          aria-label="Marcar como entregado"
                        >
                          ✅ Entregado
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Estado vacío */}
          {orders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto text-gray-400 dark:text-gray-600" size={40} />
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-4">
                {estadoFiltro === 'activos' 
                  ? '🎉 ¡No hay pedidos activos! Todo al día' 
                  : 'No hay pedidos para mostrar'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Orders;
