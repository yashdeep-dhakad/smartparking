import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, CreditCard, MapPinned, Search, Sparkles } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import CityCard from '../components/CityCard.jsx';
import AttractionCard from '../components/AttractionCard.jsx';
import ParkingCard from '../components/ParkingCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import SearchBar from '../components/SearchBar.jsx';

// Real parking photos (Wikimedia Commons) so the landing page shows parked cars/two-wheelers.
const HERO_PARKING = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Parking_lot_in_Ayyappa_society.jpg/1920px-Parking_lot_in_Ayyappa_society.jpg';
const HERO_BIKES = 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Bicycle_parking_at_Alewife_station%2C_August_2001.jpg';

function BayArt() {
  // Decorative parking-bay illustration (CSS only)
  const bays = ['free', 'free', 'taken', 'free', 'mine', 'free', 'taken', 'free'];
  return (
    <div className="bay-art" aria-hidden="true">
      {bays.map((b, i) => (<span key={i} className={`bay bay-${b}`}>{b === 'mine' ? 'P' : ''}</span>))}
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="hero-visual">
      <img className="hero-photo" src={HERO_PARKING} alt="Cars parked in a parking lot" />
      <img className="hero-photo-sm" src={HERO_BIKES} alt="Two-wheelers parked" loading="lazy" />
      <div className="hero-slot-card">
        <span className="hero-slot-title">Live slot map</span>
        <BayArt />
      </div>
    </div>
  );
}

export default function Home() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const cities = useFetch('/cities', { featured: true });
  const attractions = useFetch('/attractions', { sort: 'popular', limit: 4 });
  const parking = useFetch('/parking/featured');

  const go = (v) => nav(`/cities${v ? `?search=${encodeURIComponent(v)}` : ''}`);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="hero-badge"><Sparkles size={15} aria-hidden="true" /> Trusted parking across India</span>
            <h1>Find Your Perfect Parking Spot</h1>
            <p className="hero-sub">Discover attractions, compare nearby parking, and reserve your space before you arrive.</p>
            <div className="hero-search">
              <SearchBar value={q} onChange={setQ} onSubmit={go} placeholder="Search a city, e.g. Indore" label="Search cities" button />
            </div>
            <p className="hero-hint">No account needed to explore. You only log in when you book.</p>
            <div className="hero-stats">
              <div className="hero-stat"><strong>20+</strong><span>Cities</span></div>
              <div className="hero-stat"><strong>300+</strong><span>Parking spots</span></div>
              <div className="hero-stat"><strong>Live</strong><span>Slot availability</span></div>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="container section">
        <div className="section-head"><h2>Featured cities</h2><Link to="/cities">See all cities</Link></div>
        {cities.loading ? <LoadingSpinner /> : <ErrorMessage message={cities.error} onRetry={cities.reload} />}
        <div className="grid grid-4">{cities.data?.items.map((c) => <CityCard key={c._id} city={c} />)}</div>
      </section>

      <section className="container section">
        <div className="section-head"><h2>Popular attractions</h2><Link to="/attractions">Browse attractions</Link></div>
        {attractions.loading ? <LoadingSpinner /> : <ErrorMessage message={attractions.error} onRetry={attractions.reload} />}
        <div className="grid grid-4">{attractions.data?.items.map((a) => <AttractionCard key={a._id} attraction={a} />)}</div>
      </section>

      <section className="band">
        <div className="container section">
          <h2>How it works</h2>
          <ol className="steps">
            <li><Search aria-hidden="true" /><h3>Pick a place</h3><p>Choose a city and the attraction you are visiting.</p></li>
            <li><MapPinned aria-hidden="true" /><h3>Compare parking</h3><p>See nearby lots on the map with prices, hours and distance.</p></li>
            <li><CalendarCheck aria-hidden="true" /><h3>Choose a slot</h3><p>Select date, time and an available slot from the live grid.</p></li>
            <li><CreditCard aria-hidden="true" /><h3>Pay and park</h3><p>Log in only now, pay securely, then check in with your booking reference.</p></li>
          </ol>
        </div>
      </section>

      <section className="container section">
        <div className="section-head"><h2>Featured parking</h2><Link to="/parking">Find more parking</Link></div>
        {parking.loading ? <LoadingSpinner /> : <ErrorMessage message={parking.error} onRetry={parking.reload} />}
        <div className="grid grid-3">{parking.data?.items.map((p) => <ParkingCard key={p._id} parking={p} />)}</div>
      </section>
    </>
  );
}
