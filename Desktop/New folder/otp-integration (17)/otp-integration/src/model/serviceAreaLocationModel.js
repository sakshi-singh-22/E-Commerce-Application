const mongoose = require('mongoose');

const ClusterLocationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  }, 
  boundary: {
    type: { 
      type: String, 
      enum: ['Polygon'], 
      required: true 
    },
    coordinates: { 
      type: [[[Number]]], 
      required: true 
    }, 
  }
}, { _id: true });

const ServiceAreaLocationSchema = new mongoose.Schema({
  serviceAreaName: { 
    type: String, 
    required: true 
  }, 
  boundary: {
    type: { 
      type: String, 
      enum: ['Polygon'], 
      required: true 
    }, 
    coordinates: { 
      type: [[[Number]]], 
      required: true 
    }, 
  },
  clusters: {
    type: [ClusterLocationSchema], 
    default: [], 
  }
});

ClusterLocationSchema.index({ boundary: "2dsphere" });
ServiceAreaLocationSchema.index({ boundary: "2dsphere" });

const ServiceAreaLocation = mongoose.model('ServiceArea', ServiceAreaLocationSchema);

module.exports = ServiceAreaLocation;



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

// const clusterLocationSchema = new mongoose.Schema({
//   clusterName: {
//     type: String,
//     required: true,
//   },
//   region: {
//     type: regionSchema,
//     required: true
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
// const clusterLocation = mongoose.model('ClusterLocation', clusterLocationSchema);

// module.exports = ServiceLocation;