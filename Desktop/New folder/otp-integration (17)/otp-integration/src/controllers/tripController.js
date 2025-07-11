const mongoose = require("mongoose");
const Trip = require("../model/tripModel");
const Driver = require("../model/driverModel");
const Order = require("../model/orderModel");
const Vendor = require("../model/vendorModel");
const Earnings = require("../model/earningsModel");
const OrderAssignment = require("../model/orderAssignmentModel");
const { distanceCalWithWaypoints } = require("../utils/locationUtils");
const DriverReport = require("../model/driverReportModel");

const logTrip = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { driverId, orderId, tripType } = req.body;

    // Fetch the driver to get the current location
    const driver = await Driver.findById(driverId).session(session);
    if (!driver) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Driver not found" });
    }

    // Fetch order details to get the pickup and delivery locations
    const order = await Order.findById(orderId)
      .populate("items.vendor.vendorId")
      .session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Order not found" });
    }

    const vendorIds = order.items.map((item) => item.vendor.vendorId._id);
    const uniqueVendorIds = [...new Set(vendorIds)];

    // Fetch pickup locations from vendors in the order
    const pickupLocations = await Promise.all(
      order.items.map(async (item) => {
        const vendor = await Vendor.findById(item.vendor.vendorId._id).session(
          session
        );
        if (!vendor) {
          throw new Error(`Vendor not found for product: ${item.productName}`);
        }
        return {
          address: vendor.location.address,
          geoCoordinates: {
            type: "Point",
            coordinates: vendor.location.geoCoordes.coordinates, // [longitude, latitude]
          },
          vendor: item.vendor.vendorId._id,
        };
      })
    );

    const uniquePickupLocations = pickupLocations.filter((location) =>
      uniqueVendorIds.includes(location.vendor)
    );

    if (
      !uniquePickupLocations ||
      !Array.isArray(uniquePickupLocations) ||
      uniquePickupLocations.length === 0
    ) {
      return res.status(400).json({
        message: "Pickup locations are required and should be an array.",
      });
    }

    // Extract delivery location from the order
    const deliveryLocation = {
      address: order.userDetails.deliveryAddress.address,
      placeName: order.userDetails.deliveryAddress.placeName,
      geoCoordinates: {
        type: "Point",
        coordinates: [
          order.userDetails.deliveryAddress.geoCoordinates.longitude,
          order.userDetails.deliveryAddress.geoCoordinates.latitude,
        ],
      },
    };

    // Distance calculation (assume distanceCalWithWaypoints is defined)
    const data = {
      origin: {
        latitude: driver.currentLocation.coordinates[1],
        longitude: driver.currentLocation.coordinates[0],
      },
      destination: {
        latitude: order.userDetails.deliveryAddress.geoCoordinates.latitude,
        longitude: order.userDetails.deliveryAddress.geoCoordinates.longitude,
      },
      waypoints: uniquePickupLocations.map((location) => ({
        latitude: location.geoCoordinates.coordinates[1],
        longitude: location.geoCoordinates.coordinates[0],
      })),
    };

    const responseData = await distanceCalWithWaypoints(data);
    if (!responseData) throw new Error("responseData is missing");

    // Create new trip entry
    const newTrip = new Trip({
      orderId,
      driver: driverId,
      driverCurrentLocation: {
        type: "Point",
        coordinates: driver.currentLocation.coordinates,
      },
      pickupLocations: uniquePickupLocations,
      deliveryLocation,
      startTime: new Date(), // Set start time to now or as per your requirement
      estimatedArrivalTime: responseData.estimatedArrivalTime,
      distanceCovered: responseData.totaldistanceInKm,
      tripType,
      amountToCollect: order.payableAmount,
    });

    await newTrip.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Trip logged successfully",
      trip: newTrip,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error logging trip:", error.message);
    res.status(500).json({
      message: "Error logging trip",
      error: error.message,
    });
  }
};

// Controller function to mark the trip as paid
const paymentStatusUpdate = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tripId, amountPaid, tips, bonuses } = req.body;

    const trip = await Trip.findById(tripId).session(session);
    if (!trip) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Trip not found" });
    }

    if (amountPaid < trip.amountToCollect) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Amount paid is less than the amount to be collected",
      });
    }

    trip.paidAmount += amountPaid;
    trip.tips += tips;
    trip.amountToCollect -= amountPaid;

    let paymentStatus = "Pending";
    let paymentMessage = null;

    // Check if the entire amount has been collected
    if (trip.amountToCollect <= 0) {
      paymentStatus = "Paid";
      paymentMessage = "Payment completed successfully";
      await trip.updatePaymentStatus(paymentStatus, paymentMessage);
    } else {
      await trip.updatePaymentStatus(paymentStatus, paymentMessage);
    }

    // Update driver's earnings after payment status update
    let driverEarnings = await Earnings.findOne({
      driver: trip.driver,
    }).session(session);

    if (!driverEarnings) {
      driverEarnings = new Earnings({
        driver: trip.driver,
        fare: 0,
        tips: 0,
        bonuses: 0,
        deductions: 0,
        trips: [],
        total: 0,
      });
    }

    driverEarnings.fare += amountPaid;
    driverEarnings.tips += tips;
    driverEarnings.bonuses += bonuses;
    if (!driverEarnings.trips.includes(trip._id)) {
      driverEarnings.trips.push(trip._id);
    }

    driverEarnings.calculateTotal();
    await driverEarnings.save({ session });

    // Update the corresponding order payment status
    const order = await Order.findOne({ _id: trip.orderId }).session(session);
    if (order) {
      order.paymentStatus = paymentStatus;
      await order.save({ session });
    }

    // Update driver report with new earnings
    let driverReport = await DriverReport.findOne({
      driverId: trip.driver,
    }).session(session);

    if (driverReport) {
      driverReport.totalEarnings = driverEarnings.total;

      // No need to update efficiency or delivery time here as the trip is already logged
      await driverReport.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Trip marked as paid successfully, earnings and order updated",
      trip,
      order,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error marking trip as paid:", error.message);
    res.status(500).json({
      message: "Error marking trip as paid",
      error: error.message,
    });
  }
};

