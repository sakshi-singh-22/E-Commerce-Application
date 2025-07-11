const mongoose = require('mongoose');

const taxiServiceAreaSchema = new mongoose.Schema({
  serviceAreaName: {
    type: String,
    required: true,
  },
  boundaries: {
    type: {
      type: String, // GeoJSON type
      enum: ['Polygon'],
      required: true,
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of coordinates (longitude, latitude)
      required: true,
    },
  },
});

const TaxiServiceAreaLocation = mongoose.model('TaxiServiceAreaLocation', taxiServiceAreaSchema);

module.exports = TaxiServiceAreaLocation;
