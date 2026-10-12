import { BOOKING_STATUS, PAYMENT_STATUS } from '../utils/format.js';

export default function StatusBadge({ status, kind = 'booking' }) {
  const map = kind === 'payment' ? PAYMENT_STATUS : BOOKING_STATUS;
  const s = map[status] || { label: status, tone: 'grey' };
  return <span className={`badge badge-${s.tone}`}>{s.label}</span>;
}
