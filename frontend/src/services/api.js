import axios from 'axios';
import { API_URL } from '../utils/constants';

/**
 * Cliente de Axios configurado
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos para consultas complejas
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Aquí se puede agregar autenticación si es necesario
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'Error en la petición';
    return Promise.reject(new Error(message));
  }
);

export default api;
