import { useState } from 'react';
import api, { errMsg } from '../services/api.js';
import useFetch from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import AdminNav from '../components/AdminNav.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { formatINR } from '../utils/format.js';

function Stat({ label, value }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

export default function AdminDashboard() {
  const { user: me } = useAuth();
  const stats = useFetch('/admin/stats');
  const users = useFetch('/admin/users', { limit: 50 });
  const [err, setErr] = useState('');

  const patch = async (u, body) => {
    setErr('');
    try { await api.patch(`/admin/users/${u._id}`, body); users.reload(); } catch (e) { setErr(errMsg(e)); }
  };
  const s = stats.data;

  return (
    <div className="container section">
      <h1>Admin</h1>
      <AdminNav />
      {stats.loading && <LoadingSpinner />}
      <ErrorMessage message={stats.error} onRetry={stats.reload} />
      {s && (
        <div className="stats">
          <Stat label="Users" value={s.users} /><Stat label="Cities" value={s.cities} /><Stat label="Attractions" value={s.attractions} />
          <Stat label="Parking locations" value={s.locations} /><Stat label="Active slots" value={s.slots} /><Stat label="Bookings today" value={s.bookingsToday} />
          <Stat label="Paid payments" value={s.paidCount} /><Stat label="Revenue (test mode)" value={formatINR(s.revenuePaise)} /><Stat label="Refunds due" value={s.needsRefund} />
        </div>
      )}
      {s && <p className="muted small">Bookings by status: {Object.entries(s.bookingsByStatus).map(([k, v]) => `${k.replace('_', ' ')}: ${v}`).join(' · ') || 'none yet'}</p>}

      <h2>Users</h2>
      <ErrorMessage message={users.error || err} />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.data?.items.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
                <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-grey'}`}>{u.isActive ? 'Active' : 'Disabled'}</span></td>
                <td className="btn-row">
                  {u._id !== me._id && <>
                    <button className="btn btn-ghost btn-sm" onClick={() => patch(u, { role: u.role === 'admin' ? 'user' : 'admin' })}>Make {u.role === 'admin' ? 'user' : 'admin'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => patch(u, { isActive: !u.isActive })}>{u.isActive ? 'Disable' : 'Enable'}</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
