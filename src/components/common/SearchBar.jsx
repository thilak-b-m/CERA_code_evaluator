import { Search } from 'lucide-react';
export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return <div className="search-box"><Search size={15} /><input className="input" value={value} onChange={onChange} placeholder={placeholder} aria-label={placeholder} /></div>;
}