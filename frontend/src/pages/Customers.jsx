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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Clientes</h1>
        <p className="text-gray-600 mt-2">Lista de clientes registrados</p>
      </div>

      {loading ? (
        <LoadingSpinner text="Cargando clientes..." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nombre</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Teléfono</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Dirección</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Registro</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{customer.nombre || 'Sin nombre'}</td>
                    <td className="py-3 px-4">{formatearTelefono(customer.telefono)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {customer.direccion || 'Sin dirección'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(customer.created_at).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {customers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-400" size={48} />
                <p className="text-gray-500 mt-4">No hay clientes registrados</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default Customers;
