import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback.jsx';
import FavoriteButton from './FavoriteButton.jsx';

export default function AttractionCard({ attraction: a }) {
  return (
    <article className="card attraction-card">
      <div className="card-img-wrap">
        <ImageWithFallback src={a.images?.[0]} alt={a.name} className="card-img" />
        <FavoriteButton type="attraction" id={a._id} />
        <span className="tag tag-float">{a.category}</span>
      </div>
      <div className="card-body">
        <h3>{a.name}</h3>
        <p className="muted"><MapPin size={14} aria-hidden="true" /> {a.city?.name}{a.city?.state ? `, ${a.city.state}` : ''}</p>
        <p className="clamp-2">{a.shortDescription}</p>
        <p className="muted small clamp-2">{a.address}</p>
        <Link className="btn btn-primary btn-block" to={`/attractions/${a._id}`}>View details</Link>
      </div>
    </article>
  );
}
