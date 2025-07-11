const express = require('express');
const router = express.Router();
const { createServiceArea, checkLocation } = require('../../controllers/Taxi/taxiController');

// Route to create a service area
router.post('/service-area', createServiceArea);

// Route to check if a location is within a service area
router.post('/check-location', checkLocation);

module.exports = router;
