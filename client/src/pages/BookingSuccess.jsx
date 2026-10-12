import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, Mail, Printer, RefreshCw, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api, { errMsg } from '../services/api.js';
import useFetch from '../hooks/useFetch.js';
import BookingSummary from '../components/BookingSummary.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { formatINR } from '../utils/format.js';

export default function BookingSuccess() {
  const { bookingId } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { data, loading, error, reload } = useFetch(`/bookings/${bookingId}`);
  const tries = useRef(0);
  const booking = data?.booking;
  const [receipt, setReceipt] = useState(null);
  const [mailMsg, setMailMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // If the payment callback was delayed, keep checking the server (the webhook may confirm it).
  useEffect(() => {
    if (!booking || booking.status !== 'pending_payment') return undefined;
    const t = setInterval(() => { tries.current += 1; if (tries.current > 10) clearInterval(t); else reload(); }, 3000);
    return () => clearInterval(t);
  }, [booking, reload]);

  useEffect(() => {
    if (booking && ['expired', 'cancelled'].includes(booking.status)) nav(`/booking/failure/${bookingId}?reason=${booking.status}`, { replace: true });
  }, [booking, bookingId, nav]);

  const viewEmail = async () => {
    setMailMsg('');
    try { const { data: r } = await api.get(`/bookings/${bookingId}/receipt`); setReceipt(r); }
    catch (e) { setMailMsg(errMsg(e)); }
  };

  const resend = async () => {
    setBusy(true); setMailMsg('');
    try {
      const { data: r } = await api.post(`/bookings/${bookingId}/resend-receipt`);
      setMailMsg(r.simulated
        ? `Demo mode: the receipt for ${r.to} was saved on the server. Add SMTP settings to server/.env to deliver real email.`
        : `Confirmation email re-sent to ${r.to}.`);
    } catch (e) { setMailMsg(errMsg(e)); }
    finally { setBusy(false); }
  };

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <div className="container section"><ErrorMessage message={error} onRetry={reload} /></div>;
  if (!booking) return null;

  if (booking.status === 'pending_payment') {
    return (
      <div className="container section narrow center-text">
        <LoadingSpinner label="Waiting for payment confirmation…" />
        <p className="muted">{sp.get('wait') ? 'We could not reach the server right after payment. ' : ''}Do not pay again. This page updates automatically; if it does not, check <Link to="/my-bookings">My bookings</Link> in a minute.</p>
      </div>
    );
  }

  const payment = data.payments.find((p) => p.status === 'paid') || data.payments[0];
  return (
    <div className="container section narrow">
      <div className="success-head">
        <CheckCircle2 size={44} aria-hidden="true" />
        <h1>Booking confirmed</h1>
        <p className="muted">Show this reference at the parking entrance or use it to check in.</p>
        <p className="reference">{booking.reference}</p>
      </div>
      <div className="print-area">
        <div className="row-between">
          <div>
            <p>Booking status: <StatusBadge status={booking.status} /></p>
            <p>Payment: <StatusBadge kind="payment" status={booking.paymentStatus} /> · Amount paid <strong>{formatINR(booking.amountPaise)}</strong></p>
            {payment?.razorpayPaymentId && <p className="muted small">Payment ID: {payment.razorpayPaymentId}</p>}
          </div>
          <div className="qr" aria-label="Check-in QR code"><QRCodeSVG value={booking.checkInToken} size={120} /></div>
        </div>
        <BookingSummary data={booking} />

        <div className="panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Mail size={18} aria-hidden="true" /> Confirmation email</h3>
          <p className="muted">A confirmation email is sent to your registered address <strong>{data.receiptEmail}</strong>.</p>
          {!data.mailConfigured && (
            <div className="alert alert-info" role="note">
              Demo mode: no mail server is configured, so the receipt is stored on the server instead of being delivered. Add <code>SMTP_*</code> settings in <code>server/.env</code> to send real email.
            </div>
          )}
          {data.confirmationEmailSentAt && <p className="muted small">Recorded {new Date(data.confirmationEmailSentAt).toLocaleString()}.</p>}
          <div className="btn-row no-print">
            <button className="btn btn-ghost" onClick={viewEmail}><Eye size={16} aria-hidden="true" /> View email</button>
            <button className="btn btn-ghost" onClick={resend} disabled={busy}><RefreshCw size={16} aria-hidden="true" /> {busy ? 'Sending…' : 'Resend'}</button>
          </div>
          {mailMsg && <div className="alert alert-info" role="status">{mailMsg}</div>}
        </div>

        <div className="panel">
          <h3>Check-in instructions</h3>
          <ol>
            <li>Check-in opens 15 minutes before your start time.</li>
            <li>Open <strong>Check in</strong> in ParkWise and enter your reference <strong>{booking.reference}</strong> (or paste the QR code text).</li>
            <li>Park only in slot <strong>{booking.slot?.code}</strong>. Check out when you leave.</li>
          </ol>
          <p className="muted small">QR codes contain a random booking token only, never personal data.</p>
        </div>
      </div>
      <div className="btn-row no-print">
        <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print confirmation</button>
        <Link className="btn btn-primary" to="/my-bookings">Go to my bookings</Link>
      </div>

      {receipt && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirmation email" onClick={() => setReceipt(null)}>
          <div className="modal receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="row-between">
              <h3>Confirmation email</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setReceipt(null)} aria-label="Close"><X size={16} aria-hidden="true" /></button>
            </div>
            <p className="muted small">To: {receipt.to} · Subject: {receipt.subject}</p>
            <iframe title="Confirmation email preview" className="receipt-frame" srcDoc={receipt.html} />
          </div>
        </div>
      )}
    </div>
  );
}
