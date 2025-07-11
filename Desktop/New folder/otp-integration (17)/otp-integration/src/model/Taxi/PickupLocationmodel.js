const mongoose = require('mongoose');

const pickupLocationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    locations: [{
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true },
    }],
});

pickupLocationSchema.index({ 'locations.coordinates': '2dsphere' });

module.exports = mongoose.model('PickupLocation', pickupLocationSchema);
