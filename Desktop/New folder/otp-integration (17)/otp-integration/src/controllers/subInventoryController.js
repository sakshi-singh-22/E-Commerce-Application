const SubInventory = require("../model/subinventoryModel");
const Vendor = require("../model/vendorModel");
const addProductToSubInventory = async (req, res) => {
  try {
    const {
      name,
      sellingPrice,
      mrp,
      description,
      domainTag,
      images,
      category,
      brandName,
      nutritionalInfo,
      vendorId,
      variants,
    } = req.body;

    // Validate required fields
    if (!name || !category || !vendorId || !brandName || !variants) {
      return res.status(400).json({
        success: false,
        message:
          "Required fields (name, category, vendorId, brandName, variants) are missing",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    // Check if a product with the same productId or tags already exists
    const existingProduct = await SubInventory.findOne({
      $or: [
        {
          productId: `${category.categorySKU}-${
            category.subcategories[0]?.subcategorySKU || "S00"
          }-${vendorId}`,
        },
        {
          tags: `${name}-${category.categorySKU}-${
            category.subcategories[0]?.subcategorySKU || "S00"
          }-${brandName}`,
        },
      ],
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with the same productId or tags already exists.",
      });
    }

    // Create a new SubInventory product
    const newProduct = new SubInventory({
      name,
      sellingPrice,
      mrp,
      description,
      domainTag,
      images,
      category,
      brandName,
      nutritionalInfo,
      vendorId,
      variants,
    });

    // Pre-save hook will automatically generate the productId and tags
    await newProduct.save();

    return res.status(201).json({
      success: true,
      message: "Product added to SubInventory successfully",
      product: newProduct,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error adding product to SubInventory",
      error: error.message,
    });
  }
};

const deleteProductFromSubInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { vendorId } = req.body;
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    const deletedProduct = await SubInventory.findOneAndDelete({ productId });

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted from SubInventory successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error deleting product from SubInventory",
      error: error.message,
    });
  }
};

const updateProductInSubInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;
    const { vendorId } = req.body;
    if (!vendorId) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    const updatedProduct = await SubInventory.findOneAndUpdate(
      { productId },
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error updating product in SubInventory",
      error: error.message,
    });
  }
};
const getSubInventoryByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const products = await SubInventory.find({ vendorId });

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for this vendor",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      products: products,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching products for the vendor",
      error: error.message,
    });
  }
};
module.exports = {
  addProductToSubInventory,
  deleteProductFromSubInventory,
  updateProductInSubInventory,
  getSubInventoryByVendor,
};