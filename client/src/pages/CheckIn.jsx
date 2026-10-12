import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../services/api.js';
import useFetch from '../hooks/useFetch.js';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { fmtDateTime } from '../utils/format.js';

export default function CheckIn() {
  const { data, loading, reload } = useFetch('/bookings/mine');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const run = async (action, reference) => {
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      const r = await api.post(`/bookings/${action}`, { reference });
      setMsg({ type: 'ok', text: r.data.message });
      setCode('');
      reload();
    } catch (e) { setMsg({ type: 'err', text: errMsg(e) }); }
    finally { setBusy(false); }
  };

  const eligible = (data?.items || []).filter((b) => ['confirmed', 'checked_in'].includes(b.status));

  return (
    <div className="container section narrow">
      <h1>Check in / check out</h1>
      <p className="muted">ParkWise uses manual check-in. Enter your booking reference (or the text from your QR code). Physical arrival is not detected automatically.</p>
      <div className="panel">
        <label>Booking reference or QR text
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PW-XXXXXXXX" autoComplete="off" />
        </label>
        <div className="btn-row">
          <button className="btn btn-primary" disabled={busy || code.trim().length < 4} onClick={() => run('check-in', code.trim())}>Check in</button>
          <button className="btn btn-ghost" disabled={busy || code.trim().length < 4} onClick={() => run('check-out', code.trim())}>Check out</button>
        </div>
        {msg.text && <div className={`alert ${msg.type === 'ok' ? 'alert-ok' : 'alert-error'}`} role="status">{msg.text}</div>}
      </div>

      <h2>Your active and upcoming bookings</h2>
      {loading && <LoadingSpinner />}
      {!loading && eligible.length === 0 && <p className="muted">No confirmed bookings. <Link to="/cities">Find parking</Link></p>}
      <div className="list">
        {eligible.map((b) => (
          <div key={b._id} className="card list-item">
            <div>
              <h3>{b.attraction?.name} · Slot {b.slot?.code}</h3>
              <p>{fmtDateTime(b.startTime)} → {fmtDateTime(b.endTime)}</p>
              <p className="muted small">Ref {b.reference}</p>
            </div>
            <div className="list-side">
              <StatusBadge status={b.status} />
              {b.status === 'confirmed' ? (
                <button className="btn btn-primary btn-sm" disabled={!b.canCheckIn || busy} onClick={() => run('check-in', b.reference)}>{b.canCheckIn ? 'Check in' : 'Not open yet'}</button>
              ) : (
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => run('check-out', b.reference)}>Check out</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
