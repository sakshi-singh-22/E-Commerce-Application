const mongoose = require("mongoose");

const routeOrderReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Ride",
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Vendor",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    delivery_time_rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    delivery_time_comment: {
      type: String,
      required: false,
    },
    product_rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    product_comment: {
      type: String,
      required: false,
    },
    recommend_vendor: {
      type: Boolean,
      required: true,
    },

    issue: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const RouteOrderReview = mongoose.model(
  "RouteOrderReview",
  routeOrderReviewSchema
);
module.exports = RouteOrderReview;