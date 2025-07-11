const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EscalationSchema = new Schema({
  driver: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
  review: { type: Schema.Types.ObjectId, ref: 'Review', required: true },
  reason: { type: String, required: true },
  handledBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  status: { type: String, enum: ['Pending', 'Reviewed', 'Resolved'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Escalation', EscalationSchema);
