const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const locationSchema = new mongoose.Schema({  
  geoCoordes: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // Array of numbers, [longitude, latitude]
      required: true
    }
  },
  address:{
    type: String,
    required: true

  },
  placeName: {
      type: String,
      required: true
  }
}, { _id: true });

locationSchema.virtual('locationId').get(function() {
  return this._id.toHexString();
});

const ReviewSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const FeedbackSchema = new Schema({
  type: { type: String, enum: ["Compliment", "Complaint"], required: true },
  comment: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const VehicleSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ["Bike", "Auto", "Cab"], 
    required: true 
  }, 
  make: { 
    type: String, 
    required: true 
  }, 
  model: { 
    type: String, 
    required: true 
  },
  isElectric: { 
    type: Boolean, 
    required: true
  },
  vehicleImagesUrl: { type: [String], default: null },
  registrationNumber: { 
    type: String, 
    required: true 
  }
});

const DriverSchema = new Schema(
  {
    name: { type: String, default: null }, // Allow name to be null initially
    isDocumentsUploaded: { type: Boolean, default: false },
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, default: null }, // Set email as optional and default to null
    adharCardNumber: { type: String, default: null }, // Set as optional
    drivingLicenseNumber: { type: String, default: null }, // Set as optional
    adharCardFileUrl: { type: String, default: null }, // URL of uploaded Aadhar card file
    drivingLicenseFileUrl: { type: String, default: null }, // URL of uploaded driving license file
    location: {
      type: [locationSchema], // Array of location schemas, can be populated later
      default: [], // Default is an empty array until locations are added
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
    isAvailable: { type: Boolean, default: false },
    verification: { type: Boolean, default: false }, // Added verification field
    verificationStatus: {
      type: String,
      enum: ["Pending", "Verified", "Failed", "Suspended"],
      default: "Pending",
    },
    verificationTime: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Available", "On a Trip", "Offline" ],
      default: "Offline",
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["Available", "On a Trip", "Offline"],
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    reviews: [ReviewSchema],
    feedback: [FeedbackSchema],
    escalation: [{ type: Schema.Types.ObjectId, ref: "Escalation" }],
    profileImage: { type: String },
    vehicle: { type: VehicleSchema },
    canServe: {
      grocery: { type: Boolean, default: true },
      taxi: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", DriverSchema);


// const vehicleSchema = new mongoose.Schema({
//   driverId: {
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'Driver', 
//     required: true, 
//     unique: true
//   },
//   type: { 
//     type: String, 
//     enum: ["Bike", "Auto", "Cab"], 
//     required: true 
//   },
//   make: { 
//     type: String, 
//     required: true 
//   }, 
//   model: { 
//     type: String, 
//     required: true 
//   },
//   isElectric: { 
//     type: Boolean, 
//     required: true
//   },
//   registrationNumber: { 
//     type: String,
//     required: true 
//   },
// });

// const Vehicle = mongoose.model("Vehicle", vehicleSchema);