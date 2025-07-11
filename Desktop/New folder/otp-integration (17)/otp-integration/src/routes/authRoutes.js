const express = require('express');
const authController = require('../controllers/authController');
// const authmiddleware = require('../middleware/authmiddleware');const vendorController = require('../controllers/vendorController');
 // Ensure this is the correct path

const router = express.Router();


// Register with phone number
router.post('/register-phone', authController.registerWithPhoneNumber);

// Verify OTP and complete user registration
router.post('/verifyOtpAndRegister', authController.verifyOtpAndRegisterUser);

// Complete User Profile
router.post('/completeProfile', authController.completeUserProfile);

// // Login with email and password
// router.post('/login', authController.login);

// Login with phone number and send OTP
router.post('/login-phone', authController.loginWithPhoneNumber);

// Send OTP
router.post('/sendOtp', authController.sendOtp);

// Verify OTP and login
router.post('/verifyOtp', authController.verifyOtp);

// Get user profile
router.get('/profile',  authController.getUserProfile);

// Update user profile
router.put('/profile',  authController.updateUserProfile);

// Logout route
router.post('/logout', authController.logout);

// user location 
router.post("/userLocation", authController.userLocationManagement.addUserLocation);
router.put("/userLocation", authController.userLocationManagement.updateUserLocation);
router.get("/userLocations",  authController.userLocationManagement.getAllUserLocations); // for all user's locations 
router.delete("/userLocation",  authController.userLocationManagement.deleteUserLocation );

//user current location
router.post('/currentLocation', authController.updateCurrentLocation)
router.get('/currentLocation',  authController.getUserCurrentLocation)

// product review
router.post("/product/review", authController.productReview);

module.exports = router;
