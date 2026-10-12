import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, MapPin, Navigation } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import ParkingCard from '../components/ParkingCard.jsx';
import MapView from '../components/MapView.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import ImageWithFallback from '../components/ImageWithFallback.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { directionsUrl } from '../utils/format.js';

export default function AttractionDetails() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(`/attractions/${id}`);
  const [img, setImg] = useState(0);
  if (loading) return <LoadingSpinner />;
  if (error) return <div className="container section"><ErrorMessage message={error} onRetry={reload} /></div>;
  const { attraction: a, parking } = data;
  const markers = [
    { lat: a.location.lat, lng: a.location.lng, label: a.name, type: 'attraction', sub: a.address },
    ...parking.map((p) => ({ lat: p.location.lat, lng: p.location.lng, label: p.name, type: 'parking', link: `/parking/${p._id}`, sub: `${p.distanceKm} km away` })),
  ];
  return (
    <div className="container section">
      <div className="detail-grid">
        <div>
          <div className="gallery">
            <ImageWithFallback src={a.images?.[img]} alt={a.name} className="gallery-main" />
            {a.images?.length > 1 && (
              <div className="thumbs">
                {a.images.map((src, i) => (
                  <button key={src} className={i === img ? 'active' : ''} onClick={() => setImg(i)} aria-label={`Show image ${i + 1}`}><ImageWithFallback src={src} alt="" /></button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="row-between"><span className="tag">{a.category}</span><FavoriteButton type="attraction" id={a._id} /></div>
          <h1>{a.name}</h1>
          <p className="muted"><MapPin size={16} aria-hidden="true" /> {a.address}, {a.city.name}</p>
          <p>{a.description || a.shortDescription}</p>
          <p><Clock size={16} aria-hidden="true" /> Opening hours: {a.hoursVerified ? a.openingHours : <span className="muted">Not verified yet</span>}</p>
          <a className="btn btn-ghost" href={directionsUrl(a.location.lat, a.location.lng)} target="_blank" rel="noreferrer"><Navigation size={16} aria-hidden="true" /> Directions to attraction</a>
        </div>
      </div>

      <h2>Parking near {a.name}</h2>
      <MapView markers={markers} height={360} />
      {parking.length === 0 ? <EmptyState title="No parking listed yet">Parking for this attraction has not been added.</EmptyState> : (
        <div className="grid grid-3 mt">{parking.map((p) => <ParkingCard key={p._id} parking={p} />)}</div>
      )}
    </div>
  );
}
