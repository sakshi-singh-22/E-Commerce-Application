const mongoose = require("mongoose");

const WeeklyScheduleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  dayOfWeek: {
    type: String,
    enum: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    required: true,
  },
  specificDate: {
    type: Date,
    default: null,
  },
  timeSlot: {
    type: String,
    enum: [
      "9:00 AM - 12:00 PM",
      "12:00 PM - 3:00 PM",
      "3:00 PM - 6:00 PM",
      "6:00 PM - 9:00 PM",
    ],
    required: true,
    default: "9:00 AM - 12:00 PM",
  },
  products: {
    type: [
      {
        productId: {
          type: String,
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Price must be a positive number"],
        },
      },
    ],
    default: [],
  },
  frequency: {
    type: String,
    enum: ["weekly", "bi-weekly", "monthly", "one-time"],
    default: "one-time",
  },
  status: {
    type: String,
    enum: ["pending", "confirm", "cancel"],
    default: "pending",
  },
  totalPrice: {
    type: Number,
    required: false,
    min: [0, "Total price must be a positive number"],
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to update total price before saving
WeeklyScheduleSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Calculate the total price before saving
  this.totalPrice = this.products.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0
  );

  next();
});

module.exports = mongoose.model("WeeklySchedule", WeeklyScheduleSchema);