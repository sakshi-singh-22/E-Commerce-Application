const mongoose = require('mongoose');

const driverDocumentSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
  },
  adharCardDocument: { type: String, required: false },
  drivingLicenseDocument: { type: String, required: false },
  profileImage: { type: String, required: false },
  documentsUploaded: { type: Boolean, default: false },
});

const DriverDocument = mongoose.model('DriverDocument', driverDocumentSchema);
module.exports = DriverDocument;
