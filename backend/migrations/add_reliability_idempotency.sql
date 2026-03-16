-- ============================================================
-- RELIABILITY: Deduplicacion de webhook + idempotencia de pedidos
-- ============================================================

-- 1) Deduplicacion de mensajes entrantes (Twilio MessageSid)
CREATE TABLE IF NOT EXISTS webhook_message_dedup (
  id BIGSERIAL PRIMARY KEY,
  message_sid VARCHAR(100) NOT NULL UNIQUE,
  from_phone VARCHAR(30),
  body_hash VARCHAR(128),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_dedup_created_at
ON webhook_message_dedup(created_at DESC);

-- 2) Idempotencia de creacion de pedidos
CREATE TABLE IF NOT EXISTS order_idempotency_keys (
  idempotency_key VARCHAR(200) PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  response_json JSONB,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_idempotency_status
ON order_idempotency_keys(status);

CREATE INDEX IF NOT EXISTS idx_order_idempotency_updated_at
ON order_idempotency_keys(updated_at DESC);
