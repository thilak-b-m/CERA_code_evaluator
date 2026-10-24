import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

const AppContext = createContext({
  notify: () => {},
  toast: '',
  toastType: 'success',
});

export function AppProvider({ children }) {
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');

  /* =========================
     TOAST
  ========================= */

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast('');
    }, toastType === 'error' ? 7000 : 2800);

    return () => clearTimeout(timer);
  }, [toast, toastType]);

  /* =========================
     NOTIFICATION
  ========================= */

  const notify = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
  };

  /* =========================
     PROVIDER
  ========================= */

  return (
    <AppContext.Provider
      value={{
        notify,
        toast,
        toastType,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () =>
  useContext(AppContext);
