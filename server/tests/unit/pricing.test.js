const test = require('node:test');
const assert = require('node:assert');
const { computePrice } = require('../../utils/pricing');

test('rounds partial hours up and adds fee + tax in paise', () => {
  const p = computePrice({ rule: { ratePerHour: 40, minHours: 1, dailyCap: 0 }, durationMinutes: 90, convenienceFee: 10, taxPercent: 18 });
  assert.strictEqual(p.billableHours, 2);
  assert.strictEqual(p.baseAmountPaise, 8000);
  assert.strictEqual(p.feeAmountPaise, 1000);
  assert.strictEqual(p.taxAmountPaise, 1620);
  assert.strictEqual(p.totalPaise, 10620);
});

test('respects minimum hours and daily cap', () => {
  assert.strictEqual(computePrice({ rule: { ratePerHour: 20, minHours: 2 }, durationMinutes: 30 }).baseAmountPaise, 4000);
  assert.strictEqual(computePrice({ rule: { ratePerHour: 40, minHours: 1, dailyCap: 100 }, durationMinutes: 600 }).baseAmountPaise, 10000);
});

test('amounts are integers', () => {
  const p = computePrice({ rule: { ratePerHour: 33.33, minHours: 1 }, durationMinutes: 61, convenienceFee: 7.5, taxPercent: 18 });
  for (const k of ['baseAmountPaise', 'feeAmountPaise', 'taxAmountPaise', 'totalPaise']) assert.ok(Number.isInteger(p[k]), k);
});
