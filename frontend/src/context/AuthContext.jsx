import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);

  // Configuración de inactividad: 5 minutos (300000 ms)
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos
  const WARNING_BEFORE_LOGOUT = 30 * 1000; // 30 segundos antes de cerrar sesión
  
  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Función de logout (usando useCallback para evitar recreación)
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Sesión cerrada');
    } catch (error) {
      toast.error(error.message || 'Error al cerrar sesión');
    }
  }, []);

  // Sistema de detección de inactividad
  useEffect(() => {
    if (!user) return; // Solo activar si hay usuario logueado

    let inactivityTimer = null;
    let warningTimer = null;

    const resetInactivityTimer = () => {
      // Limpiar timers existentes
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (warningTimer) clearTimeout(warningTimer);
      setShowInactivityWarning(false);

      // Timer de advertencia (30 segundos antes del logout)
      warningTimer = setTimeout(() => {
        setShowInactivityWarning(true);
        toast.error('Tu sesión expirará en 30 segundos por inactividad', {
          duration: 30000,
          icon: '⏰',
        });
      }, INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT);

      // Timer de logout automático
      inactivityTimer = setTimeout(() => {
        toast.error('Sesión cerrada por inactividad', {
          icon: '🔒',
        });
        signOut();
      }, INACTIVITY_TIMEOUT);
    };

    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Agregar listeners para todos los eventos
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Iniciar el timer al montar
    resetInactivityTimer();

    // Cleanup: remover listeners y limpiar timers
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (warningTimer) clearTimeout(warningTimer);
    };
  }, [user, signOut, INACTIVITY_TIMEOUT, WARNING_BEFORE_LOGOUT]);

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('¡Bienvenido de vuelta!');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message || 'Error al iniciar sesión');
      return { data: null, error };
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;

      toast.success('Cuenta creada exitosamente');
      return { data, error: null };
    } catch (error) {
      toast.error(error.message || 'Error al crear cuenta');
      return { data: null, error };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Revisa tu correo para restablecer tu contraseña');
      return { error: null };
    } catch (error) {
      toast.error(error.message || 'Error al enviar correo');
      return { error };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
