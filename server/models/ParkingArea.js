const mongoose = require('mongoose');

const parkingAreaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 4 }, // slot prefix, e.g. "B"
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLocation', required: true, index: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ParkingArea', parkingAreaSchema);
