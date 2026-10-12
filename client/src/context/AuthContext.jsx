import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../services/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => logout()).finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener('pw:unauthorized', logout);
    return () => window.removeEventListener('pw:unauthorized', logout);
  }, [logout]);

  const authenticate = async (path, payload) => {
    const { data } = await api.post(path, payload);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  };

  const value = useMemo(
    () => ({
      user, loading, logout, setUser,
      isAdmin: user?.role === 'admin',
      login: (email, password) => authenticate('/auth/login', { email, password }),
      adminLogin: (email, password) => authenticate('/auth/admin/login', { email, password }),
      register: (payload) => authenticate('/auth/register', payload),
    }),
    [user, loading, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
