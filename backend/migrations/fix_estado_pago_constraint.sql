-- Corregir constraint de estado_pago para permitir el valor 'completado'
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar constraint actual
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_pago_check;

-- 2. Recrear con todos los valores válidos
ALTER TABLE pedidos
  ADD CONSTRAINT pedidos_estado_pago_check
  CHECK (estado_pago IN ('pendiente', 'completado', 'rechazado', 'reembolsado'));

-- 3. Asegurarse de que la columna exista con valor por defecto correcto
ALTER TABLE pedidos
  ALTER COLUMN estado_pago SET DEFAULT 'pendiente';

-- 4. Rellenar nulos (pedidos viejos sin estado_pago)
UPDATE pedidos
SET estado_pago = 'pendiente'
WHERE estado_pago IS NULL;
