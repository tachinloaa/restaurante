-- ═══════════════════════════════════════════════════════════════
-- SCRIPTS SQL PARA SUPABASE - EL RINCONCITO
-- Sistema de Gestión de Pedidos
-- ═══════════════════════════════════════════════════════════════

-- Eliminar tablas existentes si las hay (cuidado en producción)
DROP TABLE IF EXISTS pedido_detalles CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS subcategorias CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- TABLA: categorias
-- Categorías principales del menú
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLA: subcategorias
-- Subcategorías dentro de cada categoría
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE subcategorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLA: productos
-- Productos del menú (platillos, bebidas, etc.)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  categoria_id UUID REFERENCES categorias(id),
  subcategoria_id UUID REFERENCES subcategorias(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLA: clientes
-- Información de los clientes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefono VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(200),
  direccion TEXT,
  referencias TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLA: pedidos
-- Pedidos realizados por los clientes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_pedido VARCHAR(20) UNIQUE NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  total DECIMAL(10,2) NOT NULL,
  tipo_pedido VARCHAR(20) CHECK (tipo_pedido IN ('domicilio', 'restaurante', 'para_llevar')),
  estado VARCHAR(20) CHECK (estado IN ('pendiente', 'preparando', 'listo', 'enviado', 'entregado', 'cancelado')),
  direccion_entrega TEXT,
  numero_mesa INTEGER,
  numero_personas INTEGER,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLA: pedido_detalles
-- Detalle de productos en cada pedido
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE pedido_detalles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- ÍNDICES para mejor performance
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_subcategoria ON productos(subcategoria_id);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_tipo ON pedidos(tipo_pedido);
CREATE INDEX idx_pedidos_fecha ON pedidos(created_at DESC);
CREATE INDEX idx_pedido_detalles_pedido ON pedido_detalles(pedido_id);
CREATE INDEX idx_clientes_telefono ON clientes(telefono);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER para actualizar updated_at automáticamente
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- DATOS DE EJEMPLO (Opcional - para desarrollo)
-- ═══════════════════════════════════════════════════════════════

-- Insertar categorías
INSERT INTO categorias (nombre, descripcion, orden) VALUES
  ('ANTOJITOS', 'Antojitos mexicanos tradicionales', 1),
  ('GUISADOS', 'Guisados caseros del día', 2),
  ('HAMBURGUESAS', 'Hamburguesas completas', 3),
  ('HOT DOGS', 'Hot dogs con tocino', 4),
  ('CALDOS', 'Caldos y sopas', 5),
  ('BEBIDAS', 'Bebidas variadas', 6),
  ('JUGOS', 'Jugos naturales y frescas', 7);

-- Insertar subcategorías para ANTOJITOS
INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Pambazos', 1 FROM categorias WHERE nombre = 'ANTOJITOS';

INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Tostadas', 2 FROM categorias WHERE nombre = 'ANTOJITOS';

INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Quesadillas', 3 FROM categorias WHERE nombre = 'ANTOJITOS';

-- Insertar subcategorías para GUISADOS
INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Carnes', 1 FROM categorias WHERE nombre = 'GUISADOS';

INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Pollo', 2 FROM categorias WHERE nombre = 'GUISADOS';

-- Insertar subcategorías para CALDOS
INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Caldo de Res', 1 FROM categorias WHERE nombre = 'CALDOS';

INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Caldo de Pollo', 2 FROM categorias WHERE nombre = 'CALDOS';

INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Especiales', 3 FROM categorias WHERE nombre = 'CALDOS';

-- Insertar subcategorías para BEBIDAS
INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Refrescos', 1 FROM categorias WHERE nombre = 'BEBIDAS';

INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Aguas Frescas', 2 FROM categorias WHERE nombre = 'BEBIDAS';

INSERT INTO subcategorias (categoria_id, nombre, orden)
SELECT id, 'Calientes', 3 FROM categorias WHERE nombre = 'BEBIDAS';

-- Insertar productos de ejemplo
INSERT INTO productos (nombre, precio, categoria_id, activo) VALUES
  ('Pambazo con papas', 70.00, (SELECT id FROM categorias WHERE nombre = 'ANTOJITOS'), true),
  ('Tostadas', 35.00, (SELECT id FROM categorias WHERE nombre = 'ANTOJITOS'), true),
  ('Pata de res', 35.00, (SELECT id FROM categorias WHERE nombre = 'GUISADOS'), true),
  ('Tinga de pollo', 35.00, (SELECT id FROM categorias WHERE nombre = 'GUISADOS'), true),
  ('Tinga de res', 35.00, (SELECT id FROM categorias WHERE nombre = 'GUISADOS'), true),
  ('Hamburguesa completa', 110.00, (SELECT id FROM categorias WHERE nombre = 'HAMBURGUESAS'), true),
  ('Hot-dog con tocino', 75.00, (SELECT id FROM categorias WHERE nombre = 'HOT DOGS'), true),
  ('Caldo de res', 95.00, (SELECT id FROM categorias WHERE nombre = 'CALDOS'), true),
  ('Caldo de pollo', 95.00, (SELECT id FROM categorias WHERE nombre = 'CALDOS'), true),
  ('Pancita de res', 110.00, 10, (SELECT id FROM categorias WHERE nombre = 'CALDOS'), true),
  ('Pozole (Puerco y pollo)', 110.00, 10, (SELECT id FROM categorias WHERE nombre = 'CALDOS'), true),
  ('Coca-Cola', 40.00, 100, (SELECT id FROM categorias WHERE nombre = 'BEBIDAS'), true),
  ('Agua fresca Jamaica', 25.00, 50, (SELECT id FROM categorias WHERE nombre = 'BEBIDAS'), true),
  ('Café de olla', 25.00, 30, (SELECT id FROM categorias WHERE nombre = 'BEBIDAS'), true),
  ('Jugo de Naranja', 45.00, 20, (SELECT id FROM categorias WHERE nombre = 'JUGOS'), true);

-- ═══════════════════════════════════════════════════════════════
-- POLÍTICAS RLS (Row Level Security) - Opcional
-- Descomenta si necesitas seguridad a nivel de filas
-- ═══════════════════════════════════════════════════════════════

-- ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subcategorias ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pedido_detalles ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública
-- CREATE POLICY "Permitir lectura a todos" ON productos FOR SELECT USING (activo = true);

-- ═══════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- ═══════════════════════════════════════════════════════════════

COMMIT;
