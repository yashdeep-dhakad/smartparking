const Razorpay = require('razorpay');
const env = require('../config/env');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ParkingLocation = require('../models/ParkingLocation');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyCheckoutSignature, verifyWebhookSignature } = require('../utils/crypto');
const { computePrice } = require('../utils/pricing');
const { markPaid } = require('../services/paymentService');

// Razorpay is considered configured only when real-looking keys are present.
function razorpayConfigured() {
  const { keyId, keySecret } = env.razorpay;
  return Boolean(keyId && keySecret && !keyId.includes('xxxx') && !keySecret.includes('replace_me'));
}

let client;
function getClient() {
  if (!razorpayConfigured()) {
    throw new ApiError(503, 'Razorpay is not configured on the server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test keys) to server/.env.');
  }
  if (!client) client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  return client;
}

// 0) Lets the client know whether real Razorpay checkout is available or demo mode is active.
exports.config = (req, res) => res.json({ demo: !razorpayConfigured() });

// 1) Create (or reuse) a Razorpay order. The amount ALWAYS comes from the server, never from the browser.
//    When Razorpay keys are missing we fall back to a local "demo" payment so the full flow stays testable.
exports.createOrder = asyncHandler(async (req, res) => {
  const demo = !razorpayConfigured();
  const rzp = demo ? null : getClient();
  const booking = await Booking.findOne({ _id: req.body.bookingId, user: req.user._id });
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (booking.status === 'confirmed' || booking.status === 'checked_in') throw new ApiError(409, 'This booking is already paid.');
  if (booking.status !== 'pending_payment') throw new ApiError(409, 'This booking can no longer be paid. Please start a new booking.');
  if (!booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) throw new ApiError(409, 'Your slot hold has expired. Please start a new booking.');

  // Recalculate from trusted pricing data.
  const location = await ParkingLocation.findById(booking.location);
  const rule = location?.pricing.find((p) => p.vehicleType === booking.vehicleType);
  if (!rule) throw new ApiError(409, 'Pricing is no longer available for this booking.');
  const price = computePrice({ rule, durationMinutes: booking.durationMinutes, convenienceFee: location.convenienceFee, taxPercent: location.taxPercent });
  if (price.totalPaise !== booking.amountPaise) {
    booking.baseAmountPaise = price.baseAmountPaise;
    booking.feeAmountPaise = price.feeAmountPaise;
    booking.taxAmountPaise = price.taxAmountPaise;
    booking.amountPaise = price.totalPaise;
    await booking.save();
  }

  let payment = await Payment.findOne({ booking: booking._id, status: 'created', amountPaise: booking.amountPaise }).sort({ createdAt: -1 });
  if (!payment) {
    if (demo) {
      payment = await Payment.create({
        booking: booking._id, user: req.user._id, razorpayOrderId: `demo_${booking._id}_${Date.now()}`, amountPaise: booking.amountPaise, currency: 'INR', status: 'created',
      });
    } else {
      let order;
      try {
        order = await rzp.orders.create({
          amount: booking.amountPaise,
          currency: 'INR',
          receipt: booking.reference,
          notes: { bookingId: String(booking._id), reference: booking.reference },
        });
      } catch (e) {
        console.error('[razorpay] order creation failed:', e?.error || e);
        throw new ApiError(502, `Could not start the payment: ${e?.error?.description || 'Razorpay rejected the request. Check your test keys.'}`);
      }
      payment = await Payment.create({
        booking: booking._id, user: req.user._id, razorpayOrderId: order.id, amountPaise: booking.amountPaise, currency: 'INR', status: 'created',
      });
    }
  }
  await Booking.updateOne({ _id: booking._id, status: 'pending_payment' }, { $set: { paymentStatus: 'pending' } });

  res.json({
    demo, // true => client should call /payments/demo-complete instead of opening Razorpay Checkout
    keyId: demo ? '' : env.razorpay.keyId, // public key id only – the secret never leaves the server
    orderId: payment.razorpayOrderId,
    amount: payment.amountPaise,
    currency: payment.currency,
    bookingId: booking._id,
    reference: booking.reference,
    holdExpiresAt: booking.holdExpiresAt,
    prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone || '' },
  });
});

