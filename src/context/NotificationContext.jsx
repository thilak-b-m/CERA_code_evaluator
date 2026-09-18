import { createContext, useCallback, useContext, useState } from 'react';
const NotificationContext = createContext(null);
export function NotificationProvider({ children }) { const [message, setMessage] = useState(''); const notify = useCallback(value => setMessage(value), []); return <NotificationContext.Provider value={{ message, notify, clear: () => setMessage('') }}>{children}</NotificationContext.Provider>; }
export const useNotificationContext = () => useContext(NotificationContext);