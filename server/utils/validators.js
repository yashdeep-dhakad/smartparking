const { z } = require('zod');
const { VEHICLE_TYPES, PARKING_TYPES, CATEGORIES } = require('./constants');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const isoDate = z.string().datetime({ offset: true, message: 'Invalid date/time' });
const vehicleType = z.enum(VEHICLE_TYPES);
const phone = z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Invalid phone number').optional().or(z.literal(''));
const url = z.string().trim().max(500).optional().or(z.literal(''));
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24h)');

exports.register = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  phone,
});
exports.login = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(72) });
exports.profile = z.object({ name: z.string().trim().min(2).max(80), phone });
exports.password = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72) });

exports.quote = z.object({ slotId: objectId, vehicleType, startTime: isoDate, endTime: isoDate });
exports.createBooking = exports.quote;
exports.orderCreate = z.object({ bookingId: objectId });
exports.paymentVerify = z.object({
  razorpay_order_id: z.string().min(5).max(64),
  razorpay_payment_id: z.string().min(5).max(64),
  razorpay_signature: z.string().min(10).max(200),
});
exports.paymentFailed = z.object({ razorpay_order_id: z.string().min(5).max(64), reason: z.string().max(300).optional() });
exports.checkin = z.object({ reference: z.string().trim().min(4).max(64) });
exports.favorite = z.object({ type: z.enum(['attraction', 'parking']), id: objectId });
exports.cancel = z.object({ reason: z.string().trim().max(200).optional() });

// ----- admin -----
exports.city = z.object({
  name: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  description: z.string().max(1000).optional(),
  image: url,
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
const coords = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
exports.attraction = z.object({
  name: z.string().trim().min(2).max(120),
  city: objectId,
  category: z.enum(CATEGORIES),
  shortDescription: z.string().max(200).optional(),
  description: z.string().max(4000).optional(),
  address: z.string().trim().min(3).max(300),
  location: coords,
  images: z.array(z.string().trim().max(500)).max(10).optional(),
  openingHours: z.string().max(200).optional(),
  hoursVerified: z.boolean().optional(),
  featured: z.boolean().optional(),
  popularity: z.number().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
});
exports.location = z.object({
  name: z.string().trim().min(2).max(140),
  attraction: objectId,
  type: z.enum(PARKING_TYPES),
  address: z.string().trim().min(3).max(300),
  location: coords,
  description: z.string().max(2000).optional(),
  images: z.array(z.string().trim().max(500)).max(10).optional(),
  vehicleTypes: z.array(vehicleType).min(1),
  pricing: z
    .array(
      z.object({
        vehicleType,
        ratePerHour: z.number().min(0).max(100000),
        minHours: z.number().int().min(1).max(24).optional(),
        dailyCap: z.number().min(0).max(1000000).optional(),
      })
    )
    .min(1),
  convenienceFee: z.number().min(0).max(10000).optional(),
  taxPercent: z.number().min(0).max(50).optional(),
  operatingHours: z.object({ is24x7: z.boolean(), open: hhmm, close: hhmm }),
  verified: z.boolean().optional(),
  dataSource: z.enum(['demo', 'operator', 'verified']).optional(),
  notes: z.string().max(1000).optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
exports.area = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(1).max(4),
  location: objectId,
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});
exports.slot = z.object({
  vehicleTypes: z.array(vehicleType).min(1),
  manualStatus: z.enum(['available', 'occupied']),
  isActive: z.boolean(),
});
exports.bulkSlots = z.object({ count: z.number().int().min(1).max(100), vehicleTypes: z.array(vehicleType).min(1) });
exports.userAdmin = z.object({ role: z.enum(['user', 'admin']), isActive: z.boolean() });
exports.markRefunded = z.object({ note: z.string().trim().max(300).optional() });
