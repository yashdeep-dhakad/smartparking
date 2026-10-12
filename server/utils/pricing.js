// Pure pricing logic (no database). All money is calculated in integer paise.
const toPaise = (rupees) => Math.round(Number(rupees) * 100);

function computePrice({ rule, durationMinutes, convenienceFee = 0, taxPercent = 0 }) {
  if (!rule) throw new Error('No pricing rule for this vehicle type');
  const billableHours = Math.max(rule.minHours || 1, Math.ceil(durationMinutes / 60));
  let baseAmountPaise = toPaise(rule.ratePerHour) * billableHours;
  if (rule.dailyCap && rule.dailyCap > 0) {
    baseAmountPaise = Math.min(baseAmountPaise, toPaise(rule.dailyCap));
  }
  const feeAmountPaise = toPaise(convenienceFee);
  const taxAmountPaise = Math.round(((baseAmountPaise + feeAmountPaise) * taxPercent) / 100);
  return {
    billableHours,
    ratePerHour: rule.ratePerHour,
    baseAmountPaise,
    feeAmountPaise,
    taxAmountPaise,
    taxPercent,
    totalPaise: baseAmountPaise + feeAmountPaise + taxAmountPaise,
    currency: 'INR',
  };
}

module.exports = { computePrice, toPaise };
