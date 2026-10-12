import { useState } from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch.js';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { fmtDateTime, formatINR } from '../utils/format.js';

const TABS = [
  ['all', 'All', () => true],
  ['upcoming', 'Upcoming', (b) => b.status === 'confirmed'],
  ['active', 'Active', (b) => b.status === 'checked_in'],
  ['pending', 'Awaiting payment', (b) => b.status === 'pending_payment'],
  ['history', 'History', (b) => ['completed', 'expired'].includes(b.status)],
  ['cancelled', 'Cancelled', (b) => b.status === 'cancelled'],
];

export default function MyBookings() {
  const { data, loading, error, reload } = useFetch('/bookings/mine');
  const [tab, setTab] = useState('all');
  const items = data?.items || [];
  const current = TABS.find((t) => t[0] === tab)[2];
  const shown = items.filter(current);

  return (
    <div className="container section">
      <h1>My bookings</h1>
      <div className="tabs" role="tablist">
        {TABS.map(([k, label, fn]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label} <span className="count">{items.filter(fn).length}</span>
          </button>
        ))}
      </div>
      {loading && <LoadingSpinner />}
      <ErrorMessage message={error} onRetry={reload} />
      {!loading && !error && shown.length === 0 && (
        <EmptyState title="Nothing here yet" action={<Link className="btn btn-primary" to="/cities">Find parking</Link>}>Bookings in this group will appear here.</EmptyState>
      )}
      <div className="list">
        {shown.map((b) => (
          <Link key={b._id} to={b.status === 'pending_payment' ? `/payment/${b._id}` : `/bookings/${b._id}`} className="card card-link list-item">
            <div>
              <h3>{b.attraction?.name} · Slot {b.slot?.code}</h3>
              <p className="muted small">{b.location?.name}</p>
              <p>{fmtDateTime(b.startTime)} → {fmtDateTime(b.endTime)}</p>
              <p className="muted small">Ref {b.reference}</p>
            </div>
            <div className="list-side">
              <StatusBadge status={b.status} />
              <StatusBadge kind="payment" status={b.paymentStatus} />
              <strong>{formatINR(b.amountPaise)}</strong>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
