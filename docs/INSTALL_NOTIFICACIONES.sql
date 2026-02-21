-- =====================================================
-- SCRIPT DE INSTALACIÓN - SISTEMA DE NOTIFICACIONES
-- =====================================================
-- Este script crea la tabla de notificaciones en Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Eliminar tabla si existe (solo para desarrollo)
-- DROP TABLE IF EXISTS notificaciones CASCADE;

-- 2. Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'nuevo_pedido', 
    'pedido_actualizado', 
    'pedido_completado', 
    'pedido_cancelado', 
    'cliente_nuevo', 
    'sistema', 
    'alerta'
  )),
  mensaje TEXT NOT NULL,
  datos_adicionales JSONB DEFAULT NULL,
  leida BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida 
  ON notificaciones(leida);

CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at 
  ON notificaciones(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo 
  ON notificaciones(tipo);

CREATE INDEX IF NOT EXISTS idx_notificaciones_leida_created 
  ON notificaciones(leida, created_at DESC);

-- 4. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_notificaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_notificaciones_updated_at ON notificaciones;

CREATE TRIGGER trigger_update_notificaciones_updated_at
  BEFORE UPDATE ON notificaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_notificaciones_updated_at();

-- 6. Comentarios para documentación
COMMENT ON TABLE notificaciones IS 'Almacena las notificaciones del sistema para el panel de notificaciones';
COMMENT ON COLUMN notificaciones.tipo IS 'Tipo de notificación: nuevo_pedido, pedido_actualizado, pedido_completado, pedido_cancelado, cliente_nuevo, sistema, alerta';
COMMENT ON COLUMN notificaciones.mensaje IS 'Mensaje de la notificación para mostrar al usuario';
COMMENT ON COLUMN notificaciones.datos_adicionales IS 'Datos adicionales en formato JSON (ej: order_id, customer_id, etc)';
COMMENT ON COLUMN notificaciones.leida IS 'Indica si la notificación ha sido leída';

-- 7. Insertar notificaciones de ejemplo para pruebas
INSERT INTO notificaciones (tipo, mensaje, datos_adicionales, leida) 
VALUES
  (
    'nuevo_pedido', 
    '🛒 Nuevo pedido #12345 - DOMICILIO - $250.00', 
    '{"order_id": 1, "numero_pedido": 12345, "tipo_pedido": "DOMICILIO", "total": 250, "cliente": "Juan Pérez"}',
    false
  ),
  (
    'pedido_actualizado', 
    '📦 Pedido #12344 cambió a: En Preparación', 
    '{"order_id": 2, "numero_pedido": 12344, "estado_anterior": "pendiente", "estado_nuevo": "en_preparacion"}',
    false
  ),
  (
    'pedido_completado', 
    '✅ Pedido #12343 cambió a: Entregado', 
    '{"order_id": 3, "numero_pedido": 12343, "estado_anterior": "en_camino", "estado_nuevo": "entregado"}',
    true
  ),
  (
    'sistema', 
    'ℹ️ El sistema se actualizó a la versión 1.0.0', 
    '{"version": "1.0.0"}',
    true
  ),
  (
    'alerta', 
    '⚠️ Stock bajo en producto: Tacos al Pastor', 
    '{"product_id": 5, "producto": "Tacos al Pastor", "stock_actual": 3}',
    false
  ),
  (
    'cliente_nuevo', 
    '👤 Nuevo cliente registrado: María García', 
    '{"customer_id": 10, "nombre": "María García", "telefono": "+52155123456"}',
    false
  ),
  (
    'pedido_cancelado', 
    '❌ Pedido #12342 cambió a: Cancelado', 
    '{"order_id": 4, "numero_pedido": 12342, "estado_anterior": "pendiente", "estado_nuevo": "cancelado"}',
    true
  );

-- 8. Verificar instalación
SELECT 
  COUNT(*) as total_notificaciones,
  COUNT(CASE WHEN leida = false THEN 1 END) as no_leidas,
  COUNT(CASE WHEN leida = true THEN 1 END) as leidas
FROM notificaciones;

-- 9. Mostrar notificaciones de ejemplo
SELECT 
  id,
  tipo,
  mensaje,
  leida,
  created_at
FROM notificaciones
ORDER BY created_at DESC;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- ✅ La tabla de notificaciones ha sido creada exitosamente
-- 📝 Se insertaron 7 notificaciones de ejemplo
-- 🔍 Verifica los resultados en las consultas anteriores
