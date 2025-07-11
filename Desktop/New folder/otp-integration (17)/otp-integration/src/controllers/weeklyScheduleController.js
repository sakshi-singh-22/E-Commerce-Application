const Product = require("../model/productmodel");
const WeeklySchedule = require("../model/weeklyScheduleModel");
const User = require("../model/authmodel");
const VendorSchedule = require("../model/vendorScheduleOrderModel");
// Schedule a new order
const scheduleOrder = async (req, res) => {
  try {
    const { userId, dayOfWeek, specificDate, frequency } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a new schedule without the timeSlot yet
    const newSchedule = new WeeklySchedule({
      user: userId,
      dayOfWeek,
      specificDate,
      frequency,
    });

    // Save the new schedule
    const savedSchedule = await newSchedule.save();

    res.status(201).json({
      message: "Schedule created successfully. Please select a time slot.",
      data: savedSchedule,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while creating schedule",
      error: error.message,
    });
  }
};

// select time slot
const selectTimeSlot = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { timeSlot, userId } = req.body;

    const schedule = await WeeklySchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (schedule.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this schedule" });
    }

    schedule.timeSlot = timeSlot;
    const updatedSchedule = await schedule.save();

    res.status(200).json({
      message: "Time slot added successfully. You can now add products.",
      data: updatedSchedule,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while selecting time slot",
      error: error.message,
    });
  }
};

// Add products to an existing schedule
const addProductToSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { productId, quantity, userId } = req.body;

    const schedule = await WeeklySchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (schedule.user.toString() !== userId) {
      return res.status(403).json({
        message: "You are not authorized to add products to this schedule",
      });
    }

    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    // Add the product to the schedule
    schedule.products.push({
      productId,
      productName: product.name,
      quantity,
      price: product.sellingPrice,
    });

    const updatedSchedule = await schedule.save();

    res.status(200).json({
      message: "Product added to schedule successfully",
      data: updatedSchedule,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while adding product to schedule",
      error: error.message,
    });
  }
};

// Delete a scheduled order
const deleteScheduledOrder = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { userId } = req.body;

    const schedule = await WeeklySchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Scheduled order not found" });
    }

    if (schedule.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this schedule" });
    }

    const deletedSchedule = await WeeklySchedule.findByIdAndDelete(scheduleId);

    res.status(200).json({ message: "Scheduled order deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Server error while deleting order",
      error: error.message,
    });
  }
};

// Update a scheduled order
const updateScheduledOrder = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { dayOfWeek, specificDate, timeSlot, frequency, userId } = req.body;

    const schedule = await WeeklySchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Scheduled order not found" });
    }

    if (schedule.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this schedule" });
    }

    // Update the schedule
    const updatedSchedule = await WeeklySchedule.findByIdAndUpdate(
      scheduleId,
      {
        $set: {
          dayOfWeek,
          specificDate,
          timeSlot,
          frequency,
        },
        updatedAt: Date.now(),
      },
      { new: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({ message: "Scheduled order not found" });
    }

    res.status(200).json({
      message: "Scheduled order updated successfully",
      data: updatedSchedule,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while updating order",
      error: error.message,
    });
  }
};

// Get all scheduled orders for a user
const getUserScheduledOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const schedules = await WeeklySchedule.find({ user: userId }).sort({
      createdAt: -1,
    });

    if (!schedules || schedules.length === 0) {
      return res
        .status(404)
        .json({ message: "No scheduled orders found for the user" });
    }

    res.status(200).json({
      message: "Scheduled orders retrieved successfully",
      data: schedules,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while retrieving scheduled orders",
      error: error.message,
    });
  }
};

// Confirm the order and store in VendorSchedule
const confirmOrder = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { userId } = req.body;

    // Find the schedule by ID
    const schedule = await WeeklySchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Check if the user making the request is the same as the one who created the schedule
    if (schedule.user.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Check if the schedule is already confirmed
    if (schedule.status === "confirm") {
      return res.status(400).json({ message: "Order is already confirmed" });
    }

    // Change status to confirmed
    schedule.status = "confirm";
    await schedule.save();

    // Loop through the products in the schedule
    for (const product of schedule.products) {
      const { productId, productName, quantity, price } = product;

      // Find the vendorId for each product
      const productDetails = await Product.findOne({ productId });

      if (!productDetails) {
        return res
          .status(404)
          .json({ message: `Product with ID ${productId} not found` });
      }

      const vendorId = productDetails.vendorId;

      // Check if a similar vendor schedule already exists for the vendor
      let vendorSchedule = await VendorSchedule.findOne({
        scheduleId: schedule._id,
        "products.vendorId": vendorId,
      });

      // If vendor schedule doesn't exist, create a new one
      if (!vendorSchedule) {
        vendorSchedule = new VendorSchedule({
          scheduleId: schedule._id,
          userId: schedule.user,
          timeSlot: schedule.timeSlot,
          products: [
            {
              productId,
              productName,
              quantity,
              price,
              vendorId,
            },
          ],
          orderDate: schedule.orderDate,
        });
      } else {
        vendorSchedule.products.push({
          productId,
          productName,
          quantity,
          price,
          vendorId,
        });
      }

      // Save the vendor schedule
      await vendorSchedule.save();
    }

    res.status(200).json({
      message: "Order confirmed and stored for vendor(s) successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while confirming order",
      error: error.message,
    });
  }
};

module.exports = {
  scheduleOrder,
  selectTimeSlot,
  addProductToSchedule,
  getUserScheduledOrders,
  updateScheduledOrder,
  deleteScheduledOrder,
  confirmOrder,
};