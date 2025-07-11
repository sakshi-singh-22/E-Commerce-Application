const express = require('express');
const router = express.Router();
const vendorOrderController = require('../controllers/vendorOrderController'); // Adjust the path as necessary

// Get vendor order history
router.post('/vendor/orders', vendorOrderController.getVendorOrderHistory);

// Create vendor orders
router.post('/vendor/orders/create/:orderId', vendorOrderController.createVendorOrders);

// Accept a vendor order
router.put('/vendor/orders/accept/:vendorOrderId', vendorOrderController.acceptVendorOrder);

// Reject a vendor order
router.put('/vendor/orders/reject/:vendorOrderId', vendorOrderController.rejectVendorOrderActive);

// Reject a specific item from an accepted order
router.put('/vendor/orders/reject-item', vendorOrderController.rejectSpecificItem);

// Update vendor order status
router.put('/vendor/orders/status/:vendorOrderId', vendorOrderController.updateVendorOrderStatus);

//Get vendor order Pickup ETA
router.get('/vendor/orderPickUpETA', vendorOrderController.getOrderPickUpETA);



module.exports = router;
