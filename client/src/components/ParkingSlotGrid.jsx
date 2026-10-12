import { CheckCircle2, Car, XCircle, Lock, Wrench } from 'lucide-react';

const LABEL = { available: 'Available', occupied: 'Occupied', reserved: 'Booked', inactive: 'Unavailable' };
const ICON = { available: Car, occupied: XCircle, reserved: Lock, inactive: Wrench };

export function SlotLegend() {
  return (
    <ul className="legend" aria-label="Slot colour legend">
      {Object.entries(LABEL).map(([k, v]) => (
        <li key={k}><span className={`swatch slot-${k}`} aria-hidden="true" /> {v}</li>
      ))}
      <li><span className="swatch slot-selected" aria-hidden="true" /> Your choice</li>
    </ul>
  );
}

// areas: [{ _id, name, slots: [{ _id, code, status, reason }] }]
export default function ParkingSlotGrid({ areas, selectedId, onSelect }) {
  return (
    <div className="slot-areas">
      {areas.map((area) => {
        const free = area.slots.filter((s) => s.status === 'available').length;
        return (
          <section key={area._id} className="slot-area" aria-label={area.name}>
            <div className="slot-area-head">
              <h4>{area.name}</h4>
              <span className={`slot-area-count ${free === 0 ? 'is-full' : ''}`}>
                {free}/{area.slots.length} free
              </span>
            </div>
            {area.slots.length === 0 ? <p className="muted small">No slots configured.</p> : (
              <div className="slot-grid" role="group" aria-label={`${area.name} slots`}>
                {area.slots.map((s) => {
                  const selected = s._id === selectedId;
                  const status = selected ? 'selected' : s.status;
                  const Icon = selected ? CheckCircle2 : ICON[s.status];
                  return (
                    <button
                      key={s._id}
                      type="button"
                      className={`slot slot-${status}`}
                      disabled={s.status !== 'available'}
                      aria-pressed={selected}
                      aria-label={`Slot ${s.code}, ${selected ? 'selected' : LABEL[s.status]}${s.reason ? `, ${s.reason}` : ''}`}
                      title={s.reason || LABEL[s.status]}
                      onClick={() => onSelect(s, area)}
                    >
                      <Icon size={16} aria-hidden="true" />
                      <strong>{s.code}</strong>
                      <span>{selected ? 'Selected' : LABEL[s.status]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
