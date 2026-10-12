import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Cities from './pages/Cities.jsx';
import CityDetails from './pages/CityDetails.jsx';
import Attractions from './pages/Attractions.jsx';
import AttractionDetails from './pages/AttractionDetails.jsx';
import ParkingFinder from './pages/ParkingFinder.jsx';
import ParkingDetails from './pages/ParkingDetails.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import BookingReview from './pages/BookingReview.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import BookingSuccess from './pages/BookingSuccess.jsx';
import BookingFailure from './pages/BookingFailure.jsx';
import MyBookings from './pages/MyBookings.jsx';
import BookingDetails from './pages/BookingDetails.jsx';
import CheckIn from './pages/CheckIn.jsx';
import Favorites from './pages/Favorites.jsx';
import InfoPage from './pages/InfoPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ManageCities from './pages/ManageCities.jsx';
import ManageAttractions from './pages/ManageAttractions.jsx';
import ManageParking from './pages/ManageParking.jsx';
import ManageBookings from './pages/ManageBookings.jsx';
import ManagePayments from './pages/ManagePayments.jsx';
import NotFound from './pages/NotFound.jsx';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;
const A = ({ children }) => <ProtectedRoute admin>{children}</ProtectedRoute>;

export default function App() {
  return (
    <div className="app">
      <ScrollTop />
      <Navbar />
      <main id="main">
        <Routes>
          {/* Public: no login needed */}
          <Route path="/" element={<Home />} />
          <Route path="/cities" element={<Cities />} />
          <Route path="/cities/:idOrSlug" element={<CityDetails />} />
          <Route path="/attractions" element={<Attractions />} />
          <Route path="/attractions/:id" element={<AttractionDetails />} />
          <Route path="/parking" element={<ParkingFinder />} />
          <Route path="/parking/:id" element={<ParkingDetails />} />
          <Route path="/booking/review" element={<BookingReview />} />
          <Route path="/info/:slug" element={<InfoPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected: login required */}
          <Route path="/payment/:bookingId" element={<P><PaymentPage /></P>} />
          <Route path="/booking/success/:bookingId" element={<P><BookingSuccess /></P>} />
          <Route path="/booking/failure/:bookingId" element={<P><BookingFailure /></P>} />
          <Route path="/my-bookings" element={<P><MyBookings /></P>} />
          <Route path="/bookings/:id" element={<P><BookingDetails /></P>} />
          <Route path="/check-in" element={<P><CheckIn /></P>} />
          <Route path="/favorites" element={<P><Favorites /></P>} />

          {/* Admin only */}
          <Route path="/admin" element={<A><AdminDashboard /></A>} />
          <Route path="/admin/cities" element={<A><ManageCities /></A>} />
          <Route path="/admin/attractions" element={<A><ManageAttractions /></A>} />
          <Route path="/admin/parking" element={<A><ManageParking /></A>} />
          <Route path="/admin/bookings" element={<A><ManageBookings /></A>} />
          <Route path="/admin/payments" element={<A><ManagePayments /></A>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
