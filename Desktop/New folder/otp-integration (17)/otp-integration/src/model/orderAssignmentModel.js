const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderAssignmentSchema = new Schema({
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
    
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  status: {
    type: String,
    enum: ['Assigned', 'Completed', 'Cancelled'],
    default: 'Assigned'
  },
  assignedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('OrderAssignment', orderAssignmentSchema);
