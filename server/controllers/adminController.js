const mongoose = require('mongoose');
const User = require('../models/User');
const City = require('../models/City');
const Attraction = require('../models/Attraction');
const ParkingLocation = require('../models/ParkingLocation');
const ParkingArea = require('../models/ParkingArea');
const ParkingSlot = require('../models/ParkingSlot');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { str, oid, bool, pageParams } = require('../utils/query');
const { escapeRegex, slugify } = require('../utils/time');

// ---------- generic CRUD factory (no hard delete: admins deactivate instead) ----------
async function uniqueSlug(Model, name) {
  const base = slugify(name) || 'item';
  let slug = base;
  for (let i = 0; i < 5 && (await Model.exists({ slug })); i++) slug = `${base}-${Math.random().toString(36).slice(2, 5)}`;
  return slug;
}

function crud(Model, { filters = [], searchFields = ['name'], populate = [], sort = { createdAt: -1 }, beforeSave, slug = false }) {
  return {
    list: asyncHandler(async (req, res) => {
      const f = {};
      filters.forEach((k) => { if (oid(req.query[k])) f[k] = oid(req.query[k]); });
      if (bool(req.query.isActive) !== undefined) f.isActive = bool(req.query.isActive);
      const s = str(req.query.search);
      if (s) f.$or = searchFields.map((k) => ({ [k]: new RegExp(escapeRegex(s), 'i') }));
      const { page, limit, skip } = pageParams(req.query, 20, 200);
      const [items, total] = await Promise.all([
        Model.find(f).sort(sort).skip(skip).limit(limit).populate(populate).lean(),
        Model.countDocuments(f),
      ]);
      res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
    }),
    get: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id).populate(populate).lean();
      if (!doc) throw new ApiError(404, 'Not found.');
      res.json({ item: doc });
    }),
    create: asyncHandler(async (req, res) => {
      let body = req.body;
      if (beforeSave) body = await beforeSave(body);
      if (slug) body.slug = await uniqueSlug(Model, body.name);
      res.status(201).json({ item: await Model.create(body) });
    }),
    update: asyncHandler(async (req, res) => {
      let body = req.body;
      if (beforeSave) body = await beforeSave(body);
      const doc = await Model.findByIdAndUpdate(req.params.id, { $set: body }, { new: true, runValidators: true });
      if (!doc) throw new ApiError(404, 'Not found.');
      res.json({ item: doc });
    }),
  };
}

exports.cities = crud(City, { searchFields: ['name', 'state'], sort: { name: 1 }, slug: true });
exports.attractions = crud(Attraction, { filters: ['city'], populate: [{ path: 'city', select: 'name' }], sort: { name: 1 }, slug: true });
exports.locations = crud(ParkingLocation, {
  filters: ['city', 'attraction'],
  populate: [{ path: 'attraction', select: 'name' }, { path: 'city', select: 'name' }],
  sort: { name: 1 },
  beforeSave: async (body) => {
    if (body.attraction) {
      const a = await Attraction.findById(body.attraction).select('city');
      if (!a) throw new ApiError(400, 'Attraction does not exist.');
      body.city = a.city;
    }
    if (body.pricing && body.vehicleTypes) {
      const missing = body.vehicleTypes.filter((v) => !body.pricing.some((p) => p.vehicleType === v));
      if (missing.length) throw new ApiError(400, `Add a price for: ${missing.join(', ')}`);
    }
    return body;
  },
});
exports.areas = crud(ParkingArea, { filters: ['location'], searchFields: ['name', 'code'], sort: { code: 1 } });
exports.slots = crud(ParkingSlot, { filters: ['location', 'area'], searchFields: ['code'], sort: { code: 1 } });

// ---------- parking structure & bulk slots ----------
exports.structure = asyncHandler(async (req, res) => {
  const [areas, slots] = await Promise.all([
    ParkingArea.find({ location: req.params.id }).sort({ code: 1 }).lean(),
    ParkingSlot.find({ location: req.params.id }).sort({ code: 1 }).select('-lockToken -lockUntil').lean(),
  ]);
  res.json({ areas: areas.map((a) => ({ ...a, slots: slots.filter((s) => String(s.area) === String(a._id)) })) });
});

