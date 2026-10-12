import { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import api from '../services/api.js';

function Highlight({ text, query }) {
  const q = query.trim();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (<>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>);
}

// City search box with live suggestions. Typing "ja" suggests Jaipur, Jodhpur, Jalandhar, etc.
export default function CitySearch({ value, onChange, onSubmit, placeholder = 'Search a city', label = 'Search cities', button = false }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const timer = useRef();
  const reqId = useRef(0);

  useEffect(() => {
    const term = value.trim();
    clearTimeout(timer.current);
    if (!term) { setItems([]); setOpen(false); setLoading(false); setActive(-1); return undefined; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const my = (reqId.current += 1);
      try {
        const { data } = await api.get('/cities', { params: { search: term } });
        if (my !== reqId.current) return;
        const q = term.toLowerCase();
        // Cities whose name starts with the query first (typing "ja" -> Jabalpur, Jaipur, Jalandhar…), then the rest.
        const ranked = (data.items || []).slice().sort((a, b) => {
          const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
          const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
          return ap - bp || a.name.localeCompare(b.name);
        });
        setItems(ranked.slice(0, 7));
        setOpen(true);
        setActive(-1);
      } catch {
        if (my === reqId.current) { setItems([]); setOpen(false); }
      } finally {
        if (my === reqId.current) setLoading(false);
      }
    }, 160);
    return () => clearTimeout(timer.current);
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (name) => {
    onChange(name);
    setOpen(false);
    setActive(-1);
    onSubmit?.(name);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
  };

  return (
    <form
      className="searchbar city-search"
      role="search"
      ref={wrapRef}
      onSubmit={(e) => { e.preventDefault(); if (open && active >= 0 && items[active]) pick(items[active].name); else { setOpen(false); onSubmit?.(value); } }}
    >
      <Search size={18} aria-hidden="true" />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={label}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => { if (items.length) setOpen(true); }}
      />
      {button && <button className="btn btn-primary btn-sm" type="submit">Search</button>}

      {open && (
        <ul className="autocomplete" role="listbox" aria-label="City suggestions">
          {loading && items.length === 0 && <li className="ac-empty">Searching…</li>}
          {!loading && items.length === 0 && <li className="ac-empty">No city matches “{value.trim()}”</li>}
          {items.map((c, i) => (
            <li key={c._id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`ac-item${i === active ? ' active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); pick(c.name); }}
                onMouseEnter={() => setActive(i)}
              >
                <MapPin size={15} aria-hidden="true" />
                <span className="ac-name"><Highlight text={c.name} query={value} /></span>
                <span className="ac-state">{c.state}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
