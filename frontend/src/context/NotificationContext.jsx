/**
 * Contexto de Notificaciones - Gestión centralizada de notificaciones
 * 
 * Funcionalidades:
 * - Gestión de estado de notificaciones
 * - Polling periódico para nuevas notificaciones
 * - Marcar notificaciones como leídas
 * - Eliminar notificaciones
 * - Contador de notificaciones no leídas
 * - Notificaciones en tiempo real de nuevos pedidos
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const NotificationContext = createContext();

/**
 * Hook para acceder al contexto de notificaciones
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  }
  return context;
};

/**
 * Proveedor del contexto de notificaciones
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Carga las notificaciones del servidor
   */
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      
      if (response.data.success) {
        const notifs = response.data.data || [];
        setNotifications(notifs);
        
        // Contar no leídas
        const unread = notifs.filter(n => !n.leida).length;
        setUnreadCount(unread);
        
        // Mostrar toast para notificaciones muy recientes (últimos 30 segundos)
        const now = new Date();
        const recentNotifs = notifs.filter(n => {
          const notifDate = new Date(n.created_at);
          const diffSeconds = (now - notifDate) / 1000;
          return !n.leida && diffSeconds < 30;
        });
        
        if (recentNotifs.length > 0) {
          // Solo mostrar la más reciente
          const latest = recentNotifs[0];
          toast.success(latest.mensaje, {
            icon: getNotificationIcon(latest.tipo),
            duration: 4000
          });
        }
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Marca una notificación como leída
   */
  const markAsRead = async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, leida: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  };

  /**
   * Marca todas las notificaciones como leídas
   */
  const markAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/read-all');
      
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, leida: true }))
        );
        setUnreadCount(0);
        toast.success('Todas las notificaciones marcadas como leídas');
      }
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
      toast.error('Error al marcar notificaciones');
    }
  };

  /**
   * Elimina una notificación
   */
  const deleteNotification = async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      
      if (response.data.success) {
        const deletedNotif = notifications.find(n => n.id === notificationId);
        
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        if (deletedNotif && !deletedNotif.leida) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error eliminando notificación:', error);
      toast.error('Error al eliminar notificación');
    }
  };

  /**
   * Alterna la visibilidad del panel de notificaciones
   */
  const togglePanel = () => {
    setIsOpen(prev => !prev);
  };

  /**
   * Cierra el panel de notificaciones
   */
  const closePanel = () => {
    setIsOpen(false);
  };

  /**
   * Agrega una nueva notificación (para uso interno o pruebas)
   */
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.leida) {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    loadNotifications();
    
    // Polling cada 30 segundos para actualizar notificaciones
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    isOpen,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    togglePanel,
    closePanel,
    addNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Obtiene el icono apropiado según el tipo de notificación
 */
function getNotificationIcon(tipo) {
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
}

export default NotificationContext;
