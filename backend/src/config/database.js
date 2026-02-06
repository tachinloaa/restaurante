import { createClient } from '@supabase/supabase-js';
import config from './environment.js';
import logger from '../utils/logger.js';

/**
 * Cliente de Supabase configurado
 */
export const supabase = createClient(config.supabase.url, config.supabase.key, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  }
});

/**
 * Verificar conexión a Supabase
 */
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('count')
      .limit(1);

    if (error) throw error;

    logger.info('✅ Conexión exitosa a Supabase');
    return true;
  } catch (error) {
    logger.error('❌ Error al conectar con Supabase:', error.message);
    return false;
  }
};

export default supabase;
