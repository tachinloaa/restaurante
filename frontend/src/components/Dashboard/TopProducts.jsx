import { Package, TrendingUp } from 'lucide-react';
import Card from '../Common/Card';
import { formatearPrecio } from '../../utils/helpers';

function TopProducts({ products = [], loading = false }) {
  if (loading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="text-blue-600" size={20} />
          Productos Más Vendidos
        </h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="text-blue-600" size={20} />
          Productos Más Vendidos
        </h3>
        <p className="text-gray-500 text-sm">No hay datos disponibles</p>
      </Card>
    );
  }

  const maxCantidad = Math.max(...products.map(p => p.cantidadVendida || 0));

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Package className="text-blue-600" size={20} />
        Productos Más Vendidos
      </h3>
      
      <div className="space-y-4">
        {products.map((product, index) => {
          const porcentaje = (product.cantidadVendida / maxCantidad) * 100;
          
          return (
            <div key={product.id || index}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {index + 1}. {product.nombre}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">
                    {product.cantidadVendida} uds
                  </span>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatearPrecio(product.totalVentas)}
                </span>
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp size={12} />
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
