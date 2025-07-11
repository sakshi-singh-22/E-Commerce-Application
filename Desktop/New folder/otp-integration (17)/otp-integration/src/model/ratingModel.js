// driverRatingModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DriverRatingSchema = new Schema({
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  timeliness: { type: Number, min: 1, max: 5 },
  communication: { type: Number, min: 1, max: 5 },
  satisfaction: { type: Number, min: 1, max: 5 },
  comment: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('DriverRating', DriverRatingSchema);
