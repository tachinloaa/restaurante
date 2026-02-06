/**
 * Componente Header - Barra superior de navegación
 * 
 * Muestra:
 * - Botón de menú hamburguesa (solo móviles)
 * - Título de bienvenida
 * - Notificaciones
 * - Perfil de usuario
 * - Toggle de tema claro/oscuro
 * - Botón de cerrar sesión
 * 
 * @param {Object} props
 * @param {Function} props.onMenuClick - Callback al hacer clic en el menú
 */
import { Bell, User, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationPanel from '../Notifications/NotificationPanel';

function Header({ onMenuClick }) {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { unreadCount, togglePanel } = useNotifications();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
      <div className="px-3 lg:px-6 py-3 lg:py-4 flex items-center justify-between">
        {/* Menú hamburguesa + Título */}
        <div className="flex items-center gap-3">
          {/* Botón menú solo en móvil */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
          
          <div>
            <h2 className="text-lg lg:text-xl font-semibold text-gray-800 dark:text-gray-100">
              Bienvenido
            </h2>
            <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
              Gestiona los pedidos de tu restaurante
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Toggle Dark Mode */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDark ? (
              <Sun size={20} className="text-yellow-500" />
            ) : (
              <Moon size={20} className="text-gray-600" />
            )}
          </button>

          {/* Notificaciones */}
          <button
            onClick={togglePanel}
            className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Notificaciones"
          >
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* Panel de notificaciones */}
          <NotificationPanel />

          {/* Usuario - Ocultar detalles en móvil */}
          <div className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-4 border-l border-gray-200 dark:border-gray-700">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {user?.email?.split('@')[0] || 'Administrador'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email || 'admin@elrinconcito.com'}
              </p>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary rounded-full flex items-center justify-center">
              <User size={16} className="lg:w-5 lg:h-5 text-white" />
            </div>
          </div>

          {/* Cerrar sesión */}
          <button
            onClick={signOut}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={20} className="text-gray-600 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
