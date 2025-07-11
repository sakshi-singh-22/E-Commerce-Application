const VendorWishlist = require("../model/vendorWishlistModel");
const Vendor = require("../model/vendorModel")
const Admin = require("../model/adminModel.js");

// Add a product to the vendor's wishlist
const addProductToWishlist = async (req, res) => {
  try {
    const { vendorId, name, sellingPrice, description, images, brandName } = req.body; // Take vendorId from body

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Check if the product already exists in the vendor's wishlist to avoid duplicates
    const existingWishlistItem = await VendorWishlist.findOne({
      name,
      vendorId,
    });

    if (existingWishlistItem) {
      return res.status(400).json({
        success: false,
        message: "Product already exists in your wishlist",
      });
    }

    const newWishlistItem = new VendorWishlist({
      name,
      sellingPrice,
      description,
      images,
      brandName,
      vendorId,
    });

    await newWishlistItem.save();

    return res.status(201).json({
      success: true,
      message: "Product added to wishlist",
      data: newWishlistItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add product to wishlist",
      error: error.message,
    });
  }
};



// Get all wishlist products for a vendor
const getVendorWishlist = async (req, res) => {
  try {
    const { vendorId } = req.body; // Take vendorId from body

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const wishlistItems = await VendorWishlist.find({ vendorId });

    return res.status(200).json({
      success: true,
      data: wishlistItems,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist items",
      error: error.message,
    });
  }
};

// Update the status of a wishlist item (for admin)
const updateWishlistItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, status } = req.body;
    
    if (!adminId) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin ID is required." });
    }
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Invalid admin ID. Access denied." });
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const updatedWishlistItem = await VendorWishlist.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedWishlistItem) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wishlist item status updated",
      data: updatedWishlistItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update wishlist item status",
      error: error.message,
    });
  }
};

// Delete a product from the wishlist
const deleteWishlistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const deletedItem = await VendorWishlist.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wishlist item deleted",
      data: deletedItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete wishlist item",
      error: error.message,
    });
  }
};

module.exports = {
  addProductToWishlist,
  getVendorWishlist,
  updateWishlistItemStatus,
  deleteWishlistItem,
};