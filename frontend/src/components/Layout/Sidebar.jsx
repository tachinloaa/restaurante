import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FolderTree,
  Settings 
} from 'lucide-react';

function Sidebar() {
  const navLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/orders', icon: ShoppingCart, label: 'Pedidos' },
    { to: '/products', icon: Package, label: 'Productos' },
    { to: '/categories', icon: FolderTree, label: 'Categorías' },
    { to: '/customers', icon: Users, label: 'Clientes' },
    { to: '/settings', icon: Settings, label: 'Configuración' }
  ];

  return (
    <aside className="w-64 bg-white shadow-lg flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary font-display">
          🌮 El Rinconcito
        </h1>
        <p className="text-sm text-gray-500 mt-1">Sistema de Pedidos</p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-2">
        {navLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          v1.0.0 - {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
