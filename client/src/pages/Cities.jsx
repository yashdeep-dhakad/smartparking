import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch.js';
import CityCard from '../components/CityCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';

const PER_PAGE = 24;

export default function Cities() {
  const [sp, setSp] = useSearchParams();
  const [text, setText] = useState(sp.get('search') || '');
  const [page, setPage] = useState(1);
  const state = sp.get('state') || '';
  const search = sp.get('search') || '';
  const states = useFetch('/cities/states');
  const { data, loading, error, reload } = useFetch('/cities', { search: search || undefined, state: state || undefined });

  useEffect(() => { setPage(1); }, [search, state]);

  const update = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setSp(next);
  };

  const items = data?.items || [];
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const shown = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="container section">
      <div className="section-head">
        <h1>Explore cities</h1>
        {items.length > 0 && <span className="muted">{items.length} cit{items.length === 1 ? 'y' : 'ies'}</span>}
      </div>
      <div className="toolbar">
        <SearchBar value={text} onChange={setText} onSubmit={(v) => update({ search: v })} placeholder="Search cities" label="Search cities" button />
        <label className="field-inline">State
          <select value={state} onChange={(e) => update({ state: e.target.value })}>
            <option value="">All states</option>
            {states.data?.items.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      {loading && <LoadingSpinner />}
      <ErrorMessage message={error} onRetry={reload} />
      {!loading && !error && items.length === 0 && <EmptyState title="No cities match your search">Try a different name or clear the state filter.</EmptyState>}
      <div className="grid grid-4">{shown.map((c) => <CityCard key={c._id} city={c} />)}</div>
      {!loading && !error && <Pagination page={page} pages={pages} onChange={setPage} />}
    </div>
  );
}
