const Admin = require("../model/adminModel");
const User = require("../model/authmodel"); // Assuming user model exists
const Vendor = require("../model/vendorModel"); // Assuming vendor model exists
const Product = require("../model/productmodel"); // Assuming product model exists
const Order = require("../model/orderModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const otpService = require("../services/otpService"); // Adjust import based on your actual OTP service
const { generateAdminToken } = require("../utils/tokenUtils");
const Driver = require("../model/driverModel");
const Earnings = require("../model/earningsModel");
const Payouts = require("../model/payoutModel");
const ServiceAreaLocation = require('../model/serviceAreaLocationModel');
const SubInventory = require("../model/subinventoryModel");
// Admin Registration
const register = async (req, res) => {
  const { name, email, password, phoneNumber } = req.body;

  if (
    !name ||
    !email ||
    !password ||
    !phoneNumber ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "Name, email, phone number, and a valid password are required",
      success: false,
    });
  }

  try {
    const existingAdmin = await Admin.findOne({ email }).select("-password");
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin already exists", success: false });
    }

    const existingPhoneAdmin = await Admin.findOne({ phoneNumber }).select(
      "-password"
    );
    if (existingPhoneAdmin) {
      return res
        .status(400)
        .json({ message: "Phone number already registered", success: false });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
    });

    await admin.save();

    const token = generateAdminToken(admin._id, "2h");

    res.status(201).json({
      message: "Admin registered successfully",
      success: true,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error during registration",
      success: false,
    });
  }
};

