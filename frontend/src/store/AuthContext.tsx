import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    isAdmin: false,
    adminName: null,
    isBootstrapping: true
  });

  const refreshMe = async () => {
    try {
      const data = await auth.me();
      setAuthState({
        isAdmin: data.isAdmin,
        adminName: data.adminName || null,
        isBootstrapping: false
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        isAdmin: false,
        adminName: null,
        isBootstrapping: false
      });
    }
  };

  const login = async (username, password) => {
    const data = await auth.login(username, password);
    setAuthState({
      isAdmin: data.isAdmin,
      adminName: data.adminName,
      isBootstrapping: false
    });
  };

  const signup = async (username, password, accessCode) => {
    const data = await auth.signup(username, password, accessCode);
    setAuthState({
      isAdmin: data.isAdmin,
      adminName: data.adminName,
      isBootstrapping: false
    });
  };

  const logout = async () => {
    await auth.logout();
    setAuthState({
      isAdmin: false,
      adminName: null,
      isBootstrapping: false
    });
  };

  useEffect(() => {
    refreshMe();
  }, []);

  return (
    <AuthContext.Provider value={{ auth: authState, refreshMe, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
