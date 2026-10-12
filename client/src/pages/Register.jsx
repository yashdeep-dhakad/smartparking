import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBooking } from '../context/BookingContext.jsx';
import { errMsg } from '../services/api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const { pending } = useBooking();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || (pending ? '/booking/review' : '/');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try { await register(form); nav(from, { replace: true }); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="container auth-wrap">
      <form className="panel auth-card" onSubmit={submit} noValidate>
        <h1>Create your account</h1>
        {pending && <div className="alert alert-info" role="status">Your selected slot is saved. Register to continue your booking.</div>}
        <ErrorMessage message={error} />
        <label>Full name<input required autoComplete="name" value={form.name} onChange={set('name')} /></label>
        <label>Email<input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label>Phone (optional)<input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} /></label>
        <label>Password<input type="password" required autoComplete="new-password" minLength={8} value={form.password} onChange={set('password')} /><span className="muted small">At least 8 characters.</span></label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
        <p className="muted">Already registered? <Link to="/login" state={{ from }}>Log in</Link></p>
      </form>
    </div>
  );
}
