import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/yulo/backend/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('yulo_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // LiteSpeed/shared hosts: send PUT/PATCH/DELETE as POST + override header
  const method = (config.method || 'get').toLowerCase();
  if (['put', 'patch', 'delete'].includes(method)) {
    config.headers['X-HTTP-Method-Override'] = method.toUpperCase();
    config.method = 'post';
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('yulo_refresh_token');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const tokens = data?.data?.tokens ?? data?.data;
          if (tokens?.access_token) {
            localStorage.setItem('yulo_access_token', tokens.access_token);
            if (tokens.refresh_token) {
              localStorage.setItem('yulo_refresh_token', tokens.refresh_token);
            }
            original.headers.Authorization = `Bearer ${tokens.access_token}`;
            return api(original);
          }
        } catch {
          localStorage.removeItem('yulo_access_token');
          localStorage.removeItem('yulo_refresh_token');
          localStorage.removeItem('yulo_user');
        }
      }
    }

    if (status === 403 && !error.response?.data?.data?.requires_otp) {
      toast.error(error.response?.data?.message || 'Access denied.');
    }

    return Promise.reject(error);
  }
);

export default api;
