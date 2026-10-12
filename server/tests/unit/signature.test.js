const test = require('node:test');
const assert = require('node:assert');
const { hmacHex, verifyCheckoutSignature, verifyWebhookSignature, generateReference } = require('../../utils/crypto');

const secret = 'test_secret_123';

test('accepts a correct checkout signature', () => {
  const signature = hmacHex('order_ABC|pay_XYZ', secret);
  assert.ok(verifyCheckoutSignature({ orderId: 'order_ABC', paymentId: 'pay_XYZ', signature, secret }));
});

test('rejects tampered order, payment, signature or secret', () => {
  const signature = hmacHex('order_ABC|pay_XYZ', secret);
  assert.ok(!verifyCheckoutSignature({ orderId: 'order_ABD', paymentId: 'pay_XYZ', signature, secret }));
  assert.ok(!verifyCheckoutSignature({ orderId: 'order_ABC', paymentId: 'pay_XXX', signature, secret }));
  assert.ok(!verifyCheckoutSignature({ orderId: 'order_ABC', paymentId: 'pay_XYZ', signature: 'abc', secret }));
  assert.ok(!verifyCheckoutSignature({ orderId: 'order_ABC', paymentId: 'pay_XYZ', signature, secret: 'other' }));
  assert.ok(!verifyCheckoutSignature({ orderId: 'order_ABC', paymentId: 'pay_XYZ', signature: undefined, secret }));
});

test('webhook signature uses the raw body', () => {
  const raw = Buffer.from('{"event":"payment.captured"}');
  const sig = hmacHex(raw, secret);
  assert.ok(verifyWebhookSignature(raw, sig, secret));
  assert.ok(!verifyWebhookSignature(Buffer.from('{"event":"payment.captured" }'), sig, secret));
});

test('booking references look right and differ', () => {
  const a = generateReference(); const b = generateReference();
  assert.match(a, /^PW-[A-Z2-9]{8}$/);
  assert.notStrictEqual(a, b);
});
