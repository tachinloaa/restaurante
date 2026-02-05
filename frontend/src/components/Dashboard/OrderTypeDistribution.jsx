import { PieChart, Home, Truck, ShoppingBag } from 'lucide-react';
import Card from '../Common/Card';
import { formatearPrecio } from '../../utils/helpers';

function OrderTypeDistribution({ distribucion = {}, loading = false }) {
  if (loading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieChart className="text-purple-600" size={20} />
          Distribución por Tipo
        </h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  const tipos = [
    {
      key: 'domicilio',
      nombre: 'Domicilio',
      icon: Truck,
      color: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      key: 'restaurante',
      nombre: 'Restaurante',
      icon: Home,
      color: 'bg-green-500',
      lightBg: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      key: 'para_llevar',
      nombre: 'Para Llevar',
      icon: ShoppingBag,
      color: 'bg-orange-500',
      lightBg: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ];

  const total = Object.values(distribucion).reduce((sum, item) => sum + (item.cantidad || 0), 0);

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <PieChart className="text-purple-600" size={20} />
        Distribución por Tipo
      </h3>
      
      <div className="space-y-4">
        {tipos.map(tipo => {
          const data = distribucion[tipo.key] || { cantidad: 0, total: 0 };
          const porcentaje = total > 0 ? ((data.cantidad / total) * 100).toFixed(1) : 0;
          const Icon = tipo.icon;

          return (
            <div key={tipo.key} className={`${tipo.lightBg} p-4 rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`${tipo.color} p-2 rounded-lg`}>
                    <Icon className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{tipo.nombre}</p>
                    <p className="text-xs text-gray-500">{data.cantidad} pedidos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${tipo.textColor}`}>
                    {porcentaje}%
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatearPrecio(data.total)}
                  </p>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`${tipo.color} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default OrderTypeDistribution;
