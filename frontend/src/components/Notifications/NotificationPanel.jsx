/**
 * Componente NotificationPanel - Panel desplegable de notificaciones
 * 
 * Muestra:
 * - Lista de notificaciones recientes
 * - Estados: leídas/no leídas
 * - Acciones: marcar como leída, eliminar
 * - Botón para marcar todas como leídas
 * - Indicador de sin notificaciones
 * 
 * Características:
 * - Scroll independiente
 * - Animación de entrada/salida
 * - Dark mode completo
 * - Responsive
 */
import { X, Check, Trash2, CheckCheck, Bell } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { formatearFecha } from '../../utils/helpers';

function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    loading,
    isOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    closePanel
  } = useNotifications();

  if (!isOpen) return null;

  /**
   * Obtiene el color según el tipo de notificación
   */
  const getNotificationColor = (tipo) => {
    const colors = {
      nuevo_pedido: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      pedido_actualizado: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      pedido_completado: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      pedido_cancelado: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      cliente_nuevo: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
      sistema: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      alerta: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
    };
    
    return colors[tipo] || colors.sistema;
  };

  /**
   * Obtiene el icono según el tipo
   */
  const getNotificationIcon = (tipo) => {
    const icons = {
      nuevo_pedido: '🛒',
      pedido_actualizado: '📦',
      pedido_completado: '✅',
      pedido_cancelado: '❌',
      cliente_nuevo: '👤',
      sistema: 'ℹ️',
      alerta: '⚠️'
    };
    
    return icons[tipo] || '🔔';
  };

  /**
   * Maneja el clic en una notificación
   */
  const handleNotificationClick = async (notif) => {
    if (!notif.leida) {
      await markAsRead(notif.id);
    }
    
    // Aquí puedes agregar navegación según el tipo de notificación
    // Por ejemplo: si es nuevo_pedido, navegar a /orders
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-40"
        onClick={closePanel}
        aria-hidden="true"
      />
      
      {/* Panel de notificaciones */}
      <div className="fixed top-16 right-4 z-50 w-full max-w-sm sm:max-w-md animate-in slide-in-from-top-2 duration-200">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header del panel */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-gray-600 dark:text-gray-400" />
                <h3 className="font-bold text-gray-900 dark:text-gray-100">
                  Notificaciones
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Marcar todas como leídas */}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Marcar todas como leídas"
                    aria-label="Marcar todas como leídas"
                  >
                    <CheckCheck size={16} className="text-gray-600 dark:text-gray-400" />
                  </button>
                )}
                
                {/* Cerrar */}
                <button
                  onClick={closePanel}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label="Cerrar panel"
                >
                  <X size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto text-gray-400 dark:text-gray-600 mb-2" size={40} />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No tienes notificaciones
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 transition-colors cursor-pointer ${
                      notif.leida 
                        ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750' 
                        : 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex gap-3">
                      {/* Icono de tipo */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(notif.tipo)}`}>
                        <span className="text-lg">{getNotificationIcon(notif.tipo)}</span>
                      </div>
                      
                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notif.leida ? 'font-normal text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-gray-100'}`}>
                          {notif.mensaje}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatearFecha(notif.created_at)}
                        </p>
                      </div>
                      
                      {/* Acciones */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {!notif.leida && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                            }}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Marcar como leída"
                            aria-label="Marcar como leída"
                          >
                            <Check size={14} className="text-green-600 dark:text-green-400" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Eliminar"
                          aria-label="Eliminar notificación"
                        >
                          <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default NotificationPanel;
