const Favorite = require('../models/Favorite');
const Attraction = require('../models/Attraction');
const ParkingLocation = require('../models/ParkingLocation');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { oid } = require('../utils/query');

const MODELS = { attraction: 'Attraction', parking: 'ParkingLocation' };

exports.list = asyncHandler(async (req, res) => {
  const favs = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1 }).populate({ path: 'target', populate: [{ path: 'city', select: 'name' }] }).lean();
  const live = favs.filter((f) => f.target && f.target.isActive !== false);
  res.json({
    attractions: live.filter((f) => f.targetModel === 'Attraction').map((f) => f.target),
    parking: live.filter((f) => f.targetModel === 'ParkingLocation').map((f) => f.target),
  });
});

exports.ids = asyncHandler(async (req, res) => {
  const favs = await Favorite.find({ user: req.user._id }).select('targetModel target').lean();
  res.json({
    attractions: favs.filter((f) => f.targetModel === 'Attraction').map((f) => String(f.target)),
    parking: favs.filter((f) => f.targetModel === 'ParkingLocation').map((f) => String(f.target)),
  });
});

exports.add = asyncHandler(async (req, res) => {
  const { type, id } = req.body;
  const Model = type === 'attraction' ? Attraction : ParkingLocation;
  if (!(await Model.exists({ _id: id, isActive: true }))) throw new ApiError(404, 'Item not found.');
  await Favorite.updateOne({ user: req.user._id, targetModel: MODELS[type], target: id }, { $setOnInsert: { user: req.user._id } }, { upsert: true });
  res.status(201).json({ ok: true });
});

exports.remove = asyncHandler(async (req, res) => {
  const type = req.params.type;
  if (!MODELS[type] || !oid(req.params.id)) throw new ApiError(400, 'Invalid favorite.');
  await Favorite.deleteOne({ user: req.user._id, targetModel: MODELS[type], target: req.params.id });
  res.json({ ok: true });
});
