const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const VendorSchema = new Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },
  vendorName: {
    type: String,
    required: true,
  },
  vendorContact: {
    phone: { type: String, required: true },
    email: { type: String, default: "NA" },
  },
  vendorLocation: {
    type: String,
    default: "NA",
  },
});
const VariantSchema = new Schema({
  variantSKU: { type: String, required: true },
  color: { type: String },
  size: { type: String },
  sellingPrice: { type: Number, required: true },
  mrp: { type: Number },
});
const ItemSchema = new Schema({
  productId: {
    type: String, // Corrected to String
    required: true,
  },
  productName: { type: String, required: true },
  brandName: { type: String },
  productDescription: { type: String, required: true },
  quantity: { type: Number, required: true },
  variant: { type: VariantSchema, required: true },
  sellingPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  vendor: { type: VendorSchema, required: true },
  vendorOrderStatus: {
    type: String,
    enum: ['Accepted By Vendor', 'Rejected By Vendor','pending'],
    default: 'pending',
  },
});
const DiscountDetailsSchema = new Schema({
  code: { type: String },
  discountType: { type: String },
  discountValue: { type: Number },
  expirationDate: { type: Date },
});
const LocationSchema = new Schema({
  geoCoordes: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  address: { type: String, required: true },
  placeName: { type: String },
});
const UserDetailsSchema = new Schema({
  name: { type: String, required: true },
  contact: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  deliveryAddress: {
    address: { type: String, required: true },
    placeName: { type: String },
    geoCoordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
  },
});
const OrderSchema = new Schema( {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userDetails: { type: UserDetailsSchema, required: true },
    items: {type: [ItemSchema]},
    finalItems: {type: [ItemSchema]},
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountDetails: { type: DiscountDetailsSchema },
    deliveryFee: { type: Number, required: true },
    handlingCharge: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    payableAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, default: "Pending" },
    location: { type: LocationSchema, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled','Assigned'],
      default: 'Pending',
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled",
            "Assigned",
          ],
          required: true,
        },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    assignedDriverAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    orderUpdated: { type: Boolean, default: false },  // Add this field
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);