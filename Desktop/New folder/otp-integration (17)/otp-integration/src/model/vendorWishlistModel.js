const mongoose = require("mongoose");

const vendorWishlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
  },
  sellingPrice: {
    type: Number,
    required: false,
    min: [0, "Selling price must be a positive number"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
  },
  images: {
    type: [String],
  },
  brandName: {
    type: String,
    required: [true, "Brand name is required"],
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: [true, "Vendor ID is required"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

const VendorWishlist = mongoose.model("VendorWishlist", vendorWishlistSchema);

module.exports = VendorWishlist;