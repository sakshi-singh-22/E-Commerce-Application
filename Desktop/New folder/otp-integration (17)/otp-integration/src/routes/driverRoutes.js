const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driverController");
//const authMiddleware = require("../middleware/authmiddleware");
const tripController = require("../controllers/tripController");
const driverDocumentUpload = require('../middleware/driverDocumentUpload'); // Adjust the path as necessary


// Register Driver
router.post("/register", driverController.registerDriver);

router.post("/completeprofile", driverController.completeDriverProfile);

router.post('/upload-documents', 
    driverDocumentUpload.fields([
      { name: 'adharCard', maxCount: 1 },
      { name: 'drivingLicense', maxCount: 1 }
    ]), 
    driverController.uploadDriverDocuments
  );
  
// View Driver Status and Details
router.get("/status/:driverId", driverController.viewDriverStatusAndDetails);

// Login with Phone Number
router.post("/login/phone", driverController.loginWithPhoneNumber);

// Verify OTP and Login
router.post("/verify-otp", driverController.verifyOtp);

// // Login with Email and Password
// router.post("/login/email", driverController.loginWithEmail);

// Submit Driver Rating
router.post("/rating", driverController.submitDriverRating);

// Get Driver Ratings
router.get("/ratings/:driverId", driverController.getDriverRatings);

// Submit a Review
router.post("/review", driverController.submitReview);

// Handle Escalation
router.post("/escalation", driverController.handleEscalation);

// View Driver Earnings
router.get("/earnings/:driverId", driverController.viewDriverEarnings);

// View Driver Payouts
router.get("/payouts/:driverId", driverController.viewDriverPayouts);

//update profile
router.patch("/update/:driverId", driverController.updateDriverProfile);

// Get Driver profile
router.get("/profile/:driverId", driverController.getDriverProfile);

//update status
router.patch("/:driverId/status", driverController.updateDriverStatus);

router.post("/updateDriverCurrLoc", driverController.updateDriverCurrLoc);

router.get("/getDriverCurrLoc", driverController.getDriverCurrLoc);

// // Update Driver Verification Status
// router.put('/verification-status', driverController.updateDriverVerificationStatus);

//trip
router.post("/trips", tripController.logTrip);
router.post("/trips/status",tripController.tripStatusUpdate )
router.post("/trips/payment", tripController.paymentStatusUpdate);
router.post("/trips/payment-failure", tripController.logPaymentFailure);
router.get("/trips/:driverId/history", tripController.getTripHistory);
router.get("/reports/:driverId", tripController.generateDriverReport);
router.post("/trips/status", tripController.tripStatusUpdate);
router.post("/trips/issue", tripController.logTripIssue);

module.exports = router;