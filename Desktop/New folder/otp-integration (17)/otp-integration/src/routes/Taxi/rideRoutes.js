const express = require("express");
const rideController = require("../../controllers/Taxi/rideController");
const router = express.Router();

router.post('/add-drop-location', rideController.addDropLocation );
router.post('/select-vehicle', rideController.showVehicleOptions );
router.post('/create-ride', rideController.createRide );
router.put('/assignDriver', rideController.assignRideToDriver );
router.put('/:rideId/accept', rideController.acceptRide );
router.put('/:rideId/start', rideController.startRide );
router.put('/:rideId/end', rideController.endRide );
router.put('/:rideId/cancel', rideController.cancelRide );
router.get('/:rideId/getVendors', rideController.getVendorsOnRoute );
router.get('/locations/:userId', rideController.getUserLocations);
router.post('/rides/:rideId/confirm', rideController.confirmEndRide);

module.exports = router;