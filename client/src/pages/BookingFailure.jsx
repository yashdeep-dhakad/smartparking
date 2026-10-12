import { Link, useParams, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';

const REASONS = {
  expired: 'Your slot hold expired before payment was completed. The slot has been released.',
  cancelled: 'This booking was cancelled.',
  verification: 'We could not verify your payment. If money was deducted, it will not be lost: note your booking reference and contact support, or check My bookings in a few minutes.',
};

export default function BookingFailure() {
  const { bookingId } = useParams();
  const [sp] = useSearchParams();
  const { data } = useFetch(`/bookings/${bookingId}`);
  const booking = data?.booking;
  const reason = REASONS[sp.get('reason')] || 'Something went wrong with this booking.';
  const canRetry = booking?.status === 'pending_payment';

  return (
    <div className="container section narrow center-text">
      <XCircle size={48} color="#b42318" aria-hidden="true" />
      <h1>Booking not completed</h1>
      <p>{reason}</p>
      {booking && <p className="muted">Reference: {booking.reference}</p>}
      <div className="btn-row center">
        {canRetry && <Link className="btn btn-primary" to={`/payment/${bookingId}`}>Retry payment</Link>}
        {booking && <Link className="btn btn-primary" to={`/parking/${booking.location._id}`}>Choose another slot</Link>}
        <Link className="btn btn-ghost" to="/my-bookings">My bookings</Link>
      </div>
    </div>
  );
}
