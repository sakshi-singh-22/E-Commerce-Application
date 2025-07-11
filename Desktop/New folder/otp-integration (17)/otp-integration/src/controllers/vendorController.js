const otpService = require("../services/otpService");
const Vendor = require("../model/vendorModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { generateVendorToken } = require("../utils/tokenUtils");
const Product = require('../model/productmodel');
const VendorProduct = require('../model/VendorProductModel');
const upload = require('../middleware/multerMiddleware');
const InvalidLocation = require('../model/InvalidLocationModel.js')
const { isLocInsideValidCluster } = require('../utils/locationUtils.js');

const registerVendor = async (req, res) => {
  const { number } = req.body;

  // Check for required field
  if (!number) {
    return res.status(400).json({ message: "Phone number is required", success: false });
  }

  try {
    // Check if the vendor already exists based on phone number
    const existingVendor = await Vendor.findOne({ number });

    if (existingVendor) {
      // Check verification status
      if (!existingVendor.verification) {
        // Verification not completed, send OTP
        const otpData = await otpService.sendOtp(number);
        return res.status(200).json({
          message: "OTP sent successfully. Please verify your number.",
          success: true,
          otpData,
        });
      } else {
        // Verification completed, provide detailed messages
        if (!existingVendor.isDocumentsUploaded) {
          return res.status(400).json({
            message: "Documents pending. Complete document upload to proceed.",
            success: false
          });
        }
        if (existingVendor.verificationStatus === 'Verified') {
          return res.status(200).json({
            message: "Vendor already registered and verified. Please log in using this number.",
            success: true,
            vendorId: existingVendor._id,
          });
        } else if (existingVendor.verificationStatus === 'Pending') {
          return res.status(200).json({
            message: "Vendor already registered, but documents are pending verification. Please log in using this number.",
            success: true,
            vendorId: existingVendor._id,
          });
        } else if (existingVendor.verificationStatus === 'Failed') {
          return res.status(200).json({
            message: "Vendor already registered, but verification failed. Please contact support.",
            success: false,
            vendorId: existingVendor._id,
            verificationComment: existingVendor.verificationComments,
          });
        }
      }
    } else {
      // Vendor does not exist, create a new one and send OTP
      const newVendor = new Vendor({ number });
      await newVendor.save();
      const otpData = await otpService.sendOtp(number);

      return res.status(201).json({
        message: "OTP sent successfully. Please verify your number.",
        success: true,
        otpData,
      });
    }

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error during registration",
      success: false,
    });
  }
};

const RegisterverifyOtp = async (req, res) => {
  const { verificationId, phoneNumber, otp } = req.body;

  try {
    const vendor = await Vendor.findOne({ number: phoneNumber });
    if (!vendor) {
      return res.status(400).json({ message: "Invalid Credentials", success: false });
    }

    // if (!vendor.isDocumentsUploaded) {
    //   return res.status(400).json({ message: "Documents pending. Complete document upload to login.", success: false });
    // }

    const otpValidation = await otpService.verifyOtp(verificationId, phoneNumber, otp);
    

    if (!otpValidation) {
      return res.status(400).json({ message: "OTP verification failed", success: false });
    }

   
      vendor.verification = true;
      await vendor.save();
   

    //const token = generateVendorToken(vendor._id);

    res.status(200).json({
      message: "Registration successfull , complete profile",
      success: true,
      vendorId: vendor._id,
      verification : vendor.verification,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error during OTP verification", success: false });
  }
};

const completeVendorProfile = async (req, res) => {
  const { vendorId, name, location, email, adharCardNumber, gstNumber } = req.body;

  // Set email to null if not provided
  const vendorEmail = email || null;

  // Check for required fields
  if (!name || !location || !vendorId || !adharCardNumber || !gstNumber) {
    return res.status(400).json({ message: "Name, location, vendor ID, Aadhar card number, and GST number are required", success: false });
  }

  try {
    // Find vendor by ID
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found", success: false });
    }
    
    const response = await isLocInsideValidCluster(location.geoCoordes) 
    
    if ( response.serviceArea ) {
      
      if ( response.cluster ) {
        // Update vendor profile with name, location, email, and mark as verified
        vendor.name = name;
        vendor.location = location;
        vendor.email = vendorEmail;
        vendor.adharCard = adharCardNumber; // Update Aadhar card number
        vendor.gstNumber = gstNumber; // Update GST number

        await vendor.save();

        return res.status(200).json({
          message: "Vendor profile completed, provided location is inside service cluster zone",
          success: true,
          vendorId: vendor._id,

        });
      } else {
  
          vendor.name = name;
          vendor.location = location;
          vendor.email = vendorEmail;
          vendor.adharCard = adharCardNumber; // Update Aadhar card number
          vendor.gstNumber = gstNumber; // Update GST number
  
          await vendor.save();

          const newInvalidLocation = new InvalidLocation({ 
            userType: 'vendor',
            userId: vendor._id,
            number: vendor.number,
            location: location,
            name: name,
            insideServiceArea: !!response.serviceArea,
            insideServiceCluster: !!response.cluster
          })
          await newInvalidLocation.save();

          return res.status(200).json({
            message: "Location is out of service cluster zone, profile update saved",
            success: false,
          });
      }

    } else {
        // save in vendor location and invalid location
          vendor.name = name;
          vendor.location = location;
          vendor.email = vendorEmail;
          vendor.adharCard = adharCardNumber; // Update Aadhar card number
          vendor.gstNumber = gstNumber; // Update GST number
  
          await vendor.save();

          const newInvalidLocation = new InvalidLocation({ 
            userType: 'vendor',
            userId: vendor._id,
            number: vendor.number,
            location: location,
            name: name,
            insideServiceArea: !!response.serviceArea,
            insideServiceCluster: !!response.cluster
          })
          await newInvalidLocation.save();

      return res.status(200).json({
        message: "Location is out of service area zone, profile update saved",
        success: false,
      });
    }

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error during profile completion",
      success: false
    });
  }
};



