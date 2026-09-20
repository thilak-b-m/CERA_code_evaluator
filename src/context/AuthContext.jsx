import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

function getStoredSession() {
  try {
    const stored = localStorage.getItem('cera-session') || sessionStorage.getItem('cera-session');
    return stored ? JSON.parse(stored) : { user: null, token: null };
  } catch (error) {
    console.error('Error reading stored auth session:', error);
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());
  const { user, token } = session;
  const isAuthenticated = Boolean(user && token);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.removeItem('cera-session');
      sessionStorage.removeItem('cera-session');
    }
  }, [isAuthenticated]);

  const signIn = (profile, nextToken = 'session-token', remember = true) => {
    const nextSession = { user: profile, token: nextToken };
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;

    setSession(nextSession);
    storage.setItem('cera-session', JSON.stringify(nextSession));
    otherStorage.removeItem('cera-session');
  };

  const login = async (credentials, remember = true) => {
    const result = await authService.signIn(credentials);
    signIn(result.user, result.token, remember);
    return result;
  };

  const signup = async (details) => authService.signUp({ ...details, role: 'student' });

  const signOut = () => {
    setSession({ user: null, token: null });
    localStorage.removeItem('cera-session');
    sessionStorage.removeItem('cera-session');
    localStorage.removeItem('cera-auth');
    sessionStorage.removeItem('cera-auth');
    localStorage.removeItem('cera-user');
    sessionStorage.removeItem('cera-user');
    localStorage.removeItem('cera-user-email');
    sessionStorage.removeItem('cera-user-email');
  };

  const logout = async () => {
    await authService.signOut();
    signOut();
  };

  const updateUser = (updatedData) => {
    setSession((previous) => ({
      ...previous,
      user: { ...(previous.user || {}), ...updatedData },
    }));
  };

  const value = useMemo(
    () => ({ user, token, isAuthenticated, signIn, signOut, login, signup, logout, updateUser }),
    [user, token, isAuthenticated]
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