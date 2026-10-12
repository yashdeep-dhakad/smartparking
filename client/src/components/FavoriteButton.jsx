import { Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

// Favorites need an account. Guests are sent to log in and then returned here.
export default function FavoriteButton({ type, id }) {
  const { user } = useAuth();
  const fav = useFavorites();
  const nav = useNavigate();
  const loc = useLocation();
  const active = user && fav.has(type, id);

  const click = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return nav('/login', { state: { from: loc.pathname + loc.search, message: 'Log in to save favorites.' } });
    try { await fav.toggle(type, id); } catch { /* ignore */ }
  };
  return (
    <button className={`fav-btn ${active ? 'active' : ''}`} onClick={click} aria-pressed={!!active} aria-label={active ? 'Remove from favorites' : 'Save to favorites'}>
      <Heart size={18} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}
