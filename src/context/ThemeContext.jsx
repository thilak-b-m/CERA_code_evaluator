import { createContext, useContext, useEffect, useState } from 'react';
const ThemeContext = createContext(null);
export function ThemeProvider({ children }) { const [theme, setTheme] = useState(() => localStorage.getItem('cera-theme') || 'dark'); useEffect(() => { document.documentElement.classList.toggle('light', theme === 'light'); localStorage.setItem('cera-theme', theme); }, [theme]); return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>; }
export const useThemeContext = () => useContext(ThemeContext);