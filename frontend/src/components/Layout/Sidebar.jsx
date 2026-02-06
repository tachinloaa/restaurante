/**
 * Componente Sidebar - Menú lateral de navegación
 * 
 * Funcionalidades:
 * - Menú colapsable en móviles
 * - Navegación principal de la aplicación
 * - Overlay de fondo en móviles
 * - Soporte para dark mode
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Estado de apertura del sidebar
 * @param {Function} props.onClose - Callback para cerrar el sidebar
 */
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FolderTree,
  BarChart3,
  Settings,
  X
} from 'lucide-react';

function Sidebar({ isOpen, onClose }) {
  // Configuración de enlaces de navegación
  const navLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/orders', icon: ShoppingCart, label: 'Pedidos' },
    { to: '/products', icon: Package, label: 'Productos' },
    { to: '/categories', icon: FolderTree, label: 'Categorías' },
    { to: '/customers', icon: Users, label: 'Clientes' },
    { to: '/analytics', icon: BarChart3, label: 'Estadísticas' },
    { to: '/settings', icon: Settings, label: 'Configuración' }
  ];

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo y cabecera */}
        <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-primary font-display">
              🌮 El Rinconcito
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sistema de Pedidos
            </p>
          </div>
          {/* Botón cerrar solo en móvil */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-3 lg:p-4 space-y-1 lg:space-y-2 overflow-y-auto">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <Icon size={20} />
              <span className="font-medium text-sm lg:text-base">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 lg:p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            v1.0.0 - {new Date().getFullYear()}
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
