-- Agregar estado 'pendiente_pago' al constraint de la tabla pedidos
-- Este estado se usa para pedidos con transferencia que esperan verificación de pago

-- Primero eliminar el constraint existente
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;

-- Crear el nuevo constraint con el estado adicional
ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check 
  CHECK (estado IN ('pendiente_pago', 'pendiente', 'preparando', 'listo', 'enviado', 'entregado', 'cancelado'));

-- Agregar columnas para tracking de pago si no existen
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pago_verificado BOOLEAN DEFAULT FALSE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_verificacion_pago TIMESTAMP;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMP;
