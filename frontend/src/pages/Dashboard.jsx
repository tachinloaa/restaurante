/**
 * Página Dashboard - Panel principal de estadísticas
 * 
 * Muestra:
 * - Estadísticas del día (ventas, pedidos)
 * - Estadísticas del mes
 * - Pedidos pendientes
 * - Total de clientes
 * - Productos más vendidos
 * - Clientes leales
 * - Distribución por tipo de pedido
 * - Exportación a PDF
 * 
 * Las estadísticas se cargan en dos fases:
 * 1. Estadísticas básicas (inmediato)
 * 2. Estadísticas avanzadas (diferidas para mejor UX)
 */
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
  // Estados para las diferentes secciones de datos
  const [stats, setStats] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  /**
   * Efecto inicial: cargar estadísticas al montar el componente
   */
  useEffect(() => {
    loadStats();
    // Diferir carga de estadísticas avanzadas para mejor experiencia
    setTimeout(() => loadAdvancedStats(), 500);
  }, []);

  /**
   * Recarga todas las estadísticas
   */
  const loadAllStats = async () => {
    loadStats();
    loadAdvancedStats();
  };

  /**
   * Carga estadísticas básicas (ventas, pedidos, clientes)
   */
  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getStats();
      
      if (response.success) {
        setStats(response.data);
      } else {
        // Datos por defecto en caso de error
        setStats({
          hoy: { totalVentas: 0, totalPedidos: 0 },
          mes: { totalVentas: 0, totalPedidos: 0, promedioVenta: 0 },
          total: { totalClientes: 0 },
          pedidosPendientes: 0
        });
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
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

  /**
   * Carga estadísticas avanzadas (productos, clientes leales, distribución)
   */
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

  /**
   * Exporta el dashboard a PDF
   */
  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      
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

  // Mostrar spinner mientras carga
  if (loading) {
    return <LoadingSpinner text="Cargando dashboard..." />;
  }

  // Configuración de las tarjetas de estadísticas principales
  const statCards = [
    {
      title: 'Ventas del Día',
      value: formatearPrecio(stats.hoy?.totalVentas || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: stats.cambios?.ventas,
      changeType: (stats.cambios?.ventas || 0) >= 0 ? 'positive' : 'negative'
    },
    {
      title: 'Pedidos Hoy',
      value: stats.hoy?.totalPedidos || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: stats.cambios?.pedidos,
      changeType: (stats.cambios?.pedidos || 0) >= 0 ? 'positive' : 'negative'
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header con acciones */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 font-display">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
            Vista general de tu restaurante
          </p>
          {stats.timezone && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              🕐 Zona horaria: México (GMT-6)
            </p>
          )}
        </div>
        
        {/* Botones de acción */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={loadAllStats}
            className="btn btn-secondary flex items-center gap-2 shadow-md text-sm sm:text-base"
            disabled={loading || loadingAdvanced}
            aria-label="Actualizar estadísticas"
          >
            <RefreshCw size={18} className={loading || loadingAdvanced ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
            <span className="sm:hidden">↻</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="btn btn-primary flex items-center gap-2 shadow-md text-sm sm:text-base"
            disabled={exportingPDF}
            aria-label="Exportar a PDF"
          >
            <Download size={18} className={exportingPDF ? 'animate-bounce' : ''} />
            <span className="hidden sm:inline">{exportingPDF ? 'Generando...' : 'Exportar PDF'}</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <Card key={index} className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {stat.title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1 sm:mt-2">
                    {stat.value}
                  </p>
                  {stat.change !== undefined && stat.change !== null && (
                    <div className="flex items-center gap-1 mt-1 sm:mt-2">
                      {stat.change >= 0 ? (
                        <TrendingUp size={14} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown size={14} className="text-red-600 dark:text-red-400" />
                      )}
                      <span className={`text-xs sm:text-sm font-medium ${
                        stat.change >= 0
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {stat.change >= 0 ? '+' : ''}{stat.change}%
                      </span>
                    </div>
                  )}
                </div>
                
                <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={stat.color} size={20} />
                </div>
              </div>

              {/* Indicador de urgencia */}
              {stat.urgent && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
              )}
            </Card>
          );
        })}
      </div>

      {/* Alerta de pedidos pendientes */}
      {stats.pedidosPendientes > 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <Clock className="text-yellow-600 dark:text-yellow-500" size={20} />
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-200 text-sm sm:text-base">
                Tienes {stats.pedidosPendientes} {stats.pedidosPendientes === 1 ? 'pedido pendiente' : 'pedidos pendientes'}
              </p>
              <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                Revisa la sección de pedidos para gestionar las órdenes
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Estadísticas avanzadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Distribución por Tipo de Pedido */}
        <OrderTypeDistribution 
          distribucion={advancedStats?.distribucionTipos || {}}
          loading={loadingAdvanced}
        />

        {/* Ventas del Mes */}
        <Card>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 dark:text-gray-100">📈 Ventas del Mes</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center pb-2 sm:pb-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Total Ventas:</span>
              <span className="text-xl sm:text-2xl font-bold text-primary dark:text-primary-400">
                {formatearPrecio(stats.mes?.totalVentas || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 sm:pb-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Total Pedidos:</span>
              <span className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.mes?.totalPedidos || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Promedio por Pedido:</span>
              <span className="text-base sm:text-lg font-medium text-green-600 dark:text-green-400">
                {formatearPrecio(stats.mes?.promedioVenta || 0)}
              </span>
            </div>
            
            {/* Tasa de completación */}
            {advancedStats?.tasaCompletacion && (
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Tasa de Completación
                </p>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3">
                      <div 
                        className="bg-green-500 dark:bg-green-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                        style={{ width: `${advancedStats.tasaCompletacion.porcentajeCompletacion}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                    {advancedStats.tasaCompletacion.porcentajeCompletacion}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
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
