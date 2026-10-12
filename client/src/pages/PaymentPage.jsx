import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import useFetch from '../hooks/useFetch.js';
import { useBooking } from '../context/BookingContext.jsx';
import BookingSummary from '../components/BookingSummary.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { formatINR } from '../utils/format.js';

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function useCountdown(target) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!target) return undefined;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(target) - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  return left;
}

export default function PaymentPage() {
  const { bookingId } = useParams();
  const nav = useNavigate();
  const { clearPending } = useBooking();
  const { data, loading, error, reload } = useFetch(`/bookings/${bookingId}`);
  const cfg = useFetch('/payments/config');
  const demo = cfg.data?.demo === true;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [info, setInfo] = useState('');
  const [method, setMethod] = useState('upi');
  const done = useRef(false);

  const booking = data?.booking;
  const left = useCountdown(booking?.status === 'pending_payment' ? booking.holdExpiresAt : null);

  useEffect(() => {
    if (booking && booking.status !== 'pending_payment' && !done.current) {
      nav(booking.status === 'confirmed' || booking.status === 'checked_in' ? `/booking/success/${bookingId}` : `/booking/failure/${bookingId}?reason=${booking.status}`, { replace: true });
    }
  }, [booking, bookingId, nav]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="container section"><ErrorMessage message={error} onRetry={reload} /></div>;
  if (!booking) return null;

  const expired = left <= 0;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  const pay = async () => {
    setMsg(''); setInfo(''); setBusy(true);
    try {
      const { data: order } = await api.post('/payments/order', { bookingId });

      // Demo mode: Razorpay keys are not configured on the server, so we confirm the booking locally.
      if (order.demo) {
        await api.post('/payments/demo-complete', { bookingId });
        done.current = true;
        clearPending();
        nav(`/booking/success/${bookingId}`, { replace: true });
        return;
      }

      if (!(await loadCheckout())) throw new Error('Could not load Razorpay Checkout. Check your internet connection.');

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'ParkWise',
        description: `Parking booking ${order.reference}`,
        prefill: order.prefill,
        theme: { color: '#0b4f3a' },
        handler: async (resp) => {
          done.current = true;
          try {
            await api.post('/payments/verify', resp); // server checks the signature
            clearPending();
            nav(`/booking/success/${bookingId}`, { replace: true });
          } catch (e) {
            if (e?.response) nav(`/booking/failure/${bookingId}?reason=verification`, { replace: true });
            else nav(`/booking/success/${bookingId}?wait=1`, { replace: true }); // network glitch: success page will poll the server
          }
        },
        modal: { ondismiss: () => { setBusy(false); setInfo('Payment window closed. Your slot stays held until the timer ends – you can try again.'); } },
      });
      rzp.on('payment.failed', async (r) => {
        const reason = r?.error?.description || 'Payment failed';
        setMsg(`${reason}. You can retry while your slot is held.`);
        setBusy(false);
        try { await api.post('/payments/failed', { razorpay_order_id: order.orderId, reason }); } catch { /* informational */ }
      });
      rzp.open();
    } catch (e) {
      setMsg(errMsg(e));
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('Release this slot and cancel the booking?')) return;
    try { await api.post(`/bookings/${bookingId}/cancel`, {}); nav('/my-bookings'); } catch (e) { setMsg(errMsg(e)); }
  };

  return (
    <div className="container section narrow">
      <h1>Pay for your booking</h1>
      <p className={`hold ${left < 60 ? 'hold-low' : ''}`} role="timer" aria-live="off">
        {expired ? 'Your slot hold has expired.' : <>Slot held for <strong>{mm}:{ss}</strong></>}
      </p>
      <BookingSummary data={booking} />
      <ErrorMessage message={msg} />
      {info && <div className="alert alert-info" role="status">{info}</div>}

      {demo && !expired && (
        <>
          <div className="alert alert-warn" role="status">
            <strong>Demo checkout.</strong> Razorpay keys are not configured on the server, so your payment will be approved locally. No money is charged.
          </div>
          <fieldset className="pay-methods">
            <legend>Choose a payment method</legend>
            {[['upi', 'UPI'], ['card', 'Card'], ['netbanking', 'Netbanking']].map(([k, label]) => (
              <label key={k} className={`pay-method ${method === k ? 'active' : ''}`}>
                <input type="radio" name="method" value={k} checked={method === k} onChange={() => setMethod(k)} />
                {label}
              </label>
            ))}
          </fieldset>
        </>
      )}

      {expired ? (
        <div className="btn-row"><Link className="btn btn-primary" to={`/parking/${booking.location._id}`}>Pick a slot again</Link></div>
      ) : (
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={cancel} disabled={busy}>Cancel booking</button>
          <button className="btn btn-primary" onClick={pay} disabled={busy}><Lock size={16} aria-hidden="true" /> {busy ? 'Processing…' : demo ? `Confirm demo payment ${formatINR(booking.amountPaise)}` : `Pay ${formatINR(booking.amountPaise)}`}</button>
        </div>
      )}
      <p className="muted small">{demo
        ? 'This is a local demo payment used because Razorpay test keys are not set. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env to enable the real Razorpay checkout.'
        : 'Test mode: use Razorpay’s test card or UPI details. No real money is charged. Your card details never touch ParkWise servers.'}</p>
    </div>
  );
}
