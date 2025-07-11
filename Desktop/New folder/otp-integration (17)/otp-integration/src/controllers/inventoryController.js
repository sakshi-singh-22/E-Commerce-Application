const mongoose = require("mongoose");
const Inventory = require("../model/inventoryModel");
const Product = require("../model/productmodel");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");

// Helper function to update inventory status
const updateInventoryStatus = async (variantSKU) => {
  const inventory = await Inventory.findOne({
    "variants.variantSKU": variantSKU,
  });

  if (!inventory) return;

  const variant = inventory.variants.find((v) => v.variantSKU === variantSKU);

  if (!variant) return;

  if (variant.quantity === 0) {
    variant.status = "out of stock";
  } else if (variant.quantity <= 10) {
    variant.status = "low stock";
  } else {
    variant.status = "in stock";
  }

  await inventory.save();
};

// Add product quantity to inventory
const addProductToInventory = async (req, res) => {
  const { productId, variantSKU, quantity } = req.body;

  try {
    if (!quantity || quantity <= 0) {
      return res
        .status(400)
        .send({ message: "Quantity must be greater than 0" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }

    const variant = product.variants.find((v) => v.variantSKU === variantSKU);
    if (!variant) {
      return res.status(404).send({ message: "Variant not found" });
    }

    const inventory = await Inventory.findOneAndUpdate(
      { productId, "variants.variantSKU": variantSKU },
      {
        $inc: { "variants.$.quantity": quantity },
        title: product.name, // Updated to match field in Product
        category: product.category,
        subcategory: product.subcategory, // Ensure this matches the field name in Product
        sellingPrice: product.sellingPrice, // Updated field name to match Product schema
        mrp: product.mrp,
        productDescription: product.description,
        images: product.images,
      },
      { new: true, upsert: true }
    );

    if (inventory) {
      await updateInventoryStatus(variantSKU);
    }

    res.status(200).send({ message: "Product added to inventory", inventory });
  } catch (error) {
    console.error("Error adding product to inventory:", error);
    res.status(500).send({ message: "Server error", error: error.message });
  }
};

// Remove product from inventory
const removeProductFromInventory = async (req, res) => {
  const { variantSKU, quantity } = req.body;

  try {
    if (!quantity || quantity <= 0) {
      return res
        .status(400)
        .send({ message: "Quantity must be greater than 0" });
    }

    const inventory = await Inventory.findOne({
      "variants.variantSKU": variantSKU,
    });

    if (!inventory) {
      return res
        .status(404)
        .send({ message: "Product not found in inventory" });
    }

    const variant = inventory.variants.find((v) => v.variantSKU === variantSKU);

    if (!variant || variant.quantity < quantity) {
      return res.status(400).send({
        message: `Insufficient stock. Available quantity: ${variant.quantity}`,
      });
    }

    variant.quantity -= quantity;
    await inventory.save();
    await updateInventoryStatus(variantSKU);

    res
      .status(200)
      .send({ message: "Product removed from inventory", inventory });
  } catch (error) {
    console.error("Error removing product from inventory:", error);
    res.status(500).send({ message: "Server error", error: error.message });
  }
};

// Get inventory status for a product
const getInventoryStatus = async (req, res) => {
  const { variantSKU } = req.params;

  try {
    const inventory = await Inventory.findOne({
      "variants.variantSKU": variantSKU,
    });

    if (!inventory) {
      return res.status(404).send({ message: "Inventory record not found" });
    }

    const variant = inventory.variants.find((v) => v.variantSKU === variantSKU);

    res.status(200).send({ inventory: { ...inventory.toObject(), variant } });
  } catch (error) {
    console.error("Error getting inventory status:", error);
    res.status(500).send({ message: "Server error", error: error.message });
  }
};
//adding bulk data using excel
const ObjectId = mongoose.Types.ObjectId;
const uploadExcelToMongoDB = async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "No file uploaded." });
  }
  try {
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    console.log("Parsed Data:", jsonData);
    const inventoryData = jsonData
      .filter((item) => item.ID && item.Quantity)
      .map((item, index) => {
        let productId;
        try {
          productId = ObjectId(item.ID);
        } catch (error) {
          console.warn(
            `Invalid ObjectId for ID: ${item.ID}. Using default ObjectId.`
          );
          productId = new ObjectId();
        }
        return {
          productId: productId,
          variants: [
            {
              color: "default",
              quantity: item.Stock, //need to be changed
              variantSKU: item.Variant_SKU,
              sellingPrice: item.Price,
              mrp: item.Price,
              status:
                item.Stock > 10
                  ? "in stock"
                  : item.Stock > 0
                  ? "low stock"
                  : "out of stock",
            },
          ],
          category: {
            name: item.Product_Category || "Unknown Category",
            subcategories: [
              { name: item.Product_Sub_Category || "Unknown Subcategory" },
            ],
          },
          totalQuantity: item.Stock,
          title: item.Product || "Untitled Product",
          sellingPrice: item.Price,
          mrp: item.Price,
          productDescription: item.Product_Description || "",
          images: item.Image ? [item.Image.trim()] : [],
        };
      });
    if (inventoryData.length === 0) {
      fs.unlinkSync(file.path);
      return res
        .status(400)
        .json({ message: "No valid data found in the file." });
    }
    await Promise.all(
      inventoryData.map(async (data) => {
        await Inventory.updateOne(
          { "variants.variantSKU": data.variants[0].variantSKU },
          { $set: data },
          { upsert: true }
        );
      })
    );
    console.log("Data successfully stored in MongoDB.");
    // Remove the uploaded file from the server
    fs.unlinkSync(file.path);
    console.log("Temporary file deleted successfully.");
    res.status(200).json({
      message: "File uploaded and data stored in MongoDB successfully.",
    });
  } catch (error) {
    console.error("Error processing file:", error);
    if (file && file.path) {
      fs.unlinkSync(file.path);
      console.log("Temporary file deleted due to error.");
    }
    res
      .status(500)
      .json({ message: "Error processing file: " + error.message });
  }
};
module.exports = {
  addProductToInventory,
  removeProductFromInventory,
  getInventoryStatus,
  uploadExcelToMongoDB
};