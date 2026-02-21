/**
 * Exportar estadísticas del dashboard a PDF
 */
import { formatearPrecio } from './helpers';

export const exportarDashboardPDF = async (stats, advancedStats) => {
  try {
    // Crear contenido HTML para el PDF
    const contenido = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte Dashboard - El Rinconcito</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #e53e3e;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #e53e3e;
            margin: 0;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section h2 {
            color: #2d3748;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .stat-card {
            border: 1px solid #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            background: #f7fafc;
          }
          .stat-label {
            font-size: 12px;
            color: #718096;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2d3748;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th {
            background: #edf2f7;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            border-bottom: 2px solid #cbd5e0;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #718096;
          }
          @media print {
            body { print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌮 El Rinconcito</h1>
          <p>Reporte de Estadísticas del Dashboard</p>
          <p style="font-size: 12px; color: #718096;">
            Generado el ${new Date().toLocaleString('es-MX', { 
              timeZone: 'America/Mexico_City',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <div class="section">
          <h2>📊 Resumen General</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Ventas del Día</div>
              <div class="stat-value">${formatearPrecio(stats.hoy?.totalVentas || 0)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Pedidos Hoy</div>
              <div class="stat-value">${stats.hoy?.totalPedidos || 0}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Ventas del Mes</div>
              <div class="stat-value">${formatearPrecio(stats.mes?.totalVentas || 0)}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Pedidos del Mes</div>
              <div class="stat-value">${stats.mes?.totalPedidos || 0}</div>
            </div>
          </div>
        </div>

        ${advancedStats?.productosPopulares?.length ? `
        <div class="section">
          <h2>🏆 Productos Más Vendidos</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th style="text-align: right;">Cantidad</th>
                <th style="text-align: right;">Total Ventas</th>
              </tr>
            </thead>
            <tbody>
              ${advancedStats.productosPopulares.map((prod, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${prod.nombre}</td>
                  <td style="text-align: right;">${prod.cantidadVendida} uds</td>
                  <td style="text-align: right;">${formatearPrecio(prod.totalVentas)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${advancedStats?.clientesLeales?.length ? `
        <div class="section">
          <h2>⭐ Clientes Leales</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th style="text-align: right;">Pedidos</th>
                <th style="text-align: right;">Total Gastado</th>
              </tr>
            </thead>
            <tbody>
              ${advancedStats.clientesLeales.map((cliente, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${cliente.nombre}</td>
                  <td style="text-align: right;">${cliente.pedidos}</td>
                  <td style="text-align: right;">${formatearPrecio(cliente.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${advancedStats?.distribucionTipos ? `
        <div class="section">
          <h2>🥡 Distribución por Tipo de Pedido</h2>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th style="text-align: right;">Cantidad</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Domicilio</td>
                <td style="text-align: right;">${advancedStats.distribucionTipos.domicilio?.cantidad || 0}</td>
                <td style="text-align: right;">${formatearPrecio(advancedStats.distribucionTipos.domicilio?.total || 0)}</td>
              </tr>
              <tr>
                <td>Restaurante</td>
                <td style="text-align: right;">${advancedStats.distribucionTipos.restaurante?.cantidad || 0}</td>
                <td style="text-align: right;">${formatearPrecio(advancedStats.distribucionTipos.restaurante?.total || 0)}</td>
              </tr>
              <tr>
                <td>Para Llevar</td>
                <td style="text-align: right;">${advancedStats.distribucionTipos.para_llevar?.cantidad || 0}</td>
                <td style="text-align: right;">${formatearPrecio(advancedStats.distribucionTipos.para_llevar?.total || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p><strong>El Rinconcito</strong> - Sistema de Gestión de Pedidos</p>
          <p>Zona Horaria: América/Ciudad de México (GMT-6)</p>
        </div>
      </body>
      </html>
    `;

    // Abrir ventana de impresión
    const ventana = window.open('', '_blank');
    ventana.document.write(contenido);
    ventana.document.close();
    
    // Esperar a que se cargue y luego imprimir
    setTimeout(() => {
      ventana.print();
    }, 500);

    return { success: true };
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    return { success: false, error: error.message };
  }
};

export default exportarDashboardPDF;
