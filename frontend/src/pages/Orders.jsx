/**
 * Página Orders - Gestión de Pedidos
 * 
 * Funcionalidades:
 * - Listado de todos los pedidos
 * - Filtrado por estado (pendiente, preparando, listo, etc.)
 * - Cambio de estado de pedidos
 * - Vista responsive para móviles y tablets
 * - Soporte para dark mode
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
import { ShoppingCart, Filter } from 'lucide-react';
import Card from '../components/Common/Card';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';
import { formatearPrecio, formatearFecha } from '../utils/helpers';
import { ICONOS_TIPO } from '../utils/constants';

function Orders() {
  // Estados del componente
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState('');

  /**
   * Cargar pedidos cuando cambia el filtro de estado
   */
  useEffect(() => {
    loadOrders();
  }, [estadoFiltro]);

  /**
   * Obtiene la lista de pedidos del servidor
   */
  const loadOrders = async () => {
    try {
      setLoading(true);
      const filtros = estadoFiltro ? { estado: estadoFiltro } : {};
      const response = await orderService.getAll(filtros);
      
      if (response.success) {
        setOrders(response.data);
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
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Información del pedido */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
                    <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-gray-100">
                      {ICONOS_TIPO[order.tipo_pedido]} Pedido #{order.numero_pedido}
                    </h3>
                    <Badge estado={order.estado} />
                  </div>

                  {/* Detalles del cliente */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="truncate">
                      Cliente: {order.clientes?.nombre || 'Sin nombre'}
                    </span>
                    <span>📞 {order.clientes?.telefono}</span>
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
                        Preparar
                      </button>
                    )}
                    {order.estado === 'preparando' && (
                      <button
                        onClick={() => handleCambiarEstado(order.id, 'listo')}
                        className="btn btn-secondary text-xs sm:text-sm"
                        aria-label="Marcar como listo"
                      >
                        Listo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Estado vacío */}
          {orders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto text-gray-400 dark:text-gray-600" size={40} />
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-4">
                No hay pedidos para mostrar
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Orders;
