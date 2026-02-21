-- ============================================
-- Script de Optimización para la Base de Datos
-- Restaurante - Sistema de Gestión
-- ============================================

-- Índices para mejorar rendimiento en consultas

-- 1. Índice en fecha de creación de pedidos (usado en estadísticas)
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at 
ON pedidos(created_at DESC);

-- 2. Índice en estado de pedidos (usado en filtros)
CREATE INDEX IF NOT EXISTS idx_pedidos_estado 
ON pedidos(estado);

-- 3. Índice en tipo de pedido
CREATE INDEX IF NOT EXISTS idx_pedidos_tipo 
ON pedidos(tipo_pedido);

-- 4. Índice en cliente_id para consultas de clientes leales
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id 
ON pedidos(cliente_id) WHERE cliente_id IS NOT NULL;

-- 5. Índice compuesto para consultas de estadísticas por fecha y estado
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_estado 
ON pedidos(created_at DESC, estado);

-- 6. Índice en producto_id de detalles para top productos
CREATE INDEX IF NOT EXISTS idx_detalles_producto_id 
ON pedido_detalles(producto_id);

-- 7. Índice en pedido_id de detalles
CREATE INDEX IF NOT EXISTS idx_detalles_pedido_id 
ON pedido_detalles(pedido_id);

-- ============================================
-- Función para obtener top productos (optimizada)
-- ============================================
CREATE OR REPLACE FUNCTION get_top_products(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  nombre VARCHAR,
  cantidadVendida BIGINT,
  totalVentas NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nombre,
    SUM(pd.cantidad)::BIGINT AS cantidadVendida,
    SUM(pd.subtotal)::NUMERIC AS totalVentas
  FROM pedido_detalles pd
  INNER JOIN productos p ON p.id = pd.producto_id
  INNER JOIN pedidos ped ON ped.id = pd.pedido_id
  WHERE ped.estado != 'cancelado'
  GROUP BY p.id, p.nombre
  ORDER BY cantidadVendida DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Función para obtener clientes leales (optimizada)
-- ============================================
CREATE OR REPLACE FUNCTION get_loyal_customers(
  p_limit INTEGER DEFAULT 10,
  p_dias INTEGER DEFAULT 30
)
RETURNS TABLE (
  nombre VARCHAR,
  pedidos BIGINT,
  total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.nombre,
    COUNT(p.id)::BIGINT AS pedidos,
    SUM(p.total)::NUMERIC AS total
  FROM pedidos p
  INNER JOIN clientes c ON c.id = p.cliente_id
  WHERE p.estado != 'cancelado'
    AND p.created_at >= NOW() - INTERVAL '1 day' * p_dias
    AND p.cliente_id IS NOT NULL
  GROUP BY c.id, c.nombre
  ORDER BY pedidos DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Vista materializada para estadísticas rápidas (opcional)
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS vista_estadisticas_diarias AS
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as total_pedidos,
  SUM(CASE WHEN estado != 'cancelado' THEN total ELSE 0 END) as total_ventas,
  COUNT(DISTINCT cliente_id) as clientes_unicos,
  AVG(CASE WHEN estado != 'cancelado' THEN total ELSE NULL END) as promedio_venta
FROM pedidos
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- Índice en la vista materializada
CREATE INDEX IF NOT EXISTS idx_vista_estadisticas_fecha 
ON vista_estadisticas_diarias(fecha DESC);

-- Función para refrescar la vista (ejecutar diariamente)
CREATE OR REPLACE FUNCTION refresh_estadisticas_diarias()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vista_estadisticas_diarias;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Análisis de tablas (ejecutar después de crear índices)
-- ============================================
ANALYZE pedidos;
ANALYZE pedido_detalles;
ANALYZE productos;
ANALYZE clientes;

-- ============================================
-- Verificar índices creados
-- ============================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('pedidos', 'pedido_detalles', 'productos', 'clientes')
ORDER BY tablename, indexname;

