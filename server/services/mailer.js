const nodemailer = require('nodemailer');
const env = require('../config/env');

// Booking-confirmation email. Sent to the address on the user's account.
// If SMTP_* is not configured, the email is written to the server log instead (demo mode).

let transporter;
function smtpConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}
function getTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

const VEHICLE = { car: 'Car', bike: 'Two-wheeler', ev: 'EV' };
const money = (paise) => `₹${(Number(paise || 0) / 100).toFixed(2)}`;
const when = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

// Builds the subject + HTML/text body for a confirmed booking.
function renderBookingEmail(booking, user) {
  const b = booking.toObject ? booking.toObject() : booking;
  const location = b.location?.name || 'Parking location';
  const slot = b.slot?.code || '';
  const area = b.area?.name || '';
  const place = b.attraction?.name || b.city?.name || '';
  const subject = `ParkWise booking confirmed · ${b.reference}`;

  const rows = [
    ['Booking ID', b.reference],
    ['Place', place],
    ['Parking', location],
    ['Area', area],
    ['Slot', slot],
    ['Vehicle', VEHICLE[b.vehicleType] || b.vehicleType],
    ['Start', when(b.startTime) + ' IST'],
    ['End', when(b.endTime) + ' IST'],
    ['Base fare', money(b.baseAmountPaise)],
    ['Convenience fee', money(b.feeAmountPaise)],
    ['GST', money(b.taxAmountPaise)],
  ];

  const rowHtml = rows
    .map(([k, v]) => `<tr><td style="padding:8px 12px;color:#5b6b63;border-bottom:1px solid #e6efe9;">${k}</td><td style="padding:8px 12px;color:#0b2b21;font-weight:600;border-bottom:1px solid #e6efe9;text-align:right;">${v}</td></tr>`)
    .join('');

  const html = `<!doctype html><html><body style="margin:0;background:#eef4f0;padding:24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #dce9e2;">
    <div style="background:linear-gradient(135deg,#0b4f3a,#059669);padding:24px 28px;color:#fff;">
      <div style="font-size:22px;font-weight:800;letter-spacing:-.02em;">ParkWise</div>
      <div style="opacity:.9;margin-top:4px;">Your parking is booked</div>
    </div>
    <div style="padding:24px 28px;">
      <p style="color:#0b2b21;font-size:16px;margin:0 0 4px;">Hi ${user?.name || 'there'},</p>
      <p style="color:#5b6b63;margin:0 0 16px;">Your payment was successful. Show the QR code in your ParkWise booking at the entrance.</p>
      <div style="background:#f2f8f5;border:1px solid #dce9e2;border-radius:12px;padding:14px 16px;text-align:center;margin-bottom:18px;">
        <div style="color:#5b6b63;font-size:12px;text-transform:uppercase;letter-spacing:.12em;">Booking ID</div>
        <div style="font-size:24px;font-weight:800;color:#0b4f3a;letter-spacing:.08em;">${b.reference}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${rowHtml}
        <tr><td style="padding:12px;color:#0b2b21;font-weight:700;">Total paid</td><td style="padding:12px;color:#059669;font-weight:800;text-align:right;font-size:16px;">${money(b.amountPaise)}</td></tr>
      </table>
      <p style="color:#5b6b63;font-size:13px;margin-top:18px;">Slot ${slot}${area ? ` · ${area}` : ''}. Check-in opens 15 minutes before your start time. This is a demonstration booking.</p>
    </div>
    <div style="padding:16px 28px;background:#f2f8f5;color:#8aa398;font-size:12px;">ParkWise · This email was sent to ${user?.email || ''}.</div>
  </div></body></html>`;

  const text = [
    `ParkWise booking confirmed`,
    `Booking ID: ${b.reference}`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    `Total paid: ${money(b.amountPaise)}`,
  ].join('\n');

  return { to: user?.email, subject, html, text };
}

// Low-level send. Returns { sent, simulated }.
async function sendMail({ to, subject, html, text }) {
  if (!to) throw new Error('No recipient email address.');
  if (!smtpConfigured()) {
    console.log(`\n[mail] (demo) SMTP not configured — email logged, not sent.\n[mail] To: ${to}\n[mail] Subject: ${subject}\n`);
    return { sent: false, simulated: true };
  }
  await getTransport().sendMail({ from: env.mailFrom, to, subject, html, text });
  return { sent: true, simulated: false };
}

// Renders + sends the booking confirmation to the account email.
async function sendBookingConfirmation(booking, user) {
  const email = renderBookingEmail(booking, user);
  const result = await sendMail(email);
  return { ...result, to: email.to, subject: email.subject };
}

module.exports = { smtpConfigured, renderBookingEmail, sendMail, sendBookingConfirmation };
