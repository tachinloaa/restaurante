-- ═══════════════════════════════════════════════════════════════
-- ELIMINAR COLUMNAS STOCK E IMAGEN_URL DE PRODUCTOS
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Eliminar columna stock
ALTER TABLE productos DROP COLUMN IF EXISTS stock;

-- Eliminar columna imagen_url
ALTER TABLE productos DROP COLUMN IF EXISTS imagen_url;

-- Verificar estructura actualizada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'productos'
ORDER BY ordinal_position;
