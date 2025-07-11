const mongoose = require("mongoose");

const DriverReportSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    required: true,
  },
  generatedAt: { type: Date, default: Date.now },
  tripCount: { type: Number, default: 0 },
  feedbackCount: { type: Number, default: 0 },
  totalDistance: { type: Number, default: 0 },
  averageDeliveryTime: { type: Number, default: 0 },
  efficiency: { type: Number, default: 0 },
  issuesCount: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  tripDetails: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trip" }],
  totalTimeOnline: { type: Number, default: 0 },
});

module.exports = mongoose.model("DriverReport", DriverReportSchema);