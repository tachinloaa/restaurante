-- =========================================================
-- MIGRACIÓN: Agregar tracking de cancelaciones
-- Fecha: 2026-02-17
-- Propósito: Anti-spam - Rastrear cancelaciones por cliente
-- =========================================================

-- 1. Agregar columnas a tabla clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS cancelaciones_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Crear índice para búsquedas rápidas de usuarios bloqueados
CREATE INDEX IF NOT EXISTS idx_clientes_bloqueado 
ON clientes(bloqueado_hasta) 
WHERE bloqueado_hasta IS NOT NULL;

-- 3. Comentarios en columnas
COMMENT ON COLUMN clientes.cancelaciones_count IS 'Contador de pedidos cancelados por el cliente';
COMMENT ON COLUMN clientes.bloqueado_hasta IS 'Fecha hasta la cual el cliente está bloqueado para crear pedidos';

-- 4. Función para incrementar cancelaciones
CREATE OR REPLACE FUNCTION incrementar_cancelacion(telefono_param VARCHAR)
RETURNS VOID 
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE clientes
  SET cancelaciones_count = COALESCE(cancelaciones_count, 0) + 1,
      updated_at = NOW()
  WHERE telefono = telefono_param;
END;
$$;

-- 5. Función para bloquear usuario
CREATE OR REPLACE FUNCTION bloquear_cliente(telefono_param VARCHAR, dias_param INTEGER DEFAULT 7)
RETURNS VOID 
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE clientes
  SET bloqueado_hasta = NOW() + INTERVAL '1 day' * dias_param,
      updated_at = NOW()
  WHERE telefono = telefono_param;
END;
$$;

-- 6. Función para desbloquear usuario
CREATE OR REPLACE FUNCTION desbloquear_cliente(telefono_param VARCHAR)
RETURNS VOID 
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE clientes
  SET bloqueado_hasta = NULL,
      updated_at = NOW()
  WHERE telefono = telefono_param;
END;
$$;

-- 7. Función para verificar si un cliente está bloqueado
CREATE OR REPLACE FUNCTION cliente_esta_bloqueado(telefono_param VARCHAR)
RETURNS BOOLEAN 
LANGUAGE plpgsql
AS $$
DECLARE
  bloqueado BOOLEAN;
BEGIN
  SELECT 
    CASE 
      WHEN bloqueado_hasta IS NULL THEN FALSE
      WHEN bloqueado_hasta > NOW() THEN TRUE
      ELSE FALSE
    END INTO bloqueado
  FROM clientes
  WHERE telefono = telefono_param;
  
  RETURN COALESCE(bloqueado, FALSE);
END;
$$;

-- =========================================================
-- NOTAS DE USO:
-- =========================================================
-- Incrementar cancelaciones:
--   SELECT incrementar_cancelacion('+525519060013');
--
-- Bloquear cliente por 7 días:
--   SELECT bloquear_cliente('+525519060013');
--
-- Bloquear cliente por X días:
--   SELECT bloquear_cliente('+525519060013', 30);
--
-- Desbloquear cliente:
--   SELECT desbloquear_cliente('+525519060013');
--
-- Verificar si está bloqueado:
--   SELECT cliente_esta_bloqueado('+525519060013');
-- =========================================================
