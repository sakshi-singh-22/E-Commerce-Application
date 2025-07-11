const express = require("express");
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middleware/authmiddleware");
const { generateInvoicePDF } = require("../controllers/invoiceController");

const router = express.Router();

router.get("/locations",  orderController.getAllLocations);

router.get("/payment-methods",  orderController.getAllPaymentMethods);


// Create Order Route
router.post("/create",  orderController.createOrder);

// Update Order Status Route
router.patch("/update-status", orderController.updateOrderStatus);

router.post("/cancel-order", orderController.cancelOrder);

router.get("/history",  orderController.getOrderHistory);

router.post("/reOrder", orderController.reOrder);

router.get("/generateInvoicePDF/:orderId",  generateInvoicePDF);

router.get('/getOrderETA',  orderController.getDeliveryTimeEstimation );

module.exports = router;