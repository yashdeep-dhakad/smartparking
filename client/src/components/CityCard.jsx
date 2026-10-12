import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback.jsx';

export default function CityCard({ city }) {
  return (
    <Link to={`/cities/${city.slug}`} className="card card-link city-card">
      <ImageWithFallback src={city.image} alt={city.name} className="card-img" />
      <div className="card-body">
        <h3>{city.name}</h3>
        <p className="muted"><MapPin size={14} aria-hidden="true" /> {city.state}</p>
        <p className="clamp-2">{city.description}</p>
        <span className="tag">{city.attractionCount} attraction{city.attractionCount === 1 ? '' : 's'}</span>
      </div>
    </Link>
  );
}
