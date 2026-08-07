import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { authService, storeTokens, clearTokens, storeUser, getStoredUser } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('yulo_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authService.me();
      const userData = res.data?.data ?? res.data?.user;
      setUser(userData);
      storeUser(userData);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    const payload = res.data?.data ?? res.data;
    storeTokens(payload.tokens);
    setUser(payload.user);
    storeUser(payload.user);
    toast.success('Welcome back!');
    return payload;
  };

  const register = async (data) => {
    const res = await authService.register(data);
    const payload = res.data?.data ?? res.data;

    // OTP required — do not log in yet
    if (payload?.requires_otp) {
      return payload;
    }

    if (payload?.tokens) {
      storeTokens(payload.tokens);
      setUser(payload.user);
      storeUser(payload.user);
      toast.success('Account created successfully!');
    }

    return payload;
  };

  const completeOtpLogin = async ({ email, otp }) => {
    const res = await authService.verifyOtp({ email, otp });
    const payload = res.data?.data ?? res.data;
    storeTokens(payload.tokens);
    setUser(payload.user);
    storeUser(payload.user);
    return payload;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      /* ignore */
    }
    clearTokens();
    setUser(null);
    toast.info('Logged out.');
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      completeOtpLogin,
      logout,
      refreshUser: fetchUser,
    }),
    [user, loading, fetchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
