import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

const AppContext = createContext({
  notify: () => {},
  toast: '',
});

export function AppProvider({ children }) {
  const [toast, setToast] = useState('');

  /* =========================
     TOAST
  ========================= */

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast('');
    }, 2800);

    return () => clearTimeout(timer);
  }, [toast]);

  /* =========================
     NOTIFICATION
  ========================= */

  const notify = (message) => {
    setToast(message);
  };

  /* =========================
     PROVIDER
  ========================= */

  return (
    <AppContext.Provider
      value={{
        notify,
        toast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () =>
  useContext(AppContext);
