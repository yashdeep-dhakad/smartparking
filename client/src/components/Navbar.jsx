import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="ParkWise home">
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0b4f3a" /><path d="M22 48V16h14a10 10 0 0 1 0 20H30" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="48" cy="46" r="5" fill="#38bdf8" /></svg>
      <span>ParkWise</span>
    </Link>
  );
}

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const close = () => setOpen(false);
  const doLogout = () => { logout(); close(); nav('/'); };

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Logo />
        <button className="nav-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
          <NavLink to="/cities" onClick={close}>Cities</NavLink>
          <NavLink to="/attractions" onClick={close}>Attractions</NavLink>
          <NavLink to="/parking" onClick={close}>Find parking</NavLink>
          {user && <NavLink to="/my-bookings" onClick={close}>My bookings</NavLink>}
          {user && <NavLink to="/check-in" onClick={close}>Check in</NavLink>}
          {user && <NavLink to="/favorites" onClick={close}>Favorites</NavLink>}
          {isAdmin && <NavLink to="/admin" onClick={close}>Admin</NavLink>}
          <span className="nav-spacer" />
          {user ? (
            <>
              <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
              <button className="btn btn-ghost btn-sm" onClick={doLogout}><LogOut size={16} aria-hidden="true" /> Log out</button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" to="/login" onClick={close}>Log in</Link>
              <Link className="btn btn-primary btn-sm" to="/register" onClick={close}>Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
