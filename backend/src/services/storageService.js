import { supabase } from '../config/database.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

const BUCKET_NAME = 'comprobantes';

/**
 * Servicio para subir comprobantes a Supabase Storage
 * Descarga la imagen de Twilio (con auth) y la sube a un bucket público
 */
class StorageService {
  static bucketReady = false;

  /**
   * Asegurar que el bucket existe (se ejecuta una sola vez)
   */
  static async initBucket() {
    if (this.bucketReady) return;
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const existe = buckets?.some(b => b.name === BUCKET_NAME);
      if (!existe) {
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024 // 10MB
        });
        if (error) {
          logger.error(`❌ Error creando bucket ${BUCKET_NAME}:`, error.message);
          return;
        }
        logger.info(`✅ Bucket '${BUCKET_NAME}' creado`);
      }
      this.bucketReady = true;
    } catch (err) {
      logger.error('❌ Error inicializando bucket:', err.message);
    }
  }

  /**
   * Descargar imagen de Twilio y subirla a Supabase Storage
   * @returns {string|null} URL pública de la imagen, o null si falla
   */
  static async subirComprobanteDesdeTwilio(twilioMediaUrl, telefono) {
    try {
      await this.initBucket();

      // Descargar imagen de Twilio con autenticación
      const authHeader = 'Basic ' + Buffer.from(
        `${config.twilio.accountSid}:${config.twilio.authToken}`
      ).toString('base64');

      logger.info(`📥 Descargando imagen de Twilio: ${twilioMediaUrl}`);

      const response = await fetch(twilioMediaUrl, {
        headers: { 'Authorization': authHeader },
        redirect: 'follow'
      });

      if (!response.ok) {
        logger.error(`❌ Twilio respondió ${response.status} al descargar imagen`);
        return null;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await response.arrayBuffer());

      // Nombre único: telefono_timestamp.ext
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const telefonoLimpio = telefono.replace(/[^0-9]/g, '');
      const fileName = `${telefonoLimpio}_${Date.now()}.${ext}`;

      logger.info(`📤 Subiendo comprobante a Supabase Storage: ${fileName} (${buffer.length} bytes)`);

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, buffer, {
          contentType,
          upsert: true
        });

      if (error) {
        logger.error(`❌ Error subiendo a Storage:`, error.message);
        return null;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl;
      logger.info(`✅ Comprobante subido: ${publicUrl}`);

      return publicUrl;
    } catch (err) {
      logger.error('❌ Error en subirComprobanteDesdeTwilio:', err.message);
      return null;
    }
  }
}

export default StorageService;
