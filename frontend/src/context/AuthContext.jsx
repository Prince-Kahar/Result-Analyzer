import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('vnsgu_user_data');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (_) {}
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    if (res.success && res.token) {
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('vnsgu_user_data', JSON.stringify(res.user));
    }
    return res;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success && res.token) {
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('vnsgu_user_data', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = () => {
    removeAuthToken();
    localStorage.removeItem('vnsgu_user_data');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