// 2. Vendor document upload (Profile Photo, GST, Shop Photo/Video, Aadhar Card)
const uploadVendorDocuments = async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).json({ message: "Vendor ID is required", success: false });
  }

  try {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found", success: false });
    }

    // Handle file uploads
    const profilePhoto = req.files['profilePhoto'] ? req.files['profilePhoto'][0].location : null;
    const gstNumberFileUrl = req.files['gstNumber'] ? req.files['gstNumber'][0].location : null;
    const shopPhotoOrVideo = req.files['shopPhotoOrVideo'] ? req.files['shopPhotoOrVideo'][0].location : null;
    const adharCardFileUrl = req.files['adharCard'] ? req.files['adharCard'][0].location : null;

    // Ensure all documents are provided
    if (!profilePhoto || !gstNumberFileUrl || !shopPhotoOrVideo || !adharCardFileUrl) {
      return res.status(400).json({
        message: "All documents (profile photo, GST, shop photo/video, Aadhar card) are required",
        success: false
      });
    }

    // Update vendor with document URLs
    vendor.profilePhoto = profilePhoto;
    vendor.gstNumberFileUrl = gstNumberFileUrl;
    vendor.shopPhotoOrVideo = shopPhotoOrVideo;
    vendor.adharCardFileUrl = adharCardFileUrl;
    vendor.isDocumentsUploaded = true;

    await vendor.save();

    res.status(200).json({
      message: "Documents uploaded successfully. Awaiting admin verification.",
      success: true,
      verificationStatus: vendor.verificationStatus,
      vendorId: vendor._id
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during document upload",
      success: false,
    });
  }
};


