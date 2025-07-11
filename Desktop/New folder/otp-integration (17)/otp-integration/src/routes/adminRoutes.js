// src/routes/adminRoutes.js
const express = require("express");
const adminController = require("../controllers/adminController");
const authenticateAdmin = require("../middleware/authenticateAdmin");
const {
  generateInvoicePDFForAdmin,
} = require("../controllers/invoiceController");
const vendorWishlistController = require("../controllers/vendorWishlistController");
const router = express.Router();

// Admin Registration
router.post("/register", adminController.register);

// Admin Login (Email & Password)
router.post("/login/email", adminController.loginWithEmail);

// Admin Login (Phone Number & OTP)
router.post("/login/phone", adminController.loginWithPhone);

// Admin Update Route
router.put("/update", authenticateAdmin, adminController.updateAdmin);

// Admin Deletion
router.delete("/:id", authenticateAdmin, adminController.deleteAdmin);

// User Management Routes
router.get("/users", authenticateAdmin, adminController.getAllUsers);
router.put("/users/:id", authenticateAdmin, adminController.updateUser);
router.delete("/users/:id", authenticateAdmin, adminController.deleteUser);

// Vendor Management Routes
router.get("/vendors", authenticateAdmin, adminController.getAllVendors);
router.put("/vendors/:id", authenticateAdmin, adminController.updateVendor);
router.delete("/vendors/:id", authenticateAdmin, adminController.deleteVendor);

// Product Management Routes
router.get("/products", authenticateAdmin, adminController.getAllProducts);
router.put("/products/:id", authenticateAdmin, adminController.updateProduct);
router.delete(
  "/products/:id",
  authenticateAdmin,
  adminController.deleteProduct
);

// Order Management Routes
router.get("/orders", authenticateAdmin, adminController.getAllOrders);
router.patch(
  "/orders/:id/status",
  authenticateAdmin,
  adminController.updateOrderStatus
);

// Driver Management Routes
// View Driver Details and Status
router.get("/:driverId", authenticateAdmin, adminController.viewDriverDetails);

// Update Driver Verification Status
router.patch(
  "/:driverId/status",
  authenticateAdmin,
  adminController.updateDriverVerificationStatus
);

// Route to view all drivers with their ratings and reviews
router.get("/drivers", adminController.getAllDriversWithRatings);

// Route to filter drivers by rating
router.get("/drivers/filter", adminController.filterDriversByRating);

// Route to sort drivers by rating
router.get("/drivers/sort", adminController.sortDriversByRating);

// Route to generate performance report
router.get("/drivers/report", adminController.generatePerformanceReport);

//driver status (offline,on a trip,available)
router.get(
  "/drivers/allStatus",
  adminController.getAllDrivers
);
router.get(
  "/drivers/status/:status",
  adminController.getDriversByStatus
);
router.get(
  "/driverStatus/:driverId",
  adminController.getDriver
);

//invoice
router.get(
  "/generateInvoicePDF/:orderId",
  generateInvoicePDFForAdmin
);

router.get("/earnings", adminController.getAllDriverEarnings);
router.get("/earnings/filter", adminController.filterEarningsByDate);
router.get("/payouts", adminController.getAllPayouts);
router.get("/payouts/report", adminController.generatePayoutReport);

//route to service location(geofencing)
router.post('/serviceAreaLocation', adminController.addServiceAreaLocation)
router.get('/serviceAreaLocation/:Id', adminController.getServiceAreaLocation)
router.put('/serviceAreaLocation/:Id', adminController.updateServiceAreaLocation)
router.delete('/serviceAreaLocation/:Id', adminController.deleteServiceAreaLocation)
// router.get('/allserviceAreaLocations', authenticateAdmin, adminController.getAllServiceAreaLocations)

//vendor wishlist status update
router.patch(
  "/wishlist/:id",
  vendorWishlistController.updateWishlistItemStatus
);

//product use cases
router.post("/add-product-uses", adminController.addProductUses);

//subInventory
router.post(
  "/subInventory/SingleProductStatuses",
  adminController.changeSingleProductStatusesByVendor
);
router.post(
  "/subInventory/AllProductStatuses",
  adminController.changeAllProductStatusesByVendor
);
router.get(
  "/subInventory/:vendorId",
  adminController.getPendingSubInventoryByVendor
);
module.exports = router;