exports.createArea = asyncHandler(async (req, res) => {
  if (!(await ParkingLocation.exists({ _id: req.body.location }))) throw new ApiError(400, 'Parking location does not exist.');
  res.status(201).json({ item: await ParkingArea.create(req.body) });
});

exports.bulkSlots = asyncHandler(async (req, res) => {
  const area = await ParkingArea.findById(req.params.id);
  if (!area) throw new ApiError(404, 'Area not found.');
  const existing = await ParkingSlot.countDocuments({ area: area._id });
  const docs = Array.from({ length: req.body.count }, (_, i) => ({
    code: `${area.code}${String(existing + i + 1).padStart(2, '0')}`,
    area: area._id,
    location: area.location,
    vehicleTypes: req.body.vehicleTypes,
  }));
  res.status(201).json({ items: await ParkingSlot.insertMany(docs) });
});

// ---------- bookings / payments ----------
exports.bookings = asyncHandler(async (req, res) => {
  const f = {};
  if (str(req.query.status)) f.status = str(req.query.status);
  if (str(req.query.search)) f.reference = new RegExp(escapeRegex(str(req.query.search)), 'i');
  const { page, limit, skip } = pageParams(req.query, 20, 100);
  const [items, total] = await Promise.all([
    Booking.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('user', 'name email').populate('attraction', 'name').populate('location', 'name').populate('slot', 'code').lean(),
    Booking.countDocuments(f),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

exports.payments = asyncHandler(async (req, res) => {
  const f = {};
  if (str(req.query.status)) f.status = str(req.query.status);
  if (bool(req.query.needsRefund)) f.needsRefund = true;
  const { page, limit, skip } = pageParams(req.query, 20, 100);
  const [items, total] = await Promise.all([
    Payment.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email').populate('booking', 'reference status').lean(),
    Payment.countDocuments(f),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

// Manual bookkeeping only: the admin refunds in the Razorpay dashboard, then records it here.
exports.markRefunded = asyncHandler(async (req, res) => {
  const p = await Payment.findById(req.params.id);
  if (!p) throw new ApiError(404, 'Payment not found.');
  if (p.status !== 'paid') throw new ApiError(400, 'Only paid payments can be marked as refunded.');
  p.status = 'refunded';
  p.needsRefund = false;
  p.refundedAt = new Date();
  p.refundNote = req.body.note || 'Refund processed manually.';
  await p.save();
  await Booking.updateOne({ _id: p.booking }, { $set: { paymentStatus: 'refunded' } });
  res.json({ item: p });
});

// ---------- users ----------
exports.users = asyncHandler(async (req, res) => {
  const f = {};
  const s = str(req.query.search);
  if (s) f.$or = [{ name: new RegExp(escapeRegex(s), 'i') }, { email: new RegExp(escapeRegex(s), 'i') }];
  const { page, limit, skip } = pageParams(req.query, 20, 100);
  const [items, total] = await Promise.all([User.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(f)]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

exports.updateUser = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) throw new ApiError(400, 'You cannot change your own role or status.');
  const u = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!u) throw new ApiError(404, 'User not found.');
  res.json({ item: u });
});

// ---------- stats ----------
exports.stats = asyncHandler(async (req, res) => {
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const [users, cities, attractions, locations, slots, byStatus, revenue, today, needsRefund] = await Promise.all([
    User.countDocuments(), City.countDocuments({ isActive: true }), Attraction.countDocuments({ isActive: true }),
    ParkingLocation.countDocuments({ isActive: true }), ParkingSlot.countDocuments({ isActive: true }),
    Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amountPaise' }, count: { $sum: 1 } } }]),
    Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
    Payment.countDocuments({ needsRefund: true }),
  ]);
  res.json({
    users, cities, attractions, locations, slots, bookingsToday: today, needsRefund,
    bookingsByStatus: Object.fromEntries(byStatus.map((b) => [b._id, b.count])),
    revenuePaise: revenue[0]?.total || 0,
    paidCount: revenue[0]?.count || 0,
  });
});
