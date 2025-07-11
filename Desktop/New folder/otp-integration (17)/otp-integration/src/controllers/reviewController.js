const Driver = require('../model/driverModel');
const { notifyDriver, handleEscalation } = require('../services/feedbackService');

// Submit a review
const submitReview = async (req, res) => {
  const { driverId, userId, rating, comment } = req.body;

  if (!driverId || !userId || !rating || !comment) {
    return res.status(400).json({ message: "All fields are required", success: false });
  }

  try {
    // Basic content moderation
    if (comment.includes("badword")) {
      return res.status(400).json({ message: "Inappropriate content detected", success: false });
    }

    const review = {
      userId,
      rating,
      comment,
      createdAt: new Date()
    };

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found", success: false });
    }

    driver.reviews.push(review);
    await driver.save();

    // Notify driver
    await notifyDriver(driverId, review);

    // Handle escalation for poor reviews
    if (rating <= 2) {
      await handleEscalation(review._id, driverId, "Poor review received");
    }

    res.status(201).json({ message: "Review submitted successfully", success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

module.exports = {
  submitReview,
  getDriverReviews
};
