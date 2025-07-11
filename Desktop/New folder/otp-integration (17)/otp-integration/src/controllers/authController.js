const otpService = require("../services/otpService");
const User = require("../model/authmodel.js");
const bcrypt = require("bcryptjs");
const { generateUserToken  } = require('../utils/tokenUtils');
const { isMobilePhone } = require('validator');
const {findNearbySavedLocation, isLocInsideValidCluster} = require('../utils/locationUtils.js');
const ProductReview = require("../model/productReviewModel.js");
const Product = require("../model/productmodel.js");
const InvalidLocation  = require('../model/InvalidLocationModel.js')

const registerWithPhoneNumber = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: "Phone number is required", success: false });
  }

  try {
    const existingUser = await User.findOne({ phoneNumber });

    if (existingUser) {
      if (existingUser.verification) {
        return res.status(400).json({ message: "Phone number already registered", success: false });
      }
    } else {
      if (isMobilePhone(phoneNumber)) {
        const newUser = new User({ phoneNumber, verification: false });
        await newUser.save();
      } else {
        return res.status(400).json({ message: "Invalid phone number", success: false });
      }
    }

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



// Verify OTP
const verifyOtpAndRegisterUser = async (req, res) => {
  const { verificationId, phoneNumber, otp } = req.body;

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials", success: false });
    }

    const otpValidation = await otpService.verifyOtp(verificationId, phoneNumber, otp);

    if (!otpValidation) {
      return res.status(400).json({ message: "OTP verification failed", success: false });
    }

    await User.updateOne(
      { phoneNumber },
      { $set: { verification: true } }
    );

    // const token = generateUserToken(user._id, '30d');

    res.status(200).json({
      message: "Registration successful",
      success: true,
      userId: user._id,
      verification
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error during OTP verification", success: false });
  }
};

// Complete User Profile
const completeUserProfile = async (req, res) => {
  const { phoneNumber, name, email, location } = req.body;

  if (!phoneNumber || !name || !location) {
    return res.status(400).json({ message: "Phone number, name, and location are required", success: false });
  }

  try {
    const user = await User.findOne({ phoneNumber });

    if (!user || !user.verification) {
      return res.status(404).json({ message: "User not found or phone number not verified", success: false });
    }

    // // Check if email is already in use by another user, only if email is provided
    // if (email) {
    //   const emailExists = await User.findOne({ email });
    //   if (emailExists) {
    //     return res.status(400).json({ message: "Email already in use", success: false });
    //   }
    // }

    if (!Array.isArray(location)) {
      return res.status(400).json({ message: "Provided location should an array" });
    }
    
    let validLocations = [];
    let invalidLocations = [];
    for (loc of location) {

          const response = await isLocInsideValidCluster(loc.geoCoordes)

          if ( response.serviceArea && response.cluster ) {
              validLocations.push(loc)
          }  
          else if (response.serviceArea && response.cluster === null) {
  
              const newInvalidLocation = new InvalidLocation({ 
                userType: 'user',
                userId: user._id.toString(),
                number: phoneNumber,
                name: name,
                location: loc,
                insideServiceArea: !!response.serviceArea,
                insideServiceCluster: !!response.cluster
              });
              await newInvalidLocation.save();

              invalidLocations.push( { 
                ...loc, 
                insideServiceArea: !!response.serviceArea,
                insideServiceCluster: !!response.cluster
              })
        
          } else {
  
              const newInvalidLocation = new InvalidLocation({ 
                userType: 'user',
                userId: user._id.toString(),
                number: phoneNumber,
                name: name,
                location: loc,
                insideServiceArea: !!response.serviceArea,
                insideServiceCluster: !!response.cluster
              })
              await newInvalidLocation.save();

              invalidLocations.push( { 
                ...loc, 
                insideServiceArea: !!response.serviceArea,
                insideServiceCluster: !!response.cluster
              })
          }
    }

    // Update the user's profile
    user.name = name;
    user.email = email || "null";  // Make email optional
    user.location = validLocations || [];

    await user.save();

    res.status(200).json({
      message: "User profile completed successfully",
      data : {
        validLocations,
        invalidLocations
      },
      success: true,
      userId: user._id,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during profile completion",
      success: false,
    });
  }
};


// // Login with email and password
// const login = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: "Invalid Credentials", success: false });
//     }

//     const matchPassword = bcrypt.compareSync(password, user.password);
//     if (!matchPassword) {
//       return res.status(400).json({ message: "Invalid Credentials", success: false });
//     }

//     const token = generateUserToken(user._id, '30d'); // Use the utility function with 1 hour expiry

//     res.status(200).json({
//       message: "Login successful",
//       success: true,
//       token,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       message: "Internal server error during login",
//       success: false,
//     });
//   }
// };

// Login with phone number and send OTP
const loginWithPhoneNumber = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: "Phone number not registered", success: false });
    }

    const otpData = await otpService.sendOtp(phoneNumber);

    res.status(200).json({
      message: "OTP sent successfully",
      success: true,
      otpData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error during OTP sending", success: false });
  }
};

