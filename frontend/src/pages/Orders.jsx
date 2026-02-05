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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState('');

  useEffect(() => {
    loadOrders();
  }, [estadoFiltro]);

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
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (orderId, nuevoEstado) => {
    try {
      await orderService.updateEstado(orderId, nuevoEstado);
      toast.success('Estado actualizado');
      loadOrders();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Pedidos</h1>
          <p className="text-gray-600 mt-2">Gestiona los pedidos en tiempo real</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-400" />
          <select
            className="input"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
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
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-semibold text-lg">
                      {ICONOS_TIPO[order.tipo_pedido]} Pedido #{order.numero_pedido}
                    </h3>
                    <Badge estado={order.estado} />
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>Cliente: {order.clientes?.nombre || 'Sin nombre'}</span>
                    <span>📞 {order.clientes?.telefono}</span>
                    <span>🕒 {formatearFecha(order.created_at)}</span>
                  </div>

                  {order.direccion_entrega && (
                    <p className="text-sm text-gray-600 mt-2">
                      📍 {order.direccion_entrega}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatearPrecio(order.total)}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {order.estado === 'pendiente' && (
                      <button
                        onClick={() => handleCambiarEstado(order.id, 'preparando')}
                        className="btn btn-primary text-sm"
                      >
                        Preparar
                      </button>
                    )}
                    {order.estado === 'preparando' && (
                      <button
                        onClick={() => handleCambiarEstado(order.id, 'listo')}
                        className="btn btn-secondary text-sm"
                      >
                        Listo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {orders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-500 mt-4">No hay pedidos para mostrar</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Orders;
