const mongoose = require('mongoose');
const { VEHICLE_TYPES, PARKING_TYPES } = require('../utils/constants');

const pricingSchema = new mongoose.Schema(
  {
    vehicleType: { type: String, enum: VEHICLE_TYPES, required: true },
    ratePerHour: { type: Number, required: true, min: 0 }, // rupees
    minHours: { type: Number, default: 1, min: 1 },
    dailyCap: { type: Number, default: 0, min: 0 }, // rupees, 0 = no cap
  },
  { _id: false }
);

const parkingLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    attraction: { type: mongoose.Schema.Types.ObjectId, ref: 'Attraction', required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    type: { type: String, enum: PARKING_TYPES, default: 'public' },
    address: { type: String, required: true },
    location: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
    description: { type: String, default: '' },
    images: [{ type: String }],
    vehicleTypes: [{ type: String, enum: VEHICLE_TYPES }],
    pricing: [pricingSchema],
    convenienceFee: { type: Number, default: 0, min: 0 }, // rupees, per booking
    taxPercent: { type: Number, default: 0, min: 0, max: 50 },
    operatingHours: {
      is24x7: { type: Boolean, default: false },
      open: { type: String, default: '06:00' },
      close: { type: String, default: '23:00' },
    },
    // "verified" = a human has confirmed address, fees and hours. Demo data is always false.
    verified: { type: Boolean, default: false },
    dataSource: { type: String, enum: ['demo', 'operator', 'verified'], default: 'demo' },
    notes: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
parkingLocationSchema.index({ attraction: 1, isActive: 1 });
parkingLocationSchema.index({ city: 1, isActive: 1 });

module.exports = mongoose.model('ParkingLocation', parkingLocationSchema);
