const jwt = require('jsonwebtoken');

// Function to generate a token for a user
const generateUserToken = (userId, expiresIn = '30d') => {
  const payload = {
    user: {
      id: userId,
    },
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Function to generate a token for a vendor
const generateVendorToken = (vendorId, expiresIn = '30d') => {
  const payload = {
    vendor: {
      id: vendorId,
    },
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Function to generate a token for an admin
const generateAdminToken = (adminId, expiresIn = '2h') => {
  const payload = {
    id: adminId,  // Directly store the id here
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Function to generate a token for a driver
const generateDriverToken = (driverId, expiresIn = '30d') => {
  const payload = {
    driver: {
      id: driverId,
    },
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};


module.exports = {
  generateUserToken,
  generateVendorToken,
  generateAdminToken,
  generateDriverToken
};
