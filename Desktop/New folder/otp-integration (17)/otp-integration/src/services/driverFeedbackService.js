// services/driverFeedbackService.js

const Driver = require('../models/Driver');
const { sendAppNotification } = require('../utils/notificationUtils'); // A utility to send notifications within the app

// Notify driver of new rating and review
async function notifyDriverOfReview(driverId, review) {
  try {
    const driver = await Driver.findById(driverId);

    if (!driver) {
      throw new Error('Driver not found');
    }

    const message = `You have received a new review: "${review.comment}" with a rating of ${review.rating} stars.`;

    // Send notification to the driver within the app
    await sendAppNotification(driverId, message);
  } catch (err) {
    console.error('Error notifying driver of review:', err.message);
  }
}

module.exports = {
  notifyDriverOfReview,
};
