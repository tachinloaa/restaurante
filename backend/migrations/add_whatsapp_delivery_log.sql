-- Tabla de auditoría de mensajes WhatsApp enviados
-- Registra cada mensaje saliente con su SID de Twilio y estado de entrega
-- Sirve como evidencia ante disputas del tipo "no me llegó"

CREATE TABLE IF NOT EXISTS whatsapp_delivery_log (
  id            BIGSERIAL PRIMARY KEY,
  message_sid   TEXT UNIQUE NOT NULL,          -- SID de Twilio (SM... o MM...)
  destinatario  TEXT NOT NULL,                 -- Número en formato E.164
  tipo          TEXT NOT NULL DEFAULT 'freeform', -- 'template' | 'freeform'
  pedido_numero TEXT,                          -- Número de pedido relacionado (si aplica)
  estado        TEXT NOT NULL DEFAULT 'sent',  -- sent | delivered | read | failed | undelivered
  error_code    TEXT,                          -- Código de error Twilio (ej: 63016)
  enviado_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wdelivery_sid      ON whatsapp_delivery_log(message_sid);
CREATE INDEX IF NOT EXISTS idx_wdelivery_pedido   ON whatsapp_delivery_log(pedido_numero);
CREATE INDEX IF NOT EXISTS idx_wdelivery_estado   ON whatsapp_delivery_log(estado);
CREATE INDEX IF NOT EXISTS idx_wdelivery_enviado  ON whatsapp_delivery_log(enviado_at DESC);
CREATE INDEX IF NOT EXISTS idx_wdelivery_destino  ON whatsapp_delivery_log(destinatario);
