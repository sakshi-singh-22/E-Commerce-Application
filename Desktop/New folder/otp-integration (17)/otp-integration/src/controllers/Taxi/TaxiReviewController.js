const TaxiReview = require("../../model/Taxi/TaxiReviewModel");
const Ride = require("../../model/Taxi/rideModel");
const User = require("../../model/authmodel");
const Admin = require("../../model/adminModel");

// Function to post a new taxi review (user)
const postTaxiReview = async (req, res) => {
  try {
    const {
      rideId,
      userId,
      rating,
      comments,
      cleanliness,
      drivingSkill,
      punctuality,
      comfort,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res
        .status(404)
        .json({ message: "Ride not found or unauthorized access." });
    }

    const existingReview = await TaxiReview.findOne({ rideId, userId });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this ride." });
    }

    const newReview = new TaxiReview({
      rideId,
      userId,
      driverId: ride.driver,
      rating,
      comments,
      cleanliness,
      drivingSkill,
      punctuality,
      comfort,
    });

    await newReview.save();

    return res.status(201).json({
      message: "Review posted successfully.",
      review: newReview,
    });
  } catch (error) {
    console.error("Error posting taxi review:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify if a valid userId is provided
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Fetch all reviews made by the user
    const reviews = await TaxiReview.find({ userId });

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

// Get all reviews for a specific ride (Admin)
const getReviewsForRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { adminId } = req.body;

    // Verify if a valid adminId is provided
    if (!adminId) {
      return res.status(400).json({ message: "Admin ID is required." });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const reviews = await TaxiReview.find({ rideId });

    if (!reviews.length) {
      return res
        .status(404)
        .json({ message: "No reviews found for this ride." });
    }

    return res.status(200).json({
      message: "Reviews fetched successfully.",
      reviews,
    });
  } catch (error) {
    console.error("Error fetching reviews for ride:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Get all reviews for a specific driver (Admin)
const getReviewsForDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { adminId } = req.body;
    // Verify if a valid adminId is provided
    if (!adminId) {
      return res.status(400).json({ message: "Admin ID is required." });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const reviews = await TaxiReview.find({ driverId });

    if (!reviews.length) {
      return res
        .status(404)
        .json({ message: "No reviews found for this driver." });
    }

    return res.status(200).json({
      message: "Reviews fetched successfully.",
      reviews,
    });
  } catch (error) {
    console.error("Error fetching reviews for driver:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Get all reviews (Admin)
const getAllReviews = async (req, res) => {
  try {
    const { adminId } = req.body;

    // Verify if the adminId is valid
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const reviews = await TaxiReview.find();

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

// Delete a review (Admin)
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { adminId } = req.body;
    // Verify if the adminId is valid
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const deletedReview = await TaxiReview.findByIdAndDelete(reviewId);

    if (!deletedReview) {
      return res.status(404).json({ message: "Review not found." });
    }

    return res.status(200).json({
      message: "Review deleted successfully.",
      review: deletedReview,
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  postTaxiReview,
  getReviewsByUser,
  getReviewsForRide,
  getReviewsForDriver,
  getAllReviews,
  deleteReview,
};