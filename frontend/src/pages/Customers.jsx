import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import Card from '../components/Common/Card';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import customerService from '../services/customerService';
import toast from 'react-hot-toast';
import { formatearTelefono } from '../utils/helpers';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerService.getAll();
      
      if (response.success) {
        setCustomers(response.data);
      }
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Clientes</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Lista de clientes registrados</p>
      </div>

      {loading ? (
        <LoadingSpinner text="Cargando clientes..." />
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">Nombre</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm">Teléfono</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm hidden md:table-cell">Dirección</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 font-semibold text-gray-700 text-xs sm:text-sm hidden lg:table-cell">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-2 sm:py-3 px-3 sm:px-4 text-sm">{customer.nombre || 'Sin nombre'}</td>
                      <td className="py-2 sm:py-3 px-3 sm:px-4 text-sm">{formatearTelefono(customer.telefono)}</td>
                      <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                        {customer.direccion || 'Sin dirección'}
                      </td>
                      <td className="py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                        {new Date(customer.created_at).toLocaleDateString('es-MX')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista móvil - Cards */}
            <div className="sm:hidden space-y-3 px-4">
              {customers.map((customer) => (
                <div key={customer.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {customer.nombre || 'Sin nombre'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatearTelefono(customer.telefono)}
                  </div>
                  {customer.direccion && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {customer.direccion}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(customer.created_at).toLocaleDateString('es-MX')}
                  </div>
                </div>
              ))}
            </div>

            {customers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-400" size={40} />
                <p className="text-sm sm:text-base text-gray-500 mt-4">No hay clientes registrados</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default Customers;
