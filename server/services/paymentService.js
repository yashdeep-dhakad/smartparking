const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');
// Register referenced models so populate() works even when this service is used outside the HTTP app.
require('../models/City');
require('../models/Attraction');
require('../models/ParkingLocation');
require('../models/ParkingArea');
require('../models/ParkingSlot');
const { confirmBookingForPayment } = require('./bookingService');
const { sendBookingConfirmation } = require('./mailer');

const EMAIL_POPULATE = [
  { path: 'city', select: 'name state' },
  { path: 'attraction', select: 'name' },
  { path: 'location', select: 'name address' },
  { path: 'area', select: 'name' },
  { path: 'slot', select: 'code' },
];

// Emails the confirmation exactly once, right after the booking is confirmed.
async function emailConfirmationOnce(booking) {
  if (!booking || !['confirmed', 'checked_in'].includes(booking.status)) return;
  // Atomically claim the send so retries / webhooks don't email twice.
  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, confirmationEmailSentAt: null },
    { $set: { confirmationEmailSentAt: new Date() } },
    { new: true }
  ).populate(EMAIL_POPULATE);
  if (!claimed) return;
  try {
    const user = await User.findById(claimed.user);
    await sendBookingConfirmation(claimed, user);
  } catch (e) {
    console.warn('[mail] confirmation email failed:', e.message);
    // Release the claim so a later retry can try again.
    await Booking.updateOne({ _id: claimed._id }, { $set: { confirmationEmailSentAt: null } });
  }
}

// Marks a payment as paid and confirms the booking. SAFE TO CALL MANY TIMES (checkout callback + webhook + retries).
// Only call this AFTER the signature has been verified.
async function markPaid(payment, razorpayPaymentId, source) {
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: 'paid' } },
    { $set: { status: 'paid', razorpayPaymentId, verificationStatus: 'verified', confirmedVia: source, paidAt: new Date(), failureReason: null } },
    { new: true }
  );
  const duplicate = !updated;
  const current = updated || (await Payment.findById(payment._id));

  // Always run the (idempotent) confirmation so a crash between the two steps can self-heal on retry.
  const { booking, needsRefund } = await confirmBookingForPayment(payment.booking);
  if (needsRefund && !current.needsRefund) {
    current.needsRefund = true;
    await current.save();
  }

  // Send the confirmation email to the registered address (never blocks the payment response).
  await emailConfirmationOnce(booking);

  return { payment: current, booking, duplicate, needsRefund };
}

module.exports = { markPaid };
