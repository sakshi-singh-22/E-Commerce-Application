// services/payoutService.js
const stripe = require('../config/stripe');
const Payout = require('../model/payoutModel');
const Driver = require('../model/driverModel');
const { sendPayoutNotification } = require('./notificationService');

const processPayout = async (driverId, amount) => {
  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      throw new Error('Driver not found');
    }

    // Create a payout
    const payout = await stripe.transfers.create({
      amount: amount * 100, // Amount in cents
      currency: 'usd',
      destination: driver.stripeAccountId, // Assume you store Stripe account ID
      description: `Payout for driver ${driverId}`
    });

    // Save payout details to the database
    const newPayout = new Payout({
      driverId: driverId,
      amount: amount,
      transactionId: payout.id
    });
    await newPayout.save();

    // Notify driver
    await sendPayoutNotification(driver.email, {
      amount,
      date: new Date().toLocaleDateString(),
      transactionId: payout.id
    });

    return { success: true, payout };
  } catch (error) {
    console.error('Error processing payout:', error);
    throw error;
  }
};

module.exports = { processPayout };
