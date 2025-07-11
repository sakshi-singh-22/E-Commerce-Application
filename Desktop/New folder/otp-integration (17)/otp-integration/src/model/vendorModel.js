const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const locationSchema = require("./locationModel");

const vendorSchema = new Schema({
  number: { type: String, required: true, unique: true },
  name: {  type: String, default: null },
  location: {
    type: locationSchema,
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // Array of numbers, [longitude, latitude]
      default: [0, 0],
    }
  },
  email: { type: String, default: null,sparse: true  }, // Default value set to null, no unique constraint
  isDocumentsUploaded: { type: Boolean, default: false },
  profilePhoto: { type: String, default: null },
  gstNumber: { type: String, default: null },
  gstNumberFileUrl: { type: String, default: null }, // URL of the uploaded GST document
  shopPhotoOrVideo: { type: String, default: null },
  adharCard: { type: String, default: null },
  adharCardFileUrl: { type: String, default: null }, // URL of the uploaded Aadhar card document
  verification: { type: Boolean, default: false }, // Added verification field
  verificationStatus: {
    type: String,
    enum: ['Pending', 'Verified', 'Failed'],
    default: 'Pending'
  },
  verificationComments: { type: String, default: null },
  verificationBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }, // Admin reference
  shopStatus: {
    type: String,
    enum: ["open", "closed"],
    default: "closed",
  },
});

module.exports = mongoose.model('Vendor', vendorSchema);



// // New fields added
// cancellationCount: {
//   type: Number,
//   default: 0, // Track the number of cancellations
// },
// isSuspended: {
//   type: Boolean,
//   default: false, // Flag to mark the vendor as suspended after too many cancellations
// },
// suspensionReason: { 
//   type: String, 
//   default: null, // Reason for suspension, e.g., "Exceeded cancellation limit"
// }
