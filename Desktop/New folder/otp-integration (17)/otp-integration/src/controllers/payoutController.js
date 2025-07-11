// // controllers/payoutController.js
// const { processPayout } = require('../services/payoutService');

// const payoutDriver = async (req, res) => {
//   const { driverId, amount } = req.body;

//   try {
//     const result = await processPayout(driverId, amount);
//     res.status(200).json({ message: 'Payout processed successfully', result });
//   } catch (error) {
//     res.status(500).json({ message: 'Error processing payout', error });
//   }
// };

// module.exports = { payoutDriver };
