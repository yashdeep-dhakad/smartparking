import { fmtDate, fmtDuration, fmtTime, formatINR, VEHICLES } from '../utils/format.js';

// Works with both a quote (public) and a saved booking object.
export default function BookingSummary({ data }) {
  const price = data.price || {
    baseAmountPaise: data.baseAmountPaise, feeAmountPaise: data.feeAmountPaise, taxAmountPaise: data.taxAmountPaise, totalPaise: data.amountPaise,
  };
  const rows = [
    ['City', data.city?.name],
    ['Attraction', data.attraction?.name],
    ['Parking', data.location?.name],
    ['Address', data.location?.address],
    ['Area / Slot', `${data.area?.name} / ${data.slot?.code}`],
    ['Vehicle', VEHICLES[data.vehicleType] || data.vehicleType],
    ['Date', fmtDate(data.startTime)],
    ['Time', `${fmtTime(data.startTime)} – ${fmtTime(data.endTime)} (IST)`],
    ['Duration', fmtDuration(data.durationMinutes)],
  ];
  return (
    <div className="summary">
      <dl>
        {rows.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
      </dl>
      <dl className="price-lines">
        <div><dt>Parking fee</dt><dd>{formatINR(price.baseAmountPaise)}</dd></div>
        {price.feeAmountPaise > 0 && <div><dt>Convenience fee</dt><dd>{formatINR(price.feeAmountPaise)}</dd></div>}
        {price.taxAmountPaise > 0 && <div><dt>Taxes (GST)</dt><dd>{formatINR(price.taxAmountPaise)}</dd></div>}
        <div className="total"><dt>Total</dt><dd>{formatINR(price.totalPaise)}</dd></div>
      </dl>
    </div>
  );
}