// Controller function to log payment failure
const logPaymentFailure = async (req, res) => {
  try {
    const { tripId, failureReason } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    await trip.updatePaymentStatus("Failed", failureReason);

    res
      .status(200)
      .json({ message: "Payment failure logged successfully", trip });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error logging payment failure", error: error.message });
  }
};

// Function to fetch trip history with filters
const getTripHistory = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { startDate, endDate, tripType } = req.query;
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    let query = { driver: driverId };
    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (tripType) {
      query.tripType = tripType;
    }
    const trips = await Trip.find(query).sort({ startTime: -1 });
    res.status(200).json({ trips });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching trip history", error: error.message });
  }
};

// Driver report generation
const generateDriverReport = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driverReport = await DriverReport.findOne({ driverId })
      .populate("tripDetails")
      .exec();

    if (!driverReport)
      return res.status(404).json({ message: "No driver report found" });

    res.status(200).json({ report: driverReport });
  } catch (error) {
    res.status(500).json({
      message: "Error generating driver report",
      error: error.message,
    });
  }
};

// trip status update
const tripStatusUpdate = async (req, res) => {
  const { tripId, driverId, status } = req.body;
  console.log("Received status:", status);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const trip = await Trip.findById(tripId).session(session);
    if (!trip) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ message: "Trip not found", success: false });
    }

    const order = await Order.findById(trip.orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ message: "Order not found", success: false });
    }
    if (!trip.driver.equals(driverId)) {
      return res.status(403).json({
        message:
          "You do not have permission to access this order. The provided driverId does not match the trip's driverId.",
      });
    }
    const driver = await Driver.findById(driverId).session(session);
    if (!driver) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ message: "Driver not found", success: false });
    }

    const orderAssign = await OrderAssignment.findOne({
      order: trip.orderId,
      driver: driverId,
    }).session(session);
    if (!orderAssign) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ message: "Order Assignment not found", success: false });
    }

    if (status === "OnTheWayToDelivery") {
      trip.status = status;
      await trip.save({ session });

      order.status = "Shipped";
      await order.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: `Trip status update is successful`,
        status: status,
      });
    }

    if (status === "Delivered") {
      trip.status = status;
      trip.setEndTime(); // Set the end time of the trip

      await trip.save({ session });
      order.status = status;
      await order.save({ session });

      driver.status = "Available"; // Set driver as available again
      await driver.save({ session });

      orderAssign.status = "Completed";
      await orderAssign.save({ session });

      // Calculate the total delivery time
      const totalDeliveryTime =
        (new Date(trip.endTime) - new Date(trip.startTime)) / 1000 / 60 / 60;

      // Fetch or update the driver's report
      let driverReport = await DriverReport.findOne({ driverId }).session(
        session
      );
      if (!driverReport) {
        driverReport = new DriverReport({
          driverId,
          tripCount: 1,
          totalDistance: trip.distanceCovered,
          totalDeliveryTime: totalDeliveryTime,
          averageDeliveryTime: totalDeliveryTime,
          efficiency: 1 / trip.distanceCovered,
          tripDetails: [trip._id],
          issuesCount: trip.issuesEncountered ? 1 : 0,
        });
      } else {
        driverReport.tripCount += 1;
        driverReport.totalDistance += trip.distanceCovered;
        driverReport.totalDeliveryTime += totalDeliveryTime;

        // Calculate the new average delivery time
        driverReport.averageDeliveryTime =
          driverReport.totalDeliveryTime / driverReport.tripCount;

        // Calculate efficiency: number of trips divided by total distance covered
        driverReport.efficiency =
          driverReport.tripCount / driverReport.totalDistance;

        driverReport.tripDetails.push(trip._id);
        if (trip.issuesEncountered) driverReport.issuesCount += 1;
      }

      await driverReport.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: `Trip status update is successful, and driver report updated`,
        status: status,
      });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in trip status update:", error.message);
    return res.status(500).json({
      message: "Trip status update failed",
      success: false,
      error: error.message,
    });
  }
};
const logTripIssue = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { tripId, issuesEncountered } = req.body;
    // Find the trip
    const trip = await Trip.findById(tripId).session(session);
    if (!trip) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Trip not found" });
    }
    // Update the trip with the new issue
    trip.issuesEncountered = issuesEncountered;
    await trip.save({ session });

    // Find the driver's report
    const driverReport = await DriverReport.findOne({
      driverId: trip.driver,
    }).session(session);
    if (!driverReport) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Driver report not found" });
    }

    // Increment the issue count in the driver report
    driverReport.issuesCount += 1;
    await driverReport.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Trip issue logged and driver report updated successfully",
      trip,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error logging trip issue:", error.message);
    res.status(500).json({
      message: "Error logging trip issue",
      error: error.message,
    });
  }
};

module.exports = {
  logTrip,
  paymentStatusUpdate,
  logPaymentFailure,
  getTripHistory,
  generateDriverReport,
  tripStatusUpdate,
  logTripIssue,
};
