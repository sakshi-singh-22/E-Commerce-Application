const mongoose = require('mongoose');
const Location = require('./locationModel');


const InvalidLocationSchema = new mongoose.Schema({
    userType: { type: String, enum: ['user', 'vendor'], required: true },
    userId: { type: String, required: true },
    number: { type: String, required: true },
    name: { type: String, required: true },
    location: {
        type: Location,
        required: true
    },
    insideServiceArea: { type: Boolean, default: false },
    insideServiceCluster: { type: Boolean, default: false },
});


const InvalidLocation = mongoose.model('InvalidLocation', InvalidLocationSchema);

module.exports = InvalidLocation;

