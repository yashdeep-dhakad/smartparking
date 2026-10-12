import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch.js';
import ParkingCard from '../components/ParkingCard.jsx';
import MapView from '../components/MapView.jsx';
import SearchBar from '../components/SearchBar.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { PARKING_TYPE, VEHICLES } from '../utils/format.js';

export default function ParkingFinder() {
  const [sp, setSp] = useSearchParams();
  const [text, setText] = useState(sp.get('search') || '');
  const city = sp.get('city') || '';
  const params = { city: city || undefined, attraction: sp.get('attraction') || undefined, type: sp.get('type') || undefined, vehicleType: sp.get('vehicleType') || undefined, search: sp.get('search') || undefined, page: Number(sp.get('page')) || 1, limit: 12 };
  const cities = useFetch('/cities');
  const attractions = useFetch('/attractions', { city: city || undefined, limit: 50 });
  const { data, loading, error, reload } = useFetch('/parking', params);

  const update = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if ('city' in patch) next.delete('attraction');
    setSp(next);
  };

  const markers = (data?.items || []).map((p) => ({ lat: p.location.lat, lng: p.location.lng, label: p.name, type: 'parking', link: `/parking/${p._id}`, sub: p.address }));

  return (
    <div className="container section">
      <h1>Find parking</h1>
      <div className="toolbar wrap">
        <SearchBar value={text} onChange={setText} onSubmit={(v) => update({ search: v })} placeholder="Search parking by name or address" label="Search parking" button />
        <label className="field-inline">City
          <select value={city} onChange={(e) => update({ city: e.target.value })}>
            <option value="">All cities</option>
            {cities.data?.items.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field-inline">Attraction
          <select value={params.attraction || ''} onChange={(e) => update({ attraction: e.target.value })}>
            <option value="">Any</option>
            {attractions.data?.items.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </label>
        <label className="field-inline">Type
          <select value={params.type || ''} onChange={(e) => update({ type: e.target.value })}>
            <option value="">Any</option>
            {Object.entries(PARKING_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="field-inline">Vehicle
          <select value={params.vehicleType || ''} onChange={(e) => update({ vehicleType: e.target.value })}>
            <option value="">Any</option>
            {Object.entries(VEHICLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      {loading && <LoadingSpinner />}
      <ErrorMessage message={error} onRetry={reload} />
      {!loading && !error && data?.items.length === 0 && <EmptyState title="No parking found">Change the filters to see more locations.</EmptyState>}
      {markers.length > 0 && <MapView markers={markers} height={320} />}
      <div className="grid grid-3 mt">{data?.items.map((p) => <ParkingCard key={p._id} parking={p} />)}</div>
      {data && <Pagination page={data.page} pages={data.pages} onChange={(n) => update({ page: String(n) })} />}
    </div>
  );
}