// Send OTP
const sendOtp = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const otpData = await otpService.sendOtp(phoneNumber);
    res.status(200).json({ success: true, data: otpData });
  } catch (error) {
    res.status(500).json({ message: "Internal server error during OTP sending", success: false });
  }
};

// Verify OTP and login
const verifyOtp = async (req, res) => {
  const { verificationId, phoneNumber, otp } = req.body;

  try {
    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials", success: false });
    }

    // Verify OTP
    const otpValidation = await otpService.verifyOtp(verificationId, phoneNumber, otp);

    if (!otpValidation) {
      return res.status(400).json({ message: "OTP verification failed", success: false });
    }

    // Update user verification status
    await User.updateOne(
      { phoneNumber },
      { $set: { verification: true } }
    );

    // Check if user profile is complete
    //const isProfileComplete = user.name && user.location && user.email && user.password; // Adjust fields based on your schema

    
    //  const token = generateUserToken(user._id, '30d'); // Use the utility function with 1 hour expiry

      return res.status(200).json({
        message: "Login successful",
        success: true,
        userId: user._id,
      });
    
    
  } catch (error) {
    res.status(500).json({ message: "Internal server error during OTP verification", success: false });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  const { userId } = req.body; // Extract userId from request body

  try {
    const user = await User.findById(userId); // Find user by the provided userId
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  const { userId, name, email, phoneNumber, location } = req.body; // Extract userId and other fields from request body

  try {
    const user = await User.findById(userId); // Find user by the provided userId
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    const locationMap = new Map()
    for (let i = 0; i < user.location.length; i++) {
      locationMap.set(user.location[i]._id.toString(), user.location[i])
    }

    let validLocations = []
    let invalidLocations = []
    if (location) {
      if (!Array.isArray(location)) {
        return res.status(400).json({ message: "Provided location should an array" });
      }
      
      for (loc of location) {
          const response = await isLocInsideValidCluster(loc.geoCoordes)

          if ( response.serviceArea && response.cluster ) {
              validLocations.push(loc)
          }  
          else if (response.serviceArea && response.cluster === null) {
              const newInvalidLocation = new InvalidLocation({ 
                userType: 'user',
                userId: user._id,
                number: phoneNumber || user.phoneNumber,
                name: name || user.name,
                location: loc,
                insideServiceArea: !!response.serviceArea,
                insideServiceCluster: !!response.cluster
              })
              await newInvalidLocation.save();

              invalidLocations.push( { 
                ...loc, 
                insideServiceArea: !!response.serviceArea,
                insideServiceCluster: !!response.cluster
              })
              
              validLocations.push(locationMap.get(loc._id.toString()))

          } else {
              const newInvalidLocation = new InvalidLocation({ 
                userType: 'user',
                userId: user._id,
                number: phoneNumber || user.phoneNumber,
                name: name || user.name,
                location: loc,
                insideServiceArea: !!response.serviceArea,
                insideServiceCluster: !!response.cluster
              })
              await newInvalidLocation.save();

              invalidLocations.push( { 
                ...loc, 
                insideServiceArea: !!response.serviceArea,
                insideServiceCluster: !!response.cluster
              })

              validLocations.push(locationMap.get(loc._id.toString()))
          }
      }
    }

    // Update fields if provided in the request body
    user.name = name || user.name;
    user.email = email || user.email;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.location = validLocations || user.location; // Update location if provided

    await user.save();
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: { user, invalidLocations } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', success: false });
  }
};


//user location 
const userLocationManagement = {

  async addUserLocation(req, res) {
      const { userId, latitude, longitude, placeName, address } = req.body;  // Ensure userId is included in the request body
      const geoCoordes = {
          type: 'Point',
          coordinates: [longitude, latitude] 
      };
      try {
          const user = await User.findById(userId);  // Find the user by userId

          if (!user) {
              return res.status(404).json({ error: 'User not found', success: false });
          }

          const response = await isLocInsideValidCluster(geoCoordes)
          if (response.serviceArea && response.cluster === null || response.serviceArea === null && response.cluster === null) {
            const newInvalidLocation = new InvalidLocation({ 
              userType: 'user',
              userId: user._id,
              number: user.phoneNumber,
              name: user.name,
              location: {
                geoCoordes: {
                  type: 'Point',
                  coordinates: [longitude, latitude] 
                },
                address: address,
                placeName: placeName
              },
              insideServiceArea: !!response.serviceArea,
              insideServiceCluster: !!response.cluster
            })
            await newInvalidLocation.save();

            return  res.status(400).json({ 
              message: 'Service is not available for provided Coordinates, because of that can not create new location', 
              success: false 
            });
          } 

          const existingLocationIndex = user.location.findIndex(location => location.placeName === placeName);

          if (existingLocationIndex !== -1) {
              return res.status(400).json({ message: 'Provide placeName already exist', success: false  });
          } else {
              // Add a new location
              user.location.push({ geoCoordes, placeName, address });
              await user.save();
              return res.status(201).json({ message: 'Location created successfully' });
          }

      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
  },

  async deleteUserLocation(req, res) {
      const { userId, placeName } = req.body;  // Ensure userId is included in the request body
      try {
          const user = await User.findById(userId);  // Find the user by userId

          if (!user) {
              return res.status(404).json({ error: 'User not found' });
          }

          const existingLocationIndex = user.location.findIndex(location => location.placeName === placeName);

          if (existingLocationIndex !== -1) {
              // Delete the existing location
              user.location.splice(existingLocationIndex, 1);
              await user.save();
              return res.status(200).json({ message: 'Location deleted successfully' });
          } else {
            return res.status(404).json({ message: 'Location does not exist' });
          }

      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
  },

  async updateUserLocation(req, res) {
    const { userId, latitude, longitude, placeName, address } = req.body;  // Ensure userId is included in the request body
    const geoCoordes = {
        type: 'Point',
        coordinates: [longitude, latitude] 
    };
    try {
        const user = await User.findById(userId);  // Find the user by userId

        if (!user) {
          return res.status(404).json({ error: 'User not found', success: false });
        }

        const existingLocationIndex = user.location.findIndex(location => location.placeName === placeName);

        if (existingLocationIndex !== -1) {
            const response = await isLocInsideValidCluster(geoCoordes)
            if (response.serviceArea && response.cluster === null || response.serviceArea === null && response.cluster === null) {
              const newInvalidLocation = new InvalidLocation({ 
                userType: 'user',
                userId: user._id,
                number: user.phoneNumber,
                name: user.name,
                location: {
                  geoCoordes: geoCoordes,
                  address: address,
                  placeName: placeName
                },
                insideServiceArea: !!response.serviceArea,
                insideServiceCluster: !!response.cluster
              })
              await newInvalidLocation.save();
              return  res.status(400).json({ message: 'Service is not available for provided Coordinates, because of that can not update the location' });
            } 
            // Update the existing location
            user.location[existingLocationIndex] = { geoCoordes, placeName, address };
            await user.save();
            return res.status(200).json({ message: 'Location updated successfully', success: true });
        } else {
      
            return res.status(400).json({ message: `No location found with placeName: ${placeName}`, success: false });
        }

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
},

  async getAllUserLocations(req, res) {
      const { userId } = req.body;  // Ensure userId is included in the request body

      try {
          const user = await User.findById(userId);  // Find the user by userId

          if (!user) {
              return res.status(404).json({ error: 'User not found', success: false });
          }

          // Extract all addresses from user.location
          const allLocations = user.location.map(location => location);

          return res.status(200).json({ locations: allLocations, success: true });

      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
  }
};

const updateCurrentLocation = async (req, res) => {
  const { userId, latitude, longitude } = req.body

  if (!userId || !latitude || !longitude ) {
    return res.status(400).json({ message: " userId or latitude or longitude field are missing", success: false });
  }
  
  const currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
  
  try{

    const user = await User.findById(userId)
    if(!user){
      return res.status(400).json({ message: "user not found", success: false });
    }
    
    const response = await isLocInsideValidCluster(currentLocation) 
   
    if ( response.serviceArea ) {
      
      user.currentLocation = currentLocation
      user.isCurrLocInServiceAreaLoc = !!response.cluster
      await user.save();

      // find near by saved location within 200 meters with respective to current location
      const savedLocationNearby = await findNearbySavedLocation( userId, currentLocation )
      const isNearSavedLocation = !!savedLocationNearby;
      if ( response.cluster ) {
          return res.status(201).json({ 
            message: 'Current location updated successfully',
            isCurrLocInServiceAreaLoc: !!response.serviceArea,
            isCurrLocInServiceClusterLoc: !!response.cluster,
            clusterDetails: {Id: response.cluster._id, name: response.cluster.name },
            isNearSavedLocation: isNearSavedLocation,
            savedLocationNearby: savedLocationNearby
          });
      } else {
          return res.status(201).json({ 
            message: 'Current location updated successfully',
            isCurrLocInServiceAreaLoc: !!response.serviceArea,
            isCurrLocInServiceClusterLoc: !!response.cluster,
            clusterDetails: {},
            isNearSavedLocation: isNearSavedLocation,
            savedLocationNearby: savedLocationNearby
          });
      }
      
    } else {

        user.currentLocation = currentLocation
        user.isCurrLocInServiceAreaLoc = !!response.serviceArea
        await user.save();
  
        return res.status(201).json({ 
          message: 'Current location updated successfully and currently user is out of service area location ',
          isCurrLocInServiceAreaLoc: !!response.serviceArea,
          isCurrLocInServiceClusterLoc: !!response.cluster,
        });
    }

  } catch(error){
    res.status(500).json({ error: error.message });
  }
};

const getUserCurrentLocation = async (req, res) => {
  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ message: " userId is missing", success: false });
  }

  try{
    const user = await User.findById(userId)
    
    if(!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentLocation = user.currentLocation.coordinates
    const isCurrLocInServiceAreaLoc = user.isCurrLocInServiceAreaLoc
    
    return res.status(200).json({ currentLocation: {
      latitude: currentLocation[1],
      longitude: currentLocation[0]
    },
    isCurrLocInServiceAreaLoc: isCurrLocInServiceAreaLoc
   });

  } catch(error) {
     return res.status(500).json({ error: error.message });
  }
}

// Logout
const logout = (req, res) => {
  
  res.status(200).json({
    message: "Logged out successfully",
    success: true,
  });
};

// product Review
const productReview = async (req, res) => {
  const { userId, productId, comment, rating } = req.body;
  if (!userId) {
    return res
      .status(404)
      .json({ message: " userId is missing", success: false });
  }
  if (!productId) {
    return res
      .status(404)
      .json({ message: " productId is missing", success: false });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const newReview = new ProductReview({
      userId,
      productId,
      comment,
      rating,
    });
    await newReview.save();
    return res.status(201).json({
      message: "Review added successfully",
      success: true,
      review: newReview,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerWithPhoneNumber,
  verifyOtpAndRegisterUser,
  completeUserProfile,
  //login,
  loginWithPhoneNumber,
  sendOtp,
  verifyOtp,
  getUserProfile,
  updateUserProfile,
  userLocationManagement,
  updateCurrentLocation,
  getUserCurrentLocation,
  logout,
  productReview,
};