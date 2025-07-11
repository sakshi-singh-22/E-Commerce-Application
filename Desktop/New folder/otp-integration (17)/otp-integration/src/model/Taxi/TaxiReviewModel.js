const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define Taxi Review Schema
const TaxiReviewSchema = new Schema({
  rideId: {
    type: Schema.Types.ObjectId,
    ref: "Ride",
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  driverId: {
    type: Schema.Types.ObjectId,
    ref: "Driver",
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  comments: {
    type: String,
    maxlength: 500,
  },
  cleanliness: {
    type: Number,
    min: 1,
    max: 5,
  },
  drivingSkill: {
    type: Number,
    min: 1,
    max: 5,
  },
  punctuality: {
    type: Number,
    min: 1,
    max: 5,
  },
  comfort: {
    type: Number,
    min: 1,
    max: 5,
  },
  reviewDate: {
    type: Date,
    default: Date.now,
  },
});

const TaxiReview = mongoose.model("TaxiReview", TaxiReviewSchema);

module.exports = TaxiReview;