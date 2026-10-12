// All parking operating hours are interpreted in Indian Standard Time (UTC+05:30).
// Dates are always stored in MongoDB as UTC instants.
const IST_OFFSET_MS = 330 * 60 * 1000;

const istShift = (d) => new Date(d.getTime() + IST_OFFSET_MS);
const minutesOfDayIST = (d) => {
  const t = istShift(d);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
};
const dayKeyIST = (d) => istShift(d).toISOString().slice(0, 10);
const hhmmToMinutes = (s) => {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + (m || 0);
};

// Returns null when OK, or an error message string.
function checkOperatingHours(hours, start, end) {
  if (!hours || hours.is24x7) return null;
  const open = hhmmToMinutes(hours.open || '00:00');
  const close = hhmmToMinutes(hours.close || '23:59');
  const msg = `Bookings must be on a single day between ${hours.open} and ${hours.close} (IST).`;
  if (dayKeyIST(start) !== dayKeyIST(end)) return msg;
  if (minutesOfDayIST(start) < open || minutesOfDayIST(end) > close) return msg;
  return null;
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

function haversineKm(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

module.exports = { IST_OFFSET_MS, minutesOfDayIST, dayKeyIST, checkOperatingHours, escapeRegex, slugify, haversineKm };
