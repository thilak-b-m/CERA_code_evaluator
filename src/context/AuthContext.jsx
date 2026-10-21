import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

function getStoredSession() {
  try {
    const stored = localStorage.getItem('cera-session') || sessionStorage.getItem('cera-session');
    const session = stored ? JSON.parse(stored) : null;
    if (!session?.user || typeof session.token !== 'string') {
      return { user: null, token: null };
    }

    const payload = JSON.parse(atob(session.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!Number.isInteger(payload.exp) || payload.exp <= Date.now() / 1000) {
      return { user: null, token: null };
    }
    return session;
  } catch (error) {
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
    const result = await authService.signIn(credentials, remember);
    signIn(result.user, result.token, remember);
    return result;
  };

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
    const nextSession = {
      user: { ...(user || {}), ...updatedData },
      token,
    };
    setSession(nextSession);
    const storage = localStorage.getItem('cera-session') ? localStorage : sessionStorage;
    storage.setItem('cera-session', JSON.stringify(nextSession));
  };

  const value = useMemo(
    () => ({ user, token, isAuthenticated, signIn, signOut, login, logout, updateUser }),
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