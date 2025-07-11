const mongoose = require("mongoose");
const { isEmail, isMobilePhone } = require('validator');
const locationSchema = require("./locationModel");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    default: null,
  },
  email: { type: String, sparse: true  },
  // password: {
  //   type: String,
  // },
  phoneNumber: {
    type: String,
    unique: true,
    required: true, // Ensure this field is required
},
currentLocation: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
  },
  coordinates: {
    type: [Number], // Array of numbers [longitude, latitude]
    default: [0, 0], // Default coordinates, can be updated later
  },
},
isCurrLocInServiceAreaLoc: {
  type: Boolean,
  default: false, // Default value, will be updated later based on service zone
},
verification: {
  type: Boolean,
  default: false, // Verification is false until OTP is verified
},
location: {
  type: [locationSchema], // Array of location schemas, can be populated later
  default: [], // Default is an empty array until locations are added
},
OTP:{
  type: String,
  required: true 
}
});

UserSchema.methods.setOTP = function () {
  const digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 4; i++) {
    OTP += digits[Math.floor(Math.random() * digits.length)];
  }
  this.OTP = OTP;
};

UserSchema.pre("save", async function (next) {
  if (!this.OTP) {
    await this.setOTP();
  }

  next();
});

// Indexing phoneNumber if frequently used in queries
UserSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model("User", UserSchema);