const mongoose = require('mongoose');
const Driver = require('../model/driverModel');
const Order = require('../model/orderModel');
const OrderAssignment = require('../model/orderAssignmentModel');
const Vendor = require('../model/vendorModel');
const locationController = require('./locationController');
const { distanceCal } = require('../utils/locationUtils')
const { updateDriverStatus } = require('./driverController');

const calculateDistance = async (origin, destination) => {
  try {
    console.log("Calculating distance between:", origin, destination);
    const data = { origin: origin, destination: destination }
    console.log("Calculating distance between:", origin, destination);

    // Call distanceCal from locationController
    const response = await distanceCal(data)
 
    // Log the full response to debug the issue
    console.log("Full response from distanceCal:", response);

    return [response.distance , response.duration, response.arrivalTime]
    
  } catch (error) {
    console.error('Error in distanceCal:', error.message);
    return Infinity; // Return a high distance in case of an error
  }
};


const assignOrderToDriver = async (req, res) => {
  const { orderId } = req.params;
  console.log("Attempting to assign order to driver for orderId:", orderId);


  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch the order
    
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Order not found", success: false });
    }

   if (order.status !== 'Confirmed') {
  console.error(`Attempt to assign order failed: Current status is ${order.status}.`);
  await session.abortTransaction();
  session.endSession();
  return res.status(400).json({ message: `Invalid order status: ${order.status}.`, success: false });
}
    // Extract vendor IDs from order items
    const vendorIds = order.items.map(item => item.vendor.vendorId.toString());
    const uniqueVendorIds = [...new Set(vendorIds)];
    
    // Query vendors by vendor IDs
    const vendors = await Vendor.find({ '_id': { $in: uniqueVendorIds } }).session(session);
    if (vendors.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "No vendors found for the vendors in the order", success: false });
    }

    // Get the delivery location coordinates
    const deliveryLocation ={
      latitude: order.location.geoCoordes.coordinates[1],
      longitude: order.location.geoCoordes.coordinates[0]
    }; 
    
    // Find available drivers
    const availableDrivers = await Driver.find({
      isAvailable: true,
      status: 'Available'
    }).session(session);
    
    if (availableDrivers.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "No available drivers", success: false });
    }
    let details = []
    // Calculate distances from the delivery location to vendors and drivers
    const driverDistances = await Promise.all(availableDrivers.map(async driver => {
      const driverLocation = {
        latitude: driver.currentLocation.coordinates[1],
        longitude: driver.currentLocation.coordinates[0]
      };
      
      // Find the closest vendor for the driver
      let closestVendorInfo = null;
      
      for (const vendor of vendors) {
        try {
          const vendorLocation ={
            latitude: vendor.location.geoCoordes.coordinates[1],
            longitude: vendor.location.geoCoordes.coordinates[0]
          }; 
          
          // Calculate distance from driver to vendor
          const [distanceToVendor, durationToVendor, arrivalTimeToVendor ] = await calculateDistance(driverLocation, vendorLocation);
          console.log(`Distance from driver ${driver._id} to vendor ${vendor._id}: ${distanceToVendor}`);

          // Calculate distance from delivery location to vendor
          const [distanceToDelivery, durationToDelivery, arrivalToDelivery ] = await calculateDistance(deliveryLocation, vendorLocation);
          console.log(`Distance from delivery location to vendor ${vendor._id}: ${distanceToDelivery}`);

          details.push({
            vendorId: vendor._id,
            distanceToVendor: distanceToVendor,
            durationToVendor: durationToVendor,
            arrivalTimeToVendor: arrivalTimeToVendor,
            distanceToDelivery: distanceToDelivery,
            durationToDelivery: durationToDelivery,
            arrivalToDelivery: arrivalToDelivery,
          })
          if (!closestVendorInfo || distanceToVendor < closestVendorInfo.distanceToVendor) {
            closestVendorInfo = { vendor, distanceToVendor, distanceToDelivery };
          }
        } catch (error) {
          console.error(`Error calculating distance for driver ${driver._id} and vendor ${vendor._id}:`, error.message);
        }
      }

      return {
        driver,
        closestVendor: closestVendorInfo ? closestVendorInfo.vendor : null,
        distanceToVendor: closestVendorInfo ? closestVendorInfo.distanceToVendor : Infinity,
        distanceToDelivery: closestVendorInfo ? closestVendorInfo.distanceToDelivery : Infinity
      };
    }));

    // Filter out invalid driver distances and sort by the distance to the vendor
    const validDriverDistances = driverDistances.filter(data => data.closestVendor);
    if (validDriverDistances.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "No suitable drivers found", success: false });
    }

    validDriverDistances.sort((a, b) => a.distanceToVendor - b.distanceToVendor);

    // Select the closest driver
    const closestDriverData = validDriverDistances[0];
    const closestDriver = closestDriverData.driver;

    // Assign the order to the closest driver
    order.driver = closestDriver._id;
    order.assignedDriverAt = Date.now();
    order.status = 'Assigned';  // Set the order status to 'Assigned'

    await order.save({ session });

    // Create a new order assignment record
    const newAssignment = new OrderAssignment({
      order: order._id,
      driver: closestDriver._id,
      status: 'Assigned'
    });

    await newAssignment.save({ session });

    // Call the updateDriverStatus function but prevent it from sending a response
    const statusUpdateRequest = {
      params: { driverId: closestDriver._id },  // driverId param
      body: { status: 'On a Trip' }  // Update driver status to 'On a Trip'
    };

    // Temporarily set res to an empty object to avoid multiple responses
    const resPlaceholder = {
      status: () => resPlaceholder,
      json: () => {}
    };

    await updateDriverStatus(statusUpdateRequest, resPlaceholder);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ 
          success: true, 
          message: `Order assigned to driver ${closestDriver._id}`,
          details: details
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Order assignment failed:", error.message);
    return res.status(500).json({ message: "Order assignment failed", success: false });
  }
};

module.exports = { assignOrderToDriver };