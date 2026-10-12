import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../services/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

// Dedicated administrator sign-in. Only accounts with role "admin" are accepted (enforced by the server).
export default function AdminLogin() {
  const { user, isAdmin, adminLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAdmin) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await adminLogin(form.email, form.password); nav('/admin', { replace: true }); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="container auth-wrap">
      <form className="panel auth-card admin-login" onSubmit={submit} noValidate>
        <div className="admin-login-head">
          <ShieldCheck size={30} aria-hidden="true" />
          <div>
            <h1>Administrator</h1>
            <p className="muted small">Sign in to manage cities, attractions, parking, bookings and payments.</p>
          </div>
        </div>
        {loc.state?.message && <div className="alert alert-info" role="status">{loc.state.message}</div>}
        {user && !isAdmin && <div className="alert alert-warn" role="status">You are signed in as a normal user. Administrator access is required for this area.</div>}
        <ErrorMessage message={error} />
        <label>Admin email<input type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@parkwise.local" /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Verifying…' : 'Enter admin dashboard'}</button>
        <p className="muted small">Signing in as a customer? <Link to="/login">Use the customer login</Link>.</p>
      </form>
    </div>
  );
}
