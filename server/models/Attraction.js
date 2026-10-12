const mongoose = require('mongoose');
const { CATEGORIES } = require('../utils/constants');

const attractionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    category: { type: String, enum: CATEGORIES, default: 'Other' },
    shortDescription: { type: String, default: '', maxlength: 200 },
    description: { type: String, default: '' },
    address: { type: String, required: true },
    location: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
    images: [{ type: String }],
    openingHours: { type: String, default: '' },
    hoursVerified: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    popularity: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
attractionSchema.index({ city: 1, isActive: 1, category: 1 });
attractionSchema.index({ featured: 1, popularity: -1 });

module.exports = mongoose.model('Attraction', attractionSchema);
