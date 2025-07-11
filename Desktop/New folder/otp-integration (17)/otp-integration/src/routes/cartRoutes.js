const express = require('express');
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authmiddleware'); // Ensure this is the correct path


const router = express.Router();

// Routes for cart management
router.get('/',  cartController.createOrRetrieveCart); // Create or retrieve cart
router.post('/add-item', cartController.addItemToCart); // Add item to cart
router.post('/remove-item',  cartController.removeItemFromCart); // Remove item from cart
router.post('/update-item', cartController.updateItemQuantity); // Update item quantity
router.get('/summary',  cartController.getCartSummary); // Get cart summary and pricing

router.post('/apply-coupon', authMiddleware, cartController.applyCoupon); // Apply a coupon to the cart

//router.get('/available-discounts', authMiddleware, cartController.getAvailableDiscounts);

module.exports = router;
