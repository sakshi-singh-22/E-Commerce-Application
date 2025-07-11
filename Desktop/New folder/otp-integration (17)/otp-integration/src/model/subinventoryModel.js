const mongoose = require("mongoose");

// Define the Variant schema
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
    status: {
      type: String,
      enum: ["in stock", "out of stock", "low stock"],
      default: "in stock",
    },
    variantSKU: {
      type: String,
      required: true,
      sparse: true,
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
    image: {
      type: String,
      required: false,
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
    subcategorySKU: {
      type: String,
      required: true,
      match: [
        /^S[A-Z0-9]{2}$/,
        'Subcategory SKU must start with "S" followed by 2 alphanumeric characters (letters or digits)',
      ],
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
        'Category SKU must start with "C" followed by 2 alphanumeric characters (letters or digits)',
      ],
    },
    subcategories: [SubcategorySchema],
  },
  { _id: false }
);


// Define the Product schema
const SubInventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
  },
  sellingPrice: {
    type: Number,
    required: [false, "Selling price is required"],
    min: [0, "Selling price must be a positive number"],
  },
  mrp: {
    type: Number,
    required: [false, "MRP is required"],
    min: [0, "MRP must be a positive number"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
  },
  tags: {
    type: String,
    unique: true,
    default: "",
  },
  domainTag: {
    type: String,
    enum: ["grocery", "fashion", "home decor", "electronic"],
    default: "grocery",
  },
  images: {
    type: [String],
    default: null,
  },

  category: {
    type: CategorySchema,
    required: [true, "Category is required"],
  },
  brandName: {
    type: String,
    required: [true, "Brand name is required"],
  },
  nutritionalInfo: {
    type: String,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: [true, "Vendor ID is required"],
  },
  variants: [VariantSchema],
  quantity: {
    type: Number,
    default: 0,
    min: [0, "Quantity must be a positive number"],
  },
  productId: {
    type: String,
    unique: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending",
  },
});

// Method to update variant status based on quantity
SubInventorySchema.methods.updateVariantStatus = function () {
  const lowStockThreshold = 10;

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

// Pre-save middleware to generate unique productId and ensure unique tags
SubInventorySchema.pre("save", async function (next) {
  this.updateVariantStatus();

  this.quantity = this.variants.reduce(
    (total, variant) => total + variant.quantity,
    0
  );

  if (!this.productId) {
    const categoryPart = this.category.categorySKU.padStart(3, "0");
    const subcategoryPart =
      this.category.subcategories[0]?.subcategorySKU.padStart(3, "0") || "S00";
    const vendorPart = this.vendorId.toString().slice(-5);
    const defaultProductId = new mongoose.Types.ObjectId();
    const productPart = defaultProductId.toString().slice(-5);

    this.productId = `${categoryPart}-${subcategoryPart}-${vendorPart}-${productPart}`;
  }

  // Set the tags field with predefined values
  this.tags = `${this.name}-${this.category.categorySKU}-${
    this.category.subcategories[0]?.subcategorySKU || "S00"
  }-${this.brandName}`;

  // Ensure that both productId and tags are unique
  const existingProduct = await mongoose.models.SubInventory.findOne({
    $or: [{ productId: this.productId }, { tags: this.tags }],
  });

  if (existingProduct) {
    return next(
      new Error("Product with the same productId or tags already exists")
    );
  }

  next();
});

module.exports = mongoose.model("SubInventory", SubInventorySchema);