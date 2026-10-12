import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

// Guests are redirected to /login and sent back afterwards. The server still re-checks every API call.
export default function ProtectedRoute({ children, admin = false }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <LoadingSpinner label="Checking your session…" />;
  if (admin) {
    // Admin area has its own sign-in screen. Anyone who is not an admin (guest or normal user) goes there.
    if (!user || user.role !== 'admin') {
      return <Navigate to="/admin/login" replace state={{ from: loc.pathname, message: user ? undefined : 'Please sign in with an administrator account.' }} />;
    }
    return children;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search, message: 'Please log in to continue.' }} />;
  return children;
}
