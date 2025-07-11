//const mongoose = require ("mongoose");
const Driver = require("../model/driverModel");
const otpService = require("../services/otpService");
const bcrypt = require("bcryptjs");
const { generateDriverToken } = require("../utils/tokenUtils");
const DriverRating = require("../model/ratingModel");
const Escalation = require("../model/escalationModel");
const Payout = require("../model/payoutModel");
const { sendAppNotification } = require("../services/notificationService"); // Updated to use Notification Service
const ServiceAreaLocation = require('../model/serviceAreaLocationModel');
const Order = require("../model/orderModel");
const { getDirections } = require('../services/locationService'); // Import getDirections
const DriverReport = require('../model/driverReportModel')
const { isLocInsideValidCluster}  = require('../utils/locationUtils.js');
const Earnings = require('../model/earningsModel.js')
const { default: mongoose } = require("mongoose");

// Register Driver (Phone Number Only)
const registerDriver  = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: "Phone number is required", success: false });
  }

  try {
    // Check if the phone number already exists
    const existingDriver = await Driver.findOne({ phoneNumber });

    if (existingDriver) {
      if (existingDriver.verification) {
        return res.status(400).json({ message: "Phone number already registered and verified", success: false });
      } else {
        // If the driver exists but not verified, send OTP again
        const otpData = await otpService.sendOtp(phoneNumber);
        return res.status(200).json({
          message: "OTP sent successfully",
          success: true,
          otpData,
        });
      }
    }

    // Create a new driver if not exists
    const driver = new Driver({ phoneNumber, verification: false });
    await driver.save();

    // Send OTP
    const otpData = await otpService.sendOtp(phoneNumber);
    res.status(200).json({
      message: "OTP sent successfully",
      success: true,
      otpData,
    });
  } catch (error) {
    console.error("Error during registration process:", error);
    res.status(500).json({
      message: "Internal server error during phone number registration",
      success: false,
    });
  }
};

// Complete Driver Profile (Optional Fields)
const completeDriverProfile = async (req, res) => {
  const { driverId, name, adharCardNumber, drivingLicenseNumber, location, email, vehicle } = req.body;

  // Check if driverId is provided
  if (!driverId) {
    return res.status(400).json({ message: "Driver ID is required", success: false });
  }

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found", success: false });
    }

    // Only update the provided fields
    if (name) driver.name = name;
    if (adharCardNumber) driver.adharCardNumber = adharCardNumber;
    if (drivingLicenseNumber) driver.drivingLicenseNumber = drivingLicenseNumber;
    if (location) driver.location = location;
    if (email) driver.email = email; // This field is now optional
    if (vehicle) {
          driver.vehicle = vehicle;

          const vehicle = new Vehicle({
            driverId: driver._id,
            type: vehicle.type,
            make: vehicle.make,
            model: vehicle.model,
            isElectric: vehicle.isElectric,
            registrationNumber: vehicle.registrationNumber,
          })
          await vehicle.save();
    } 

    // // If any of the key fields are still null after the update, mark profileComplete as false
    // if (driver.name && driver.adharCardNumber && driver.drivingLicenseNumber && driver.location) {
    //   driver.profileComplete = true; // Profile is complete if all required fields are filled
    // } else {
      driver.profileComplete = false;
    // }

    await driver.save();

    res.status(200).json({ 
      message: "Profile saved successfully, document upload pending , profile verification pending by admin", 
      success: true, 
      driver: {
        name: driver.name,
        email: driver.email,
        adharCardNumber: driver.adharCardNumber,
        drivingLicenseNumber: driver.drivingLicenseNumber,
        location: driver.location,
        profileComplete: driver.profileComplete,
        VerificationStatus : driver.verificationStatus,
        vehicleDetails: driver.vehicle
       }
    });
  } catch (error) {
    console.log("Error completing driver profile:", error);
    res.status(500).json({ message: "Internal server error during profile completion", success: false });
  }
};

