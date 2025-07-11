const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for checkout
const CheckoutSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },
  paymentMethod: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  payableAmount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  orderDetails: {
    items: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        brandName: { type: String, required: true },
        quantity: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        totalProductPrice: { type: Number, required: true },
        variant: {
          variantSKU: { type: String, required: true },
          color: { type: String },
          size: { type: String },
          sellingPrice: { type: Number },
          mrp: { type: Number }
        }
      }
    ],
    deliveryFee: { type: Number, required: true },
    handlingCharge: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    totalCost: { type: Number, required: true }
  },
  userLocation: {
    location: { type: String, required: true }
  },
  userDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Checkout', CheckoutSchema);
