/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = localStorage.getItem('lumora_token');
      if (!token) {
        setLoading(false);
        return;
      }
      api
        .get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('lumora_token'))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('lumora_token', data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      throw new Error(msg, { cause: err });
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem('lumora_token', data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      throw new Error(msg, { cause: err });
    }
  };

  const logout = () => {
    localStorage.removeItem('lumora_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
