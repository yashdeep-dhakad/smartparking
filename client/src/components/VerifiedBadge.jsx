import { BadgeCheck, FlaskConical } from 'lucide-react';

export default function VerifiedBadge({ verified, dataSource }) {
  if (verified) return <span className="badge badge-green"><BadgeCheck size={14} aria-hidden="true" /> Verified</span>;
  return (
    <span className="badge badge-amber" title="Sample record. Fees, hours and availability are not verified.">
      <FlaskConical size={14} aria-hidden="true" /> {dataSource === 'operator' ? 'Operator-managed' : 'Demo data'}
    </span>
  );
}
