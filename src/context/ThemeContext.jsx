import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useApp } from './AppContext.jsx';
import { authService } from '../services/authService.js';

const ThemeContext = createContext(null);

function readTheme(accountKey) {
  const savedTheme = localStorage.getItem(`cera-theme:${accountKey}`);
  return savedTheme === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const { user, token } = useAuth();
  const { notify } = useApp();
  const accountKey = user?.id || user?.email || 'guest';
  const preferenceVersion = useRef(0);
  const saveQueue = useRef(Promise.resolve());
  const [preference, setPreference] = useState(() => ({
    accountKey,
    theme: readTheme(accountKey),
  }));
  const theme = preference.accountKey === accountKey
    ? preference.theme
    : readTheme(accountKey);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem(`cera-theme:${accountKey}`, theme);
  }, [accountKey, theme]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    const version = preferenceVersion.current;
    authService.getThemePreference(token)
      .then(({ theme: savedTheme }) => {
        if (
          cancelled
          || preferenceVersion.current !== version
          || !['light', 'dark'].includes(savedTheme)
        ) return;
        setPreference({ accountKey, theme: savedTheme });
        localStorage.setItem(`cera-theme:${accountKey}`, savedTheme);
      })
      .catch((error) => {
        if (!cancelled) console.error('Unable to load the account theme preference:', error);
      });
    return () => { cancelled = true; };
  }, [accountKey, token]);

  const updateTheme = (nextTheme) => {
    if (!['light', 'dark'].includes(nextTheme)) {
      throw new Error('Theme must be either light or dark.');
    }
    preferenceVersion.current += 1;
    setPreference({ accountKey, theme: nextTheme });
    localStorage.setItem(`cera-theme:${accountKey}`, nextTheme);
    if (token) {
      saveQueue.current = saveQueue.current
        .then(() => authService.updateThemePreference(nextTheme, token))
        .catch((error) => {
          console.error('Unable to save the account theme preference:', error);
          notify('Theme changed on this device, but could not be saved to your account.');
        });
    }
  };
  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const toggleMobileSidebar = () => setMobileSidebarOpen((prev) => !prev);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  const value = useMemo(
    () => ({
      theme,
      setTheme: updateTheme,
      sidebarCollapsed,
      mobileSidebarOpen,
      toggleSidebar,
      toggleMobileSidebar,
      closeMobileSidebar,
    }),
    [theme, accountKey, token, notify, sidebarCollapsed, mobileSidebarOpen]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useThemeContext = () => useContext(ThemeContext);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}