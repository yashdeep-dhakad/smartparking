const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const sign = (user) => jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

// Public registration can ONLY create normal users. Admins come from the seed script or another admin.
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists.');
  const user = await User.create({ name, email, password, phone: phone || '', role: 'user' });
  res.status(201).json({ token: sign(user), user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Incorrect email or password.');
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled.');
  res.json({ token: sign(user), user });
});

// Separate entry point for the admin area (/admin). Only admin accounts are allowed through.
exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Incorrect email or password.');
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled.');
  if (user.role !== 'admin') throw new ApiError(403, 'This account does not have administrator access.');
  res.json({ token: sign(user), user });
});

exports.me = (req, res) => res.json({ user: req.user });

exports.updateProfile = asyncHandler(async (req, res) => {
  req.user.name = req.body.name;
  req.user.phone = req.body.phone || '';
  await req.user.save();
  res.json({ user: req.user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await require('../models/User').findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) throw new ApiError(400, 'Current password is incorrect.');
  user.password = req.body.newPassword;
  await user.save();
  res.json({ message: 'Password updated.' });
});
