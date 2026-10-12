const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ParkingSlot = require('../models/ParkingSlot');
const ParkingArea = require('../models/ParkingArea');
const ParkingLocation = require('../models/ParkingLocation');
const { computePrice } = require('../utils/pricing');
const { checkOperatingHours } = require('../utils/time');
const { generateReference, generateToken } = require('../utils/crypto');

const MIN_MINUTES = 30;
const MAX_MINUTES = 24 * 60;
const MAX_ADVANCE_DAYS = 30;
const MAX_OPEN_HOLDS = 3;
const BLOCKING = ['confirmed', 'checked_in'];

// ---------- time range ----------
function parseRange(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new ApiError(400, 'Invalid date or time.');
  const now = Date.now();
  if (end <= start) throw new ApiError(400, 'End time must be after start time.');
  if (start.getTime() < now - 5 * 60 * 1000) throw new ApiError(400, 'Start time is in the past.');
  if (start.getTime() > now + MAX_ADVANCE_DAYS * 86400000) throw new ApiError(400, `You can book up to ${MAX_ADVANCE_DAYS} days in advance.`);
  const durationMinutes = Math.round((end - start) / 60000);
  if (durationMinutes < MIN_MINUTES) throw new ApiError(400, `Minimum booking is ${MIN_MINUTES} minutes.`);
  if (durationMinutes > MAX_MINUTES) throw new ApiError(400, 'Maximum booking length is 24 hours.');
  return { start, end, durationMinutes };
}

// ---------- conflicts ----------
// A booking blocks a slot if it is confirmed / checked in, or it is an UNEXPIRED payment hold.
function blockingFilter(now = new Date()) {
  return { $or: [{ status: { $in: BLOCKING } }, { status: 'pending_payment', holdExpiresAt: { $gt: now } }] };
}

async function hasConflict({ slotId, start, end, excludeId }) {
  const q = { slot: slotId, startTime: { $lt: end }, endTime: { $gt: start }, ...blockingFilter() };
  if (excludeId) q._id = { $ne: excludeId };
  return !!(await Booking.exists(q));
}

// ---------- slot lock (atomic reservation without needing replica-set transactions) ----------
async function acquireSlotLock(slotId) {
  const token = crypto.randomBytes(8).toString('hex');
  const now = new Date();
  const doc = await ParkingSlot.findOneAndUpdate(
    { _id: slotId, $or: [{ lockUntil: null }, { lockUntil: { $exists: false } }, { lockUntil: { $lt: now } }] },
    { $set: { lockUntil: new Date(now.getTime() + 10000), lockToken: token } },
    { new: true }
  );
  return doc ? token : null;
}
async function releaseSlotLock(slotId, token) {
  await ParkingSlot.updateOne({ _id: slotId, lockToken: token }, { $set: { lockUntil: null, lockToken: null } });
}
async function withSlotLock(slotId, fn) {
  let token = null;
  for (let i = 0; i < 8 && !token; i++) {
    token = await acquireSlotLock(slotId);
    if (!token) await new Promise((r) => setTimeout(r, 120));
  }
  if (!token) throw new ApiError(409, 'This slot is being booked by someone else. Please try again.');
  try {
    return await fn();
  } finally {
    await releaseSlotLock(slotId, token);
  }
}

// ---------- context + quote ----------
async function loadSlotContext(slotId) {
  const slot = await ParkingSlot.findById(slotId);
  if (!slot) throw new ApiError(404, 'Parking slot not found.');
  const [area, location] = await Promise.all([
    ParkingArea.findById(slot.area),
    ParkingLocation.findById(slot.location).populate('attraction', 'name').populate('city', 'name state'),
  ]);
  if (!area || !location) throw new ApiError(404, 'Parking location not found.');
  return { slot, area, location };
}

function unavailableReason({ slot, area, location, vehicleType }) {
  if (!location.isActive || !area.isActive || !slot.isActive) return 'This slot is not open for booking.';
  if (slot.manualStatus === 'occupied') return 'This slot is marked as occupied by the operator.';
  if (!slot.vehicleTypes.includes(vehicleType) || !location.vehicleTypes.includes(vehicleType)) return `This slot does not accept ${vehicleType}.`;
  return null;
}

