import SessionService from './sessionService.js';
import TwilioService from './twilioService.js';
import OrderService from './orderService.js';
import { supabase } from '../config/database.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

class ReliabilityWatchdogService {
  constructor() {
    this.started = false;
    this.lastStatus = null;
    this.lastNotificationAt = 0;
    this.cooldownMs = 5 * 60 * 1000;
  }

  async collectStatus() {
    const sessionMetrics = SessionService.getOperationalMetrics();
    const twilioMetrics = TwilioService.getOperationalMetrics();
    const emergencyMetrics = OrderService.getOperationalMetrics();

    let dbProbe = { ok: true, latencyMs: null, error: null };
    try {
      const started = Date.now();
      const { error } = await supabase.from('productos').select('id').limit(1);
      dbProbe.latencyMs = Date.now() - started;
      if (error) {
        dbProbe.ok = false;
        dbProbe.error = error.message || 'Error desconocido en BD';
      }
    } catch (error) {
      dbProbe = { ok: false, latencyMs: null, error: error.message };
    }

    const redisDegraded = config.isProduction && !sessionMetrics.sessions.redisConnected;
    const pendingAdminNotifications = twilioMetrics.queue.adminPendientes || 0;
    const staleAdminQueue = pendingAdminNotifications > 0 && (twilioMetrics.queue.oldestPendingMs || 0) > 5 * 60 * 1000;
    const dbDegraded = !dbProbe.ok;

    const status = (redisDegraded || staleAdminQueue || dbDegraded) ? 'degraded' : 'ok';

    return {
      status,
      redisDegraded,
      staleAdminQueue,
      dbDegraded,
      pendingAdminNotifications,
      sessionMetrics,
      twilioMetrics,
      emergencyMetrics,
      dbProbe
    };
  }

  buildAlertMessage(snapshot, recovered = false) {
    if (recovered) {
      return `✅ *RECUPERACIÓN DEL SISTEMA*\n\n` +
        `Todos los indicadores críticos volvieron a estado OK.\n\n` +
        `• Redis: ${snapshot.redisDegraded ? 'DEGRADADO' : 'OK'}\n` +
        `• Base de datos: ${snapshot.dbDegraded ? 'DEGRADADO' : 'OK'}\n` +
        `• Cola admin estancada: ${snapshot.staleAdminQueue ? 'SÍ' : 'NO'}`;
    }

    let msg = `🚨 *ALERTA DE CONFIABILIDAD*\n\n`;
    msg += `Estado actual: *DEGRADED*\n\n`;
    msg += `• Redis degradado: ${snapshot.redisDegraded ? 'SÍ' : 'NO'}\n`;
    msg += `• BD degradada: ${snapshot.dbDegraded ? 'SÍ' : 'NO'}\n`;
    msg += `• Cola admin estancada: ${snapshot.staleAdminQueue ? 'SÍ' : 'NO'}\n`;
    msg += `• Pendientes admin: ${snapshot.pendingAdminNotifications}\n`;

    if (snapshot.dbProbe?.error) {
      msg += `\nError BD: ${snapshot.dbProbe.error}`;
    }

    return msg;
  }

  async checkAndNotify() {
    try {
      const snapshot = await this.collectStatus();

      if (!this.lastStatus) {
        this.lastStatus = snapshot.status;
        return;
      }

      if (snapshot.status === this.lastStatus) {
        return;
      }

      const now = Date.now();
      if (now - this.lastNotificationAt < this.cooldownMs) {
        this.lastStatus = snapshot.status;
        return;
      }

      const recovered = this.lastStatus === 'degraded' && snapshot.status === 'ok';
      const message = this.buildAlertMessage(snapshot, recovered);

      const result = await TwilioService.enviarMensajeAdmin(message);
      if (result.success) {
        this.lastNotificationAt = now;
      }

      this.lastStatus = snapshot.status;
    } catch (error) {
      logger.error('Error en reliability watchdog:', error);
    }
  }

  start() {
    if (this.started) return;

    setInterval(async () => {
      await this.checkAndNotify();
    }, 60000);

    this.started = true;
    logger.info('🛡️ Reliability Watchdog ACTIVADO (verificación cada 60s)');
  }
}

export default new ReliabilityWatchdogService();
