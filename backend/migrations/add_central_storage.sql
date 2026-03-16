-- ============================================================
-- CENTRAL STORAGE: Migrar estado de archivos JSON a Supabase
-- Elimina vulnerabilidad a reinicios y disk failure
-- ============================================================

-- 1) Backup de sesiones (reemplaza sessions_backup.json)
CREATE TABLE IF NOT EXISTS sessions_backup (
  telefono VARCHAR(30) PRIMARY KEY,
  carrito JSONB NOT NULL DEFAULT '[]',
  datos JSONB NOT NULL DEFAULT '{}',
  estado VARCHAR(50) NOT NULL DEFAULT 'esperando_menu',
  ultimo_mensaje_sid VARCHAR(100),
  creado_at TIMESTAMP DEFAULT NOW(),
  actualizado_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_actualizado_at
ON sessions_backup(actualizado_at DESC);

-- 2) Cola de emergencia de pedidos (reemplaza emergency_orders.json)
CREATE TABLE IF NOT EXISTS order_emergency_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_data JSONB NOT NULL,
  numero_intentos INTEGER NOT NULL DEFAULT 0,
  proximo_reintento_at TIMESTAMP DEFAULT NOW(),
  creado_at TIMESTAMP DEFAULT NOW(),
  actualizado_at TIMESTAMP DEFAULT NOW(),
  error_mensaje TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_emergency_proximo_reintento
ON order_emergency_queue(proximo_reintento_at ASC);

-- 3) Cola de notificaciones fallidas (reemplaza failed_notifications.json)
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL,
  numero_destino VARCHAR(30),
  mensaje TEXT NOT NULL,
  numero_intentos INTEGER NOT NULL DEFAULT 0,
  proximo_reintento_at TIMESTAMP DEFAULT NOW(),
  creado_at TIMESTAMP DEFAULT NOW(),
  actualizado_at TIMESTAMP DEFAULT NOW(),
  admin_targets JSONB,
  ultimo_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_tipo_proximo_reintento
ON notification_queue(tipo, proximo_reintento_at ASC);

-- 4) Dead Letter Queue (items fallidos permanentemente)
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  numero_intentos INTEGER NOT NULL,
  razon_descarte TEXT NOT NULL,
  creado_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_tipo
ON dead_letter_queue(tipo);

-- 5) Auditoría de operaciones de almacenamiento central
CREATE TABLE IF NOT EXISTS storage_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion VARCHAR(50) NOT NULL,
  tabla VARCHAR(50) NOT NULL,
  registro_id VARCHAR(100),
  detalles JSONB,
  creado_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_audit_operacion_tabla
ON storage_audit_log(operacion, tabla, creado_at DESC);
