import { useState } from 'react';
import useFetch from '../hooks/useFetch.js';
import AdminNav from '../components/AdminNav.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { fmtDateTime, formatINR } from '../utils/format.js';

const STATUSES = ['pending_payment', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired'];

export default function ManageBookings() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch('/admin/bookings', { status: status || undefined, search: search || undefined, page, limit: 20 });
  return (
    <div className="container section">
      <h1>Admin</h1>
      <AdminNav />
      <div className="row-between">
        <h2>Bookings</h2>
        <div className="toolbar">
          <input aria-label="Search by reference" placeholder="Reference…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
      <ErrorMessage message={error} onRetry={reload} />
      {loading ? <LoadingSpinner /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Reference</th><th>User</th><th>Parking / slot</th><th>When</th><th>Amount</th><th>Status</th><th>Payment</th></tr></thead>
            <tbody>
              {data.items.map((b) => (
                <tr key={b._id}>
                  <td>{b.reference}</td><td>{b.user?.name}<br /><span className="muted small">{b.user?.email}</span></td>
                  <td>{b.location?.name}<br /><span className="muted small">Slot {b.slot?.code}</span></td>
                  <td className="small">{fmtDateTime(b.startTime)}<br />→ {fmtDateTime(b.endTime)}</td>
                  <td>{formatINR(b.amountPaise)}</td><td><StatusBadge status={b.status} /></td><td><StatusBadge kind="payment" status={b.paymentStatus} /></td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan="7" className="muted">No bookings.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}
