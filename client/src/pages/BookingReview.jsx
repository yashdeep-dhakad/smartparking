import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useBooking } from '../context/BookingContext.jsx';
import BookingSummary from '../components/BookingSummary.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';

// Public page: guests can review the price. Login is required only to continue to payment.
export default function BookingReview() {
  const { user, loading: authLoading } = useAuth();
  const { pending, clearPending } = useBooking();
  const nav = useNavigate();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!pending);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pending) return;
    setLoading(true);
    api.post('/bookings/quote', { slotId: pending.slotId, vehicleType: pending.vehicleType, startTime: pending.startTime, endTime: pending.endTime })
      .then((r) => { setQuote(r.data); setError(''); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [pending]);

  if (!pending) {
    return <div className="container section"><EmptyState title="No booking in progress" action={<Link className="btn btn-primary" to="/cities">Find parking</Link>}>Pick a parking slot first and it will appear here.</EmptyState></div>;
  }
  if (loading || authLoading) return <LoadingSpinner label="Preparing your booking…" />;

  const back = `/parking/${pending.parkingId}`;

  const proceed = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/bookings', { slotId: pending.slotId, vehicleType: pending.vehicleType, startTime: pending.startTime, endTime: pending.endTime });
      nav(`/payment/${data.booking._id}`);
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="container section narrow">
      <h1>Review your booking</h1>
      <ErrorMessage message={error} />
      {quote && (
        <>
          <BookingSummary data={quote} />
          {!quote.available && (
            <div className="alert alert-error" role="alert">
              {quote.unavailableReason} <Link to={back}>Choose another slot</Link>
            </div>
          )}
          {!user && quote.available && (
            <div className="alert alert-info" role="note">Log in or create an account to continue. Your slot selection stays saved.</div>
          )}
          <div className="btn-row">
            <Link className="btn btn-ghost" to={back}>Change selection</Link>
            {user ? (
              <button className="btn btn-primary" disabled={!quote.available || busy} onClick={proceed}>{busy ? 'Reserving slot…' : 'Continue to payment'}</button>
            ) : (
              <button className="btn btn-primary" disabled={!quote.available} onClick={() => nav('/login', { state: { from: '/booking/review', message: 'Log in to continue to payment.' } })}>Log in to continue</button>
            )}
          </div>
          <p className="muted small">Your slot is held for a few minutes once you continue to payment. Unpaid holds are released automatically.</p>
        </>
      )}
      {!quote && error && <button className="btn btn-ghost" onClick={() => { clearPending(); nav('/cities'); }}>Start over</button>}
    </div>
  );
}
