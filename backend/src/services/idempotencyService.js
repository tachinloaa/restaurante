import { supabase } from '../config/database.js';
import logger from '../utils/logger.js';

const IN_PROGRESS_STALE_MS = 30 * 1000;

class IdempotencyService {
  async begin(idempotencyKey) {
    if (!idempotencyKey) {
      return { ok: true, acquired: false, skipped: true };
    }

    try {
      const { data: existing, error: readError } = await supabase
        .from('order_idempotency_keys')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (readError) {
        logger.error('Error consultando idempotency key:', readError);
      }

      if (!existing) {
        const { error: insertError } = await supabase
          .from('order_idempotency_keys')
          .insert({
            idempotency_key: idempotencyKey,
            status: 'processing',
            updated_at: new Date().toISOString()
          });

        if (insertError && insertError.code !== '23505') {
          logger.error('Error creando idempotency key:', insertError);
          return { ok: false, error: insertError.message };
        }

        return { ok: true, acquired: true };
      }

      if (existing.status === 'completed' && existing.pedido_id) {
        return { ok: true, acquired: false, completed: true, pedidoId: existing.pedido_id, response: existing.response_json };
      }

      const updatedAt = new Date(existing.updated_at || existing.created_at || 0).getTime();
      const isStale = Date.now() - updatedAt > IN_PROGRESS_STALE_MS;

      if (existing.status === 'processing' && !isStale) {
        return { ok: true, acquired: false, inProgress: true };
      }

      const { error: updateError } = await supabase
        .from('order_idempotency_keys')
        .update({
          status: 'processing',
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('idempotency_key', idempotencyKey);

      if (updateError) {
        logger.error('Error refrescando idempotency key:', updateError);
        return { ok: false, error: updateError.message };
      }

      return { ok: true, acquired: true };
    } catch (error) {
      logger.error('Error en begin idempotency:', error);
      return { ok: false, error: error.message };
    }
  }

  async markCompleted(idempotencyKey, pedidoId, responseJson = null) {
    if (!idempotencyKey) return;

    const { error } = await supabase
      .from('order_idempotency_keys')
      .update({
        status: 'completed',
        pedido_id: pedidoId || null,
        response_json: responseJson || null,
        last_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('idempotency_key', idempotencyKey);

    if (error) {
      logger.error('Error marcando idempotencia completada:', error);
    }
  }

  async markFailed(idempotencyKey, errorText) {
    if (!idempotencyKey) return;

    const { error } = await supabase
      .from('order_idempotency_keys')
      .update({
        status: 'failed',
        last_error: errorText || 'Error desconocido',
        updated_at: new Date().toISOString()
      })
      .eq('idempotency_key', idempotencyKey);

    if (error) {
      logger.error('Error marcando idempotencia fallida:', error);
    }
  }
}

export default new IdempotencyService();
