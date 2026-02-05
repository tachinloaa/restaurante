import { Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Breadcrumb o título */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Bienvenido
          </h2>
          <p className="text-sm text-gray-600">
            Gestiona los pedidos de tu restaurante
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-4">
          {/* Notificaciones */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
          </button>

          {/* Usuario */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">
                {user?.email?.split('@')[0] || 'Administrador'}
              </p>
              <p className="text-xs text-gray-500">{user?.email || 'admin@elrinconcito.com'}</p>
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
          </div>

          {/* Cerrar sesión */}
          <button
            onClick={signOut}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
            title="Cerrar sesión"
          >
            <LogOut size={20} className="text-gray-600 group-hover:text-red-600" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
