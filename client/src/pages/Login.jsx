import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBooking } from '../context/BookingContext.jsx';
import { errMsg } from '../services/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const { pending } = useBooking();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || (pending ? '/booking/review' : '/');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(form.email, form.password); nav(from, { replace: true }); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="container auth-wrap">
      <form className="panel auth-card" onSubmit={submit} noValidate>
        <h1>Log in</h1>
        {loc.state?.message && <div className="alert alert-info" role="status">{loc.state.message}</div>}
        {pending && <div className="alert alert-info" role="status">Your selected slot is saved. Log in to continue your booking.</div>}
        <ErrorMessage message={error} />
        <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="muted">New to ParkWise? <Link to="/register" state={{ from }}>Create an account</Link></p>
      </form>
    </div>
  );
}
