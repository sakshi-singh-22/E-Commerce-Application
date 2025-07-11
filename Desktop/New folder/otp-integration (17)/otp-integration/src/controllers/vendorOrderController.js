const mongoose = require('mongoose');
const VendorOrder = require('../model/vendorOrderModel');
const Order = require('../model/orderModel');
const Vendor = require('../model/vendorModel');
const Trip = require('../model/tripModel');
const Driver = require('../model/driverModel')
const { distanceCalWithWaypoints, distanceCal } = require("../utils/locationUtils.js");
const Webhook = require("../model/webhookModel");
const { assignOrderToDriver } = require('./orderAssignmentController');
const axios = require('axios');


//const getVendorOrderHistory = async (req, res) => {
  const getVendorOrderHistory = async (req, res) => {
    const { vendorId } = req.body;
  
    try {
      // Validate vendorId
      if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        return res.status(400).json({ message: 'Invalid vendor ID format' });
      }
  
      // Convert vendorId to ObjectId
      const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
  
      // Find vendor orders from the VendorOrder model
      const vendorOrders = await VendorOrder.find({ vendorId: vendorObjectId }).populate('orderId');
  
      // Debugging: Log vendor orders to check data returned
      console.log('Vendor Orders:', vendorOrders);
  
      // If no vendor orders found
      if (vendorOrders.length === 0) {
        return res.status(404).json({ message: 'No orders found for this vendor' });
      }
  
      // Format the order data
      const formattedOrders = vendorOrders.map(vendorOrder => ({
        orderId: vendorOrder.orderId._id,
        createdAt: vendorOrder.createdAt,
        updatedAt: vendorOrder.updatedAt,
        status: vendorOrder.status,
        rejectionReason: vendorOrder.rejectionReason || null,
        totalAmount: vendorOrder.items.reduce((acc, item) => acc + item.totalPrice, 0), // Calculate total price from items
        items: vendorOrder.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          variant: item.variant,
          totalPrice: item.totalPrice
        }))
      }));
  
      return res.status(200).json({ vendorId, orders: formattedOrders });
    } catch (error) {
      console.error('Error fetching vendor order history:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
//   const createVendorOrders = async (req, res) => {
//     const { orderId } = req.params;

//     console.log('Processing vendor order creation for order ID:', orderId);

//     try {
//         // Fetch the order by ID
//         const order = await Order.findById(orderId).exec();
//         if (!order) {
//             console.log('Order not found for ID:', orderId);
//             return res.status(404).json({ message: 'Order not found' });
//         }

//         console.log('Order found. Grouping items by vendor.');

//         // Group items by vendor
//         const vendorOrdersMap = new Map();
//         for (const item of order.items) {
//             if (!item.vendor || !item.vendor.vendorId) {
//                 console.error(`Vendor information is missing for item: ${item.productName}`);
//                 continue; // Skip items with missing vendor data
//             }
//             const vendorId = item.vendor.vendorId.toString();

//             if (!vendorOrdersMap.has(vendorId)) {
//                 vendorOrdersMap.set(vendorId, {
//                     vendorId: item.vendor.vendorId,
//                     orderId: order._id,
//                     items: [],
//                     status: 'Pending',
//                 });
//             }

//             vendorOrdersMap.get(vendorId).items.push({
//                 productId: item.productId,
//                 productName: item.productName,
//                 quantity: item.quantity,
//                 variant: item.variant,
//                 totalPrice: item.totalPrice,
//             });
//         }

//         const createdOrders = [];
//         for (const [vendorId, vendorOrderData] of vendorOrdersMap) {
//             const vendorOrder = new VendorOrder(vendorOrderData);
//             await vendorOrder.save();
//             console.log('Vendor order created for vendor ID:', vendorId);
//             createdOrders.push(vendorOrder);
//         }

//         if (createdOrders.length === 0) {
//             console.log('No vendor orders created due to missing vendor information.');
//             return res.status(400).json({ message: 'No vendor orders created due to missing vendor information' });
//         }

//         console.log('Vendor orders created successfully.');
//         return res.status(201).json({
//             message: 'Vendor orders created successfully',
//             createdOrders: createdOrders.map(order => ({
//                 ...order.toObject(),
//                 vendorId: order.vendorId,
//             })),
//         });
//     } catch (error) {
//         console.error('Error creating vendor orders:', error);
//         return res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// };

const createVendorOrders = async (req, res) => {
  const { orderId } = req.params;

  console.log('Processing vendor order creation for order ID:', orderId);
  
  try {
    // Fetch the order by ID
    const order = await Order.findById(orderId).exec();
    if (!order) {
      console.log('Order not found for ID:', orderId);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('Order found. Grouping items by vendor.');

    // Group items by vendor
    const vendorOrdersMap = new Map();
    for (const item of order.items) {
      if (!item.vendor || !item.vendor.vendorId) {
        console.error(`Vendor information is missing for item: ${item.productName}`);
        continue; // Skip items with missing vendor data
      }

      const vendorId = item.vendor.vendorId.toString();

      if (!vendorOrdersMap.has(vendorId)) {
        vendorOrdersMap.set(vendorId, {
          vendorId: item.vendor.vendorId,
          orderId: order._id,
          items: [],
          status: 'Pending',
        });
      }

      vendorOrdersMap.get(vendorId).items.push({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        variant: item.variant,
        totalPrice: item.totalPrice,
      });
    }

    const createdOrders = [];
    for (const [vendorId, vendorOrderData] of vendorOrdersMap) {
      const vendorOrder = new VendorOrder(vendorOrderData);
      await vendorOrder.save();
      console.log('Vendor order created for vendor ID:', vendorId);
      createdOrders.push(vendorOrder);
    }

    if (createdOrders.length === 0) {
      console.log('No vendor orders created due to missing vendor information.');
      return res.status(400).json({ message: 'No vendor orders created due to missing vendor information' });
    }

    console.log('Vendor orders created successfully.');

    res.status(201).json({
      message: 'Vendor orders created successfully',
      createdOrders: createdOrders.map(order => ({
        ...order.toObject(),
        vendorId: order.vendorId,
      })),
    });
  } catch (error) {
    console.error('Error creating vendor orders:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
  
  // Accept Vendor Order
  const acceptVendorOrder = async (req, res) => {
    const { vendorOrderId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(vendorOrderId)) {
        return res.status(400).json({ message: 'Invalid Vendor Order ID' });
      }
      const vendorOrder = await VendorOrder.findById(vendorOrderId).populate('vendorId');
      if (!vendorOrder) {
        return res.status(404).json({ message: 'Vendor Order not found' });
      }
      const currentTime = Date.now();
      const orderCreatedTime = new Date(vendorOrder.createdAt).getTime();
      const timeElapsed = (currentTime - orderCreatedTime) / 1000; // Time in seconds
      if (vendorOrder.status !== 'Pending') {
        return res.status(400).json({ message: 'Order has already been processed' });
      }
      // If the order was not accepted within 30 seconds, reject the order
      if (timeElapsed > 30) {
        vendorOrder.status = 'Rejected'; // Change this to 'Rejected'
        vendorOrder.rejectionReason = 'Order not accepted by vendor within 30 seconds'; // Set rejection reason
        vendorOrder.updatedAt = currentTime;
        await vendorOrder.save();
        // Increment vendor's cancellation count
        vendorOrder.vendorId.cancellationCount = (vendorOrder.vendorId.cancellationCount || 0) + 1;
        // Check if vendor has exceeded the cancellation limit (e.g., 3 cancellations)
        if (vendorOrder.vendorId.cancellationCount > 3) {
          vendorOrder.vendorId.isSuspended = true; // Suspend vendor after too many cancellations
          vendorOrder.vendorId.suspensionReason = 'Exceeded cancellation limit due to timeout and rejections';
          console.log('Vendor has been suspended due to excessive cancellations or timeouts.');
        }
        await vendorOrder.vendorId.save();
        return res.status(400).json({ message: 'Order automatically rejected due to timeout', vendorOrder });
      }
      // If within 30 seconds, accept the order
      vendorOrder.status = 'Accepted';
      vendorOrder.updatedAt = currentTime;
      await vendorOrder.save();

         // Check if all vendor orders are completed
     ///    await checkVendorOrderCompletion(vendorOrder.orderId);

      res.status(200).json({ message: 'Vendor order accepted successfully', vendorOrder });
    } catch (error) {
      console.error('Error accepting vendor order:', error);
      res.status(500).json({ message: 'Error accepting vendor order', error });
    }
  };

  // Reject Vendor Order (Active rejection)
  const rejectVendorOrderActive = async (req, res) => {
    const { vendorOrderId } = req.params;
    try {
      if (!mongoose.Types.ObjectId.isValid(vendorOrderId)) {
        return res.status(400).json({ message: 'Invalid Vendor Order ID' });
      }
      const vendorOrder = await VendorOrder.findById(vendorOrderId);
      if (!vendorOrder) {
        return res.status(404).json({ message: 'Vendor Order not found' });
      }
      if (vendorOrder.status === 'Rejected' ) {
        return res.status(400).json({ message: 'Vendor Order is already rejected, because of timeout' });
      }
      if (vendorOrder.status === 'Accepted' ) {
        return res.status(400).json({ message: 'Can Process the request' });
      }
      if (vendorOrder.status === 'Completed' ) {
        return res.status(400).json({ message: 'Order already completed' });
      }
      vendorOrder.status = 'Rejected';
      for(item of vendorOrder.items){
        item.isRejected = true;
      };
      vendorOrder.rejectionReason = 'Vendor actively rejected the order'; // Set rejection reason
      vendorOrder.updatedAt = Date.now();
      // Increment vendor's rejection count
      vendorOrder.rejectionCount += 1;
      // Ensure the main order exists
      const mainOrder = await Order.findById(vendorOrder.orderId);
      if (!mainOrder) {
        return res.status(404).json({ message: 'Main Order not found' });
      }
      // Check if vendorId is valid
      if (!vendorOrder.vendorId) {
        return res.status(400).json({ message: 'Vendor ID is missing' });
      }
      // Ensure items exist
      if (!Array.isArray(mainOrder.items)) {
        return res.status(400).json({ message: 'Main Order items are not valid' });
      }
      
      await vendorOrder.save(); // Save the vendor order
  
      res.status(200).json({ message: 'Vendor order rejected successfully', vendorOrder });
    } catch (error) {
      console.error('Error rejecting vendor order:', error);
      res.status(500).json({ message: 'Error rejecting vendor order', error });
    }
  };
  // Reject Specific Item
  const rejectSpecificItem = async (req, res) => {
    const { vendorOrderId, items } = req.body;
    
    try {
      const vendorOrder = await VendorOrder.findById(vendorOrderId);
      if (!vendorOrder) {
        return res.status(404).json({ message: 'Vendor Order not found' });
      }
  
      const userOrder = await Order.findById(vendorOrder.orderId);
      if (!userOrder) {
        return res.status(404).json({ message: 'User Order not found' });
      }
  
      if (vendorOrder.status !== 'Accepted') {
        return res.status(400).json({ message: 'You must accept the order before rejecting specific items' });
      }
      for (let product of items) {
        const vendorItem = vendorOrder.items.find(
          (I) => I.productId.toString() === product.productId && I.variant.variantSKU === product.variant.variantSKU
        );
        const userItem = userOrder.items.find(
          (I) => I.productId.toString() === product.productId && I.variant.variantSKU === product.variant.variantSKU
        );
        
        const indexOfUserItem = userOrder.items.findIndex((I) => I.productId.toString() === product.productId && I.variant.variantSKU === product.variant.variantSKU)
        
        if (!vendorItem) {
          return res.status(404).json({ message: 'Item not found in the vendor order' });
        } 
        if (product.isRejected) {
            userOrder.items[indexOfUserItem].vendorOrderStatus = 'Rejected By Vendor'; // code in user order is not working while changing the status
            vendorItem.isRejected = true; 
        } else {
            userOrder.items[indexOfUserItem].vendorOrderStatus = 'Accepted By Vendor';
            vendorItem.isRejected = false;     
        }
        
      }
     
      await vendorOrder.save(); // Save the updated vendor order
      await userOrder.save();
      
      res.status(200).json({ message: 'Item rejected successfully', vendorOrder });
    } catch (error) {
      console.error('Error rejecting item:', error);
      res.status(500).json({ message: 'Error rejecting item', error });
    }
  };
  
  
// Update Vendor Order Status
const updateVendorOrderStatus = async (req, res) => {
  const { vendorOrderId } = req.params;
  const { status } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(vendorOrderId)) {
      return res.status(400).json({ message: 'Invalid Vendor Order ID' });
    }

    const validStatuses = [
      'Pending',
      'Accepted',
      'Preparing',
      'Packed',
      'Waiting for Driver',
      'On the Way',
      'Delivered',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const vendorOrder = await VendorOrder.findById(vendorOrderId);
    if (!vendorOrder) {
      return res.status(404).json({ message: 'Vendor Order not found' });
    }

    vendorOrder.vendorstatus = status;
    vendorOrder.updatedAt = Date.now();
    await vendorOrder.save();

    res.status(200).json({ message: 'Vendor order status updated successfully', vendorOrder });
  } catch (error) {
    console.error('Error updating vendor order status:', error);
    res.status(500).json({ message: 'Error updating vendor order status', error });
  }
};

// async function checkVendorOrderCompletion(orderId) {
//   const vendorOrders = await VendorOrder.find({ orderId });

//   const allCompleted = vendorOrders.every(order => order.status !== 'Pending');
//   if (allCompleted) {
//     // All vendor orders are either accepted or rejected
//     const mainOrder = await Order.findById(orderId);
//     if (mainOrder) {
//       mainOrder.status = 'Confirmed';
//       await mainOrder.save();
//       // Trigger webhook to notify order status update
//       await triggerWebhook(mainOrder);
//     }
//   }
// }

// // Function to trigger webhook for order status update
// async function triggerWebhook(order) {
//   const webhookData = {
//     event: 'orderStatusUpdated',
//     payload: {
//       orderId: order._id,
//       status: order.status,
//     },
//   };

//   await Webhook.create(webhookData); // Adjust as needed to send the webhook
// }

const getOrderPickUpETA = async (req, res) => {
  const { vendorOrderId, vendorId } = req.body
  try {
      const vendorOrder = await VendorOrder.findById(vendorOrderId);
      if(!vendorOrder){
          return res.status(404).send({ message: " Vendor order is not found" })
      }
      if (!vendorOrder.vendorId.equals(vendorId)) {
          return res.status(403).json({
            message: "You do not have permission to access this order. The provided vendorId does not match the order's vendorId."
          });
      }
      const trip =  await Trip.findOne({orderId: vendorOrder.orderId});
      if (!trip) {
          return res.status(404).json({ message: "Order's trip not found" });
      }
      const driver = await Driver.findById(trip.driver);
      if (!driver) {
          return res.status(404).json({ message: "Driver not found" });
      }
      const driverCurrLoc = {
          latitude: driver.currentLocation.coordinates[1],
          longitude : driver.currentLocation.coordinates[0]
      }
      const destinationVendorIndex = trip.pickupLocations.findIndex(loc => loc.vendor.equals(vendorId));
      if (trip.pickupLocations.length > 1) {
          let waypoints;
          let destination;
          if (destinationVendorIndex !== -1) {
             waypoints = trip.pickupLocations.slice(0, destinationVendorIndex);
             destination = trip.pickupLocations[destinationVendorIndex];
          } else {
            return res.status(404).json({
              message: 'Vendor ID not found in pickup locations',
              statusCode: 404,
              success: false
             });
          }
          const waypointsLoc = waypoints.map( loc => ({
              latitude :loc.geoCoordinates.coordinates[1],
              longitude :loc.geoCoordinates.coordinates[0]
          }))
          const destinationLoc = {
              latitude :destination.geoCoordinates.coordinates[1],
              longitude :destination.geoCoordinates.coordinates[0]
            }
          const data = {
              origin: driverCurrLoc,
              destination: destinationLoc,
              waypoints: waypointsLoc
          };
          const responseData = await distanceCalWithWaypoints(data);
          return res.status(201).json({
              data: responseData,
              success: true
          });
        }
      if (trip.pickupLocations.length == 1 ){
          const destination = {
              latitude : trip.pickupLocations[destinationVendorIndex].geoCoordinates.coordinates[1],
              longitude : trip.pickupLocations[destinationVendorIndex].geoCoordinates.coordinates[0]
          }
          const data = {
                origin: driverCurrLoc,
                destination: destination,
          };
          const responseData = await distanceCal(data);
           return res.status(201).json({
              data: responseData,
              success: true
           });
      }
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getVendorOrderHistory,
  createVendorOrders,
  acceptVendorOrder,
  rejectVendorOrderActive,
  rejectSpecificItem,
  updateVendorOrderStatus,
  getOrderPickUpETA,
};