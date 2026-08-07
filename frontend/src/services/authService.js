import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  verifyOtp: ({ email, otp }) => api.post('/auth/verify-email', { email, otp }),
  resendOtp: (email) => api.post('/auth/resend-otp', { email }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
};

export function storeTokens(tokens) {
  if (tokens?.access_token) localStorage.setItem('yulo_access_token', tokens.access_token);
  if (tokens?.refresh_token) localStorage.setItem('yulo_refresh_token', tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem('yulo_access_token');
  localStorage.removeItem('yulo_refresh_token');
  localStorage.removeItem('yulo_user');
}

export function storeUser(user) {
  if (user) localStorage.setItem('yulo_user', JSON.stringify(user));
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('yulo_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
