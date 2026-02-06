/**
 * Componente MainLayout - Layout principal de la aplicación
 * 
 * Estructura:
 * - Sidebar lateral (colapsable en móviles)
 * - Header superior
 * - Área de contenido principal (Outlet de React Router)
 * 
 * Gestiona el estado de apertura/cierre del sidebar en móviles
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function MainLayout() {
  // Estado para controlar la visibilidad del sidebar en móviles
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /**
   * Alterna el estado del sidebar
   */
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  /**
   * Cierra el sidebar
   */
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar con estado de apertura */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      {/* Contenedor principal */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Header con botón de menú */}
        <Header onMenuClick={toggleSidebar} />
        
        {/* Área de contenido con scroll */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
