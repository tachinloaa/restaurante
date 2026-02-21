import { createContext, useContext, useState, useEffect } from 'react';

/**
 * Contexto para el manejo del tema (claro/oscuro)
 * Proporciona el estado del tema y funciones para cambiarlo
 */
const ThemeContext = createContext();

/**
 * Hook personalizado para acceder al contexto del tema
 * @returns {Object} Objeto con isDark y toggleTheme
 * @throws {Error} Si se usa fuera del ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
};

/**
 * Proveedor del contexto de tema
 * Gestiona el estado del tema y persiste la preferencia en localStorage
 * 
 * @param {Object} props - Props del componente
 * @param {React.ReactNode} props.children - Componentes hijos
 * @returns {JSX.Element} Proveedor del contexto
 */
export const ThemeProvider = ({ children }) => {
  // Estado del tema: true = oscuro, false = claro
  const [isDark, setIsDark] = useState(() => {
    // Intentar recuperar preferencia guardada
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Si no hay preferencia, usar la del sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  /**
   * Efecto para aplicar la clase 'dark' al HTML y guardar preferencia
   */
  useEffect(() => {
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  /**
   * Alterna entre tema claro y oscuro
   */
  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const value = {
    isDark,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
