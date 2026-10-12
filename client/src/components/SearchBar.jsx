import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange, onSubmit, placeholder = 'Search…', label = 'Search', button = false }) {
  return (
    <form className="searchbar" role="search" onSubmit={(e) => { e.preventDefault(); onSubmit?.(value); }}>
      <Search size={18} aria-hidden="true" />
      <input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {button && <button className="btn btn-primary btn-sm" type="submit">Search</button>}
    </form>
  );
}
