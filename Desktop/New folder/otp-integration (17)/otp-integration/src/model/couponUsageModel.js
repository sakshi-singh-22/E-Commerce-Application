const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  couponCode: {
    type: String,
    required: true
  },
  discountAmount: {
    type: Number,
    required: true
  },
  usedAt: {
    type: Date,
    default: Date.now
  }
});

const CouponUsage = mongoose.model('CouponUsage', couponUsageSchema);

module.exports = CouponUsage;
