import { supabase } from '../config/database.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

class WebhookDedupService {
  async isDuplicateOrRegister(messageSid, from, body = '') {
    if (!messageSid) {
      return { duplicate: false, reason: 'no-message-sid' };
    }

    try {
      const { data: existing, error: findError } = await supabase
        .from('webhook_message_dedup')
        .select('id')
        .eq('message_sid', messageSid)
        .maybeSingle();

      if (findError) {
        logger.error('Error consultando deduplicacion webhook:', findError);
      }

      if (existing?.id) {
        return { duplicate: true, reason: 'already-processed' };
      }

      const bodyHash = crypto.createHash('sha256').update(String(body || '')).digest('hex');

      const { error: insertError } = await supabase
        .from('webhook_message_dedup')
        .insert({
          message_sid: messageSid,
          from_phone: from || null,
          body_hash: bodyHash
        });

      if (insertError) {
        // Si existe conflicto unico, se considera duplicado.
        if (insertError.code === '23505') {
          return { duplicate: true, reason: 'unique-conflict' };
        }
        logger.error('Error insertando deduplicacion webhook:', insertError);
      }

      return { duplicate: false, reason: 'registered' };
    } catch (error) {
      logger.error('Error en deduplicacion webhook:', error);
      // Fail-open para no bloquear mensajes por un problema de la capa de dedup.
      return { duplicate: false, reason: 'dedup-service-error' };
    }
  }
}

export default new WebhookDedupService();
