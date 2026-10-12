import useFetch from '../hooks/useFetch.js';
import AttractionCard from '../components/AttractionCard.jsx';
import ParkingCard from '../components/ParkingCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Favorites() {
  const { data, loading, error, reload } = useFetch('/favorites');
  if (loading) return <LoadingSpinner />;
  const none = data && !data.attractions.length && !data.parking.length;
  return (
    <div className="container section">
      <h1>Favorites</h1>
      <ErrorMessage message={error} onRetry={reload} />
      {none && <EmptyState title="No favorites yet">Tap the heart on an attraction or parking card to save it here.</EmptyState>}
      {data?.attractions.length > 0 && (<><h2>Attractions</h2><div className="grid grid-3">{data.attractions.map((a) => <AttractionCard key={a._id} attraction={a} />)}</div></>)}
      {data?.parking.length > 0 && (<><h2>Parking locations</h2><div className="grid grid-3">{data.parking.map((p) => <ParkingCard key={p._id} parking={p} />)}</div></>)}
    </div>
  );
}