function priceFor(location, vehicleType, durationMinutes) {
  const rule = location.pricing.find((p) => p.vehicleType === vehicleType);
  if (!rule) throw new ApiError(400, `No price is configured for ${vehicleType} at this location.`);
  return computePrice({ rule, durationMinutes, convenienceFee: location.convenienceFee, taxPercent: location.taxPercent });
}

async function buildQuote({ slotId, vehicleType, startTime, endTime }) {
  const { start, end, durationMinutes } = parseRange(startTime, endTime);
  const ctx = await loadSlotContext(slotId);
  const hoursErr = checkOperatingHours(ctx.location.operatingHours, start, end);
  if (hoursErr) throw new ApiError(400, hoursErr);
  const price = priceFor(ctx.location, vehicleType, durationMinutes);
  let reason = unavailableReason({ ...ctx, vehicleType });
  if (!reason && (await hasConflict({ slotId, start, end }))) reason = 'This slot is already reserved for the selected time.';
  return {
    ...ctx,
    vehicleType,
    start,
    end,
    durationMinutes,
    price,
    available: !reason,
    unavailableReason: reason,
  };
}

function publicQuote(q) {
  return {
    city: q.location.city,
    attraction: q.location.attraction,
    location: {
      _id: q.location._id,
      name: q.location.name,
      address: q.location.address,
      type: q.location.type,
      verified: q.location.verified,
      dataSource: q.location.dataSource,
      coords: q.location.location,
    },
    area: { _id: q.area._id, name: q.area.name },
    slot: { _id: q.slot._id, code: q.slot.code },
    vehicleType: q.vehicleType,
    startTime: q.start,
    endTime: q.end,
    durationMinutes: q.durationMinutes,
    price: q.price,
    available: q.available,
    unavailableReason: q.unavailableReason,
  };
}

// ---------- create pending booking (temporary hold) ----------
async function createPendingBooking({ userId, slotId, vehicleType, startTime, endTime }) {
  const now = new Date();
  const openHolds = await Booking.countDocuments({ user: userId, status: 'pending_payment', holdExpiresAt: { $gt: now } });

  const q = await buildQuote({ slotId, vehicleType, startTime, endTime });
  if (q.unavailableReason && !q.available && !q.unavailableReason.includes('already reserved')) throw new ApiError(409, q.unavailableReason);

  return withSlotLock(slotId, async () => {
    // Re-use this user's identical unexpired hold (e.g. page refresh / double click).
    const mine = await Booking.findOne({
      user: userId, slot: slotId, startTime: q.start, endTime: q.end, status: 'pending_payment', holdExpiresAt: { $gt: new Date() },
    });
    if (mine) return mine;

    if (openHolds >= MAX_OPEN_HOLDS) throw new ApiError(429, 'You already have several unpaid bookings. Pay for or cancel one first.');

    // Authoritative conflict check INSIDE the lock.
    if (await hasConflict({ slotId, start: q.start, end: q.end })) {
      throw new ApiError(409, 'Sorry, this slot was just reserved by someone else. Please pick another slot.');
    }

    const doc = {
      user: userId,
      city: q.location.city._id,
      attraction: q.location.attraction._id,
      location: q.location._id,
      area: q.area._id,
      slot: q.slot._id,
      vehicleType,
      startTime: q.start,
      endTime: q.end,
      durationMinutes: q.durationMinutes,
      baseAmountPaise: q.price.baseAmountPaise,
      feeAmountPaise: q.price.feeAmountPaise,
      taxAmountPaise: q.price.taxAmountPaise,
      amountPaise: q.price.totalPaise,
      status: 'pending_payment',
      paymentStatus: 'created',
      holdExpiresAt: new Date(Date.now() + env.holdMinutes * 60000),
    };
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await Booking.create({ ...doc, reference: generateReference(), checkInToken: generateToken() });
      } catch (e) {
        if (e.code === 11000 && attempt < 4) continue;
        throw e;
      }
    }
    return null;
  });
}

// ---------- expiry of abandoned holds ----------
async function expireStaleHolds() {
  const now = new Date();
  const stale = await Booking.find({ status: 'pending_payment', holdExpiresAt: { $lte: now } }).select('_id');
  if (!stale.length) return 0;
  const ids = stale.map((b) => b._id);
  await Booking.updateMany({ _id: { $in: ids }, status: 'pending_payment' }, { $set: { status: 'expired' } });
  await Payment.updateMany(
    { booking: { $in: ids }, status: { $in: ['created', 'pending'] } },
    { $set: { status: 'failed', failureReason: 'Booking hold expired before payment was completed.' } }
  );
  return ids.length;
}

