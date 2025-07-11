const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ProductReview = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", require: true },
    productId: { type: String, require: true },
    comment: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductReview", ProductReview);