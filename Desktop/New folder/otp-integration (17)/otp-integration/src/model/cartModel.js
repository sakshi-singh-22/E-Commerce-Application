const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const locationSchema = require("./locationModel");

// Variant Schema
const VariantSchema = new Schema(
  {
    color: { type: String, required: false },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    variantSKU: { type: String, required: true },
    size: { type: String, required: false },
    sellingPrice: {
      type: Number,
      required: false,
      min: [0, "Selling price must be a positive number"],
    },
    mrp: {
      type: Number,
      required: false,
      min: [0, "MRP must be a positive number"],
    },
  },
  { _id: false }
);

// Cart Item Schema
const CartItemSchema = new Schema(
  {
    productId: { type: String, ref: "Product", required: true },
    productName: { type: String, required: false },
    brandName: { type: String, required: false },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    payableAmount: {
      type: Number,
      required: false,
      min: [0, "Payable amount must be a positive number"],
    },
    variant: { type: VariantSchema, required: true },
  },
  { _id: false }
);

const scheduleItemSchema = new Schema({
  scheduleDetails: {
    type: [
      {
        date: {
          type: Date,
          required: true,
        },
        products: [
          {
            productId: {
              type: String,
              required: true,
            },
            variantSKU: {
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
      },
    ],
    default: [],
  },
  productsAdded: {
    type: Boolean,
    default: false,
  },
  timeSlot: {
    type: String,
    enum: [
      "6:00 AM - 12:00 PM",
      "12:00 PM - 4:00 PM",
      "4:00 PM - 8:00 PM",
      "8:00 PM - 12:00 AM",
    ],
    required: true,
    default: "6:00 AM - 12:00 PM",
  },
  totalPrice: {
    type: Number,
    required: false,
    min: [0, "Total price must be a positive number"],
    default: 0,
  },
});

// Cart Schema
const CartSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: { type: [CartItemSchema], default: [] },
    totalPrice: { type: Number, default: 0 }, // Total price of items in the cart
    discount: { type: Number, default: 0 }, // Discount amount applied
    discountDetails: {
      code: { type: String, required: false },
      discountType: { type: String, required: false },
      discountValue: { type: Number, required: false },
      expirationDate: { type: Date, required: false },
    }, // Store details of the applied coupon
    deliveryFee: { type: Number, default: 0 }, // Delivery fee
    handlingCharge: { type: Number, default: 0 }, // Handling charge
    gstAmount: { type: Number, default: 0 }, // GST amount
    totalCost: { type: Number, default: 0 }, // Total cost before discount
    payableAmount: { type: Number, default: 0 }, // Final amount to be paid after discount
    scheduleItems: { type: scheduleItemSchema, required: false },
    deliveryAddress: {
      type: [locationSchema],
      default: [],
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);