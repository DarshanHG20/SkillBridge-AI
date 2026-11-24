import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiClient from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState(null);

  const initAuth = async () => {
    const token = ApiClient.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await ApiClient.getMe();
      setUser(userData);
      setAuthError(null);
    } catch (err) {
      console.warn('Failed to restore user session:', err.message);
      ApiClient.clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setAuthError('Session expired. Please log in again.');
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setAuthPending(true);
    setAuthError(null);
    try {
      const res = await ApiClient.login({ email, password });
      setUser(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.detail || err.message || 'Login failed');
      throw err;
    } finally {
      setAuthPending(false);
    }
  };

  const register = async (email, password, full_name) => {
    setAuthPending(true);
    setAuthError(null);
    try {
      const res = await ApiClient.register({ email, password, full_name });
      setUser(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.detail || err.message || 'Registration failed');
      throw err;
    } finally {
      setAuthPending(false);
    }
  };

  const logout = () => {
    ApiClient.clearTokens();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const fresh = await ApiClient.getMe();
      setUser(fresh);
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  const value = {
    user,
    loading,
    authPending,
    authError,
    isAuthenticated: !!user,
    isAdmin: user ? ['admin', 'superadmin'].includes(user.role) : false,
    isInstructor: user ? ['instructor', 'admin', 'superadmin'].includes(user.role) : false,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
