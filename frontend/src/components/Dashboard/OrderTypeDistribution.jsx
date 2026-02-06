import { PieChart, Home, Truck, ShoppingBag } from 'lucide-react';
import Card from '../Common/Card';
import { formatearPrecio } from '../../utils/helpers';

function OrderTypeDistribution({ distribucion = {}, loading = false }) {
  if (loading) {
    return (
      <Card>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <PieChart className="text-purple-600 dark:text-purple-400" size={18} />
          Distribución por Tipo
        </h3>
        <div className="animate-pulse space-y-3 sm:space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 sm:h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
      color: 'bg-blue-500 dark:bg-blue-600',
      lightBg: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      key: 'restaurante',
      nombre: 'Restaurante',
      icon: Home,
      color: 'bg-green-500 dark:bg-green-600',
      lightBg: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400'
    },
    {
      key: 'para_llevar',
      nombre: 'Para Llevar',
      icon: ShoppingBag,
      color: 'bg-orange-500 dark:bg-orange-600',
      lightBg: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-600 dark:text-orange-400'
    }
  ];

  const total = Object.values(distribucion).reduce((sum, item) => sum + (item.cantidad || 0), 0);

  return (
    <Card>
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        <PieChart className="text-purple-600 dark:text-purple-400" size={18} />
        <span className="hidden sm:inline">Distribución por Tipo</span>
        <span className="sm:hidden">Por Tipo</span>
      </h3>
      
      <div className="space-y-3 sm:space-y-4">
        {tipos.map(tipo => {
          const data = distribucion[tipo.key] || { cantidad: 0, total: 0 };
          const porcentaje = total > 0 ? ((data.cantidad / total) * 100).toFixed(1) : 0;
          const Icon = tipo.icon;

          return (
            <div key={tipo.key} className={`${tipo.lightBg} p-3 sm:p-4 rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className={`${tipo.color} p-1.5 sm:p-2 rounded-lg flex-shrink-0`}>
                    <Icon className="text-white" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">{tipo.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{data.cantidad} pedidos</p>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <p className={`text-xl sm:text-2xl font-bold ${tipo.textColor}`}>
                    {porcentaje}%
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {formatearPrecio(data.total)}
                  </p>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                <div 
                  className={`${tipo.color} h-1.5 sm:h-2 rounded-full transition-all duration-500`}
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
