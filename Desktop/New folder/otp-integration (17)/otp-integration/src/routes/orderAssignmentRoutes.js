const express = require('express');
const router = express.Router();
const { assignOrderToDriver } = require('../controllers/orderAssignmentController');

// Route to assign an order to a driver
router.post('/assign/:orderId', assignOrderToDriver);

module.exports = router;

