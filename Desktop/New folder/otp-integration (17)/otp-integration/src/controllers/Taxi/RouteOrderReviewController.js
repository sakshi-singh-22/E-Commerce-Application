const orderReview = require("../../model/Taxi/RouteOrderReviewModel");
const Ride = require("../../model/Taxi/rideModel");
const User = require("../../model/authmodel");
const Admin = require("../../model/adminModel");
const Order = require("../../model/orderModel");

// Post a new review (user)
const postReview = async (req, res) => {
  try {
    const {
      userId,
      rideId,
      delivery_time_rating,
      delivery_time_comment,
      product_rating,
      product_comment,
      recommend_vendor,
      issue,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(403)
        .json({ message: "User verification failed or User not found." });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    const OrderId = ride.orderId;
    const order = await Order.findById(OrderId);

    const newReview = new orderReview({
      userId,
      rideId,
      vendorId: order.items[0].vendor.vendorId,
      orderId: OrderId,
      delivery_time_rating,
      delivery_time_comment,
      product_rating,
      product_comment,
      recommend_vendor,
      issue,
    });

    await newReview.save();
    return res.status(201).json({ message: "Review saved successfully." });
  } catch (error) {
    console.error("Error posting taxi order review:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Get all reviews (user)
const getReviewUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(403)
        .json({ message: "User verification failed or User not found." });
    }

    const reviews = await orderReview.find({ userId });

    if (!reviews.length) {
      return res
        .status(404)
        .json({ message: "No reviews found for this user." });
    }

    return res.status(200).json({
      message: "Reviews fetched successfully.",
      reviews,
    });
  } catch (error) {
    console.error("Error fetching reviews by user:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Get all reviews (Admin)
const getAllReviews = async (req, res) => {
  try {
    const { adminId } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Admin verification failed or Admin not found." });
    }

    const reviews = await orderReview.find({});
    if (!reviews.length) {
      return res.status(404).json({ message: "No reviews found." });
    }

    return res.status(200).json({
      message: "All reviews fetched successfully.",
      reviews,
    });
  } catch (error) {
    console.error("Error fetching all reviews:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Update a review (User)
const updateReview = async (req, res) => {
  try {
    const {
      reviewId,
      userId,
      delivery_time_rating,
      delivery_time_comment,
      product_rating,
      product_comment,
      recommend_vendor,
      issue,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(403)
        .json({ message: "User verification failed or User not found." });
    }

    const review = await orderReview.findOne({ _id: reviewId, userId });
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    review.delivery_time_rating =
      delivery_time_rating || review.delivery_time_rating;
    review.delivery_time_comment =
      delivery_time_comment || review.delivery_time_comment;
    review.product_rating = product_rating || review.product_rating;
    review.product_comment = product_comment || review.product_comment;
    review.recommend_vendor = recommend_vendor ?? review.recommend_vendor;
    review.issue = issue || review.issue;

    await review.save();
    return res.status(200).json({ message: "Review updated successfully." });
  } catch (error) {
    console.error("Error updating review:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Delete a review (Admin)
const deleteReview = async (req, res) => {
  try {
    const { reviewId, adminId } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Admin verification failed or Admin not found." });
    }

    const review = await orderReview.findByIdAndDelete(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    return res.status(200).json({ message: "Review deleted successfully." });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  postReview,
  getReviewUser,
  getAllReviews,
  updateReview,
  deleteReview,
};