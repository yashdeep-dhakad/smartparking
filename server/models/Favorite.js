const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetModel: { type: String, enum: ['Attraction', 'ParkingLocation'], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, refPath: 'targetModel', required: true },
  },
  { timestamps: true }
);
favoriteSchema.index({ user: 1, targetModel: 1, target: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
