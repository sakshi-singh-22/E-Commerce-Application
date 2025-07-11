const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }, // Optional, can be assigned later
    pickupLocation: {
        type: { type: String, enum: ['Point'], required: true }, // Ensure type is 'Point'
        coordinates: { type: [Number] } // [longitude, latitude]
    },
    dropLocation: {
        type: { type: String, enum: ['Point'], required: true }, // Ensure type is 'Point'
        coordinates: { type: [Number] } // [longitude, latitude]
      },
      finalDropLocation: {
          type: { type: String, default: 'Point' }, // Default value added
          coordinates: { type: [Number], default: [0, 0] } // Default coordinates can be adjusted
      },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    OTP: {
      type: String,
      required: true 
    },
    vehicleType: { type: String, enum: ['cab', 'bike', 'auto'] }, // Restrict vehicle types
    distance: { type: Number }, // Distance in kilometers
    price: { type: Number }, // Price for the ride
        OTP: {
      type: String,
      required: true 
    },
    status: { type: String, enum: ['pending', 'searching for driver', 'accepted', "onTrip", 'completed', 'canceled'], default: 'pending' } ,// Updated Ride status enum
    userConfirmation: { type: Boolean, default: false }, // Add userConfirmation field
}, { timestamps: true }); // Automatically manage createdAt and updatedAt fields

rideSchema.methods.setStartedAt = function () {
  this.endedAt = new Date();
};

rideSchema.methods.setEndedAt = function () {
  this.endedAt = new Date();
};

rideSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.updatedAt = new Date()
  } 

  // if(!this.otp){
  //     this.otp = this.userId.toString().slice(-4); 
  // }

  next()
});

// Exporting the model
module.exports = mongoose.model('Ride', rideSchema);




// const geoCoordinatesSchema = new Schema({
//     type: {
//       type: String,
//       enum: ["Point"],
//       default: "Point",
//       required: true,
//     },
//     coordinates: {
//       type: [Number], // [longitude, latitude]
//       required: true,
//     },
//   });

// const RideSchema = new mongoose.Schema({
//     userId: { 
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User', 
//         required: true  
//     },
//     driverCurrentLocation: {
//       type: geoCoordinatesSchema, 
//       required: true,
//     },
//     pickupLocation: {
//       type: geoCoordinatesSchema, 
//       required: true,
//     },
//     dropLocation: {
//       type: geoCoordinatesSchema, 
//       required: true,
//     },
//     driverId: { 
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Driver', 
//         required: true  
//     },
//     vehicleType: { type: String, enum: ['cab', 'bike', 'auto'], required: true },
//     status: {
//         type: String,
//         enum: ["Pending", "Rejected", "Accepted" ,"Ontrip" ,"Cancelled", "Completed"],
//         default: "Pending",
//     },
//     otp: {
//         type: String,
//         required: true 
//     },
//     distanceCovered:{ type: Number },
//     price: { type: Number, required: true },
//     startedAt: { type: Date, },
//     endedAt: {type: Date},
//     createdAt: { type: Date, default: Date.now },
//     updatedAt: {type: Date}
// });

// RideSchema.methods.setStartedAt = function () {
//   this.endedAt = new Date();
// };

// RideSchema.methods.setEndedAt = function () {
//   this.endedAt = new Date();
// };

// RideSchema.pre("save", function (next) {
//   if (this.isModified("status")) {
//     this.updatedAt = new Date()
//   }

//   if(!this.otp){
//       this.otp = this.userId.toString().slice(-4); 
//   }

//   next()
// });

// const Ride = mongoose.model('Ride', RideSchema);



/*
for user and driver will we use same ride model
create logic to generate otp while logging new ride

 ride schema 

 id
 userid
 driverid
 pickup location
 waypoints(if any, array of location)
 drop location
 status - pending, rejected, accepted, ontrip ,completed, cancelled
 otp - 
 distanceCovered: will we include distance covered by driver current location to pickup location( same with grocery )
 startAt
 endAt
 createdAt
 updatedAt


 , OTP
 while updating status(ontrip)
if ( !ride.otp === OTP ){
    return res.status(400).json({ message: 'invalid OTP', success: false  });
}

user and driver should both have there own table to store the ride history.
because when ride is assign to driver if driver don't accepts the ride then if we use one table - we loss the data
then we can't store the rejected rides by driver
UserRideHistory and driverRideHistory

vehicle model need to create when driver is completing the profile and also insert the vehicle data in the driver model 
do we have to store vehicle images and documents related to vehicle
*/