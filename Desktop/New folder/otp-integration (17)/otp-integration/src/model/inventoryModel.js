const mongoose = require("mongoose");

// Helper function to generate unique ID of size 2
const generateUniqueId = (size) => {
  return Math.random().toString(36).substr(2, size).toUpperCase();
};

// Define Variant Schema
const VariantSchema = new mongoose.Schema(
  {
    color: {
      type: String,
      required: false,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, "Quantity must be a positive number"],
    },
    variantSKU: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: false,
    },
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

// Define Subcategory Schema
const SubcategorySchema = new mongoose.Schema(
  {
    subcategoryId: {
      type: String,
      default: () => generateUniqueId(2), // Generate unique ID of size 2
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Subcategory name is required"],
    },
  },
  { _id: false }
);

// Define Category Schema
const CategorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      default: () => generateUniqueId(2), // Generate unique ID of size 2
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Category name is required"],
    },
    subcategories: [SubcategorySchema],
  },
  { _id: false }
);

// Define Inventory Schema
const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      required: true,
    },
    variants: {
      type: [VariantSchema],
      required: true,
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    category: CategorySchema, // Use CategorySchema with unique IDs
    subcategory: {
      type: String, // Store selected subcategory ID
      required: true,
    },
    title: {
      type: String,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    productDescription: {
      type: String,
      required: true,
    },
    images: {
      type: [String], // Array of image URLs
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate total quantity and generate product ID
inventorySchema.pre("save", function (next) {
  this.totalQuantity = this.variants.reduce(
    (acc, variant) => acc + variant.quantity,
    0
  );

  // Generate the formatted product ID
  if (!this.productId) {
    const categoryPart = this.category.categoryId;
    const subcategoryPart = this.subcategory || "00"; // Default to '00' if no subcategory
    const productPart = Math.random().toString().slice(2, 6); // Generate a random 4-digit number
    const quantityPart = this.totalQuantity.toString().padStart(2, "0"); // Ensure quantity is 2 digits
    this.productId = `${categoryPart}-${subcategoryPart}-${productPart}-${quantityPart}`;
  }

  next();
});

const Inventory = mongoose.model("Inventory", inventorySchema);
module.exports = Inventory;