// 1b) Demo checkout: confirms a booking whose payment was created in demo mode (no Razorpay keys).
//     Disabled automatically as soon as real Razorpay keys are configured.
exports.demoComplete = asyncHandler(async (req, res) => {
  if (razorpayConfigured()) throw new ApiError(403, 'Demo checkout is disabled because Razorpay is configured.');
  const booking = await Booking.findOne({ _id: req.body.bookingId, user: req.user._id });
  if (!booking) throw new ApiError(404, 'Booking not found.');

  if (booking.status === 'confirmed' || booking.status === 'checked_in') {
    const existing = await Payment.findOne({ booking: booking._id, status: 'paid' }).sort({ createdAt: -1 });
    const populated = await Booking.findById(booking._id).populate('location', 'name').populate('slot', 'code');
    return res.json({ duplicate: true, needsRefund: false, payment: existing, booking: populated, message: 'This booking is already paid.' });
  }
  if (booking.status !== 'pending_payment') throw new ApiError(409, 'This booking can no longer be paid. Please start a new booking.');
  if (!booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) throw new ApiError(409, 'Your slot hold has expired. Please start a new booking.');

  const payment = await Payment.findOne({ booking: booking._id }).sort({ createdAt: -1 });
  if (!payment) throw new ApiError(404, 'Payment record not found.');

  const result = await markPaid(payment, `demo_${payment.razorpayOrderId}`, 'demo');
  const populated = await Booking.findById(payment.booking).populate('location', 'name').populate('slot', 'code');
  res.json({
    duplicate: result.duplicate,
    needsRefund: result.needsRefund,
    payment: result.payment,
    booking: populated,
    message: result.needsRefund
      ? 'Payment received, but your slot could not be held any more. The operator will refund you manually.'
      : 'Demo payment approved and booking confirmed.',
  });
});

// 2) Browser sends Razorpay's response; the SERVER verifies the signature before confirming anything.
exports.verify = asyncHandler(async (req, res) => {
  if (!env.razorpay.keySecret) throw new ApiError(503, 'Razorpay is not configured on the server.');
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  const payment = await Payment.findOne({ razorpayOrderId: orderId, user: req.user._id });
  if (!payment) throw new ApiError(404, 'Payment record not found.');

  const ok = verifyCheckoutSignature({ orderId, paymentId, signature, secret: env.razorpay.keySecret });
  if (!ok) {
    await Payment.updateOne({ _id: payment._id, status: { $ne: 'paid' } }, { $set: { verificationStatus: 'failed', status: 'failed', failureReason: 'Signature verification failed' } });
    throw new ApiError(400, 'Payment verification failed. If money was deducted, contact support with your booking reference.');
  }
  const result = await markPaid(payment, paymentId, 'checkout');
  const booking = await Booking.findById(payment.booking).populate('location', 'name').populate('slot', 'code');
  res.json({
    duplicate: result.duplicate,
    needsRefund: result.needsRefund,
    payment: result.payment,
    booking,
    message: result.needsRefund
      ? 'Payment received, but your slot could not be held any more. The operator will refund you manually.'
      : 'Payment verified and booking confirmed.',
  });
});

// 3) Client tells us a payment failed / was cancelled (information only – never confirms anything).
exports.recordFailure = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ razorpayOrderId: req.body.razorpay_order_id, user: req.user._id });
  if (!payment) throw new ApiError(404, 'Payment record not found.');
  if (payment.status !== 'paid') {
    await Payment.updateOne({ _id: payment._id, status: { $ne: 'paid' } }, { $set: { status: 'failed', failureReason: req.body.reason || 'Payment failed or was cancelled' } });
    await Booking.updateOne({ _id: payment.booking, status: 'pending_payment' }, { $set: { paymentStatus: 'failed' } });
  }
  res.json({ ok: true });
});

// 4) Webhook (server-to-server). Uses the RAW body so the signature can be verified.
async function handleEvent(event) {
  const pay = event.payload?.payment?.entity;
  const orderId = pay?.order_id || event.payload?.order?.entity?.id;
  if (!orderId) return;
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) return;

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    if (!pay?.id) return;
    if (pay.amount !== payment.amountPaise || pay.currency !== payment.currency) {
      console.error('[webhook] amount/currency mismatch for order', orderId);
      return;
    }
    await markPaid(payment, pay.id, 'webhook');
  } else if (event.event === 'payment.failed') {
    await Payment.updateOne({ _id: payment._id, status: { $ne: 'paid' } }, { $set: { status: 'failed', failureReason: pay?.error_description || 'Payment failed' } });
    await Booking.updateOne({ _id: payment.booking, status: 'pending_payment' }, { $set: { paymentStatus: 'failed' } });
  }
}

exports.webhook = async (req, res) => {
  try {
    const secret = env.razorpay.webhookSecret;
    if (!secret) return res.status(503).json({ message: 'Webhook secret not configured.' });
    const raw = req.body; // Buffer (express.raw)
    if (!Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, req.get('x-razorpay-signature'), secret)) {
      return res.status(400).json({ message: 'Invalid webhook signature.' });
    }
    await handleEvent(JSON.parse(raw.toString('utf8')));
    res.json({ received: true });
  } catch (e) {
    console.error('[webhook] processing error', e);
    res.status(500).json({ message: 'Webhook processing error.' }); // non-2xx => Razorpay retries
  }
};
