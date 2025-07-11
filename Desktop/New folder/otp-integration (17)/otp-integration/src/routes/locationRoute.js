const express = require('express');
const { 
        nearbySuggestion,
    } = require('../controllers/locationController');
    const authmiddleware = require('../middleware/authmiddleware');


const router = express.Router();

router.get("/nearbySuggestion",nearbySuggestion)
// router.get("/distanceCal", distanceCal)
// router.get("/distanceCalWithWaypoints", distanceCalWithWaypoints)
module.exports = router;