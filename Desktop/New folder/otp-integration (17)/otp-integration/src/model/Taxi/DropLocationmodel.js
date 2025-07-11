const mongoose = require('mongoose');

const dropLocationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    locations: [{
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true },
    }],
});

dropLocationSchema.index({ 'locations.coordinates': '2dsphere' });

module.exports = mongoose.model('DropLocation', dropLocationSchema);
