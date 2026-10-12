import { useState } from 'react';
import api, { errMsg } from '../services/api.js';
import useFetch from '../hooks/useFetch.js';
import AdminNav from '../components/AdminNav.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { fmtDateTime, formatINR } from '../utils/format.js';

export default function ManagePayments() {
  const [status, setStatus] = useState('');
  const [refundOnly, setRefundOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState('');
  const { data, loading, error, reload } = useFetch('/admin/payments', { status: status || undefined, needsRefund: refundOnly ? 'true' : undefined, page, limit: 20 });

  const markRefunded = async (p) => {
    const note = window.prompt('I have refunded this payment in the Razorpay dashboard. Note (optional):', 'Refunded via Razorpay dashboard');
    if (note === null) return;
    try { await api.post(`/admin/payments/${p._id}/mark-refunded`, { note }); reload(); } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <div className="container section">
      <h1>Admin</h1>
      <AdminNav />
      <div className="row-between">
        <h2>Payments</h2>
        <div className="toolbar">
          <label className="chip-check"><input type="checkbox" checked={refundOnly} onChange={(e) => { setRefundOnly(e.target.checked); setPage(1); }} /> Needs refund</label>
          <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {['created', 'pending', 'paid', 'failed', 'refunded'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="alert alert-info">Refunds are <strong>not</strong> automatic. Refund in the Razorpay dashboard first, then record it here.</div>
      <ErrorMessage message={error || err} onRetry={reload} />
      {loading ? <LoadingSpinner /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Booking</th><th>User</th><th>Order / payment ID</th><th>Amount</th><th>Status</th><th>Verified</th><th /></tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p._id}>
                  <td className="small">{fmtDateTime(p.createdAt)}</td>
                  <td>{p.booking?.reference}<br /><span className="muted small">{p.booking?.status}</span></td>
                  <td>{p.user?.name}</td>
                  <td className="small">{p.razorpayOrderId}<br />{p.razorpayPaymentId || '—'}</td>
                  <td>{formatINR(p.amountPaise)}</td>
                  <td><StatusBadge kind="payment" status={p.status} />{p.needsRefund && <span className="badge badge-red">Refund due</span>}</td>
                  <td>{p.verificationStatus}</td>
                  <td>{p.status === 'paid' && <button className="btn btn-ghost btn-sm" onClick={() => markRefunded(p)}>Mark refunded</button>}</td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan="8" className="muted">No payments.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}