// Admin Login (Email & Password)
const loginWithEmail = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid email " });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = generateAdminToken(admin._id, "2h");
    res.json({
      message: "Login successful",
      token,
      admin: {
        _id: admin._id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin Login (Phone Number & OTP)

// Admin Login (Phone Number & OTP)
const loginWithPhone = async (req, res) => {
  const { phoneNumber, otp, verificationId } = req.body;

  if (!phoneNumber || !otp || !verificationId) {
    return res.status(400).json({
      message: "Phone number, OTP, and verification ID are required",
      success: false,
    });
  }

  try {
    // Find the admin by phone number
    const admin = await Admin.findOne({ phoneNumber });
    if (!admin) {
      return res
        .status(400)
        .json({ message: "Invalid phone number or OTP", success: false });
    }

    // Verify OTP
    const otpValidation = await otpService.verifyOtp(
      verificationId,
      phoneNumber,
      otp
    );

    if (!otpValidation) {
      return res
        .status(400)
        .json({ message: "OTP verification failed", success: false });
    }

    // Generate JWT token
    const token = generateAdminToken(admin._id, "2h");
    res.status(200).json({
      message: "Login successful",
      success: true,
      token,
    });
  } catch (error) {
    console.error("Error during admin login:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

// Admin Update
const updateAdmin = async (req, res) => {
  const { name, email, phoneNumber } = req.body;

  try {
    // Find the admin using the ID from the token
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res
        .status(404)
        .json({ message: "Admin not found", success: false });
    }

    // Update fields if they are provided in the request
    admin.name = name || admin.name;
    admin.email = email || admin.email;
    admin.phoneNumber = phoneNumber || admin.phoneNumber;

    // Save the updated admin
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: admin,
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

// Admin Deletion
const deleteAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const admin = await Admin.findByIdAndDelete(id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
// Manage Users, Vendors, and Products
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.status(200).json(vendors);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update User by ID
const updateUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndUpdate(id, req.body, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Vendor by ID
const updateVendor = async (req, res) => {
  const { id } = req.params;

  try {
    const vendor = await Vendor.findByIdAndUpdate(id, req.body, { new: true });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({ message: "Vendor updated successfully", vendor });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Product by ID
const updateProduct = async (req, res) => {
  const productId = req.params.id; // This should be the productId
  const updateData = req.body;

  try {
    // Fetch the existing product by productId
    const product = await Product.findOne({ productId });

    if (!product) {
      console.log("Product not found for productId:", productId);
      return res.status(404).send({ message: "Product not found" });
    }

    // Update fields other than variants
    Object.keys(updateData).forEach((key) => {
      if (key !== "variants" && product[key] !== undefined) {
        product[key] = updateData[key];
      }
    });

    // Handle variants separately
    if (updateData.variants) {
      updateData.variants.forEach((updatedVariant) => {
        const existingVariant = product.variants.find(
          (v) => v.variantSKU === updatedVariant.variantSKU
        );

        if (existingVariant) {
          // Update existing variant fields
          Object.assign(existingVariant, updatedVariant);
        } else {
          // Add new variant if it doesn't exist
          product.variants.push(updatedVariant);
        }
      });
    }

    // Recalculate total quantity based on variants
    product.quantity = product.variants.reduce(
      (total, variant) => total + variant.quantity,
      0
    );

    // Update variant status if necessary
    if (typeof product.updateVariantStatus === "function") {
      product.updateVariantStatus();
    }

    // Save the updated product
    await product.save();

    // Send the updated product details in the response
    res.status(200).send({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send({ message: "Server error", error: error.message });
  }
};

// Deleting User by ID
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Deleting Vendor by ID
const deleteVendor = async (req, res) => {
  const { id } = req.params;

  try {
    const vendor = await Vendor.findByIdAndDelete(id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({ message: "Vendor deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Deleting Product by ID
// Delete product by ID
const deleteProduct = async (req, res) => {
  try {
    const vendorId = req.vendor.id; // Fetch vendor ID from token
    const productId = req.params.id;

    if (!productId || typeof productId !== "string") {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    const deletedProduct = await Product.findOneAndDelete({
      productId,
      vendorId,
    });

    if (!deletedProduct) {
      return res
        .status(404)
        .json({ message: "Product not found or not authorized to delete" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error); // Debug log
    res.status(500).json({ message: "Error deleting product", error });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("user items.productId");
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

// Update Order Status
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res
      .status(400)
      .json({ message: "Status is required", success: false });
  }

  const validStatuses = [
    "Pending",
    "Confirmed",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status", success: false });
  }

  try {
    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("user items.productId");

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found", success: false });
    }

    // Optional: Update inventory based on the new status
    if (status === "Cancelled" || status === "Delivered") {
      for (const item of order.items) {
        const product = await Product.findById(item.productId._id);
        if (product) {
          const variant = product.variants.find(
            (v) => v.variantSKU === item.variant.variantSKU
          );
          if (variant) {
            variant.quantity += item.quantity; // Add back to inventory
            await product.save();
          }
        }
      }
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

// View Driver Details (Admin Only)
const viewDriverDetails = async (req, res) => {
  const { driverId } = req.params;

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    res.status(200).json({
      message: "Driver details fetched successfully",
      success: true,
      driver: {
        name: driver.name,
        phoneNumber: driver.phoneNumber,
        adharCardNumber: driver.adharCardNumber,
        drivingLicenseNumber: driver.drivingLicenseNumber,
        location: driver.location,
        verificationStatus: driver.verificationStatus,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during fetching driver details",
      success: false,
    });
  }
};

// Update Driver Verification Status (Admin Only)
const updateDriverVerificationStatus = async (req, res) => {
  const { driverId } = req.params;
  const { status } = req.body; // Expect status to be 'Verified' or 'Failed'

  if (!["Verified", "Failed"].includes(status)) {
    return res.status(400).json({ message: "Invalid status", success: false });
  }

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    driver.verificationStatus = status;
    await driver.save();

    res.status(200).json({
      message: "Driver verification status updated successfully",
      success: true,
      driver: {
        name: driver.name,
        phoneNumber: driver.phoneNumber,
        verificationStatus: driver.verificationStatus,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during driver verification",
      success: false,
    });
  }
};

// View all drivers with their ratings and reviews
const getAllDriversWithRatings = async (req, res) => {
  try {
    const drivers = await Driver.find()
      .select("name email phoneNumber averageRating ratingCount reviews")
      .populate("reviews.userId", "name email"); // Populate user details in reviews
    res.status(200).json(drivers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching drivers with ratings", error });
  }
};

// Filter drivers by rating (e.g., get drivers with averageRating >= 4)
const filterDriversByRating = async (req, res) => {
  const { minRating } = req.query;
  try {
    const drivers = await Driver.find({
      averageRating: { $gte: minRating },
    }).select("name email phoneNumber averageRating ratingCount reviews");
    res.status(200).json(drivers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error filtering drivers by rating", error });
  }
};

// Sort drivers by rating (high to low)
const sortDriversByRating = async (req, res) => {
  try {
    const drivers = await Driver.find()
      .select("name email phoneNumber averageRating ratingCount reviews")
      .sort({ averageRating: -1 }); // Sort by averageRating in descending order
    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ message: "Error sorting drivers by rating", error });
  }
};

// Generate a report identifying trends in driver performance
const generatePerformanceReport = async (req, res) => {
  try {
    const drivers = await Driver.find().select(
      "name email phoneNumber averageRating ratingCount reviews"
    );

    const report = drivers.map((driver) => {
      return {
        driverName: driver.name,
        email: driver.email,
        phoneNumber: driver.phoneNumber,
        averageRating: driver.averageRating,
        ratingCount: driver.ratingCount,
        positiveReviews: driver.reviews.filter((review) => review.rating >= 4)
          .length,
        negativeReviews: driver.reviews.filter((review) => review.rating <= 2)
          .length,
        feedback: driver.feedback,
      };
    });

    res.status(200).json(report);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error generating performance report", error });
  }
};

// View all driver earnings
const getAllDriverEarnings = async (req, res) => {
  try {
    const earnings = await Earnings.find().populate("driver", "name email");
    res.status(200).json(earnings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching earnings", error });
  }
};

// Filter earnings by date range
const filterEarningsByDate = async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const earnings = await Earnings.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).populate("driver", "name email");
    res.status(200).json(earnings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error filtering earnings by date", error });
  }
};

// View all payouts
const getAllPayouts = async (req, res) => {
  try {
    const payouts = await Payouts.find().populate("driver", "name email");
    res.status(200).json(payouts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching payouts", error });
  }
};

// Generate a report of payout trends
const generatePayoutReport = async (req, res) => {
  try {
    const payouts = await Payouts.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          payoutCount: { $count: {} },
          averagePayout: { $avg: "$amount" },
        },
      },
    ]);

    res.status(200).json(payouts);
  } catch (error) {
    res.status(500).json({ message: "Error generating payout report", error });
  }
};

// Fetch All Drivers and Their Statuses
const getAllDrivers = async (req, res) => {
  try {
    const { adminId } = req.body;
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

    const drivers = await Driver.find(
      {},
      "name phoneNumber email status location"
    );
    res.status(200).json({
      message: "Drivers fetched successfully",
      success: true,
      drivers,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during fetching drivers",
      success: false,
    });
  }
};
// Fetch Drivers by Status
const getDriversByStatus = async (req, res) => {
  const { status } = req.params;
  const { adminId } = req.body;
    
  if (!["Available", "On a Trip", "Offline"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Invalid status value", success: false });
  }

  try {

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

    const drivers = await Driver.find(
      { status },
      "name phoneNumber email status location"
    );
    res.status(200).json({
      message: "Drivers fetched successfully",
      success: true,
      drivers,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during fetching drivers by status",
      success: false,
    });
  }
};
//fetching single driver status
const getDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { adminId } = req.body;
    
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

    const driver = await Driver.findById(
      driverId,
      "name phoneNumber email status location"
    );

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found",
        success: false,
      });
    }

    res.status(200).json({
      message: "Driver details fetched successfully",
      success: true,
      driver: {
        name: driver.name,
        phoneNumber: driver.phoneNumber,
        email: driver.email,
        status: driver.status,
        location: driver.location,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during fetching driver details",
      success: false,
    });
  }
};

const addServiceAreaLocation = async (req, res) => {
  const { serviceAreaName, areaBoundary, clusters } = req.body

  if (!serviceAreaName || !areaBoundary || !clusters) {
    return res.status(400).json({
      message: "serviceAreaName, areaCoordinates and clusters are required",
      success: false,
    });
  }

  try {
    const serviceAreaLocation = new ServiceAreaLocation({ 
      serviceAreaName, 
      boundary: areaBoundary, 
      clusters 
    })
    await serviceAreaLocation.save();

    res.status(201).json({
      message: "New service area location successfully created",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getServiceAreaLocation = async (req, res) => {
  const { Id } = req.params;

  if (!Id) {
    return res.status(400).json({ message: 'id is required', success: false });
  }

 
  try {
    const serviceAreaLocation = await ServiceAreaLocation.findById(Id)

    if (!serviceAreaLocation) {
      return res.status(404).json({ message: 'serviceAreaLocation not found', success: false });
    }
    res.status(200).json({ success: true, data: serviceAreaLocation });

  } catch(error) {
      res.status(500).json({ error: error.message });
  }
}

const updateServiceAreaLocation = async (req, res) => {
  const { Id } = req.params;
  const { serviceAreaName, areaBoundary, clusters } = req.body
  const data = { }

  if (!Id) {
    return res.status(400).json({ message: 'id is required', success: false });
  }

  if(serviceAreaName) {
      data.serviceAreaName = serviceAreaName
  }
  if(areaBoundary) {
      data.boundary = areaBoundary
  }
  if(clusters) {
      data.clusters = clusters
  }

  try {
    const serviceAreaLocation = await ServiceAreaLocation.findByIdAndUpdate(Id, data, { new: true });

    if (!serviceAreaLocation) {
      return res.status(404).json({ message: 'serviceAreaLocation not found', success: false });
    }

    res.status(200).json({ success: true, data: serviceAreaLocation });

  } catch (error) {
      res.status(500).json({ error: error.message });
  }
}

const deleteServiceAreaLocation = async (req, res) => {
  const { Id } = req.params;

  if (!Id) {
    return res.status(400).json({ message: 'id is required', success: false });
  }
  try {
    const serviceAreaLocation = await ServiceAreaLocation.findByIdAndDelete(Id);
    if (!serviceAreaLocation) {
      return res.status(404).json({ message: 'serviceAreaLocation not found' });
    }

    res.status(200).json({ message: 'serviceAreaLocation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// const getAllServiceAreaLocations = async (req, res) => {
//   try {
//     const allServiceAreaLocations = await ServiceAreaLocation.find({});

//     if (allServiceAreaLocations.length === 0) {
//       return res.status(404).json({ message: 'No service locations found' });
//     }

//     res.status(200).json(allServiceAreaLocations);
//   } catch (error) {

//     res.status(500).json({ error: 'Internal server error' });
//   }
// }

const addProductUses = async (req, res) => {
  const { productId, uses } = req.body;

  try {
    const product = await Product.findOne({ productId });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!Array.isArray(uses)) {
      return res.status(400).json({ message: "Uses must be an array" });
    }

    product.productUses = uses;
    await product.save();

    return res
      .status(200)
      .json({ message: "Product uses updated successfully" });
  } catch (error) {
    console.error("Error updating product uses:", error);
    return res
      .status(500)
      .json({ message: "Error updating product uses", error: error.message });
  }
};

//subInventory
const changeSingleProductStatusesByVendor = async (req, res) => {
  const { adminId, vendorId, productId, status } = req.body;

  try {

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

    const subInventoryProduct = await SubInventory.findOne({
      vendorId,
      productId,
    });

    if (!subInventoryProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!["Pending", "Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // If status is already accepted, do not add to Product model again
    if (subInventoryProduct.status === "Accepted" && status === "Accepted") {
      return res.status(400).json({
        message: "Product is already accepted in the SubInventory model",
      });
    }

    subInventoryProduct.status = status;

    if (status === "Accepted") {
      const existingProduct = await Product.findOne({ productId });

      if (existingProduct) {
        return res.status(400).json({
          message: "Product already accepted and exists in the Product model",
        });
      }

      const newProduct = new Product({
        name: subInventoryProduct.name,
        sellingPrice: subInventoryProduct.sellingPrice,
        mrp: subInventoryProduct.mrp,
        description: subInventoryProduct.description,
        tags: subInventoryProduct.tags,
        domainTag : subInventoryProduct.domainTag,
        images: subInventoryProduct.images,
        category: subInventoryProduct.category,
        brandName: subInventoryProduct.brandName,
        nutritionalInfo: subInventoryProduct.nutritionalInfo,
        vendorId: subInventoryProduct.vendorId,
        variants: subInventoryProduct.variants,
        quantity: subInventoryProduct.quantity,
        productId: subInventoryProduct.productId,
      });

      await newProduct.save();
    }

    await subInventoryProduct.save();

    return res.status(200).json({
      message: "Product status updated successfully",
      product: subInventoryProduct,
    });
  } catch (error) {
    console.error("Error updating product status:", error);
    return res.status(500).json({
      message: "Error updating product status",
      error: error.message,
    });
  }
};
const changeAllProductStatusesByVendor = async (req, res) => {
  const { vendorId, status, adminId } = req.body;
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
  try {
    if (!["Pending", "Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const subInventoryProducts = await SubInventory.find({ vendorId });

    if (!subInventoryProducts || subInventoryProducts.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this vendor" });
    }

    let updatedProducts = [];
    let acceptedProducts = [];

    for (const product of subInventoryProducts) {
      if (product.status === "Accepted" && status === "Accepted") {
        continue;
      }
      product.status = status;

      if (status === "Accepted") {
        const existingProduct = await Product.findOne({
          productId: product.productId,
        });

        if (!existingProduct) {
          const newProduct = new Product({
            name: product.name,
            sellingPrice: product.sellingPrice,
            mrp: product.mrp,
            description: product.description,
            tags: product.tags,
            domainTag: product.domainTag,
            images: product.images,
            category: product.category,
            brandName: product.brandName,
            nutritionalInfo: product.nutritionalInfo,
            vendorId: product.vendorId,
            variants: product.variants,
            quantity: product.quantity,
            productId: product.productId,
          });

          await newProduct.save();
          acceptedProducts.push(newProduct);
        }
      }

      await product.save();
      updatedProducts.push(product);
    }

    return res.status(200).json({
      message: `Product statuses updated to "${status}" for all items of vendor ${vendorId}`,
      updatedProducts,
      acceptedProducts,
    });
  } catch (error) {
    console.error("Error updating product statuses:", error);
    return res.status(500).json({
      message: "Error updating product statuses",
      error: error.message,
    });
  }
};
const getPendingSubInventoryByVendor = async (req, res) => {
  const { vendorId } = req.params;
  const { adminId } = req.body

  try {

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

    const pendingProducts = await SubInventory.find({
      vendorId,
      status: "Pending",
    });

    if (!pendingProducts || pendingProducts.length === 0) {
      return res
        .status(404)
        .json({ message: "No pending products found for this vendor." });
    }

    return res.status(200).json({
      message: "Pending products retrieved successfully.",
      products: pendingProducts,
    });
  } catch (error) {
    console.error("Error retrieving pending products:", error);
    return res.status(500).json({
      message: "Error retrieving pending products.",
      error: error.message,
    });
  }
};


module.exports = {
  register,
  loginWithEmail,
  loginWithPhone,
  updateAdmin,
  deleteAdmin,
  getAllUsers,
  getAllVendors,
  getAllProducts,
  updateUser,
  updateVendor,
  updateProduct,
  deleteUser,
  deleteVendor,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  viewDriverDetails,
  updateDriverVerificationStatus,
  getAllDriversWithRatings,
  filterDriversByRating,
  sortDriversByRating,
  generatePerformanceReport,
  getAllDriverEarnings,
  filterEarningsByDate,
  getAllPayouts,
  generatePayoutReport,
  getAllDrivers,
  getDriversByStatus,
  getDriver,
  addServiceAreaLocation,
  getServiceAreaLocation,
  updateServiceAreaLocation,
  deleteServiceAreaLocation,
  addProductUses,
  changeSingleProductStatusesByVendor,
  changeAllProductStatusesByVendor,
  getPendingSubInventoryByVendor,
};