const mongoose = require('mongoose');
const { VEHICLE_TYPES, BOOKING_STATUSES, PAYMENT_STATUSES } = require('../utils/constants');

const ref = (model, extra = {}) => ({ type: mongoose.Schema.Types.ObjectId, ref: model, required: true, ...extra });

const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    checkInToken: { type: String, required: true, unique: true },
    user: ref('User', { index: true }),
    city: ref('City'),
    attraction: ref('Attraction'),
    location: ref('ParkingLocation'),
    area: ref('ParkingArea'),
    slot: ref('ParkingSlot'),
    vehicleType: { type: String, enum: VEHICLE_TYPES, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    baseAmountPaise: { type: Number, required: true },
    feeAmountPaise: { type: Number, default: 0 },
    taxAmountPaise: { type: Number, default: 0 },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending_payment' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'created' },
    holdExpiresAt: { type: Date },
    confirmationEmailSentAt: { type: Date, default: null },
    checkInAt: Date,
    checkOutAt: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true }
);

// Fast overlap lookups per slot, user history, and the expiry job.
bookingSchema.index({ slot: 1, startTime: 1, endTime: 1, status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ status: 1, holdExpiresAt: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
