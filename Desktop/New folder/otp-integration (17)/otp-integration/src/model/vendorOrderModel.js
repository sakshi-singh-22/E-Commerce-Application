const mongoose = require('mongoose');
const vendorOrderSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  items: [{
    productId: {
      type: String, // Change from ObjectId to String
      required: true
    },
    productName:{ type: String},
    brandName: { type: String },
    productDescription: { type: String},
    quantity: { type: Number} ,
    variant: {
      variantSKU: { type: String, required: true },
      color: { type: String },
      size: { type: String },
      sellingPrice: { type: Number, required: true },
      mrp: { type: Number },
    },
    sellingPrice: { type: Number },
    totalPrice: { type: Number, required: true },
    isRejected: { type: Boolean, default: false }, // Track if item is rejected
  }],
//  finalitems: [{ 
//     productId: {
//       type: String, // Change from ObjectId to String
//       required: true
//     },
//     productName: String,
//     quantity: Number,
//     variant: {
//       variantSKU: String,
//       color: String,
//       size: String,
//       sellingPrice: Number,
//       mrp: Number
//     },
//     totalPrice: Number,
//     isRejected: { type: Boolean, default: false } 
//   }],
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected', 'Completed'], default: 'Pending' },
  rejectionCount: { type: Number, default: 0 }, // Count of rejected items
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
// Middleware to handle automatic rejection after 30 seconds
vendorOrderSchema.post('save', function(doc) {
  const vendorOrder = this;
  if (vendorOrder.status === 'Pending') {
    setTimeout(async () => {
      try {
        // Re-fetch the vendor order to check its latest status
        const updatedOrder = await mongoose.model('VendorOrder').findById(vendorOrder._id).populate('vendorId');
        const userOrder = await mongoose.model('Order').findById(vendorOrder.orderId)
        
        if (updatedOrder && updatedOrder.status === 'Pending') {
          updatedOrder.status = 'Rejected';
          for(item of updatedOrder.items){
            const indexOfUserItem = userOrder.items.findIndex( (I) => I.productId.toString() === item.productId && I.variant.variantSKU === item.variant.variantSKU )
            userOrder.items[indexOfUserItem].vendorOrderStatus = 'Rejected By Vendor';
            item.isRejected = true;
          };// add code for change status in user oder 
          updatedOrder.rejectionReason = 'Order not accepted by vendor within 30 seconds';
          updatedOrder.updatedAt = Date.now();
          // Increment vendor's cancellation count
          updatedOrder.vendorId.cancellationCount = updatedOrder.vendorId.cancellationCount + 1 || 1;
          // Check if vendor has exceeded the cancellation limit (e.g., 3 cancellations)
          if (updatedOrder.vendorId.cancellationCount > 3) {
            updatedOrder.vendorId.isSuspended = true; // Suspend vendor after too many cancellations
            updatedOrder.vendorId.suspensionReason = 'Exceeded cancellation limit due to timeout and rejections';
            console.log('Vendor has been suspended due to excessive cancellations or timeouts.');
            // Optionally: Notify admin or take further actions
          }
          await updatedOrder.vendorId.save();
          await updatedOrder.save();
          await userOrder.save();
        }
      } catch (error) {
        console.error('Error auto-rejecting vendor order after 30 seconds:', error);
      }
    }, 60000); // 60 seconds in milliseconds
  }
});
// Create and export the model
module.exports = mongoose.model('VendorOrder', vendorOrderSchema);