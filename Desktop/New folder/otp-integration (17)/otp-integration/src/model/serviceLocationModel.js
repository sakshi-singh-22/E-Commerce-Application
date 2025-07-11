// const mongoose = require('mongoose');

// const regionSchema = new mongoose.Schema({
//   type: {
//     type: String,
//     required: true,
//     enum: ['Polygon'] 
//   },
//   coordinates: {
//     type: [
//             [
//                 [Number]
//             ]
//         ],
//     required: true,
//   }
// });

// const ServiceLocationSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   region: {
//     type: regionSchema,
//     required: true
//   }
// });

// ServiceLocationSchema.index({ region: "2dsphere" });

// const ServiceLocation = mongoose.model('ServiceLocation', ServiceLocationSchema);

// module.exports = ServiceLocation;