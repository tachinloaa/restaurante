import { TrendingUp, Users, Award } from 'lucide-react';
import Card from '../Common/Card';
import { formatearPrecio, formatearTelefono } from '../../utils/helpers';

function LoyalCustomers({ customers = [], loading = false }) {
  if (loading) {
    return (
      <Card>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Award className="text-yellow-600" size={18} />
          Clientes Leales
        </h3>
        <div className="animate-pulse space-y-2 sm:space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 sm:h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <Card>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Award className="text-yellow-600" size={18} />
          Clientes Leales
        </h3>
        <p className="text-gray-500 text-xs sm:text-sm">No hay datos disponibles</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        <Award className="text-yellow-600" size={18} />
        Clientes Leales
      </h3>
      
      <div className="space-y-2 sm:space-y-3">
        {customers.map((customer, index) => (
          <div 
            key={customer.id || index} 
            className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-base flex-shrink-0">
                #{index + 1}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{customer.nombre}</p>
                <p className="text-xs text-gray-500 truncate">{formatearTelefono(customer.telefono || '')}</p>
              </div>
            </div>
            
            <div className="text-right ml-2">
              <p className="text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                {customer.totalPedidos} pedidos
              </p>
              <p className="text-xs text-gray-600 whitespace-nowrap">
                {formatearPrecio(customer.totalGastado)}
              </p>
              {customer.promedioTicket && (
                <p className="text-xs text-primary whitespace-nowrap">
                  Prom: {formatearPrecio(customer.promedioTicket)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Top clientes de los últimos 30 días
        </p>
      </div>
    </Card>
  );
}

export default LoyalCustomers;
