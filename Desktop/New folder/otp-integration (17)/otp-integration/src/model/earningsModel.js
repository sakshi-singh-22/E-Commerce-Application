const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EarningsSchema = new Schema({
  driver: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
  date: { type: Date, default: Date.now },
  fare: { type: Number, required: true },
  tips: { type: Number, default: 0 },
  bonuses: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  trips: [{ type: Schema.Types.ObjectId, ref: "Trip" }], // Reference to Trip model
  total: { type: Number, required: true },
});

EarningsSchema.methods.calculateTotal = function () {
  this.total = this.fare + this.tips + this.bonuses - this.deductions;
};

module.exports = mongoose.model("Earnings", EarningsSchema);