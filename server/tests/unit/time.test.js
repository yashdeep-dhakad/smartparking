const test = require('node:test');
const assert = require('node:assert');
const { checkOperatingHours } = require('../../utils/time');

const at = (hhmm, day = '2030-01-10') => new Date(`${day}T${hhmm}:00+05:30`);
const hours = { is24x7: false, open: '06:00', close: '23:00' };

test('inside hours is allowed', () => assert.strictEqual(checkOperatingHours(hours, at('10:00'), at('12:00')), null));
test('before opening / after closing is rejected', () => {
  assert.ok(checkOperatingHours(hours, at('05:00'), at('07:00')));
  assert.ok(checkOperatingHours(hours, at('22:00'), at('23:30')));
});
test('crossing midnight is rejected unless 24x7', () => {
  assert.ok(checkOperatingHours(hours, at('22:00'), at('01:00', '2030-01-11')));
  assert.strictEqual(checkOperatingHours({ is24x7: true }, at('22:00'), at('01:00', '2030-01-11')), null);
});
