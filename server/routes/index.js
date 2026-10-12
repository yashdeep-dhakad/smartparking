const router = require('express').Router();
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const { authLimiter, paymentLimiter, bookingLimiter } = require('../middleware/rateLimit');
const v = require('../utils/validators');
const auth = require('../controllers/authController');
const pub = require('../controllers/publicController');
const booking = require('../controllers/bookingController');
const pay = require('../controllers/paymentController');
const fav = require('../controllers/favoriteController');
const admin = require('../controllers/adminController');

// ---------- auth ----------
router.post('/auth/register', authLimiter, validate(v.register), auth.register);
router.post('/auth/login', authLimiter, validate(v.login), auth.login);
router.post('/auth/admin/login', authLimiter, validate(v.login), auth.adminLogin);
router.get('/auth/me', protect, auth.me);
router.put('/auth/profile', protect, validate(v.profile), auth.updateProfile);
router.put('/auth/password', protect, authLimiter, validate(v.password), auth.changePassword);

// ---------- PUBLIC (guests can use all of these) ----------
router.get('/cities', pub.listCities);
router.get('/cities/states', pub.listStates);
router.get('/cities/:idOrSlug', pub.getCity);
router.get('/attractions/categories', pub.listCategories);
router.get('/attractions', pub.listAttractions);
router.get('/attractions/:id', pub.getAttraction);
router.get('/parking', pub.listParking);
router.get('/parking/featured', pub.featuredParking);
router.get('/parking/:id', pub.getParking);
router.get('/parking/:id/availability', pub.availability);
router.post('/bookings/quote', bookingLimiter, validate(v.quote), pub.quote);

// ---------- PROTECTED: bookings ----------
router.post('/bookings', protect, bookingLimiter, validate(v.createBooking), booking.create);
router.get('/bookings/mine', protect, booking.mine);
router.post('/bookings/check-in', protect, validate(v.checkin), booking.checkIn);
router.post('/bookings/check-out', protect, validate(v.checkin), booking.checkOut);
router.get('/bookings/:id/receipt', protect, booking.receipt);
router.post('/bookings/:id/resend-receipt', protect, booking.resendReceipt);
router.get('/bookings/:id', protect, booking.getOne);
router.post('/bookings/:id/cancel', protect, validate(v.cancel), booking.cancel);

// ---------- PROTECTED: payments (webhook is mounted in app.js with the raw body) ----------
router.get('/payments/config', protect, pay.config);
router.post('/payments/order', protect, paymentLimiter, validate(v.orderCreate), pay.createOrder);
router.post('/payments/demo-complete', protect, paymentLimiter, validate(v.orderCreate), pay.demoComplete);
router.post('/payments/verify', protect, paymentLimiter, validate(v.paymentVerify), pay.verify);
router.post('/payments/failed', protect, paymentLimiter, validate(v.paymentFailed), pay.recordFailure);

// ---------- PROTECTED: favorites ----------
router.get('/favorites', protect, fav.list);
router.get('/favorites/ids', protect, fav.ids);
router.post('/favorites', protect, validate(v.favorite), fav.add);
router.delete('/favorites/:type/:id', protect, fav.remove);

// ---------- ADMIN (every route: logged in AND role === admin, checked on the server) ----------
const a = require('express').Router();
a.use(protect, restrictTo('admin'));
a.get('/stats', admin.stats);
const mount = (path, c, schema) => {
  a.get(path, c.list);
  a.get(`${path}/:id`, c.get);
  a.post(path, validate(schema), c.create);
  a.patch(`${path}/:id`, validate(schema.partial()), c.update);
};
mount('/cities', admin.cities, v.city);
mount('/attractions', admin.attractions, v.attraction);
mount('/parking-locations', admin.locations, v.location);
a.get('/parking-areas', admin.areas.list);
a.post('/parking-areas', validate(v.area), admin.createArea);
a.patch('/parking-areas/:id', validate(v.area.partial()), admin.areas.update);
a.get('/parking-slots', admin.slots.list);
a.patch('/parking-slots/:id', validate(v.slot.partial()), admin.slots.update);
a.get('/parking-locations/:id/structure', admin.structure);
a.post('/parking-areas/:id/slots/bulk', validate(v.bulkSlots), admin.bulkSlots);
a.get('/bookings', admin.bookings);
a.get('/payments', admin.payments);
a.post('/payments/:id/mark-refunded', validate(v.markRefunded), admin.markRefunded);
a.get('/users', admin.users);
a.patch('/users/:id', validate(v.userAdmin.partial()), admin.updateUser);
router.use('/admin', a);

module.exports = router;
