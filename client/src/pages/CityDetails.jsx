import { Link, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import AttractionCard from '../components/AttractionCard.jsx';
import ImageWithFallback from '../components/ImageWithFallback.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function CityDetails() {
  const { idOrSlug } = useParams();
  const { data, loading, error, reload } = useFetch(`/cities/${idOrSlug}`);
  if (loading) return <LoadingSpinner />;
  if (error) return <div className="container section"><ErrorMessage message={error} onRetry={reload} /></div>;
  const { city, featured } = data;
  return (
    <>
      <section className="page-hero">
        <ImageWithFallback src={city.image} alt={city.name} className="page-hero-img" />
        <div className="container page-hero-text">
          <h1>{city.name}</h1>
          <p><MapPin size={16} aria-hidden="true" /> {city.state}</p>
          <p className="lead">{city.description}</p>
        </div>
      </section>
      <section className="container section">
        <div className="section-head">
          <h2>Featured attractions in {city.name}</h2>
          <Link className="btn btn-primary" to={`/attractions?city=${city._id}`}>All attractions</Link>
        </div>
        <div className="grid grid-4">{featured.map((a) => <AttractionCard key={a._id} attraction={{ ...a, city }} />)}</div>
      </section>
    </>
  );
}
