import axios from 'axios';
import { API_URL } from '../utils/constants';

/**
 * Servicio de autenticación JWT
 */
class AuthService {
  constructor() {
    this.tokenKey = 'auth_token';
    this.userKey = 'auth_user';
  }

  /**
   * Login con email y password
   */
  async login(email, password) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { token, user } = response.data;

      // Guardar token y usuario en localStorage
      this.setToken(token);
      this.setUser(user);

      return { success: true, token, user };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Error al iniciar sesión';
      return { success: false, error: message };
    }
  }

  /**
   * Logout
   */
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  /**
   * Obtener token almacenado
   */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Guardar token
   */
  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Obtener usuario almacenado
   */
  getUser() {
    const userStr = localStorage.getItem(this.userKey);
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Guardar usuario
   */
  setUser(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Verificar si está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Verificar si el token es válido (solo revisa si existe y no está expirado)
   */
  isTokenValid() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Decodificar JWT (sin verificar firma, solo para leer exp)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      // Verificar si expiró
      return payload.exp > now;
    } catch {
      return false;
    }
  }
}

export default new AuthService();
