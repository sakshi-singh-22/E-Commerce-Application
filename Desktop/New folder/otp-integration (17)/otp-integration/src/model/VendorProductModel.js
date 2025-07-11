const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the VendorProduct schema
const VendorProductSchema = new Schema({
  vendorId: {
    type: Schema.Types.ObjectId, // Referencing the Vendor model
    ref: 'Vendor',
    required: true,
  },
  products: [
    {
      productId: {
        type: String, // Custom productId
        required: true,
      },
      name: {
        type: String, // Product name
        required: true,
      },
      sellingPrice: {
        type: Number, // Product selling price
        required: true,
      },
      mrp: {
        type: Number, // Product MRP
        required: true,
      },
      description: {
        type: String, // Product description
        required: true,
      },
      tags: [String], // Array of tags
      images: [String], // Array of image URLs
      category: {
        type: Object, // Category details
        required: true,
      },
      brandName: {
        type: String, // Brand name
        required: true,
      },
      nutritionalInfo: {
        type: String, // Nutritional information
      },
      variants: [
        {
          color: String,
          quantity: Number,
          status: {
            type: String,
            enum: ["in stock", "out of stock", "low stock"],
            default: "in stock",
          },
          variantSKU: String,
          size: String,
          sellingPrice: Number,
          mrp: Number,
        },
      ],
    },
  ],
}, { timestamps: true });

// Create a model from the schema
const VendorProduct = mongoose.model('VendorProduct', VendorProductSchema);

module.exports = VendorProduct;
