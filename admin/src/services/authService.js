import api, { extractData } from './api';
import { ADMIN_ROLES } from '../utils/constants';

const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const data = extractData(res);
    const { user, tokens } = data;

    if (!ADMIN_ROLES.includes(user?.role)) {
      throw new Error('Access denied. Admin credentials required.');
    }

    localStorage.setItem('yulo_admin_token', tokens.access_token);
    localStorage.setItem('yulo_admin_refresh', tokens.refresh_token);
    localStorage.setItem('yulo_admin_user', JSON.stringify(user));

    return { user, tokens };
  },

  logout: async () => {
    try {
      const refresh = localStorage.getItem('yulo_admin_refresh');
      await api.post('/auth/logout', { refresh_token: refresh });
    } catch {
      /* ignore */
    } finally {
      localStorage.removeItem('yulo_admin_token');
      localStorage.removeItem('yulo_admin_refresh');
      localStorage.removeItem('yulo_admin_user');
    }
  },

  me: async () => {
    const res = await api.get('/auth/me');
    return extractData(res);
  },

  getStoredUser: () => {
    try {
      return JSON.parse(localStorage.getItem('yulo_admin_user'));
    } catch {
      return null;
    }
  },

  isAuthenticated: () => !!localStorage.getItem('yulo_admin_token'),
};

export default authService;
