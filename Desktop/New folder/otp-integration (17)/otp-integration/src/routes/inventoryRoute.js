const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.post("/add", inventoryController.addProductToInventory);
router.post("/remove", inventoryController.removeProductFromInventory);
router.get("/status/:variantSKU", inventoryController.getInventoryStatus);
router.post(
  "/upload",
  upload.single("file"),
  inventoryController.uploadExcelToMongoDB
);
module.exports = router;