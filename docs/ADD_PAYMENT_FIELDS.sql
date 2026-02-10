-- ═══════════════════════════════════════════════════════════════
-- AGREGAR CAMPOS DE MÉTODO DE PAGO Y ESTADO DE PAGO
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Agregar campo método_pago
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) 
CHECK (metodo_pago IN ('efectivo', 'transferencia')) 
DEFAULT 'efectivo';

-- Agregar campo pago_verificado (para transferencias)
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS pago_verificado BOOLEAN 
DEFAULT TRUE;

-- Agregar campo comprobante_pago (para guardar info del comprobante)
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS comprobante_pago TEXT;

-- Comentarios
COMMENT ON COLUMN pedidos.metodo_pago IS 'Método de pago: efectivo o transferencia';
COMMENT ON COLUMN pedidos.pago_verificado IS 'Si el pago ha sido verificado (FALSE para transferencias pendientes)';
COMMENT ON COLUMN pedidos.comprobante_pago IS 'Información del comprobante de pago (número de referencia, etc)';

-- Para pedidos existentes, marcar como efectivo y verificado
UPDATE pedidos 
SET metodo_pago = 'efectivo', 
    pago_verificado = TRUE 
WHERE metodo_pago IS NULL;
