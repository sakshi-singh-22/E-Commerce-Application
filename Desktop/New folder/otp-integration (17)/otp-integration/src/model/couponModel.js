const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CouponSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  discountType: {
    type: String,
    enum: ["fixed", "percentage"],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  expirationDate: {
    type: Date,
    required: true,
  },
  usageLimit: {
    type: Number,
    default: 1,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  applicableCategories: [String],
  applicableSubcategories: [String],
  applicableBrands: [String],
  applicableProducts: [Schema.Types.ObjectId],
  applyToAllCart: {
    type: Boolean,
    default: false,
  },
  applyToTag: [String],
});

module.exports = mongoose.model("Coupon", CouponSchema);