const uploadDriverDocuments = async (req, res) => {
  const { driverId } = req.body; // Fetch driverId from body

  if (!driverId) {
    return res.status(400).json({ message: "Driver ID is required", success: false });
  }

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found", success: false });
    }

    // Handle file uploads
    const adharCardFileUrl = req.files['adharCard'] ? req.files['adharCard'][0].location : null;
    const drivingLicenseFileUrl = req.files['drivingLicense'] ? req.files['drivingLicense'][0].location : null;

    // Ensure all required documents are provided
    if (!adharCardFileUrl || !drivingLicenseFileUrl) {
      return res.status(400).json({
        message: "Both Aadhar card and driving license are required",
        success: false
      });
    }

    // Update driver with document URLs
    driver.adharCardFileUrl = adharCardFileUrl;
    driver.drivingLicenseFileUrl = drivingLicenseFileUrl;
    driver.isDocumentsUploaded = true; // Mark documents as uploaded

    await driver.save();

    res.status(200).json({
      message: "Documents uploaded successfully. Awaiting admin verification.",
      success: true,
      verificationStatus: driver.verificationStatus, // Return current verification status
      driverId: driver._id
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during document upload",
      success: false,
    });
  }
};


// View Driver Status and Details (Driver Only)
const viewDriverStatusAndDetails = async (req, res) => {
  const { driverId } = req.params;

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    res.status(200).json({
      message: "Driver details fetched successfully",
      success: true,
      driver: {
        _id: driver._id, // Driver ID
        name: driver.name,
        phoneNumber: driver.phoneNumber,
        email: driver.email,
        adharCardNumber: driver.adharCardNumber, // Driver's Aadhar card number
        drivingLicenseNumber: driver.drivingLicenseNumber, // Driver's driving license number
        adharCardFileUrl : driver.adharCardFileUrl,
        drivingLicenseFileUrl: driver.drivingLicenseFileUrl,
        verificationStatus: driver.verificationStatus,
        verificationTime: driver.verificationTime,
      },
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({
        message: "Internal server error during fetching driver details",
        success: false,
      });
  }
};

// Login with Phone Number
const loginWithPhoneNumber = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const driver = await Driver.findOne({ phoneNumber });
    if (!driver) {
      return res
        .status(400)
        .json({ message: "Driver not found", success: false });
    }

    if (driver.verificationStatus === "Failed") {
      return res
        .status(400)
        .json({ message: "Account verification failed", success: false });
    }

    if (driver.verificationStatus === "Pending") {
      return res
        .status(400)
        .json({ message: "Verification pending", success: false });
    }

    const otpData = await otpService.sendOtp(phoneNumber);

    res.status(200).json({
      message: "OTP sent successfully",
      success: true,
      otpData,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({
        message: "Internal server error during OTP sending",
        success: false,
      });
  }
};

//verify otp
const verifyOtp = async (req, res) => {
  const { verificationId, phoneNumber, otp } = req.body;

  try {
    // Find driver by phone number
    const driver = await Driver.findOne({ phoneNumber });
    if (!driver) {
      return res
        .status(400)
        .json({ message: "Invalid Credentials", success: false });
    }

    // Verify the OTP using otpService
    const otpValidation = await otpService.verifyOtp(
      verificationId,
      phoneNumber,
      otp
    );

    if (!otpValidation) {
      return res
        .status(400)
        .json({ message: "OTP verification failed", success: false });
    }

    // Set the driver's verification to true and save
    driver.verification = true; // Set the verification to true
    await driver.save(); // Save the updated driver

    // Generate a token (optional, if using token authentication)
    // const token = generateDriverToken(driver._id);

    res.status(200).json({
      message: "Login successful",
      success: true,
      driverId: driver._id,
      verification: true,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Internal server error during OTP verification",
        success: false,
      });
  }
};

// Submit Driver Rating
const submitDriverRating = async (req, res) => {
  const {
    driverId,
    userId,
    rating,
    timeliness,
    communication,
    satisfaction,
    comment,
  } = req.body;

  if (!driverId || !userId || !rating) {
    return res
      .status(400)
      .json({
        message: "Driver ID, User ID, and Rating are required",
        success: false,
      });
  }

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    const newRating = new DriverRating({
      driverId,
      userId,
      rating,
      timeliness,
      communication,
      satisfaction,
      comment,
    });

    await newRating.save();

    // Update driver's average rating
    const ratings = await DriverRating.find({ driverId });
    const totalRating = ratings.reduce((acc, rate) => acc + rate.rating, 0);
    const averageRating = totalRating / ratings.length;

    await Driver.findByIdAndUpdate(driverId, {
      averageRating,
      ratingCount: ratings.length,
    });

    res
      .status(201)
      .json({ message: "Rating submitted successfully", success: true });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: "Internal server error during rating submission",
        success: false,
      });
  }
};

