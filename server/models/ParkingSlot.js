const mongoose = require('mongoose');
const { VEHICLE_TYPES } = require('../utils/constants');

const parkingSlotSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    area: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingArea', required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLocation', required: true, index: true },
    vehicleTypes: [{ type: String, enum: VEHICLE_TYPES }],
    // Operator-managed flag (NOT detected automatically): admin can mark a slot as occupied.
    manualStatus: { type: String, enum: ['available', 'occupied'], default: 'available' },
    isActive: { type: Boolean, default: true },
    // Short-lived lock used to make "check conflicts + create booking" atomic (works without transactions).
    lockUntil: { type: Date, default: null },
    lockToken: { type: String, default: null },
  },
  { timestamps: true }
);
parkingSlotSchema.index({ area: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);
