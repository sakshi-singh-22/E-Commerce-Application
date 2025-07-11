const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
    },
    payload: {
        type: Object,
        required: true,
    },
    receivedAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['pending', 'processed', 'failed'],
        default: 'pending',
    },
});

const Webhook = mongoose.model('Webhook', webhookSchema);

module.exports = Webhook;



// const mongoose = require('mongoose');

// const webhookSchema = new mongoose.Schema({
//     url: {
//         type: String,
//         required: true,
//     },
//     events: [{
//         type: String,
//         required: true,
//     }],
//     payload: {
//         type: Object,
//         required: false,
//     },
//     receivedAt: {
//         type: Date,
//         default: Date.now,
//     },
//     status: {
//         type: String,
//         enum: ['pending', 'processed', 'failed'],
//         default: 'pending',
//     },
// });


// const Webhook = mongoose.model('Webhook', webhookSchema);

// module.exports = Webhook;
