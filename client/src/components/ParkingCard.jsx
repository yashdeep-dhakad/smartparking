import { Link } from 'react-router-dom';
import { Bike, Car, Clock, MapPin, Navigation, Zap } from 'lucide-react';
import VerifiedBadge from './VerifiedBadge.jsx';
import FavoriteButton from './FavoriteButton.jsx';
import { PARKING_TYPE, directionsUrl, formatRupees } from '../utils/format.js';

const ICON = { car: Car, bike: Bike, ev: Zap };

export default function ParkingCard({ parking: p }) {
  const hours = p.operatingHours?.is24x7 ? 'Open 24 hours' : `${p.operatingHours?.open}–${p.operatingHours?.close}`;
  return (
    <article className="card parking-card">
      <div className="card-body">
        <div className="row-between">
          <span className="tag">{PARKING_TYPE[p.type] || p.type}</span>
          <FavoriteButton type="parking" id={p._id} />
        </div>
        <h3>{p.name}</h3>
        <p className="muted small"><MapPin size={14} aria-hidden="true" /> {p.address}</p>
        <div className="chips">
          {p.vehicleTypes?.map((v) => { const I = ICON[v] || Car; return <span key={v} className="chip"><I size={14} aria-hidden="true" /> {v === 'bike' ? 'Two-wheeler' : v === 'ev' ? 'EV' : 'Car'}</span>; })}
        </div>
        <p className="small"><Clock size={14} aria-hidden="true" /> {hours}{!p.verified && ' (unverified)'}</p>
        <div className="row-between">
          <strong>{p.fromRate != null ? `From ${formatRupees(p.fromRate)}/hr` : 'Price on request'}</strong>
          {p.distanceKm != null && <span className="muted small">{p.distanceKm} km away</span>}
        </div>
        <VerifiedBadge verified={p.verified} dataSource={p.dataSource} />
        <div className="btn-row">
          <Link className="btn btn-primary" to={`/parking/${p._id}`}>View slots</Link>
          <a className="btn btn-ghost" href={directionsUrl(p.location.lat, p.location.lng)} target="_blank" rel="noreferrer"><Navigation size={16} aria-hidden="true" /> Directions</a>
        </div>
      </div>
    </article>
  );
}
