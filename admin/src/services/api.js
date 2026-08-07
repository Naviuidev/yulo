import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/yulo/backend/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('yulo_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Use real PUT/PATCH/DELETE — MilesWeb LiteSpeed blocks X-HTTP-Method-Override (403).
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Request failed';

    if (status === 401) {
      localStorage.removeItem('yulo_admin_token');
      localStorage.removeItem('yulo_admin_refresh');
      localStorage.removeItem('yulo_admin_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (status !== 422 && status !== 409) {
      // 409 handled by the calling page (e.g. category delete with linked products)
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export const extractData = (response) => response.data?.data ?? response.data;
export const extractPaginated = (response) => ({
  items: response.data?.data ?? [],
  pagination: response.data?.pagination ?? {},
});

export default api;