// Get Driver Ratings
const getDriverRatings = async (req, res) => {
  const { driverId } = req.params;

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    const ratings = await DriverRating.find({ driverId });

    res.status(200).json({
      message: "Ratings fetched successfully",
      success: true,
      ratings,
      averageRating: driver.averageRating,
      ratingCount: driver.ratingCount,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: "Internal server error during fetching ratings",
        success: false,
      });
  }
};

// Submit a Review
// Submit a Review
const submitReview = async (req, res) => {
const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { driverId, rating, comment, userId } = req.body;

    // Validate input
    if (!driverId || !rating || !userId) {
      return res.status(400).json({
        message: "Driver ID, Rating, and User ID are required",
        success: false,
      });
    }

    // Create a review object with userId
    const review = {
      rating,
      comment,
      userId, // Include the userId in the review object
      createdAt: new Date(),
    };

    // Find the driver and update their reviews
    const driver = await Driver.findById(driverId).session(session);
    if (!driver) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    driver.reviews.push(review);
    driver.ratingCount += 1;
    driver.averageRating =
      (driver.averageRating * (driver.ratingCount - 1) + rating) /
      driver.ratingCount;

    await driver.save({ session });

    // Update the feedbackCount in DriverReport
    let driverReport = await DriverReport.findOne({ driverId }).session(
      session
    );
    if (!driverReport) {
      driverReport = new DriverReport({
        driverId,
        feedbackCount: 1,
      });
    } else {
      driverReport.feedbackCount += 1;
    }

    await driverReport.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Review submitted successfully and feedback count updated",
      review,
      success: true,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error during review submission:", error.message);
    res.status(500).json({
      message: "Internal server error during review submission",
      success: false,
    });
  }
};

const handleEscalation = async (req, res) => {
  const { reviewId, driverId, reason } = req.body;

  try {
    // Validate input
    if (!reviewId || !driverId || !reason) {
      return res
        .status(400)
        .json({
          message: "Review ID, Driver ID, and Reason are required",
          success: false,
        });
    }

    // Check if the driver exists
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    // Create a new escalation document
    const escalation = new Escalation({
      review: reviewId,
      driver: driverId,
      reason,
      createdAt: new Date(),
    });

    await escalation.save();

    // Notify admin about the escalation
    await sendAppNotification("admin", {
      title: "Driver Escalation",
      body: `Driver ${driverId} has been escalated for the following reason: ${reason}`,
    });

      driver.escalation = escalation._id; 
     await driver.save();
    // console.log(escalation);

    res
      .status(201)
      .json({ message: "Escalation handled successfully", success: true , data:escalation});
  } catch (error) {
    console.error("Error handling escalation:", error);
    res
      .status(500)
      .json({
        message: "Internal server error during escalation handling",
        success: false,
      });
  }
};

