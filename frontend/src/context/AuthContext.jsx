import { useEffect, useState } from 'react';
import { authService } from '../services/auth';
import { setToken, getToken } from '../services/api';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!getToken()) {
        if (!cancelled) setInitializing(false);
        return;
      }
      try {
        const me = await authService.me();
        if (!cancelled) setUser(me);
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (data) => {
    const res = await authService.register(data);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, initializing, login, register, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}