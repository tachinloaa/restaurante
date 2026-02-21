-- Tabla de Notificaciones
-- Almacena las notificaciones del sistema para el panel de notificaciones

CREATE TABLE IF NOT EXISTS notificaciones (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  mensaje TEXT NOT NULL,
  datos_adicionales JSONB,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_notificaciones_created_at ON notificaciones(created_at DESC);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_notificaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER trigger_update_notificaciones_updated_at
  BEFORE UPDATE ON notificaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_notificaciones_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE notificaciones IS 'Almacena las notificaciones del sistema';
COMMENT ON COLUMN notificaciones.tipo IS 'Tipo de notificación: nuevo_pedido, pedido_actualizado, pedido_completado, pedido_cancelado, cliente_nuevo, sistema, alerta';
COMMENT ON COLUMN notificaciones.mensaje IS 'Mensaje de la notificación para mostrar al usuario';
COMMENT ON COLUMN notificaciones.datos_adicionales IS 'Datos adicionales en formato JSON (ej: order_id, customer_id, etc)';
COMMENT ON COLUMN notificaciones.leida IS 'Indica si la notificación ha sido leída';

-- Insertar notificaciones de ejemplo
INSERT INTO notificaciones (tipo, mensaje, datos_adicionales, leida) VALUES
  ('nuevo_pedido', 'Nuevo pedido recibido: #12345', '{"order_id": 1}', false),
  ('pedido_completado', 'Pedido #12344 completado exitosamente', '{"order_id": 2}', false),
  ('sistema', 'El sistema se actualizó a la versión 1.0.0', null, true),
  ('alerta', 'Stock bajo en producto: Tacos al Pastor', '{"product_id": 5}', false);
