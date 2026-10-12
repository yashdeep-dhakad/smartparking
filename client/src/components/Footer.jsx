import { Link } from 'react-router-dom';
import { Logo } from './Navbar.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <Logo />
          <p className="muted small">Find attractions, compare nearby parking and reserve before you arrive.</p>
        </div>
        <nav aria-label="Footer">
          <Link to="/info/about">About</Link>
          <Link to="/info/contact">Contact</Link>
          <Link to="/info/terms">Terms</Link>
          <Link to="/info/privacy">Privacy</Link>
        </nav>
      </div>
      <p className="container muted small footer-note">College project. Parking records marked “Demo data” are samples, not verified information. Payments run in Razorpay test mode.</p>
    </footer>
  );
}
