/**
 * Página de Estadísticas Avanzadas - Análisis profundo del negocio
 * 
 * KPIs y métricas incluidas:
 * - Ingresos por período (día, semana, mes, año)
 * - Productos más y menos vendidos
 * - Ticket promedio
 * - Tasa de conversión
 * - Horarios pico de ventas
 * - Análisis por tipo de pedido (domicilio vs restaurante)
 * - Productos con bajo rendimiento (egresos/desperdicio)
 * - Tendencias y comparativas
 */
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  AlertTriangle,
  Package,
  Download
} from 'lucide-react';
import Card from '../components/Common/Card';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { formatearPrecio } from '../utils/helpers';
import toast from 'react-hot-toast';
import analyticsService from '../services/analyticsService';

function Analytics() {
  const [periodo, setPeriodo] = useState('mes'); // dia, semana, mes, año
  const [loading, setLoading] = useState(true);

  // KPIs principales
  const [kpis, setKpis] = useState({
    ingresos_totales: 0,
    incremento_ingresos: 0,
    total_pedidos: 0,
    incremento_pedidos: 0,
    ticket_promedio: 0,
    incremento_ticket: 0,
    total_clientes: 0,
    incremento_clientes: 0
  });

  // Ingresos por día de la semana
  const [ingresosSemana, setIngresosSemana] = useState([]);

  // Top productos vendidos
  const [topProductos, setTopProductos] = useState([]);

  // Productos con BAJO rendimiento (los que NO se venden)
  const [productosPobreRendimiento, setProductosPobreRendimiento] = useState([]);

  // Análisis por tipo de pedido
  const [analisisTipoPedido, setAnalisisTipoPedido] = useState([]);

  // Horarios con mayor actividad
  const [horariosPico, setHorariosPico] = useState([]);

  /**
   * Carga todas las estadísticas del período seleccionado
   */
  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      // Cargar todos los datos en paralelo
      const [
        kpisData,
        ingresosSemanaData,
        topProductosData,
        bajoRendimientoData,
        analisisTipoData,
        horariosPicoData
      ] = await Promise.all([
        analyticsService.getKPIs(periodo),
        analyticsService.getIngresosSemana(periodo),
        analyticsService.getTopProductos(periodo, 5),
        analyticsService.getProductosBajoRendimiento(periodo),
        analyticsService.getAnalisisTipoPedido(periodo),
        analyticsService.getHorariosPico(periodo)
      ]);

      // Si kpisData ya contiene los datos directamente (sin .data wrapper)
      const datosKpis = kpisData?.data || kpisData;

      // Validar y setear datos con valores por defecto
      setKpis(datosKpis || {
        ingresos_totales: 0,
        incremento_ingresos: 0,
        total_pedidos: 0,
        incremento_pedidos: 0,
        ticket_promedio: 0,
        incremento_ticket: 0,
        total_clientes: 0,
        incremento_clientes: 0
      });
      setIngresosSemana(ingresosSemanaData?.data || ingresosSemanaData || []);
      setTopProductos(topProductosData?.data || topProductosData || []);
      setProductosPobreRendimiento(bajoRendimientoData?.data || bajoRendimientoData || []);
      setAnalisisTipoPedido(analisisTipoData?.data || analisisTipoData || []);
      setHorariosPico(horariosPicoData?.data || horariosPicoData || []);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      toast.error('Error al cargar las estadísticas');
      
      // Setear valores por defecto en caso de error
      setKpis({
        ingresos_totales: 0,
        incremento_ingresos: 0,
        total_pedidos: 0,
        incremento_pedidos: 0,
        ticket_promedio: 0,
        incremento_ticket: 0,
        total_clientes: 0,
        incremento_clientes: 0
      });
      setIngresosSemana([]);
      setTopProductos([]);
      setProductosPobreRendimiento([]);
      setAnalisisTipoPedido([]);
      setHorariosPico([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Efecto para cargar datos al montar y cuando cambia el período
   */
  useEffect(() => {
    cargarEstadisticas();
  }, [periodo]);

  /**
   * Maneja el cambio de período
   */
  const handlePeriodoChange = async (nuevoPeriodo) => {
    setPeriodo(nuevoPeriodo);
    toast.success(`Actualizando datos: ${nuevoPeriodo}`);
  };

  /**
   * Exporta el reporte en PDF
   */
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const fechaActual = new Date().toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Título
      doc.setFontSize(20);
      doc.setTextColor(220, 38, 38); // Color rojo
      doc.text('El Rinconcito', 105, 15, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Estadísticas Avanzadas', 105, 25, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Período: ${periodo.charAt(0).toUpperCase() + periodo.slice(1)} - ${fechaActual}`, 105, 32, { align: 'center' });
      
      let yPos = 45;
      
      // KPIs Principales
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('KPIs Principales', 14, yPos);
      yPos += 5;
      
      doc.autoTable({
        startY: yPos,
        head: [['Métrica', 'Valor', 'Cambio vs Anterior']],
        body: [
          ['Ingresos Totales', formatearPrecio(kpis.ingresos_totales), `${kpis.incremento_ingresos > 0 ? '+' : ''}${kpis.incremento_ingresos}%`],
          ['Total Pedidos', kpis.total_pedidos.toString(), `${kpis.incremento_pedidos > 0 ? '+' : ''}${kpis.incremento_pedidos}%`],
          ['Ticket Promedio', formatearPrecio(kpis.ticket_promedio), `${kpis.incremento_ticket > 0 ? '+' : ''}${kpis.incremento_ticket}%`],
          ['Total Clientes', kpis.total_clientes.toString(), `${kpis.incremento_clientes > 0 ? '+' : ''}${kpis.incremento_clientes}%`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Ingresos por Día
      doc.setFontSize(14);
      doc.text('Ingresos por Día de la Semana', 14, yPos);
      yPos += 5;
      
      doc.autoTable({
        startY: yPos,
        head: [['Día', 'Pedidos', 'Ingresos']],
        body: ingresosSemana.map(d => [d.dia, d.pedidos.toString(), formatearPrecio(d.ingresos)]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Top Productos
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Top 5 Productos Más Vendidos', 14, yPos);
      yPos += 5;
      
      doc.autoTable({
        startY: yPos,
        head: [['Producto', 'Cantidad', 'Ingresos', 'Margen']],
        body: topProductos.map(p => [p.nombre, p.cantidad.toString(), formatearPrecio(p.ingresos), `${p.margen}%`]),
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Productos Bajo Rendimiento
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Productos de Bajo Rendimiento', 14, yPos);
      yPos += 5;
      
      doc.autoTable({
        startY: yPos,
        head: [['Producto', 'Vendidos', 'Ingresos', 'Costo Inv.', 'Pérdida']],
        body: productosPobreRendimiento.map(p => [
          p.nombre, 
          p.cantidad.toString(), 
          formatearPrecio(p.ingresos), 
          formatearPrecio(p.costo_inventario),
          formatearPrecio(Math.abs(p.perdida))
        ]),
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Análisis por Tipo de Pedido
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Análisis por Tipo de Pedido', 14, yPos);
      yPos += 5;
      
      doc.autoTable({
        startY: yPos,
        head: [['Tipo', 'Pedidos', 'Ingresos', 'Ticket Prom.', '%']],
        body: analisisTipoPedido.map(t => [
          t.tipo, 
          t.pedidos.toString(), 
          formatearPrecio(t.ingresos), 
          formatearPrecio(t.ticket_promedio),
          `${t.porcentaje}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [168, 85, 247] }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Horarios Pico
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Horarios con Mayor Actividad', 14, yPos);
      yPos += 5;
      
      doc.autoTable({
        startY: yPos,
        head: [['Horario', 'Pedidos', 'Ingresos']],
        body: horariosPico.map(h => [h.horario, h.pedidos.toString(), formatearPrecio(h.ingresos)]),
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22] }
      });
      
      // Footer en todas las páginas
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
        doc.text('El Rinconcito - Sistema de Pedidos', 14, 290);
        doc.text(fechaActual, 196, 290, { align: 'right' });
      }
      
      // Guardar PDF
      doc.save(`estadisticas-${periodo}-${new Date().getTime()}.pdf`);
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      toast.error('Error al exportar el reporte');
    }
  };

  /**
   * Calcula el color según la tendencia
   */
  const getTrendColor = (value) => {
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Estadísticas Avanzadas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Análisis profundo y KPIs del negocio
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Selector de período */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {['dia', 'semana', 'mes', 'año'].map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodoChange(p)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  periodo === p
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Botón exportar */}
          <button onClick={handleExportPDF} className="btn btn-secondary flex items-center gap-2">
            <Download size={18} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* KPIs Principales */}
      {!loading && (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Totales */}
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {formatearPrecio(kpis.ingresos_totales)}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(kpis.incremento_ingresos)}`}>
                {kpis.incremento_ingresos > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-medium">{Math.abs(kpis.incremento_ingresos)}%</span>
                <span className="text-gray-500 dark:text-gray-400">vs anterior</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </Card>

        {/* Total Pedidos */}
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Pedidos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {kpis.total_pedidos}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(kpis.incremento_pedidos)}`}>
                {kpis.incremento_pedidos > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-medium">{Math.abs(kpis.incremento_pedidos)}%</span>
                <span className="text-gray-500 dark:text-gray-400">vs anterior</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingCart className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </Card>

        {/* Ticket Promedio */}
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {formatearPrecio(kpis.ticket_promedio)}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(kpis.incremento_ticket)}`}>
                {kpis.incremento_ticket > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-medium">{Math.abs(kpis.incremento_ticket)}%</span>
                <span className="text-gray-500 dark:text-gray-400">vs anterior</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BarChart3 className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </Card>

        {/* Total Clientes */}
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Clientes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {kpis.total_clientes}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(kpis.incremento_clientes)}`}>
                {kpis.incremento_clientes > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="font-medium">{Math.abs(kpis.incremento_clientes)}%</span>
                <span className="text-gray-500 dark:text-gray-400">vs anterior</span>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Users className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Ingresos por Día de la Semana */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Ingresos por Día de la Semana
            </h2>
          </div>
        </div>

        <div className="space-y-3">
          {(ingresosSemana || []).length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No hay datos de ingresos disponibles
            </p>
          ) : (
            (ingresosSemana || []).map((item, index) => {
              const maxIngresos = Math.max(...(ingresosSemana || []).map(d => d.ingresos), 1);
              const porcentaje = (item.ingresos / maxIngresos) * 100;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100 w-16">{item.dia}</span>
                  <span className="text-gray-600 dark:text-gray-400">{item.pedidos} pedidos</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {formatearPrecio(item.ingresos)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${porcentaje}%` }}
                  ></div>
                </div>
              </div>
            );
          })
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Productos Vendidos */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Top Productos Vendidos
            </h2>
          </div>

          <div className="space-y-4">
            {(topProductos || []).length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No hay datos de productos disponibles
              </p>
            ) : (
              (topProductos || []).map((producto, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{producto.nombre}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {producto.cantidad} unidades • Margen: {producto.margen}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 dark:text-green-400">
                    {formatearPrecio(producto.ingresos)}
                  </p>
                </div>
              </div>
            ))
            )}
          </div>
        </Card>

        {/* Productos de BAJO Rendimiento (EGRESOS) */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Productos de Bajo Rendimiento
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Productos que NO se venden bien (posibles pérdidas)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {(productosPobreRendimiento || []).length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No hay productos con bajo rendimiento
              </p>
            ) : (
              (productosPobreRendimiento || []).map((producto, index) => (
              <div key={index} className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{producto.nombre}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Solo {producto.cantidad} vendidos este {periodo}
                    </p>
                  </div>
                  <Badge variant="error">
                    Pérdida: {formatearPrecio(Math.abs(producto.perdida))}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Ingresos:</span>
                    <span className="ml-1 text-gray-900 dark:text-gray-100 font-medium">
                      {formatearPrecio(producto.ingresos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Costo inv.:</span>
                    <span className="ml-1 text-gray-900 dark:text-gray-100 font-medium">
                      {formatearPrecio(producto.costo_inventario)}
                    </span>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>

          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>💡 Recomendación:</strong> Considera reducir el inventario de estos productos o eliminarlos del menú para reducir pérdidas.
            </p>
          </div>
        </Card>
      </div>

      {/* Análisis por Tipo de Pedido */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <PieChartIcon className="text-purple-600 dark:text-purple-400" size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Análisis por Tipo de Pedido
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(analisisTipoPedido || []).length === 0 ? (
            <p className="col-span-3 text-center text-gray-500 dark:text-gray-400 py-8">
              No hay datos de tipos de pedido disponibles
            </p>
          ) : (
            (analisisTipoPedido || []).map((tipo, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-gray-100">{tipo.tipo}</h3>
                <span className="text-2xl font-bold text-primary">{tipo.porcentaje}%</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Pedidos:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{tipo.pedidos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ingresos:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatearPrecio(tipo.ingresos)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ticket Prom:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatearPrecio(tipo.ticket_promedio)}
                  </span>
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </Card>

      {/* Horarios Pico */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Clock className="text-orange-600 dark:text-orange-400" size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Horarios con Mayor Actividad
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Horario
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pedidos
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Ingresos
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Actividad
                </th>
              </tr>
            </thead>
            <tbody>
              {(horariosPico || []).length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No hay datos de horarios disponibles
                  </td>
                </tr>
              ) : (
                (horariosPico || []).map((horario, index) => {
                  const maxPedidos = Math.max(...(horariosPico || []).map(h => h.pedidos), 1);
                  const porcentaje = (horario.pedidos / maxPedidos) * 100;

                return (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      {horario.horario}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                      {horario.pedidos}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatearPrecio(horario.ingresos)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex-1 max-w-[150px] bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full"
                            style={{ width: `${porcentaje}%` }}
                          ></div>
                        </div>
                        {porcentaje >= 80 && (
                          <Badge variant="success">Pico</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recomendaciones de Negocio - Dinámicas basadas en datos reales */}
      {kpis.total_pedidos > 0 && (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Package className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Recomendaciones de Negocio
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {/* Día más fuerte */}
              {(ingresosSemana || []).length > 0 && (() => {
                const diasOrdenados = [...ingresosSemana].sort((a, b) => b.ingresos - a.ingresos);
                const diaFuerte = diasOrdenados[0];
                const diasDebiles = diasOrdenados.slice(-2);
                
                return diaFuerte && diaFuerte.ingresos > 0 ? (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                    <span>
                      <strong>{diaFuerte.dia}</strong> es tu día más fuerte con {formatearPrecio(diaFuerte.ingresos)}. 
                      {diasDebiles.length > 0 && diasDebiles[0].dia && (
                        <> Considera promociones especiales para {diasDebiles.map(d => d.dia).join(' y ')} que son más bajos.</>
                      )}
                    </span>
                  </li>
                ) : null;
              })()}

              {/* Horario pico */}
              {(horariosPico || []).length > 0 && (() => {
                const horarioMasFuerte = [...horariosPico].sort((a, b) => b.pedidos - a.pedidos)[0];
                return horarioMasFuerte && horarioMasFuerte.pedidos > 0 ? (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                    <span>
                      El horario de <strong>{horarioMasFuerte.horario}</strong> es tu pico máximo con {horarioMasFuerte.pedidos} pedidos. 
                      Asegúrate de tener personal suficiente en ese horario.
                    </span>
                  </li>
                ) : null;
              })()}

              {/* Productos con bajo rendimiento */}
              {(productosPobreRendimiento || []).length > 0 && (() => {
                const productosTop = productosPobreRendimiento.slice(0, 2);
                const nombres = productosTop.map(p => p.nombre).join(' y ');
                return (
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 dark:text-red-400 mt-0.5">✗</span>
                    <span>
                      Productos como <strong>{nombres}</strong> tienen bajo rendimiento. 
                      Considera eliminarlos o promocionarlos con descuentos especiales.
                    </span>
                  </li>
                );
              })()}

              {/* Tipo de pedido dominante */}
              {(analisisTipoPedido || []).length > 0 && (() => {
                const tipoDominante = [...analisisTipoPedido].sort((a, b) => b.cantidad - a.cantidad)[0];
                const totalPedidos = analisisTipoPedido.reduce((sum, t) => sum + t.cantidad, 0);
                const porcentaje = totalPedidos > 0 ? Math.round((tipoDominante.cantidad / totalPedidos) * 100) : 0;
                
                return tipoDominante && porcentaje > 0 ? (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                    <span>
                      <strong>{tipoDominante.tipo_pedido}</strong> representa el {porcentaje}% de tus ventas. 
                      {tipoDominante.tipo_pedido === 'domicilio' && 'Invierte más en marketing digital y apps de delivery.'}
                      {tipoDominante.tipo_pedido === 'restaurante' && 'Enfócate en mejorar la experiencia en el local.'}
                      {tipoDominante.tipo_pedido === 'para_llevar' && 'Optimiza los tiempos de preparación y empaquetado.'}
                    </span>
                  </li>
                ) : null;
              })()}

              {/* Mensaje cuando no hay suficientes datos */}
              {(ingresosSemana || []).length === 0 && 
               (horariosPico || []).length === 0 && 
               (productosPobreRendimiento || []).length === 0 && 
               (analisisTipoPedido || []).length === 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ</span>
                  <span>
                    Necesitas más datos para generar recomendaciones precisas. 
                    Continúa registrando pedidos para obtener insights valiosos.
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </Card>
      )}
      </>
      )}
    </div>
  );
}

export default Analytics;
