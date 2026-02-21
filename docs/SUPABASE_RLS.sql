-- ═══════════════════════════════════════════════════════════════
-- CONFIGURAR RLS (Row Level Security) PARA DESARROLLO
-- Ejecutar este script en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Desactivar RLS en todas las tablas para desarrollo
-- En producción, deberías configurar políticas apropiadas

ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE subcategorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_detalles DISABLE ROW LEVEL SECURITY;

-- Si quieres activar RLS pero permitir acceso público (RECOMENDADO):
/*
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir todo (desarrollo)
CREATE POLICY "Permitir todo en categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en subcategorias" ON subcategorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en productos" ON productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en pedidos" ON pedidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en pedido_detalles" ON pedido_detalles FOR ALL USING (true) WITH CHECK (true);
*/
