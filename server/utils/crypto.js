const crypto = require('crypto');

function hmacHex(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// Constant-time comparison of two strings.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Razorpay Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
function verifyCheckoutSignature({ orderId, paymentId, signature, secret }) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  return safeEqual(hmacHex(`${orderId}|${paymentId}`, secret), signature);
}

// Razorpay webhook signature: HMAC_SHA256(raw request body, webhook_secret)
function verifyWebhookSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  return safeEqual(hmacHex(rawBody, secret), signature);
}

function generateReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `PW-${out}`;
}

function generateToken() {
  return crypto.randomBytes(18).toString('hex');
}

module.exports = { hmacHex, safeEqual, verifyCheckoutSignature, verifyWebhookSignature, generateReference, generateToken };