// 4. Login with phone number and send OTP for vendors
const loginWithPhoneNumber = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const vendor = await Vendor.findOne({ number: phoneNumber });
    if (!vendor) {
      return res.status(400).json({ message: "Invalid Credentials", success: false });
    }

    if (!vendor.isDocumentsUploaded) {
      return res.status(400).json({ message: "Documents pending. Complete document upload to login.", success: false });
    }

    if (vendor.verificationStatus === 'Pending') {
      return res.status(400).json({ message: "Documents pending verification. Awaiting admin verification.", success: false, verificationComment: vendor.verificationComments });
    } else if (vendor.verificationStatus === 'Failed') {
      return res.status(400).json({ message: "Verification failed. Contact support.", success: false, verificationComment: vendor.verificationComments });
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

// 5. Verify OTP and login for vendors
const verifyOtp = async (req, res) => {
  const { verificationId, phoneNumber, otp } = req.body;

  try {
    const vendor = await Vendor.findOne({ number: phoneNumber });
    if (!vendor) {
      return res.status(400).json({ message: "Invalid Credentials", success: false });
    }

    if (!vendor.isDocumentsUploaded) {
      return res.status(400).json({ message: "Documents pending. Complete document upload to login.", success: false });
    }

    const otpValidation = await otpService.verifyOtp(verificationId, phoneNumber, otp);

    if (!otpValidation) {
      return res.status(400).json({ message: "OTP verification failed", success: false });
    }

    const token = generateVendorToken(vendor._id);

    res.status(200).json({
      message: "Login successful",
      success: true,
      vendorId : vendor._id
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error during OTP verification", success: false });
  }
};

const getVendorDocuments = async (req, res) => {
  try {
    const { vendorId } = req.params; // Assuming vendorId is passed in URL parameters
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found", success: false });
    }

    const files = {
      profilePhoto: vendor.profilePhoto,
      gstNumber: vendor.gstNumber,
      shopPhotoOrVideo: vendor.shopPhotoOrVideo,
      adharCard: vendor.adharCard
    };

    res.status(200).json({
      message: "documents retrieved successfully.",
      success: true,
      files: files,
      verificationStatus: vendor.verificationStatus, // Include verification status
      verificationComment: vendor.verificationComments // Include verification comment
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during document retrieval",
      success: false,
    });
  }
};


// Get vendor profile
const getVendorProfile = async (req, res) => {
  try {
    const { vendorId } = req.body; // Fetch vendorId from body
    const vendor = await Vendor.findById(vendorId).select('-password');
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found', success: false });
    }
    
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const getProductsByVendorId = async (req, res) => {
  try {
    const { vendorId } = req.params; // Get vendorId from route params

    // Check if the vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Find all products associated with the vendor
    const products = await Product.find({ vendorId });

    // Map the product details for storing in VendorProduct
    const productsWithDetails = products.map(product => ({
      productId: product.productId,
      name: product.name,
      sellingPrice: product.sellingPrice,
      mrp: product.mrp,
      description: product.description,
      tags: product.tags,
      images: product.images,
      category: product.category,
      brandName: product.brandName,
      nutritionalInfo: product.nutritionalInfo,
      variants: product.variants,
    }));

    // Create or update the VendorProduct document
    const vendorProduct = await VendorProduct.findOneAndUpdate(
      { vendorId },
      { products: productsWithDetails }, // Store complete product details
      { new: true, upsert: true } // Create if not exists, update if exists
    );

    res.status(200).json(vendorProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving or storing products', error });
  }
};

const verifyVendorDocuments = async (req, res) => {
  const { vendorId } = req.params; // Assuming vendorId is passed in URL parameters
  const { status, comments, adminId } = req.body; // Status: 'Verified' or 'Failed'

  // Validate the status value
  if (!['Verified', 'Failed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid verification status', success: false });
  }

  // Validate adminId
  if (!adminId) {
    return res.status(400).json({ message: 'Admin ID is required', success: false });
  }

  try {
    // Find the vendor by ID
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found", success: false });
    }

    // Update vendor verification status and comments
    vendor.verificationStatus = status;
    vendor.verificationComments = comments || null;
    vendor.verificationBy = adminId; // Record who verified the documents

    // Save the updated vendor document
    await vendor.save();

    res.status(200).json({
      message: `Vendor documents ${status.toLowerCase()} successfully.`,
      success: true,
      vendorId: vendor._id,
 //// verifiedBy: adminId // Optionally include admin ID in the response
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error during document verification",
      success: false,
    });
  }
};

const updateCurrentLocation = async (req, res) => {
  const { vendorId, latitude, longitude } = req.body

  if (!vendorId || !latitude || !longitude ) {
    return res.status(400).json({ message: " vendorId or latitube or longitube field are missing", success: false });
  }

  const currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude]
  };
  
  try{
    const vendor = await Vendor.findById(vendorId)
    
    if(!vendor){
      return res.status(400).json({ message: "vendor not found", success: false });
    }
    vendor.currentLocation = currentLocation
    await vendor.save();

    const isNearby = await Vendor.findOne({
      _id: vendorId, 
      'location.geoCoordes': {
        $near: {
          $geometry: currentLocation,
          $maxDistance: 30  // In meters
        }
      }
    });
    
    res.status(201).json({ 
        success: true,
        message: 'Current location updated successfully',
        neartoStore: !!isNearby 
    });

  } catch(error) {
    res.status(500).json({ error: error.message });
  }
}

const getCurrentLocation = async (req, res) => {
  const { vendorId } = req.body

  if (!vendorId) {
    return res.status(400).json({ message: " VendorId is missing", success: false });
  }

  try{
    const vendor = await Vendor.findById(vendorId)
    
    if(!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const currentLocation = vendor.currentLocation.coordinates
    
    res.status(200).json({ 
      data: { currentLocation: { latitude: currentLocation[1], longitude: currentLocation[0] } },
      success: true
    });

  } catch(error) {
      res.status(500).json({ error: error.message });
  }
}

const updateShopStatus = async (req, res) => {
  try {
    const { vendorId, status } = req.body; // Fetch vendorId and status from body

    // Validate status value
    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use "open" or "closed".' });
    }

    // Update shop status
    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { shopStatus: status },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({ message: "Shop status updated", shopStatus: vendor.shopStatus });
  } catch (error) {
    console.error("Error updating shop status:", error);
    res.status(500).json({ message: "Server error", error: error.message || error });
  }
};

const getShopStatus = async (req, res) => {
  try {
    const { vendorId } = req.body; // Fetch vendorId from body

    const vendor = await Vendor.findById(vendorId).select("shopStatus");

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({ shopStatus: vendor.shopStatus });
  } catch (error) {
    console.error("Error fetching shop status:", error);
    res.status(500).json({ message: "Server error", error: error.message || error });
  }
};

module.exports = {
  registerVendor,
  RegisterverifyOtp,
  completeVendorProfile,
  uploadVendorDocuments,
  //loginWithEmailAndPassword,
  loginWithPhoneNumber,
  verifyOtp,
  getVendorProfile,
  //updateVendorProfile,
  getProductsByVendorId,
  getVendorDocuments,
  verifyVendorDocuments,
  updateCurrentLocation,
  getCurrentLocation,
  updateShopStatus,
  getShopStatus
};