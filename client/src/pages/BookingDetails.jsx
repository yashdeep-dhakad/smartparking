import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api, { errMsg } from '../services/api.js';
import useFetch from '../hooks/useFetch.js';
import BookingSummary from '../components/BookingSummary.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { fmtDateTime, fmtTime, formatINR } from '../utils/format.js';

export default function BookingDetails() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(`/bookings/${id}`);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <div className="container section"><ErrorMessage message={error} onRetry={reload} /></div>;
  const b = data.booking;

  const act = async (path, body = {}) => {
    setBusy(true); setMsg({ type: '', text: '' });
    try { const r = await api.post(path, body); setMsg({ type: 'ok', text: r.data.message }); await reload(); }
    catch (e) { setMsg({ type: 'err', text: errMsg(e) }); }
    finally { setBusy(false); }
  };

  return (
    <div className="container section narrow">
      <p className="muted small"><Link to="/my-bookings">← My bookings</Link></p>
      <div className="row-between"><h1>Booking {b.reference}</h1><StatusBadge status={b.status} /></div>
      <p>Payment: <StatusBadge kind="payment" status={b.paymentStatus} /> · {formatINR(b.amountPaise)}</p>
      <BookingSummary data={b} />
      {msg.text && <div className={`alert ${msg.type === 'ok' ? 'alert-ok' : 'alert-error'}`} role="status">{msg.text}</div>}

      {b.checkInAt && <p>Checked in: {fmtDateTime(b.checkInAt)}</p>}
      {b.checkOutAt && <p>Checked out: {fmtDateTime(b.checkOutAt)}</p>}

      {['confirmed', 'checked_in'].includes(b.status) && (
        <div className="panel">
          <div className="row-between">
            <div>
              <h3>Check-in</h3>
              <p className="muted small">Opens at {fmtTime(b.checkInOpensAt)} (15 min before start).</p>
              <div className="btn-row">
                {b.status === 'confirmed' && <button className="btn btn-primary" disabled={!b.canCheckIn || busy} onClick={() => act('/bookings/check-in', { reference: b.reference })}>Check in</button>}
                {b.status === 'checked_in' && <button className="btn btn-primary" disabled={busy} onClick={() => act('/bookings/check-out', { reference: b.reference })}>Check out</button>}
              </div>
            </div>
            <div className="qr"><QRCodeSVG value={b.checkInToken} size={104} /></div>
          </div>
        </div>
      )}

      {b.status === 'pending_payment' && <Link className="btn btn-primary" to={`/payment/${b._id}`}>Continue to payment</Link>}

      {b.canCancel && b.status === 'confirmed' && (
        <div className="panel">
          <h3>Cancel this booking</h3>
          <p className="muted small">Free cancellation until {fmtDateTime(b.cancelDeadline)}. <strong>Refund policy:</strong> refunds are not automatic. After cancelling, the operator reviews paid bookings and refunds them manually to your original payment method.</p>
          <button className="btn btn-danger" disabled={busy} onClick={() => window.confirm('Cancel this booking?') && act(`/bookings/${b._id}/cancel`)}>Cancel booking</button>
        </div>
      )}
      {b.status === 'confirmed' && !b.canCancel && <p className="muted small">Cancellation closed {b.policy.cancelBeforeHours} hours before the start time. Refunds are not automatic.</p>}

      {data.payments.length > 0 && (
        <>
          <h3>Payment attempts</h3>
          <table className="table">
            <thead><tr><th>Order</th><th>Status</th><th>Amount</th></tr></thead>
            <tbody>{data.payments.map((p) => <tr key={p._id}><td className="small">{p.razorpayOrderId}</td><td><StatusBadge kind="payment" status={p.status} /></td><td>{formatINR(p.amountPaise)}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}
