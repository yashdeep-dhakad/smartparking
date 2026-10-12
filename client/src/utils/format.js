const TZ = 'Asia/Kolkata'; // all parking times are shown in IST

export const formatINR = (paise = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);
export const formatRupees = (r = 0) => formatINR(Math.round(r * 100));

export const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true });
export const fmtDateTime = (iso) => `${fmtDate(iso)}, ${fmtTime(iso)}`;

// Build an ISO instant from a date ("2030-01-10") and time ("14:30") entered as IST wall-clock time.
export const toISO = (date, time) => new Date(`${date}T${time}:00+05:30`).toISOString();

export const istDate = (offsetDays = 0) =>
  new Date(Date.now() + 330 * 60000 + offsetDays * 86400000).toISOString().slice(0, 10);

export const fmtDuration = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(' ');
};

export const BOOKING_STATUS = {
  pending_payment: { label: 'Pending payment', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'green' },
  checked_in: { label: 'Checked in', tone: 'blue' },
  completed: { label: 'Completed', tone: 'grey' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  expired: { label: 'Expired', tone: 'grey' },
};
export const PAYMENT_STATUS = {
  created: { label: 'Created', tone: 'grey' },
  pending: { label: 'Pending', tone: 'amber' },
  paid: { label: 'Paid', tone: 'green' },
  failed: { label: 'Failed', tone: 'red' },
  refunded: { label: 'Refunded', tone: 'blue' },
};
export const VEHICLES = { car: 'Car', bike: 'Two-wheeler', ev: 'Electric car' };
export const PARKING_TYPE = { public: 'Public', private: 'Private', 'on-site': 'On-site', street: 'Street', 'multi-level': 'Multi-level' };

export const directionsUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
