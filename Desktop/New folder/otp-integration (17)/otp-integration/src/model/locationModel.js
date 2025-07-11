const mongoose = require('mongoose');


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

locationSchema.index({ geoCoordes: "2dsphere" });

module.exports =  locationSchema 