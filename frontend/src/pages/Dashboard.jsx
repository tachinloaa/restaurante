import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, Users, Clock, Download, RefreshCw } from 'lucide-react';
import Card from '../components/Common/Card';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import LoyalCustomers from '../components/Dashboard/LoyalCustomers';
import TopProducts from '../components/Dashboard/TopProducts';
import OrderTypeDistribution from '../components/Dashboard/OrderTypeDistribution';
import dashboardService from '../services/dashboardService';
import { formatearPrecio } from '../utils/helpers';
import exportarDashboardPDF from '../utils/pdfExport';
import toast from 'react-hot-toast';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    loadStats();
    // Cargar estadísticas avanzadas después, sin bloquear
    setTimeout(() => loadAdvancedStats(), 500);
  }, []);

  const loadAllStats = async () => {
    loadStats();
    loadAdvancedStats();
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getStats();
      
      if (response.success) {
        setStats(response.data);
      } else {
        // Crear datos por defecto si falla
        setStats({
          hoy: { totalVentas: 0, totalPedidos: 0 },
          mes: { totalVentas: 0, totalPedidos: 0, promedioVenta: 0 },
          total: { totalClientes: 0 },
          pedidosPendientes: 0
        });
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      // Datos por defecto en caso de error
      setStats({
        hoy: { totalVentas: 0, totalPedidos: 0 },
        mes: { totalVentas: 0, totalPedidos: 0, promedioVenta: 0 },
        total: { totalClientes: 0 },
        pedidosPendientes: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAdvancedStats = async () => {
    try {
      setLoadingAdvanced(true);
      const response = await dashboardService.getAdvancedStats();
      
      if (response.success) {
        setAdvancedStats(response.data);
      } else {
        setAdvancedStats({
          productosPopulares: [],
          clientesLeales: [],
          distribucionTipos: {},
          tasaCompletacion: { total: 0, completados: 0, porcentajeCompletacion: 0 }
        });
      }
    } catch (error) {
      console.error('Error al cargar estadísticas avanzadas:', error);
      setAdvancedStats({
        productosPopulares: [],
        clientesLeales: [],
        distribucionTipos: {},
        tasaCompletacion: { total: 0, completados: 0, porcentajeCompletacion: 0 }
      });
    } finally {
      setLoadingAdvanced(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      
      // Usar datos actuales o valores por defecto
      const statsToExport = stats || {
        hoy: { totalVentas: 0, totalPedidos: 0 },
        mes: { totalVentas: 0, totalPedidos: 0 }
      };
      
      const advancedToExport = advancedStats || {
        productosPopulares: [],
        clientesLeales: [],
        distribucionTipos: {}
      };
      
      const result = await exportarDashboardPDF(statsToExport, advancedToExport);
      
      if (result.success) {
        toast.success('Reporte generado correctamente');
      } else {
        toast.error('Error al generar reporte');
      }
    } catch (error) {
      toast.error('Error al exportar PDF');
      console.error(error);
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Cargando dashboard..." />;
  }

  const statCards = [
    {
      title: 'Ventas del Día',
      value: formatearPrecio(stats.hoy?.totalVentas || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+12%'
    },
    {
      title: 'Pedidos Hoy',
      value: stats.hoy?.totalPedidos || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+8%'
    },
    {
      title: 'Pedidos Pendientes',
      value: stats.pedidosPendientes || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      urgent: stats.pedidosPendientes > 5
    },
    {
      title: 'Total Clientes',
      value: stats.total?.totalClientes || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-display">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Vista general de tu restaurante
          </p>
          {stats.timezone && (
            <p className="text-xs text-gray-500 mt-1">
              🕐 Zona horaria: México (GMT-6)
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadAllStats}
            className="btn btn-secondary flex items-center gap-2 shadow-md"
            disabled={loading || loadingAdvanced}
          >
            <RefreshCw size={18} className={loading || loadingAdvanced ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={handleExportPDF}
            className="btn btn-primary flex items-center gap-2 shadow-md"
            disabled={exportingPDF}
          >
            <Download size={18} className={exportingPDF ? 'animate-bounce' : ''} />
            {exportingPDF ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <Card key={index} className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                  {stat.change && (
                    <div className="flex items-center gap-1 mt-2">
                      {stat.change.startsWith('+') ? (
                        <TrendingUp size={16} className="text-green-600" />
                      ) : (
                        <TrendingDown size={16} className="text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={stat.color} size={24} />
                </div>
              </div>

              {stat.urgent && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
              )}
            </Card>
          );
        })}
      </div>

      {/* Alerta de pedidos pendientes */}
      {stats.pedidosPendientes > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <Clock className="text-yellow-600" size={24} />
            <div>
              <p className="font-semibold text-yellow-900">
                Tienes {stats.pedidosPendientes} {stats.pedidosPendientes === 1 ? 'pedido pendiente' : 'pedidos pendientes'}
              </p>
              <p className="text-sm text-yellow-700">
                Revisa la sección de pedidos para gestionar las órdenes
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Estadísticas avanzadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clientes Leales */}
        <LoyalCustomers 
          customers={advancedStats?.clientesLeales || []}
          loading={loadingAdvanced}
        />

        {/* Productos Más Vendidos */}
        <TopProducts 
          products={advancedStats?.productosPopulares || []}
          loading={loadingAdvanced}
        />
      </div>

      {/* Distribución por tipo y estadísticas del mes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Tipo de Pedido */}
        <OrderTypeDistribution 
          distribucion={advancedStats?.distribucionTipos || {}}
          loading={loadingAdvanced}
        />

        {/* Ventas del Mes */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">📈 Ventas del Mes</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-600">Total Ventas:</span>
              <span className="text-2xl font-bold text-primary">
                {formatearPrecio(stats.mes?.totalVentas || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="text-gray-600">Total Pedidos:</span>
              <span className="text-xl font-semibold text-gray-900">
                {stats.mes?.totalPedidos || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Promedio por Pedido:</span>
              <span className="text-lg font-medium text-green-600">
                {formatearPrecio(stats.mes?.promedioVenta || 0)}
              </span>
            </div>
            
            {/* Tasa de completación */}
            {advancedStats?.tasaCompletacion && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Tasa de Completación</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${advancedStats.tasaCompletacion.porcentajeCompletacion}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {advancedStats.tasaCompletacion.porcentajeCompletacion}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {advancedStats.tasaCompletacion.completados} completados de {advancedStats.tasaCompletacion.total} pedidos
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
