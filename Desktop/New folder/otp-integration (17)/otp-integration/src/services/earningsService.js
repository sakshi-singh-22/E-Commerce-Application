// services/earningsService.js
const Earnings = require('../model/earningsModel');
const moment = require('moment');

const calculateEarnings = async (driverId, period) => {
  try {
    let startDate, endDate;

    if (period === 'daily') {
      startDate = moment().startOf('day').toDate();
      endDate = moment().endOf('day').toDate();
    } else if (period === 'weekly') {
      startDate = moment().startOf('week').toDate();
      endDate = moment().endOf('week').toDate();
    } else if (period === 'monthly') {
      startDate = moment().startOf('month').toDate();
      endDate = moment().endOf('month').toDate();
    } else {
      throw new Error('Invalid period');
    }

    const earnings = await Earnings.aggregate([
      { $match: { driverId: mongoose.Types.ObjectId(driverId), date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$driverId', totalFare: { $sum: '$fare' }, totalTips: { $sum: '$tips' }, totalBonuses: { $sum: '$bonuses' }, totalDeductions: { $sum: '$deductions' }, totalEarnings: { $sum: '$total' } } }
    ]);

    return earnings[0] || {};
  } catch (error) {
    console.error('Error calculating earnings:', error);
    throw error;
  }
};

module.exports = { calculateEarnings };
