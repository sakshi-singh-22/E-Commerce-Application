const express = require("express");
const router = express.Router();
const {
  scheduleOrder,
  selectTimeSlot,
  addProductToSchedule,
  getUserScheduledOrders,
  updateScheduledOrder,
  deleteScheduledOrder,
  confirmOrder,
} = require("../controllers/weeklyScheduleController");

// Create schedule include date and day
router.post("/schedule", scheduleOrder);

// Select a time slot for an existing schedule
router.put("/schedule/select-time/:scheduleId", selectTimeSlot);

// Add product to an existing schedule
router.put("/schedule/add-product/:scheduleId", addProductToSchedule);

// Get all scheduled orders for a specific user
router.get("/schedule/user/:userId", getUserScheduledOrders);

// Update a scheduled order
router.put("/schedule/update/:scheduleId", updateScheduledOrder);

// Delete a scheduled order
router.delete("/schedule/delete/:scheduleId", deleteScheduledOrder);
//confirm order
router.post("/schedule/confirmOrder/:scheduleId", confirmOrder);

module.exports = router;