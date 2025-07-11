const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Order",
  },
  customerName: {
    type: String,
    required: true,
  },
  deliveryAddress: {
    type: String,
    required: true,
  },
  contactInfo: {
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
  },
  products: [
    {
      productId: {
        type: String,
        required: true,
      },
      productDescription: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      unitPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      discount: {
        type: Number,
        default: 0,
        min: 0,
      },
      productTotal: {
        type: Number,
        required: true,
        min: 0,
      },
      vendorName: {
        type: String,
        required: true,
      },
      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
      },
      vendorLocation: {
        type: String,
        required: true,
      },
      vendorContact: {
        phone: {
          type: String,
          required: true,
        },
        email: {
          type: String,
        },
      },
    },
  ],
  taxDetails: {
    type: Number,
    required: true,
    min: 0,
  },
  deliveryCharges: {
    type: Number,
    default: 0,
    min: 0,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    default: "COD",
  },
});

// Pre-save middleware to calculate totals
invoiceSchema.pre("save", function (next) {
  this.subtotal = this.products.reduce(
    (sum, product) =>
      sum + product.quantity * product.unitPrice - product.discount,
    0
  );

  this.totalAmount = this.subtotal + this.taxDetails + this.deliveryCharges;
  next();
});

module.exports = mongoose.model("Invoice", invoiceSchema);