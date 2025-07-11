const express = require('express');
const router = express.Router();
const { 
  createCoupon, 
  updateCoupon, 
  deleteCoupon, 
  getCoupons, 
  getCouponByCode
} = require('../controllers/couponController');
const authMiddleware = require('../middleware/authmiddleware');
const authenticateAdmin = require('../middleware/authenticateAdmin');

// Route to create a new coupon
router.post('/create', authenticateAdmin, createCoupon);

// Route to update an existing coupon
router.put('/update/:code', authenticateAdmin, updateCoupon);

// Route to delete a coupon
router.delete('/delete/:code', authenticateAdmin, deleteCoupon);

// Route to get all coupons
router.get('/', authenticateAdmin, getCoupons);

// Route to get a single coupon by code
router.get('/:code', authenticateAdmin, getCouponByCode);


module.exports = router;