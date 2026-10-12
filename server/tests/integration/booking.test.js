// Integration tests - need a running MongoDB and seeded data:
//   cd server && npm run seed && npm run test:integration
// They create temporary users/bookings/payments and delete them afterwards.
const test = require('node:test');
const assert = require('node:assert');
require('../../config/env');
const mongoose = require('mongoose');
const connectDB = require('../../config/db');
const User = require('../../models/User');
const Booking = require('../../models/Booking');
const Payment = require('../../models/Payment');
const ParkingSlot = require('../../models/ParkingSlot');
const { createPendingBooking, expireStaleHolds } = require('../../services/bookingService');
const { markPaid } = require('../../services/paymentService');

const tag = `it_${Date.now()}`;
let slot; let u1; let u2;
const day = new Date(Date.now() + 2 * 86400000 + 330 * 60000).toISOString().slice(0, 10);
const range = (from, to) => ({ startTime: new Date(`${day}T${from}:00+05:30`).toISOString(), endTime: new Date(`${day}T${to}:00+05:30`).toISOString() });

test.before(async () => {
  await connectDB();
  slot = await ParkingSlot.findOne({ isActive: true, manualStatus: 'available', vehicleTypes: 'car' }).populate('location');
  assert.ok(slot, 'Run `npm run seed` first');
  u1 = await User.create({ name: 'IT One', email: `${tag}_1@test.local`, password: 'Password@123' });
  u2 = await User.create({ name: 'IT Two', email: `${tag}_2@test.local`, password: 'Password@123' });
});

test.after(async () => {
  const ids = [u1?._id, u2?._id].filter(Boolean);
  const bookings = await Booking.find({ user: { $in: ids } }).select('_id');
  await Payment.deleteMany({ booking: { $in: bookings.map((b) => b._id) } });
  await Booking.deleteMany({ user: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
  await mongoose.disconnect();
});

test('two users booking the same slot at the same time: exactly one wins', async () => {
  const args = { slotId: String(slot._id), vehicleType: 'car', ...range('11:00', '12:00') };
  const results = await Promise.allSettled([
    createPendingBooking({ userId: u1._id, ...args }),
    createPendingBooking({ userId: u2._id, ...args }),
  ]);
  const ok = results.filter((r) => r.status === 'fulfilled');
  const bad = results.filter((r) => r.status === 'rejected');
  assert.strictEqual(ok.length, 1, 'one booking should succeed');
  assert.strictEqual(bad.length, 1, 'one booking should fail');
  assert.strictEqual(bad[0].reason.status, 409);
  assert.strictEqual(await Booking.countDocuments({ slot: slot._id, user: { $in: [u1._id, u2._id] } }), 1);
});

test('overlapping but different times are rejected; adjacent times are allowed', async () => {
  await assert.rejects(createPendingBooking({ userId: u2._id, slotId: String(slot._id), vehicleType: 'car', ...range('11:30', '12:30') }), (e) => e.status === 409);
  const adjacent = await createPendingBooking({ userId: u2._id, slotId: String(slot._id), vehicleType: 'car', ...range('12:00', '13:00') });
  assert.ok(adjacent._id);
});

test('an expired unpaid hold no longer blocks the slot', async () => {
  const b = await Booking.findOne({ user: { $in: [u1._id, u2._id] }, status: 'pending_payment', startTime: new Date(range('11:00', '12:00').startTime) });
  assert.ok(b);
  await Booking.updateOne({ _id: b._id }, { $set: { holdExpiresAt: new Date(Date.now() - 1000) } });
  const retry = await createPendingBooking({ userId: u2._id, slotId: String(slot._id), vehicleType: 'car', ...range('11:00', '12:00') });
  assert.ok(retry._id);
  await expireStaleHolds();
  assert.strictEqual((await Booking.findById(b._id)).status, 'expired');
});

test('duplicate payment confirmation is idempotent', async () => {
  const booking = await createPendingBooking({ userId: u1._id, slotId: String(slot._id), vehicleType: 'car', ...range('15:00', '16:00') });
  const payment = await Payment.create({ booking: booking._id, user: u1._id, razorpayOrderId: `order_${tag}`, amountPaise: booking.amountPaise, status: 'created' });
  const first = await markPaid(payment, `pay_${tag}`, 'checkout');
  const second = await markPaid(payment, `pay_${tag}`, 'webhook');
  assert.strictEqual(first.duplicate, false);
  assert.strictEqual(second.duplicate, true);
  assert.strictEqual((await Booking.findById(booking._id)).status, 'confirmed');
  assert.strictEqual(await Payment.countDocuments({ booking: booking._id, status: 'paid' }), 1);
});
