import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch.js';
import AttractionCard from '../components/AttractionCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Attractions() {
  const [sp, setSp] = useSearchParams();
  const [text, setText] = useState(sp.get('search') || '');
  const p = { city: sp.get('city') || undefined, category: sp.get('category') || undefined, search: sp.get('search') || undefined, sort: sp.get('sort') || 'popular', page: Number(sp.get('page')) || 1, limit: 9 };
  const cities = useFetch('/cities');
  const cats = useFetch('/attractions/categories');
  const { data, loading, error, reload } = useFetch('/attractions', p);

  const update = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setSp(next);
  };

  return (
    <div className="container section">
      <h1>Attractions</h1>
      <div className="toolbar">
        <SearchBar value={text} onChange={setText} onSubmit={(v) => update({ search: v })} placeholder="Search attractions" label="Search attractions" button />
        <label className="field-inline">City
          <select value={p.city || ''} onChange={(e) => update({ city: e.target.value })}>
            <option value="">All cities</option>
            {cities.data?.items.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field-inline">Sort
          <select value={p.sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="popular">Most popular</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>
      <div className="chips chips-filter" role="group" aria-label="Category filter">
        <button className={`chip-btn ${!p.category ? 'active' : ''}`} onClick={() => update({ category: '' })}>All</button>
        {cats.data?.items.map((c) => <button key={c} className={`chip-btn ${p.category === c ? 'active' : ''}`} onClick={() => update({ category: c })}>{c}</button>)}
      </div>
      {loading && <LoadingSpinner />}
      <ErrorMessage message={error} onRetry={reload} />
      {!loading && !error && data?.items.length === 0 && <EmptyState title="No attractions found">Try another category or search term.</EmptyState>}
      <div className="grid grid-3">{data?.items.map((a) => <AttractionCard key={a._id} attraction={a} />)}</div>
      {data && <Pagination page={data.page} pages={data.pages} onChange={(n) => update({ page: String(n) })} />}
    </div>
  );
}