// ---------- confirm after a VERIFIED payment (idempotent) ----------
async function confirmBookingForPayment(bookingId) {
  const confirmUpdate = { $set: { status: 'confirmed', paymentStatus: 'paid' }, $unset: { holdExpiresAt: 1 } };
  let booking = await Booking.findOneAndUpdate({ _id: bookingId, status: 'pending_payment' }, confirmUpdate, { new: true });
  if (booking) return { booking, needsRefund: false };

  booking = await Booking.findById(bookingId);
  if (!booking) return { booking: null, needsRefund: true };

  if (['confirmed', 'checked_in', 'completed'].includes(booking.status)) {
    if (booking.paymentStatus !== 'paid') {
      booking.paymentStatus = 'paid';
      await booking.save();
    }
    return { booking, needsRefund: false };
  }

  if (booking.status === 'expired' && booking.endTime > new Date()) {
    // Late payment (callback arrived after the hold expired): confirm only if the slot is still free.
    try {
      return await withSlotLock(booking.slot, async () => {
        if (await hasConflict({ slotId: booking.slot, start: booking.startTime, end: booking.endTime, excludeId: booking._id })) {
          await Booking.updateOne({ _id: booking._id }, { $set: { paymentStatus: 'paid' } });
          return { booking, needsRefund: true };
        }
        const updated = await Booking.findOneAndUpdate({ _id: booking._id, status: 'expired' }, confirmUpdate, { new: true });
        return { booking: updated || booking, needsRefund: !updated };
      });
    } catch {
      return { booking, needsRefund: true };
    }
  }

  // Cancelled (or expired and already in the past): money received but nothing to confirm.
  await Booking.updateOne({ _id: booking._id }, { $set: { paymentStatus: 'paid' } });
  return { booking, needsRefund: true };
}

// ---------- availability grid for a parking location ----------
async function getLocationAvailability({ locationId, vehicleType, startTime, endTime }) {
  const location = await ParkingLocation.findOne({ _id: locationId, isActive: true });
  if (!location) throw new ApiError(404, 'Parking location not found.');
  if (!location.vehicleTypes.includes(vehicleType)) throw new ApiError(400, `This location does not accept ${vehicleType}.`);
  const { start, end, durationMinutes } = parseRange(startTime, endTime);
  const hoursErr = checkOperatingHours(location.operatingHours, start, end);
  if (hoursErr) throw new ApiError(400, hoursErr);
  const price = priceFor(location, vehicleType, durationMinutes);

  const [areas, slots, bookings] = await Promise.all([
    ParkingArea.find({ location: location._id, isActive: true }).sort({ code: 1 }).lean(),
    ParkingSlot.find({ location: location._id }).sort({ code: 1 }).select('-lockToken -lockUntil').lean(),
    Booking.find({ location: location._id, startTime: { $lt: end }, endTime: { $gt: start }, ...blockingFilter() }).select('slot').lean(),
  ]);
  const taken = new Set(bookings.map((b) => String(b.slot)));

  let available = 0;
  let total = 0;
  const out = areas.map((area) => {
    const areaSlots = slots
      .filter((s) => String(s.area) === String(area._id))
      .map((s) => {
        let status = 'available';
        let reason = '';
        if (!s.isActive) { status = 'inactive'; reason = 'Closed by operator'; }
        else if (!s.vehicleTypes.includes(vehicleType)) { status = 'inactive'; reason = `Not for ${vehicleType}`; }
        else if (s.manualStatus === 'occupied') { status = 'occupied'; reason = 'Marked occupied by operator'; }
        else if (taken.has(String(s._id))) { status = 'reserved'; reason = 'Reserved for this time'; }
        if (s.vehicleTypes.includes(vehicleType) && s.isActive) { total++; if (status === 'available') available++; }
        return { _id: s._id, code: s.code, status, reason };
      });
    return { _id: area._id, name: area.name, code: area.code, description: area.description, slots: areaSlots };
  });

  return { range: { startTime: start, endTime: end, durationMinutes }, price, summary: { available, total }, areas: out };
}

module.exports = {
  parseRange, hasConflict, withSlotLock, buildQuote, publicQuote, createPendingBooking,
  expireStaleHolds, confirmBookingForPayment, getLocationAvailability, priceFor,
};
