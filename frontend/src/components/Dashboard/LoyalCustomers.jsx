import { TrendingUp, Users, Award } from 'lucide-react';
import Card from '../Common/Card';
import { formatearPrecio } from '../../utils/helpers';

function LoyalCustomers({ customers = [], loading = false }) {
  if (loading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="text-yellow-600" size={20} />
          Clientes Leales
        </h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="text-yellow-600" size={20} />
          Clientes Leales
        </h3>
        <p className="text-gray-500 text-sm">No hay datos disponibles</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Award className="text-yellow-600" size={20} />
        Clientes Leales
      </h3>
      
      <div className="space-y-3">
        {customers.map((customer, index) => (
          <div 
            key={customer.id || index} 
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-bold">
                #{index + 1}
              </div>
              <div>
                <p className="font-medium text-gray-900">{customer.nombre}</p>
                <p className="text-xs text-gray-500">{customer.telefono}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {customer.totalPedidos} pedidos
              </p>
              <p className="text-xs text-gray-600">
                {formatearPrecio(customer.totalGastado)}
              </p>
              {customer.promedioTicket && (
                <p className="text-xs text-primary">
                  Prom: {formatearPrecio(customer.promedioTicket)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Top clientes de los últimos 30 días
        </p>
      </div>
    </Card>
  );
}

export default LoyalCustomers;
