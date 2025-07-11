const express = require("express");
const productController = require("../controllers/ProductController");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const router = express.Router();

// excel upload
router.post(
  "/admin",
  upload.single("file"),
  productController.uploadExcelToMongoDB
);

router.post(
  "/vendor",
  upload.single("file"),
  productController.uploadExcelToMongoDBVendor
);
module.exports = router;