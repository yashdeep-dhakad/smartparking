const rateLimit = require('express-rate-limit');

const make = (windowMs, max, message) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { message } });

exports.authLimiter = make(15 * 60 * 1000, 30, 'Too many attempts. Please try again in a few minutes.');
exports.paymentLimiter = make(15 * 60 * 1000, 60, 'Too many payment requests. Please try again shortly.');
exports.bookingLimiter = make(5 * 60 * 1000, 60, 'Too many booking requests. Please slow down.');
