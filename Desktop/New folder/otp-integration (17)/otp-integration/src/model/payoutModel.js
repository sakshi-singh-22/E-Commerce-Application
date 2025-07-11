const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PayoutSchema = new Schema({
  driver: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
  amount: { type: Number, required: true },
  dateProcessed: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Processed'], default: 'Pending' },
  transactionId: { type: String }
});

module.exports = mongoose.model('Payout', PayoutSchema);
