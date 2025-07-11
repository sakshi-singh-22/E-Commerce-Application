const mongoose = require("mongoose");

const vendorScheduleSchema = new mongoose.Schema({
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WeeklySchedule",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  timeSlot: {
    type: String,
    required: true,
  },
  products: [
    {
      productId: String,
      productName: String,
      quantity: Number,
      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "confirmed", "completed"],
        default: "pending",
      },
    },
  ],

  orderDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("VendorSchedule", vendorScheduleSchema);