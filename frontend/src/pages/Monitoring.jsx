import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Siren, Timer, WifiOff } from 'lucide-react';
import Card from '../components/Common/Card';
import monitoringService from '../services/monitoringService';

const POLL_INTERVAL_MS = 10000;

function semaforoConfig(estado) {
  if (estado === 'ok') {
    return {
      label: 'VERDE',
      badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      dotClass: 'bg-green-500'
    };
  }

  if (estado === 'degraded') {
    return {
      label: 'AMARILLO',
      badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
      dotClass: 'bg-yellow-500'
    };
  }

  return {
    label: 'ROJO',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    dotClass: 'bg-red-500'
  };
}

function formatearDuracion(ms = 0) {
  if (!ms || ms < 0) return '0s';

  const totalSeg = Math.floor(ms / 1000);
  const minutos = Math.floor(totalSeg / 60);
  const segundos = totalSeg % 60;

  if (minutos === 0) return `${segundos}s`;
  return `${minutos}m ${segundos}s`;
}

function Kpi({ title, value, subtitle, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'text-gray-900 dark:text-gray-100',
    good: 'text-green-700 dark:text-green-300',
    warn: 'text-yellow-700 dark:text-yellow-300',
    bad: 'text-red-700 dark:text-red-300'
  }[tone];

  return (
    <Card>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-2xl font-bold mt-2 ${toneClass}`}>{value}</p>
      {subtitle ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p> : null}
    </Card>
  );
}

function Monitoring() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState('');

  const cargar = async () => {
    try {
      const response = await monitoringService.getOpsHealth();
      if (response?.success) {
        setData(response.data);
        setError('');
        setLastUpdate(new Date());
      } else {
        setError('No se pudo obtener métricas operativas');
      }
    } catch (err) {
      setError(err.message || 'Error consultando monitoreo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const estado = data?.status || (error ? 'down' : 'ok');
  const semaforo = useMemo(() => semaforoConfig(estado), [estado]);

  const sessions = data?.metrics?.sessions || {};
  const queue = data?.metrics?.queue || {};
  const emergency = data?.metrics?.emergencyOrders || {};
  const alerts = data?.alerts || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 font-display">Monitoreo Operativo</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Actualización automática cada 10 segundos. Endpoint: /api/health/ops
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold ${semaforo.badgeClass}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${semaforo.dotClass}`} />
            Semáforo {semaforo.label}
          </span>

          <button
            onClick={cargar}
            className="btn btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {error ? (
        <Card className="border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
            <WifiOff size={18} />
            <p className="font-medium">No se pudo consultar el estado operativo: {error}</p>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          title="Notificaciones pendientes"
          value={queue.total ?? 0}
          subtitle={`Admin: ${queue.adminPendientes ?? 0} | Cliente: ${queue.clientePendientes ?? 0}`}
          tone={(queue.total ?? 0) === 0 ? 'good' : (queue.total ?? 0) < 5 ? 'warn' : 'bad'}
        />

        <Kpi
          title="Cola pedidos emergencia"
          value={emergency.totalPendientes ?? 0}
          subtitle={`Máx intentos: ${emergency.maxIntentos ?? 0}`}
          tone={(emergency.totalPendientes ?? 0) === 0 ? 'good' : 'bad'}
        />

        <Kpi
          title="Sesiones activas"
          value={sessions.activas ?? 0}
          subtitle={`Total: ${sessions.total ?? 0}`}
          tone="neutral"
        />

        <Kpi
          title="Redis"
          value={sessions.redisConnected ? 'Conectado' : 'Desconectado'}
          subtitle={`Backup local: ${sessions.localBackupExists ? 'Sí' : 'No'}`}
          tone={sessions.redisConnected ? 'good' : 'bad'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Siren size={18} className="text-red-600 dark:text-red-300" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Alertas críticas</h2>
          </div>

          <div className="space-y-2 text-sm">
            <p className={alerts.redisDegraded ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}>
              Redis degradado: {alerts.redisDegraded ? 'Sí' : 'No'}
            </p>
            <p className={alerts.staleAdminQueue ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}>
              Cola admin estancada: {alerts.staleAdminQueue ? 'Sí' : 'No'}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Pendientes de admin: {alerts.pendingAdminNotifications ?? 0}
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Timer size={18} className="text-blue-600 dark:text-blue-300" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Latencia de colas</h2>
          </div>

          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p>Notificación más antigua: {formatearDuracion(queue.oldestPendingMs)}</p>
            <p>Pedido emergencia más antiguo: {formatearDuracion(emergency.oldestPendingMs)}</p>
            <p>Procesando notificaciones: {queue.processing ? 'Sí' : 'No'}</p>
            <p>Procesando emergencia: {emergency.processing ? 'Sí' : 'No'}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            {estado === 'ok' ? (
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-300" />
            ) : (
              <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-300" />
            )}
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Estado global: {estado.toUpperCase()}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Última actualización: {lastUpdate ? lastUpdate.toLocaleTimeString('es-MX') : 'N/A'}
          </p>
        </div>
      </Card>
    </div>
  );
}

export default Monitoring;
