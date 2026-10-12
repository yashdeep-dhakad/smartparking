import { useParams } from 'react-router-dom';
import NotFound from './NotFound.jsx';

const PAGES = {
  about: ['About ParkWise', ['ParkWise is a college project that helps people discover attractions, compare nearby parking and reserve a slot before they arrive.', 'All parking records marked “Demo data” are samples for demonstration. Operators can replace them with verified information in the admin panel.']],
  contact: ['Contact', ['Questions about a booking? Keep your booking reference (PW-XXXXXXXX) ready and email support@parkwise.example (placeholder address).']],
  terms: ['Terms of use', ['This is a demonstration application. Payments run in Razorpay test mode and no real money is charged.', 'Bookings can be cancelled free of charge until the cancellation deadline shown on the booking. Refunds are not automatic: refunds for paid bookings are handled manually by the operator.']],
  privacy: ['Privacy', ['We store your name, email, optional phone number and booking history to run the service. Passwords are hashed. Card details are handled entirely by Razorpay and are never stored by ParkWise.']],
};

export default function InfoPage() {
  const { slug } = useParams();
  const page = PAGES[slug];
  if (!page) return <NotFound />;
  return (
    <div className="container section narrow">
      <h1>{page[0]}</h1>
      {page[1].map((t) => <p key={t}>{t}</p>)}
    </div>
  );
}
