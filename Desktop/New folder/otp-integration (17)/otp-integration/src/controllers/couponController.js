const Coupon = require("../model/couponModel");
const CouponService = require("../services/couponService");

// Create a new coupon
const createCoupon = async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    expirationDate,
    usageLimit,
    applicableProducts,
    applicableCategories,
    applicableSubcategories,
    applicableBrands,
    applyToAllCart,
    applyToTag,
  } = req.body;

  try {
    const existingCoupon = await CouponService.getCouponByCode(code);
    if (existingCoupon) {
      return res
        .status(400)
        .json({ message: "Coupon code already exists", success: false });
    }

    const coupon = new Coupon({
      code,
      discountType,
      discountValue,
      expirationDate,
      usageLimit,
      usedCount: 0,
      applicableProducts,
      applicableCategories,
      applicableSubcategories,
      applicableBrands,
      applyToAllCart,
      applyToTag,
    });

    await coupon.save();
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ message: "Server error", success: false });
  }
};

// Get all coupons
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ message: "Server error", success: false });
  }
};

// Get a single coupon by code
const getCouponByCode = async (req, res) => {
  const { code } = req.params;

  try {
    const coupon = await CouponService.getCouponByCode(code);
    if (!coupon) {
      return res
        .status(404)
        .json({ message: "Coupon not found", success: false });
    }
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ message: "Server error", success: false });
  }
};

// Update a coupon
const updateCoupon = async (req, res) => {
  const { code } = req.params;
  const {
    discountType,
    discountValue,
    expirationDate,
    usageLimit,
    applicableProducts,
    applicableCategories,
    applicableSubcategories,
    applicableBrands,
    applyToAllCart,
    applyToTag,
  } = req.body;

  try {
    const updates = {
      discountType,
      discountValue,
      expirationDate,
      usageLimit,
      applicableProducts,
      applicableCategories,
      applicableSubcategories,
      applicableBrands,
      applyToAllCart,
      applyToTag,
    };

    const coupon = await Coupon.findOneAndUpdate({ code }, updates, {
      new: true,
    });
    if (!coupon) {
      return res
        .status(404)
        .json({ message: "Coupon not found", success: false });
    }
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ message: "Server error", success: false });
  }
};

// Delete a coupon
const deleteCoupon = async (req, res) => {
  const { code } = req.params;

  try {
    const coupon = await Coupon.findOneAndDelete({ code });
    if (!coupon) {
      return res
        .status(404)
        .json({ message: "Coupon not found", success: false });
    }
    res.status(200).json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", success: false });
  }
};

module.exports = {
  createCoupon,
  getCoupons,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
};