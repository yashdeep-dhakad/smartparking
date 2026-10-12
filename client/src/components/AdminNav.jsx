import { NavLink } from 'react-router-dom';

export default function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Admin">
      <NavLink to="/admin" end>Overview</NavLink>
      <NavLink to="/admin/cities">Cities</NavLink>
      <NavLink to="/admin/attractions">Attractions</NavLink>
      <NavLink to="/admin/parking">Parking</NavLink>
      <NavLink to="/admin/bookings">Bookings</NavLink>
      <NavLink to="/admin/payments">Payments</NavLink>
    </nav>
  );
}
