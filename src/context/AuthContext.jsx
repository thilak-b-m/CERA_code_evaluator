import { createContext, useContext, useMemo, useState } from 'react';
const AuthContext = createContext(null);
export function AuthProvider({ children }) { const [user, setUser] = useState(null); const value = useMemo(() => ({ user, signIn: profile => setUser(profile), signOut: () => setUser(null) }), [user]); return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>; }
export const useAuthContext = () => useContext(AuthContext);