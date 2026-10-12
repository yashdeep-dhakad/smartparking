const mongoose = require('mongoose');
const { PAYMENT_STATUSES } = require('../utils/constants');

// NOTE: no card data is ever stored. Only Razorpay identifiers and status.
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, default: 'razorpay' },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    amountPaise: { type: Number, required: true }, // integer paise
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'created' },
    verificationStatus: { type: String, enum: ['unverified', 'verified', 'failed'], default: 'unverified' },
    confirmedVia: { type: String, enum: ['checkout', 'webhook'] },
    failureReason: String,
    paidAt: Date,
    // Set when money was received but the booking could not be confirmed (e.g. hold expired and slot got taken).
    needsRefund: { type: Boolean, default: false },
    refundNote: String,
    refundedAt: Date,
  },
  { timestamps: true }
);
paymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: 'string' } } });

module.exports = mongoose.model('Payment', paymentSchema);
