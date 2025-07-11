const mongoose = require("mongoose");

// Define the Variant schema for backup
const VariantSchema = new mongoose.Schema({
  color: String,
  quantity: Number,
  variantSKU: String,
  size: String,
  sellingPrice: Number,
  mrp: Number,
}, { _id: false });

// Define the Subcategory schema for backup
const SubcategorySchema = new mongoose.Schema({
  subcategorySKU: String,
  name: String,
}, { _id: false });

// Define the Category schema for backup
const CategorySchema = new mongoose.Schema({
  name: String,
  categorySKU: String,
  subcategories: [SubcategorySchema],
}, { _id: false });

// Define the Backup schema
const BackupSchema = new mongoose.Schema({
  productId: {
    type: String, // Change to String to match the Product schema format
    required: true,
  },
  name: String,
  sellingPrice: Number,
  mrp: Number,
  description: String,
  tags: [String],
  images: [String],
  category: CategorySchema,
  subcategory: String, // This can be used if you need it separately
  brandName: String,
  nutritionalInfo: String,
  vendorId: mongoose.Schema.Types.ObjectId, // Assuming vendorId is an ObjectId
  variants: [VariantSchema],
  quantity: Number,
  deletedAt: {
    type: Date,
    default: Date.now,
  },
});

const Backup = mongoose.model("Backup", BackupSchema);

module.exports = Backup;
