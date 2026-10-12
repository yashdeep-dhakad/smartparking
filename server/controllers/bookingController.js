const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { createPendingBooking } = require('../services/bookingService');
const { renderBookingEmail, sendBookingConfirmation, smtpConfigured } = require('../services/mailer');
const { str } = require('../utils/query');

const POPULATE = [
  { path: 'city', select: 'name state' },
  { path: 'attraction', select: 'name address' },
  { path: 'location', select: 'name address type location verified dataSource' },
  { path: 'area', select: 'name' },
  { path: 'slot', select: 'code' },
];

// Adds server-computed hints so the UI never has to guess business rules.
function decorate(b) {
  const o = b.toObject ? b.toObject() : b;
  const now = Date.now();
  const cancelDeadline = new Date(new Date(o.startTime).getTime() - env.cancelBeforeHours * 3600000);
  const opensAt = new Date(new Date(o.startTime).getTime() - env.checkInEarlyMinutes * 60000);
  return {
    ...o,
    canCancel: o.status === 'pending_payment' || (o.status === 'confirmed' && now <= cancelDeadline.getTime()),
    cancelDeadline,
    checkInOpensAt: opensAt,
    canCheckIn: o.status === 'confirmed' && o.paymentStatus === 'paid' && now >= opensAt.getTime() && now <= new Date(o.endTime).getTime(),
    canCheckOut: o.status === 'checked_in',
    policy: { cancelBeforeHours: env.cancelBeforeHours, holdMinutes: env.holdMinutes },
  };
}

exports.create = asyncHandler(async (req, res) => {
  const booking = await createPendingBooking({ userId: req.user._id, ...req.body });
  res.status(201).json({ booking: decorate(await booking.populate(POPULATE)) });
});

exports.mine = asyncHandler(async (req, res) => {
  const items = await Booking.find({ user: req.user._id }).sort({ startTime: -1 }).limit(200).populate(POPULATE);
  res.json({ items: items.map(decorate) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id }).populate(POPULATE);
  if (!booking) throw new ApiError(404, 'Booking not found.'); // same answer for "not yours" – no information leak
  const payments = await Payment.find({ booking: booking._id }).sort({ createdAt: -1 }).select('-__v');
  res.json({ booking: decorate(booking), payments, receiptEmail: req.user.email, confirmationEmailSentAt: booking.confirmationEmailSentAt || null, mailConfigured: smtpConfigured() });
});

// The confirmation email rendered for the success screen (owner only).
exports.receipt = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id }).populate(POPULATE);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  const email = renderBookingEmail(booking, req.user);
  res.json({ to: req.user.email, subject: email.subject, html: email.html, text: email.text, sentAt: booking.confirmationEmailSentAt || null, simulated: !smtpConfigured() });
});

// Re-send the confirmation to the account email on demand.
exports.resendReceipt = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id }).populate(POPULATE);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (!['confirmed', 'checked_in', 'completed'].includes(booking.status)) throw new ApiError(400, 'A confirmation email is only available for paid bookings.');
  const result = await sendBookingConfirmation(booking, req.user);
  res.json({ ok: true, ...result });
});

exports.cancel = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
  if (!booking) throw new ApiError(404, 'Booking not found.');
  const d = decorate(booking);
  if (!d.canCancel) {
    throw new ApiError(400, booking.status === 'confirmed'
      ? `Free cancellation closed ${env.cancelBeforeHours} hours before the start time.`
      : `A ${booking.status.replace('_', ' ')} booking cannot be cancelled.`);
  }
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: { $in: ['pending_payment', 'confirmed'] } },
    { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: req.body.reason || 'Cancelled by user' }, $unset: { holdExpiresAt: 1 } },
    { new: true }
  ).populate(POPULATE);
  if (!updated) throw new ApiError(409, 'Booking status changed. Please refresh.');
  // Money is NOT refunded automatically. For paid bookings, flag so an admin can process the refund manually.
  if (booking.status === 'confirmed') await Payment.updateMany({ booking: booking._id, status: 'paid' }, { $set: { needsRefund: true, refundNote: 'Cancelled by user – refund to be processed manually.' } });
  res.json({ booking: decorate(updated), message: booking.status === 'confirmed'
    ? 'Booking cancelled. Refunds are processed manually by the operator – see the refund policy.'
    : 'Booking cancelled and the slot has been released.' });
});

async function findOwned(userId, code) {
  const c = str(code);
  if (!c) throw new ApiError(400, 'Booking reference is required.');
  const b = await Booking.findOne({ user: userId, $or: [{ reference: c.toUpperCase() }, { checkInToken: c }] });
  if (!b) throw new ApiError(404, 'No booking found for that reference on your account.');
  return b;
}

exports.checkIn = asyncHandler(async (req, res) => {
  const b = await findOwned(req.user._id, req.body.reference);
  const now = Date.now();
  if (b.status === 'checked_in') throw new ApiError(409, 'You are already checked in.');
  if (b.status !== 'confirmed' || b.paymentStatus !== 'paid') throw new ApiError(400, `Cannot check in: booking is ${b.status.replace('_', ' ')}.`);
  if (now < b.startTime.getTime() - env.checkInEarlyMinutes * 60000) throw new ApiError(400, `Check-in opens ${env.checkInEarlyMinutes} minutes before your start time.`);
  if (now > b.endTime.getTime()) throw new ApiError(400, 'This booking has already ended.');
  const updated = await Booking.findOneAndUpdate({ _id: b._id, status: 'confirmed' }, { $set: { status: 'checked_in', checkInAt: new Date() } }, { new: true }).populate(POPULATE);
  if (!updated) throw new ApiError(409, 'You are already checked in.');
  res.json({ booking: decorate(updated), message: 'Checked in. Enjoy your visit!' });
});

exports.checkOut = asyncHandler(async (req, res) => {
  const b = await findOwned(req.user._id, req.body.reference);
  if (b.status !== 'checked_in') throw new ApiError(400, 'Only checked-in bookings can be checked out.');
  const updated = await Booking.findOneAndUpdate({ _id: b._id, status: 'checked_in' }, { $set: { status: 'completed', checkOutAt: new Date() } }, { new: true }).populate(POPULATE);
  if (!updated) throw new ApiError(409, 'Booking already completed.');
  res.json({ booking: decorate(updated), message: 'Checked out. Thank you for using ParkWise!' });
});
