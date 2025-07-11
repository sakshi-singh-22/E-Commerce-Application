// services/driverEscalationService.js

const Driver = require('../models/Driver');
const Escalation = require('../models/Escalation');
const { sendAppNotification } = require('../utils/notificationUtils');

// Handle escalation for poor reviews
async function handleEscalation(driverId, review) {
  try {
    if (review.rating <= 2) { // Assuming ratings of 2 or below need escalation
      // Create an escalation entry
      const escalation = new Escalation({
        driver: driverId,
        reviewId: review._id,
        status: 'Pending',
        createdAt: new Date(),
      });

      await escalation.save();

      const driverMessage = `Your recent review has been flagged for further review. Our management will contact you if necessary.`;
      const adminMessage = `Driver ${driverId} has received a poor review. Please review the case in the escalation section.`;

      // Notify the driver within the app
      await sendAppNotification(driverId, driverMessage);

      // Notify the admin within the app (assuming there's an admin notification system)
      await sendAppNotification('admin', adminMessage); // 'admin' is a placeholder; replace with actual admin ID

      console.log(`Escalation created for driver ${driverId}`);
    }
  } catch (err) {
    console.error('Error handling escalation:', err.message);
  }
}

module.exports = {
  handleEscalation,
};
