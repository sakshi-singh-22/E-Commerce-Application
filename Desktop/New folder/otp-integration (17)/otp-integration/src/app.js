const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes"); // Cart routes import
const couponRoutes = require("./routes/couponRoutes");
const adminRoutes = require("./routes/adminRoutes"); // Admin routes import
const inventoryRoutes = require("./routes/inventoryRoute");
const orderRoutes = require("./routes/orderRoutes");
const vendorRoutes = require("./routes/vendorRoute");
const filterRoutes = require("../src/routes/filterRoute");
const locationRoutes = require("../src/routes/locationRoute");
const searchRoutes = require("../src/routes/searchRoutes");
const driverRoutes = require("../src/routes/driverRoutes");
////const checkoutRoute = require('../src/routes/checkoutRoutes');
const webhookRoutes = require("./routes/webhookRoutes");
////const earningsRoutes = require('./routes/earningsRoutes');
////const payoutRoutes = require('./routes/payoutRoutes');
const orderAssignmentRoutes = require("./routes/orderAssignmentRoutes");
const vendorOrderRoutes = require("./routes/vendorOrderRoutes");
const bulkRoutes = require("./routes/bulkRoutes");
const getProductWithinRadiusRoutes = require('./routes/getProductsRoutes');
const rideRoutes = require('./routes/Taxi/rideRoutes');
const taxiRoutes = require('./routes/Taxi/taxiRoutes');
const taxiReviewRoutes = require("./routes/Taxi/taxiReviewRoutes");
const scheduleRoute = require("./routes/scheduleRoutes");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Connect to MongoDB with error handling
(async function connectDatabase() {
  try {
    await connectDB();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1); // Exit the process if database connection fails
  }
})();

// Middleware
app.use(helmet()); // Adds security headers
app.use(morgan("dev")); // Logs requests to the console
app.use(bodyParser.json()); // Parses incoming JSON requests
app.use(express.json());

// Rate limiter for authentication routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Apply rate limiting only to auth routes
app.use("/auth", apiLimiter, authRoutes); // Auth routes with rate limiting
app.use("/api", vendorRoutes);
app.use("/api/products", productRoutes); // Product routes
app.use("/api/carts", cartRoutes); // Cart routes under '/api/carts' prefix
app.use("/api/coupons", couponRoutes); // Coupon routes under '/api/coupons' prefix
app.use("/api/admin", adminRoutes); // Admin routes under '/api/admin' prefix
app.use("/api/inventory", inventoryRoutes); // Inventory routes
app.use("/api/orders", orderRoutes);
app.use("/api/filter", filterRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/assignments", orderAssignmentRoutes);
app.use("/api/vendororder", vendorOrderRoutes);
app.use("/api/bulk-upload", bulkRoutes);
app.use('/api/getProducts', getProductWithinRadiusRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/taxi', taxiRoutes);
app.use("/api/taxi", taxiReviewRoutes);
app.use("/api", scheduleRoute);
////app.use('/api/checkout' , checkoutRoute);
app.use("/webhook", webhookRoutes);
////app.use('/api', earningsRoutes);
////app.use('/api', payoutRoutes);

// General error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message || err); // Log error details
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    success: false,
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app; // Export the app