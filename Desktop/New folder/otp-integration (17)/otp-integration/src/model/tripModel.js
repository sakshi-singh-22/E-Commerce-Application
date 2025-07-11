const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const geoCoordinatesSchema = new Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
    required: true,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
});

const PaymentStatusLogSchema = new Schema({
  status: {
    type: String,
    enum: ["Pending", "Paid", "Failed"],
    required: true,
  },
  timestamp: { type: Date, default: Date.now }, // Timestamp of the status update
  reason: { type: String, default: "" }, // Optional reason for status update
});

const TripSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    driver: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
    driverCurrentLocation: {
      type: geoCoordinatesSchema, // Use standardized geoCoordinates schema
      required: true,
    },
    pickupLocations: [
      {
        address: { type: String, required: true },
        geoCoordinates: {
          type: geoCoordinatesSchema, // Use standardized geoCoordinates schema
          required: true,
        },
        vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
        isPickedUp: {
          type: Boolean,
          default: false,
        },
      },
    ],
    deliveryLocation: {
      address: { type: String, required: true },
      placeName: { type: String },
      geoCoordinates: {
        type: geoCoordinatesSchema, // Use standardized geoCoordinates schema
        required: true,
      },
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, required: false },
    estimatedArrivalTime: { type: String, required: true },
    distanceCovered: { type: Number, required: true },
    issuesEncountered: { type: String, default: "" },
    tripType: {
      type: String,
      enum: ["Pickup", "Delivery", "Return"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pickup", "OnTheWayToDelivery", "Delivered", "Cancelled"],
      default: "Pickup",
    },
    // Payment fields
    amountToCollect: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    paymentStatusLog: [PaymentStatusLogSchema],
  },
  { timestamps: true }
);

// Method to update payment status
TripSchema.methods.updatePaymentStatus = async function (status, reason = "") {
  this.paymentStatusLog.push({
    status,
    reason,
  });
  this.paymentStatus = status;
  await this.save();
};

// Separate function to set endTime
TripSchema.methods.setEndTime = function () {
  this.endTime = new Date();
};

module.exports = mongoose.model("Trip", TripSchema);