import { Package, TrendingUp } from 'lucide-react';
import Card from '../Common/Card';
import { formatearPrecio } from '../../utils/helpers';

function TopProducts({ products = [], loading = false }) {
  if (loading) {
    return (
      <Card>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Package className="text-blue-600" size={18} />
          Productos Más Vendidos
        </h3>
        <div className="animate-pulse space-y-2 sm:space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 sm:h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Card>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Package className="text-blue-600" size={18} />
          Productos Más Vendidos
        </h3>
        <p className="text-gray-500 text-xs sm:text-sm">No hay datos disponibles</p>
      </Card>
    );
  }

  const maxCantidad = Math.max(...products.map(p => p.cantidadVendida || 0));

  return (
    <Card>
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        <Package className="text-blue-600" size={18} />
        <span className="hidden sm:inline">Productos Más Vendidos</span>
        <span className="sm:hidden">Top Productos</span>
      </h3>
      
      <div className="space-y-3 sm:space-y-4">
        {products.map((product, index) => {
          const porcentaje = (product.cantidadVendida / maxCantidad) * 100;
          
          return (
            <div key={product.id || index}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
                    {index + 1}. {product.nombre}
                  </span>
                </div>
                <div className="text-right ml-2">
                  <span className="text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">
                    {product.cantidadVendida} uds
                  </span>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mb-1">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatearPrecio(product.totalVentas || 0)}
                </span>
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp size={10} />
                  Top #{index + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default TopProducts;
