const City = require('../models/City');
const Attraction = require('../models/Attraction');
const ParkingLocation = require('../models/ParkingLocation');
const ParkingArea = require('../models/ParkingArea');
const ParkingSlot = require('../models/ParkingSlot');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { str, oid, bool, pageParams } = require('../utils/query');
const { escapeRegex, haversineKm } = require('../utils/time');
const { VEHICLE_TYPES, PARKING_TYPES, CATEGORIES } = require('../utils/constants');
const { getLocationAvailability, buildQuote, publicQuote } = require('../services/bookingService');

// ---------------- cities ----------------
exports.listCities = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  const search = str(req.query.search);
  if (search) filter.name = new RegExp(escapeRegex(search), 'i');
  if (str(req.query.state)) filter.state = str(req.query.state);
  if (bool(req.query.featured)) filter.featured = true;

  const [cities, counts] = await Promise.all([
    City.find(filter).sort({ featured: -1, name: 1 }).lean(),
    Attraction.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$city', count: { $sum: 1 } } }]),
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json({ items: cities.map((c) => ({ ...c, attractionCount: map.get(String(c._id)) || 0 })) });
});

exports.listStates = asyncHandler(async (req, res) => {
  res.json({ items: (await City.distinct('state', { isActive: true })).sort() });
});

exports.getCity = asyncHandler(async (req, res) => {
  const key = str(req.params.idOrSlug) || '';
  const city = await City.findOne({ isActive: true, ...(mongoose.isValidObjectId(key) ? { _id: key } : { slug: key.toLowerCase() }) }).lean();
  if (!city) throw new ApiError(404, 'City not found.');
  const featured = await Attraction.find({ city: city._id, isActive: true }).sort({ featured: -1, popularity: -1 }).limit(4).lean();
  res.json({ city, featured });
});

// ---------------- attractions ----------------
exports.listCategories = (req, res) => res.json({ items: CATEGORIES });

exports.listAttractions = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (oid(req.query.city)) filter.city = oid(req.query.city);
  const category = str(req.query.category);
  if (category && CATEGORIES.includes(category)) filter.category = category;
  const search = str(req.query.search);
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { shortDescription: rx }, { address: rx }];
  }
  if (bool(req.query.featured)) filter.featured = true;
  const sorts = { popular: { popularity: -1, name: 1 }, 'name-asc': { name: 1 }, 'name-desc': { name: -1 }, newest: { createdAt: -1 } };
  const sort = sorts[str(req.query.sort)] || sorts.popular;
  const { page, limit, skip } = pageParams(req.query, 9, 50);

  const [items, total] = await Promise.all([
    Attraction.find(filter).sort(sort).skip(skip).limit(limit).populate('city', 'name state slug').lean(),
    Attraction.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

const decorateParking = (p, from) => ({
  ...p,
  distanceKm: from ? Math.round(haversineKm(from, p.location) * 10) / 10 : undefined,
  fromRate: p.pricing?.length ? Math.min(...p.pricing.map((x) => x.ratePerHour)) : null,
});

exports.getAttraction = asyncHandler(async (req, res) => {
  const attraction = await Attraction.findOne({ _id: req.params.id, isActive: true }).populate('city', 'name state slug').lean();
  if (!attraction) throw new ApiError(404, 'Attraction not found.');
  // Linked parking + any other parking in the same city within 1.5 km.
  const candidates = await ParkingLocation.find({ city: attraction.city._id, isActive: true }).populate('attraction', 'name').lean();
  const parking = candidates
    .map((p) => decorateParking(p, attraction.location))
    .filter((p) => String(p.attraction?._id) === String(attraction._id) || p.distanceKm <= 1.5)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  res.json({ attraction, parking });
});

// ---------------- parking ----------------
exports.listParking = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (oid(req.query.city)) filter.city = oid(req.query.city);
  if (oid(req.query.attraction)) filter.attraction = oid(req.query.attraction);
  if (PARKING_TYPES.includes(str(req.query.type))) filter.type = str(req.query.type);
  if (VEHICLE_TYPES.includes(str(req.query.vehicleType))) filter.vehicleTypes = str(req.query.vehicleType);
  const search = str(req.query.search);
  if (search) filter.$or = [{ name: new RegExp(escapeRegex(search), 'i') }, { address: new RegExp(escapeRegex(search), 'i') }];
  const { page, limit, skip } = pageParams(req.query, 12, 50);
  const [items, total] = await Promise.all([
    ParkingLocation.find(filter).sort({ featured: -1, name: 1 }).skip(skip).limit(limit).populate('attraction', 'name location').populate('city', 'name').lean(),
    ParkingLocation.countDocuments(filter),
  ]);
  res.json({ items: items.map((p) => decorateParking(p, p.attraction?.location)), total, page, pages: Math.ceil(total / limit) || 1 });
});

exports.featuredParking = asyncHandler(async (req, res) => {
  const items = await ParkingLocation.find({ isActive: true, featured: true }).limit(6).populate('attraction', 'name location').populate('city', 'name').lean();
  res.json({ items: items.map((p) => decorateParking(p, p.attraction?.location)) });
});

exports.getParking = asyncHandler(async (req, res) => {
  const p = await ParkingLocation.findOne({ _id: req.params.id, isActive: true }).populate('attraction', 'name location address').populate('city', 'name state').lean();
  if (!p) throw new ApiError(404, 'Parking location not found.');
  const areas = await ParkingArea.find({ location: p._id, isActive: true }).sort({ code: 1 }).lean();
  const slotCounts = await ParkingSlot.aggregate([{ $match: { location: p._id, isActive: true } }, { $group: { _id: '$area', count: { $sum: 1 } } }]);
  const cmap = new Map(slotCounts.map((s) => [String(s._id), s.count]));
  res.json({ parking: decorateParking(p, p.attraction?.location), areas: areas.map((a) => ({ ...a, slotCount: cmap.get(String(a._id)) || 0 })) });
});

exports.availability = asyncHandler(async (req, res) => {
  const vehicleType = str(req.query.vehicleType);
  if (!VEHICLE_TYPES.includes(vehicleType)) throw new ApiError(400, 'Choose a valid vehicle type.');
  res.json(await getLocationAvailability({ locationId: req.params.id, vehicleType, startTime: str(req.query.start), endTime: str(req.query.end) }));
});

// Public price + availability preview (no login needed) used by the booking review page.
exports.quote = asyncHandler(async (req, res) => {
  res.json(publicQuote(await buildQuote(req.body)));
});