// View Driver Earnings
const viewDriverEarnings = async (req, res) => {
  try {
    const { driverId } = req.params;

    // Fetch the earnings for the given driverId
    const earnings = await Earnings.findOne({ driver: driverId })
      .populate("driver", "name") // Populate driver name if needed
      .populate("trips", "orderId"); // Populate related trip details (e.g., orderId)

    if (!earnings) {
      return res
        .status(404)
        .json({ message: "Earnings not found for this driver" });
    }

    res.status(200).json({ success: true, earnings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// View Driver Payouts
const viewDriverPayouts = async (req, res) => {
  const { driverId } = req.params;

  try {
    const payouts = await Payout.find({ driverId });
    if (!payouts) {
      return res
        .status(404)
        .json({ message: "Payouts not found", success: false });
    }

    res.status(200).json({
      message: "Payouts fetched successfully",
      success: true,
      payouts,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        message: "Internal server error during fetching payouts",
        success: false,
      });
  }
};

//update profile
const updateDriverProfile = async (req, res) => {
  const { driverId } = req.params;
  const {
    name,
    phoneNumber,
    email,
    adharCardNumber,
    drivingLicenseNumber,
    location,
    password,
  } = req.body;

  if (
    !name &&
    !phoneNumber &&
    !email &&
    !adharCardNumber &&
    !drivingLicenseNumber &&
    !location &&
    !password
  ) {
    return res
      .status(400)
      .json({ message: "No fields provided to update", success: false });
  }

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    if (phoneNumber && phoneNumber !== driver.phoneNumber) {
      const existingDriverWithPhone = await Driver.findOne({ phoneNumber });
      if (existingDriverWithPhone) {
        return res
          .status(400)
          .json({ message: "Phone number already in use", success: false });
      }
    }

    if (email && email !== driver.email) {
      const existingDriverWithEmail = await Driver.findOne({ email });
      if (existingDriverWithEmail) {
        return res
          .status(400)
          .json({ message: "Email already in use", success: false });
      }
    }

    if (name) driver.name = name;
    if (phoneNumber) driver.phoneNumber = phoneNumber;
    if (email) driver.email = email;
    if (adharCardNumber) driver.adharCardNumber = adharCardNumber;
    if (drivingLicenseNumber)
      driver.drivingLicenseNumber = drivingLicenseNumber;
    if (location) driver.location = location;

    if (password) {
      driver.password = bcrypt.hashSync(password, 8);
    }

    await driver.save();

    res.status(200).json({
      message: "Driver profile updated successfully",
      success: true,
      driver: {
        name: driver.name,
        phoneNumber: driver.phoneNumber,
        email: driver.email,
        adharCardNumber: driver.adharCardNumber,
        drivingLicenseNumber: driver.drivingLicenseNumber,
        location: driver.location,
      },
    });
  } catch (error) {
    console.error("Error updating driver profile:", error);
    res.status(500).json({
      message: "Internal server error during profile update",
      success: false,
    });
  }
};

// Get Driver profile
// Get Driver profile
const getDriverProfile = async (req, res) => {
  const { driverId } = req.params;

  if (!driverId) {
    return res
      .status(400)
      .json({ message: " driverId is missing", success: false });
  }
  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    res.status(200).json({
      message: "Driver details fetched successfully",
      success: true,
      data: driver,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error during fetching driver details",
      error: error.message,
      success: false,
    });
  }
};

// Function to calculate online time based on statusHistory
const calculateNewOnlineTime = (statusHistory, lastUpdatedAt) => {
  let totalOnlineTime = 0;
  let onlineStart = null;

  // Only process status changes after the last update
  for (let i = 0; i < statusHistory.length; i++) {
    const currentStatus = statusHistory[i];

    // Ignore statuses before the last update
    if (new Date(currentStatus.timestamp) <= new Date(lastUpdatedAt)) {
      continue;
    }

    // If status is 'Available' or 'On a Trip', mark the start of the online period
    if (["Available", "On a Trip"].includes(currentStatus.status)) {
      if (!onlineStart) {
        onlineStart = currentStatus.timestamp;
      }
    } else {
      // If status is 'Offline', calculate the time spent online
      if (onlineStart) {
        totalOnlineTime +=
          new Date(currentStatus.timestamp) - new Date(onlineStart);
        onlineStart = null; // Reset the start marker
      }
    }
  }

  // If still online, calculate time from last online status to now
  if (onlineStart) {
    totalOnlineTime += new Date() - new Date(onlineStart);
  }

  // Convert total time from milliseconds to hours
  return totalOnlineTime / (1000 * 60 * 60);
};

// Update Driver Status and DriverReport
const updateDriverStatus = async (req, res) => {
  const { driverId } = req.params;
  const { status } = req.body;
  
  if (!status || !["Available", "On a Trip", "Offline"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Invalid status value", success: false });
  }

  try {
    // Fetch driver
    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    // Update driver status and add to statusHistory
    driver.status = status;
    driver.statusHistory.push({ status });

    // Save updated driver status
    await driver.save();

    // Fetch the driver's report
    let driverReport = await DriverReport.findOne({ driverId });

    // If the driver report doesn't exist, create it
    if (!driverReport) {
      driverReport = new DriverReport({
        driverId: driver._id,
        totalTimeOnline: 0,
        tripCount: 0,
        feedbackCount: 0,
        totalDistance: 0,
        averageDeliveryTime: 0,
        efficiency: 0,
        issuesCount: 0,
        totalEarnings: 0,
        tripDetails: [],
        totalTimeOnline: 0,
        generatedAt: new Date(),
      });
    }

    // Calculate the new online time since the last update
    const newOnlineTime = calculateNewOnlineTime(
      driver.statusHistory,
      driverReport.generatedAt
    );

    // Add new online time to the previous total
    driverReport.totalTimeOnline += newOnlineTime;

    // Update the last updated time
    driverReport.generatedAt = new Date();

    // Save the updated or newly created driver report
    await driverReport.save();

    res.status(200).json({
      message: "Driver status and report updated successfully",
      success: true,
      driverStatus: driver.status,
      statusHistory: driver.statusHistory,
      totalTimeOnline: driverReport.totalTimeOnline,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during status update",
      success: false,
    });
  }
};

const updateDriverCurrLoc = async (req, res) => {

  const { driverId, latitude, longitude } = req.body

  if (!driverId || !latitude || !longitude ) {
    return res.status(400).json({ message: " driverId or latitude or longitude field are missing", success: false });
  }

  const currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };

  try{
    const driver = await Driver.findById(driverId)

    if(!driver){
      return res.status(400).json({ message: "Driver not found", success: false });
    }
    
    const response = await isLocInsideValidCluster(currentLocation) 
   
    if (response.serviceArea) {
       
      if (response.cluster === null) {
        
        driver.currentLocation = currentLocation
        await driver.save();
  
        return res.status(201).json({ 
          message: 'Location updated successfully',
          isDriverInsideServiceAreaLoc: !!response.serviceArea,
          isDriverInsideCluster: !!response.cluster,
          clusterDetails: {}
          //isAvailable: true
         });
      }

      driver.currentLocation = currentLocation
      await driver.save();

      return res.status(201).json({ 
        message: 'Location updated successfully',
        isDriverInsideServiceAreaLoc: !!response.serviceArea,
        isDriverInsideCluster: !!response.cluster,
        clusterDetails: {Id: response.cluster._id, name: response.cluster.name }
        //isAvailable: true
       });

    } else {
        driver.currentLocation = currentLocation
        await driver.save();
        // notify driver that your are out of service zone using fcm
  
        return res.status(201).json({ 
          message: 'Location updated successfully and currently driver is out of service location ',
          alert: 'driver is out of service zone',
          isDriverInsideServiceAreaLoc: !!response.serviceArea,
          isDriverInsideCluster: !!response.cluster,
          //isAvailable: false
        });
    }

  } catch(error){
    res.status(500).json({ error: error.message });
  }
};

const getDriverCurrLoc = async (req, res) => {
    const { driverId } = req.body

    if (!driverId) {
      return res.status(400).json({ message: " driverId is missing", success: false });
    }

    try{
      const driver = await Driver.findById(driverId)
      
      if(!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      const driverCurrLoc = driver.currentLocation.coordinates
      
      return res.status(200).json({ currentLocation: {
        latitude: driverCurrLoc[1],
        longitude: driverCurrLoc[0]
      } });

    } catch(error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports = {
  registerDriver,
  completeDriverProfile,
  uploadDriverDocuments,
  viewDriverStatusAndDetails,
  loginWithPhoneNumber,
  verifyOtp,
  //loginWithEmail,
  submitDriverRating,
  getDriverRatings,
  submitReview,
  handleEscalation,
  viewDriverEarnings,
  viewDriverPayouts,
  updateDriverProfile,
  getDriverProfile,
  updateDriverStatus,
  updateDriverCurrLoc,
  getDriverCurrLoc,
  //assignOrderToDriver
};