const mongoose = require('mongoose');

// Define the Variant schema
const VariantSchema = new mongoose.Schema({
  color: {
    type: String,
    required: false
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity must be a positive number']
  },
  status: {
    type: String,
    enum: ["in stock", "out of stock", "low stock"],
    default: "in stock",
  },
  variantSKU: {
    type: String,
    required: true,
    sparse: true
  },
  size: {
    type: String,
    required: false
  },
  sellingPrice: {
    type: Number,
    required: false,
    min: [0, 'Selling price must be a positive number']
  },
  image: {
    type: String, // Optional field to store image URL
    required: false 
  },
  mrp: {
    type: Number,
    required: false,
    min: [0, 'MRP must be a positive number']
  }
}, { _id: false });

// Define Subcategory Schema
const SubcategorySchema = new mongoose.Schema(
  {
    subcategorySKU: {
      type: String,
      required: true,
      match: [
        /^S[A-Z0-9]{2}$/,
        'Subcategory SKU must start with "S" followed by 2 alphanumeric characters',
      ], // Updated regex to allow letters or digits
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
    name: {
      type: String,
      required: [true, "Category name is required"],
    },
    categorySKU: {
      type: String,
      required: true,
      match: [
        /^C[A-Z0-9]{2}$/,
        'Category SKU must start with "C" followed by 2 alphanumeric characters',
      ], // Updated regex to allow letters or digits
    },
    subcategories: [SubcategorySchema],
  },
  { _id: false }
);

// Define the Product schema
const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  sellingPrice: {
    type: Number,
    required: [false, 'Selling price is required'],
    min: [0, 'Selling price must be a positive number']
  },
  mrp: {
    type: Number,
    required: [false, 'MRP is required'],
    min: [0, 'MRP must be a positive number']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  tags: {
    type: String, // Changed from array to string
    default: ''
  },

  productUses: {
    type: [String],
    required: false,
    default : null
  },

  images: {
    type: [String], // Array of image URLs
    default: null
  },
  category: {
    type: CategorySchema, // Embedded object
    required: [true, 'Category is required']
  },
  brandName: {
    type: String, // Add brandName
    required: [true, 'Brand name is required']
  },
  nutritionalInfo: {
    type: String // Nutritional information as a string
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor', // Reference to the Vendor model
    required: [true, 'Vendor ID is required']
  },
  variants: [VariantSchema], // Array of variants
  quantity: {
    type: Number,
    default: 0, // Default to 0 if not set
    min: [0, 'Quantity must be a positive number']
  },
  productId: {
    type: String,
    unique: true
  },
  cluster_tag: {
    type: Boolean,
    default: false // Default to false
  },
  coupon_tags: {
    type: [String], // Array for coupon tags
    default: [] // Default to an empty array
  },
  domainTag: {
    type: String,
    enum: ["grocery", "fashion", "home decor", "electronic"],
    default: "grocery" // Default to grocery
  },
  imageid:{
    type:String,
  }
});

// Method to update variant status based on quantity
ProductSchema.methods.updateVariantStatus = function () {
  const lowStockThreshold = 10; // Define your low stock threshold here

  this.variants.forEach((variant) => {
    if (variant.quantity === 0) {
      variant.status = "out of stock";
    } else if (variant.quantity < lowStockThreshold) {
      variant.status = "low stock";
    } else {
      variant.status = "in stock";
    }
  });
};

// Calculate the total quantity before saving and generate the product ID
ProductSchema.pre("save", async function (next) {
  // Update the status of variants before saving
  this.updateVariantStatus();

  // Sum up the quantity of all variants
  this.quantity = this.variants.reduce(
    (total, variant) => total + variant.quantity,
    0
  );

  // Generate the formatted product ID
  if (!this.productId) {
    const categoryPart = this.category.categorySKU.padStart(3, "0");
    const subcategoryPart =
      this.category.subcategories[0]?.subcategorySKU.padStart(3, "0") || "S00"; // Use subcategorySKU if available, default to 'S00'
    const vendorPart = this.vendorId.toString().slice(-5); // Last 5 characters of vendorId
    
    // Generate a default product ID
    const defaultProductId = new mongoose.Types.ObjectId();
    this._id = defaultProductId
    const productPart = defaultProductId.toString().slice(-5); // Last 5 digits of the ObjectId
    
    this.productId = `${categoryPart}-${subcategoryPart}-${vendorPart}-${productPart}`;

    if(!this.tags) {
      // Set the tags field with predefined values
      this.tags = `${this.name}-${this.category.categorySKU}-${
        this.category.subcategories[0]?.subcategorySKU || "S00"
      }-${this.brandName}`;
    }

     // Ensure that both productId and tags are unique
    const existingProduct = await mongoose.models.SubInventory.findOne({
      $or: [{ productId: this.productId }, { tags: this.tags }],
    });

    if (existingProduct) {
      return next(
        new Error("Product with the same productId or tags already exists")
      );
    }
  }
   
  next();
});

module.exports = mongoose.model("Product", ProductSchema);
