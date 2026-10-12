import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const FavoritesContext = createContext(null);
export const useFavorites = () => useContext(FavoritesContext);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState({ attraction: new Set(), parking: new Set() });

  useEffect(() => {
    if (!user) { setIds({ attraction: new Set(), parking: new Set() }); return; }
    api.get('/favorites/ids').then((r) => setIds({ attraction: new Set(r.data.attractions), parking: new Set(r.data.parking) })).catch(() => {});
  }, [user]);

  const toggle = useCallback(async (type, id) => {
    const has = ids[type].has(id);
    if (has) await api.delete(`/favorites/${type}/${id}`); else await api.post('/favorites', { type, id });
    setIds((prev) => {
      const next = new Set(prev[type]);
      if (has) next.delete(id); else next.add(id);
      return { ...prev, [type]: next };
    });
  }, [ids]);

  const value = useMemo(() => ({ has: (type, id) => ids[type].has(id), toggle }), [ids, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
