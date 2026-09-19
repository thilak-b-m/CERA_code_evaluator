import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { currentUser } from '../data/studentMockData.js';

const AuthContext = createContext(null);

function getStoredUser() {
  try {
    const localUser = localStorage.getItem('cera-user');
    if (localUser) {
      return JSON.parse(localUser);
    }
  } catch (error) {
    console.error('Error reading stored user:', error);
  }

  return currentUser || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('cera-auth');
    const sessionSaved = sessionStorage.getItem('cera-auth');
    return saved === 'true' || sessionSaved === 'true' || Boolean(currentUser);
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('cera-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cera-user');
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('cera-auth', 'true');
    } else {
      localStorage.removeItem('cera-auth');
      sessionStorage.removeItem('cera-auth');
    }
  }, [isAuthenticated]);

  const signIn = (profile) => {
    setUser(profile);
    setIsAuthenticated(true);
  };

  const signOut = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('cera-user');
    localStorage.removeItem('cera-auth');
    sessionStorage.removeItem('cera-auth');
    sessionStorage.removeItem('cera-user-email');
  };

  const login = (profile) => {
    signIn(profile);
  };

  const logout = () => {
    signOut();
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...(prev || currentUser || {}), ...updatedData }));
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      signIn,
      signOut,
      login,
      logout,
      updateUser,
    }),
    [user, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => useContext(AuthContext);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}