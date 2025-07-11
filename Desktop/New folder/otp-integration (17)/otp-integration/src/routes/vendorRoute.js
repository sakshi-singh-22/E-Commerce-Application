const express = require('express');
const vendorController = require('../controllers/vendorController');
const vendorMiddleware = require('../middleware/vendorMiddleware'); // Updated path
const { generateVendorInvoicePDF } = require('../controllers/invoiceController');
const upload = require('../middleware/multerMiddleware');
const vendorWishlistController = require("../controllers/vendorWishlistController");
const subInventoryController = require("../controllers/subInventoryController");

const router = express.Router();

// Vendor registration
router.post('/register', vendorController.registerVendor);

router.post('/verify-register', vendorController.RegisterverifyOtp);

router.post('/complete-profile', vendorController.completeVendorProfile);

router.post('/upload-documents', upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'gstNumber', maxCount: 1 },
  { name: 'shopPhotoOrVideo', maxCount: 1 },
  { name: 'adharCard', maxCount: 1 }
]), vendorController.uploadVendorDocuments);


// Route to get vendor documents
router.get('/vendor-documents/:vendorId', vendorController.getVendorDocuments);

// Route to verify vendor documents
router.post('/verify-vendor-documents/:vendorId', vendorController.verifyVendorDocuments);

// // Vendor login
// router.post('/login-vendor', vendorController.loginWithEmailAndPassword);
router.post('/login-vendor-phone', vendorController.loginWithPhoneNumber);
router.post('/verify-vendor-otp', vendorController.verifyOtp);

// Vendor profile
router.get('/vendor-profile',  vendorController.getVendorProfile);

// Get products by vendor ID
router.get('/vendor/:vendorId', vendorController.getProductsByVendorId);

//current location
router.post('/currentLocation', vendorController.updateCurrentLocation);
router.get('/currentLocation',  vendorController.getCurrentLocation);

// Generate vendor invoice PDF
router.get('/vendorinvoice/:orderId',  generateVendorInvoicePDF);


router.put("/shop-status",  vendorController.updateShopStatus);

router.get("/shop-status", vendorController.getShopStatus);

// vendor wishlist
router.post(
  "/wishlist",
  vendorWishlistController.addProductToWishlist
);
router.get(
  "/wishlist",
  vendorWishlistController.getVendorWishlist
);

router.delete(
  "/wishlist/:id",
  vendorWishlistController.deleteWishlistItem
);

//subInventory routes
router.post(
  "/subInventory/product",
  subInventoryController.addProductToSubInventory
);
router.get(
  "/subInventory/:vendorId",
  subInventoryController.getSubInventoryByVendor
);
router.put(
  "/subInventory/:productId",
  subInventoryController.updateProductInSubInventory
);
router.delete(
  "/subInventory/:productId",
  subInventoryController.deleteProductFromSubInventory
);

module.exports = router;
