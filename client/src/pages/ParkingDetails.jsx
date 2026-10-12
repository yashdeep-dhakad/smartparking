import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Clock, MapPin, Navigation } from 'lucide-react';
import api, { errMsg } from '../services/api.js';
import useFetch from '../hooks/useFetch.js';
import { useBooking } from '../context/BookingContext.jsx';
import MapView from '../components/MapView.jsx';
import ParkingSlotGrid, { SlotLegend } from '../components/ParkingSlotGrid.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { PARKING_TYPE, VEHICLES, directionsUrl, formatINR, formatRupees, fmtDuration, istDate, toISO } from '../utils/format.js';

export default function ParkingDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { pending, setPending } = useBooking();
  const { data, loading, error, reload } = useFetch(`/parking/${id}`);

  // Restore a saved selection (e.g. after logging in) if it belongs to this parking location.
  const saved = pending?.parkingId === id ? pending : null;
  const [vehicleType, setVehicleType] = useState(saved?.vehicleType || '');
  const [date, setDate] = useState(saved?.form?.date || istDate(1));
  const [start, setStart] = useState(saved?.form?.start || '10:00');
  const [end, setEnd] = useState(saved?.form?.end || '12:00');
  const [selected, setSelected] = useState(saved?.slotId || '');
  const [avail, setAvail] = useState(null);
  const [availErr, setAvailErr] = useState('');
  const [checking, setChecking] = useState(false);
  const reqRef = useRef(0);

  const parking = data?.parking;
  useEffect(() => { if (parking && !vehicleType) setVehicleType(parking.vehicleTypes[0]); }, [parking, vehicleType]);

  const rangeError = useMemo(() => {
    if (!date || !start || !end) return 'Choose a date, start time and end time.';
    if (end <= start) return 'End time must be after the start time.';
    return '';
  }, [date, start, end]);

  // silent=true is used by the periodic refresh so the grid updates in place without a loading flash.
  const loadAvail = useCallback((silent = false) => {
    if (!parking || !vehicleType || rangeError) { setAvail(null); return; }
    const my = (reqRef.current += 1);
    if (!silent) { setChecking(true); setAvailErr(''); }
    api.get(`/parking/${id}/availability`, { params: { vehicleType, start: toISO(date, start), end: toISO(date, end) } })
      .then((r) => { if (my === reqRef.current) { setAvail(r.data); setAvailErr(''); } })
      .catch((e) => { if (my === reqRef.current && !silent) { setAvail(null); setAvailErr(errMsg(e)); } })
      .finally(() => { if (my === reqRef.current && !silent) setChecking(false); });
  }, [id, parking, vehicleType, date, start, end, rangeError]);

  useEffect(() => { loadAvail(false); }, [loadAvail]);
  // Poll every 20s so slots booked by other people show up as Booked without a manual reload.
  useEffect(() => {
    const t = setInterval(() => loadAvail(true), 20000);
    return () => clearInterval(t);
  }, [loadAvail]);

  // Drop the selection if that slot is no longer available for the chosen period.
  const selectedSlot = useMemo(() => {
    if (!avail || !selected) return null;
    for (const a of avail.areas) { const s = a.slots.find((x) => x._id === selected && x.status === 'available'); if (s) return { ...s, area: a }; }
    return null;
  }, [avail, selected]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="container section"><ErrorMessage message={error} onRetry={reload} /></div>;

  const hours = parking.operatingHours.is24x7 ? 'Open 24 hours' : `${parking.operatingHours.open} – ${parking.operatingHours.close} IST`;

  const bookNow = () => {
    setPending({
      parkingId: id, slotId: selectedSlot._id, vehicleType,
      startTime: toISO(date, start), endTime: toISO(date, end),
      form: { date, start, end },
    });
    nav('/booking/review');
  };

  return (
    <div className="container section">
      <p className="muted small"><Link to={`/attractions/${parking.attraction?._id}`}>← {parking.attraction?.name}</Link></p>
      <div className="row-between">
        <h1>{parking.name}</h1>
        <FavoriteButton type="parking" id={parking._id} />
      </div>
      <div className="chips">
        <span className="tag">{PARKING_TYPE[parking.type]}</span>
        <VerifiedBadge verified={parking.verified} dataSource={parking.dataSource} />
      </div>
      <p className="muted"><MapPin size={16} aria-hidden="true" /> {parking.address} · {parking.city?.name}</p>
      <p><Clock size={16} aria-hidden="true" /> {hours}{!parking.verified && <span className="muted"> (not verified)</span>}</p>
      {!parking.verified && (
        <div className="alert alert-warn" role="note">
          This is a <strong>demonstration record</strong>. Fees, hours and slot availability are sample data managed by the operator, not detected automatically.
        </div>
      )}
      {parking.description && <p>{parking.description}</p>}

      <div className="detail-grid">
        <div>
          <h2>Pricing</h2>
          <table className="table">
            <thead><tr><th>Vehicle</th><th>Rate / hour</th><th>Minimum</th><th>Daily cap</th></tr></thead>
            <tbody>
              {parking.pricing.map((p) => (
                <tr key={p.vehicleType}><td>{VEHICLES[p.vehicleType]}</td><td>{formatRupees(p.ratePerHour)}</td><td>{p.minHours} hr</td><td>{p.dailyCap ? formatRupees(p.dailyCap) : '—'}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">Plus {formatRupees(parking.convenienceFee)} convenience fee and {parking.taxPercent}% GST per booking.</p>
        </div>
        <div>
          <MapView height={240} markers={[{ lat: parking.location.lat, lng: parking.location.lng, label: parking.name, type: 'parking', sub: parking.address }, ...(parking.attraction?.location ? [{ ...parking.attraction.location, label: parking.attraction.name, type: 'attraction' }] : [])]} />
          <a className="btn btn-ghost mt" href={directionsUrl(parking.location.lat, parking.location.lng)} target="_blank" rel="noreferrer"><Navigation size={16} aria-hidden="true" /> Get directions</a>
          {parking.distanceKm != null && <span className="muted small"> {parking.distanceKm} km from {parking.attraction?.name}</span>}
        </div>
      </div>

      <section className="panel mt" aria-labelledby="pick-slot">
        <h2 id="pick-slot">Choose your slot</h2>
        <div className="form-row">
          <label>Vehicle
            <select value={vehicleType} onChange={(e) => { setVehicleType(e.target.value); setSelected(''); }}>
              {parking.vehicleTypes.map((v) => <option key={v} value={v}>{VEHICLES[v]}</option>)}
            </select>
          </label>
          <label>Date
            <input type="date" value={date} min={istDate(0)} max={istDate(30)} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>Start time
            <input type="time" step="1800" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>End time
            <input type="time" step="1800" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <p className="muted small">Times are in Indian Standard Time (IST). Availability is calculated for exactly this period.</p>

        <ErrorMessage message={rangeError || availErr} />
        {checking && <LoadingSpinner label="Checking availability…" />}

        {avail && !checking && (
          <>
            <div className="row-between">
              <p aria-live="polite"><strong>{avail.summary.available}</strong> of {avail.summary.total} slots available · {fmtDuration(avail.range.durationMinutes)} · <strong>{formatINR(avail.price.totalPaise)}</strong> total incl. fees &amp; GST</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadAvail(false)}>Refresh</button>
            </div>
            <SlotLegend />
            <ParkingSlotGrid areas={avail.areas} selectedId={selectedSlot?._id} onSelect={(s) => setSelected(s._id)} />
            <p className="muted small">Availability updates automatically. Slots booked by others are shown as <strong>Booked</strong> for your chosen time.</p>
          </>
        )}

        <div className="booking-bar">
          {selectedSlot ? (
            <p>Slot <strong>{selectedSlot.code}</strong> ({selectedSlot.area.name}) · {formatINR(avail.price.totalPaise)}</p>
          ) : <p className="muted">Select an available slot to continue.</p>}
          <button className="btn btn-primary" disabled={!selectedSlot} onClick={bookNow}>Book now</button>
        </div>
        <p className="muted small">You can explore everything without an account. You will be asked to log in only when you continue to payment, and your selection will be kept.</p>
      </section>
    </div>
  );
}
