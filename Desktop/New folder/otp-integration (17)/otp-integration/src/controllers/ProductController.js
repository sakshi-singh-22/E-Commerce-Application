const Product = require("../model/productmodel"); // Correct path to Product model
const SubInventory = require("../model/subinventoryModel");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const Backup = require("../model/backUpModel.js");
const path = require("path");
const fs = require("fs");
const Comment = require("../model/commentModel.js");
const Admin = require("../model/adminModel.js");
const createProduct = async (req, res) => {
  const {
    name,
    sellingPrice,
    mrp,
    description,
    images,
    category,
    brandName,
    nutritionalInfo,
    variants,
    vendorId,
    domainTag,
    adminId, // for admin verification
  } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!adminId) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin ID is required." });
    }
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Invalid admin ID. Access denied." });
    }
    const product = new Product({
      name,
      sellingPrice,
      mrp,
      description,
      images,
      category: {
        name: category.name,
        categorySKU: category.categorySKU,
        subcategories: category.subcategories.map((sub) => ({
          subcategorySKU: sub.subcategorySKU,
          name: sub.name,
        })),
      },
      brandName,
      nutritionalInfo,
      vendorId,
      variants,
      domainTag,
    });

    const savedProduct = await product.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ product: savedProduct });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      message: "Failed to create product",
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  const productId = req.params.id;
  const updateData = req.body;
  const { adminId } = req.body;
  try {
    if (!adminId) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin ID is required." });
    }
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Invalid admin ID. Access denied." });
    }
    const product = await Product.findOne({ productId });

    if (!product) {
      console.log("Product not found for productId:", productId);
      return res.status(404).send({ message: "Product not found" });
    }

    // Update fields other than variants
    Object.keys(updateData).forEach((key) => {
      if (key !== "variants" && product[key] !== undefined) {
        product[key] = updateData[key];
      }
    });

    // Handle variants separately
    if (updateData.variants) {
      updateData.variants.forEach((updatedVariant) => {
        const existingVariant = product.variants.find(
          (v) => v.variantSKU === updatedVariant.variantSKU
        );

        if (existingVariant) {
          // Update existing variant fields
          Object.assign(existingVariant, updatedVariant);
        } else {
          // Add new variant if it doesn't exist
          product.variants.push(updatedVariant);
        }
      });
    }

    // Recalculate total quantity based on variants
    product.quantity = product.variants.reduce(
      (total, variant) => total + variant.quantity,
      0
    );

    // Update variant status if necessary
    product.updateVariantStatus();

    // Save the updated product
    await product.save();

    // Send the updated product details in the response
    res.status(200).send({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send({ message: "Server error", error: error.message });
  }
};

// Get all products
const getAllProducts = async (req, res) => {
  const { adminId } = req.body;
  try {
    if (!adminId) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin ID is required." });
    }
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Invalid admin ID. Access denied." });
    }
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving products", error });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  const { adminId } = req.body;
  try {
    if (!adminId) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin ID is required." });
    }
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Invalid admin ID. Access denied." });
    }
    const product = await Product.findOne({ productId: req.params.id });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving product", error });
  }
};

// Delete product by ID
const deleteProduct = async (req, res) => {
  try {
    
    const { adminId } = req.body; // Fetch vendor ID from token
    const productId = req.params.id;

    if (!adminId) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin ID is required." });
    }
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Invalid admin ID. Access denied." });
    }

    // Validate that productId is in the correct format
    if (!productId || typeof productId !== "string") {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    // Find and delete the product using productId
    const deletedProduct = await Product.findOneAndDelete({
      productId,
    });

    if (!deletedProduct) {
      return res
        .status(404)
        .json({ message: "Product not found or not authorized to delete" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error); // Debug log
    res.status(500).json({ message: "Error deleting product", error });
  }
};

const bulkUploadProducts = async (req, res) => {
  const { adminId, products } = req.body;
  if (!adminId) {
    return res
      .status(403)
      .json({ message: "Access denied. Admin ID is required." });
  }
  const admin = await Admin.findById(adminId);
  if (!admin) {
    return res
      .status(403)
      .json({ message: "Invalid admin ID. Access denied." });
  }
  // Validate that products is an array and not empty
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: "No products to upload." });
  }

  const session = await mongoose.startSession(); // Start a MongoDB session for transactions
  session.startTransaction();

  try {
    const results = [];
    const variantSKUs = new Set(); // To track variant SKUs and ensure uniqueness

    for (const productData of products) {
      const {
        name,
        description,
        images,
        category,
        brandName,
        nutritionalInfo,
        vendorId,
        variants,
        tags,
        domainTag,
      } = productData;

      // Validate required fields
      if (
        !name ||
        !description ||
        !category ||
        !brandName ||
        !vendorId ||
        !Array.isArray(variants)
      ) {
        throw new Error("Missing required fields.");
      }

      // Validate variant SKUs
      for (const variant of variants) {
        if (!variant.variantSKU) {
          throw new Error("Variant SKU is required and cannot be null.");
        }
        if (variantSKUs.has(variant.variantSKU)) {
          throw new Error(`Duplicate SKU found: ${variant.variantSKU}`);
        }
        variantSKUs.add(variant.variantSKU);
      }

      // Step 1: Create the product with the new schema structure
      const product = new Product({
        name,
        description,
        images,
        category: {
          name: category.name,
          categorySKU: category.categorySKU, // Ensure SKU is correctly included
          subcategories: category.subcategories.map((subcat) => ({
            subcategorySKU: subcat.subcategorySKU, // Ensure SKU is correctly included
            name: subcat.name,
          })),
        },
        brandName,
        nutritionalInfo,
        vendorId,
        variants: variants.map((variant) => ({
          color: variant.color,
          quantity: variant.quantity,
          variantSKU: variant.variantSKU,
          size: variant.size,
          sellingPrice: variant.sellingPrice,
          mrp: variant.mrp,
        })),
        tags,
        domainTag,
      });

      // Save the product within the transaction
      const savedProduct = await product.save({ session });
      results.push(savedProduct); // Collect results
    }

    // Step 4: Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Step 5: Send the response with the created products
    res.status(201).json({
      message: "Products uploaded successfully",
      results,
    });
  } catch (error) {
    // Step 6: Handle any errors, rollback the transaction if any error occurs
    await session.abortTransaction();
    session.endSession();
    console.error("Error during bulk upload:", error); // Debug log
    res.status(500).json({
      message: "Failed to upload products",
      error: error.message,
    });
  }
};

const bulkUpdateProducts = async (req, res) => {
  const { adminId, updates } = req.body;
  if (!adminId) {
    return res
      .status(403)
      .json({ message: "Access denied. Admin ID is required." });
  }
  const admin = await Admin.findById(adminId);
  if (!admin) {
    return res
      .status(403)
      .json({ message: "Invalid admin ID. Access denied." });
  }
  // Check if updates is an array
  if (!Array.isArray(updates)) {
    return res.status(400).send({
      message: "Invalid input format. Expected an array of updates.",
    });
  }

  try {
    const updatePromises = updates.map(async ({ productId, updateData }) => {
      // Validate that productId and updateData are provided
      if (!productId || !updateData) {
        return {
          productId,
          status: "Invalid input: Missing productId or updateData",
        };
      }

      // Fetch the product to update
      const product = await Product.findOne({ productId });

      if (!product) {
        return { productId, status: "Product not found" };
      }

      // Update product fields
      Object.assign(product, updateData);

      // Update the status of variants before saving
      product.updateVariantStatus();

      // Save the updated product document
      const updatedProduct = await product.save();

      return updatedProduct;
    });

    const updatedProducts = await Promise.all(updatePromises);

    const successfulUpdates = updatedProducts.filter(
      (product) => product && product.status !== "Product not found"
    );

    res.status(200).send({
      message: "Bulk products updated successfully",
      updatedProducts: successfulUpdates,
    });
  } catch (error) {
    res.status(500).send({
      message: "Server error during bulk update",
      error: error.message,
    });
  }
};

// Bulk Delete Products
const bulkDeleteProducts = async (req, res) => {
  const { productIds, adminId } = req.body; // Expecting an array of product IDs to be deleted

  try {
    if (!adminId) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin ID is required." });
    }
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Invalid admin ID. Access denied." });
    }
    // Validate input is an array of valid productIds
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).send({
        message: "Invalid input: productIds should be a non-empty array.",
      });
    }

    // Map over productIds to handle deletion
    const deletePromises = productIds.map(async (productId) => {
      // Find the product using the new productId format
      const product = await Product.findOne({ productId });

      if (!product) {
        return { productId, status: "Product not found" };
      }

      // Prepare backup data
      const newBackupData = {
        productId: product.productId,
        name: product.name,
        sellingPrice: product.sellingPrice,
        mrp: product.mrp,
        description: product.description,
        tags: product.tags,
        domainTag: product.domainTag,
        images: product.images,
        category: product.category,
        brandName: product.brandName,
        nutritionalInfo: product.nutritionalInfo, // Keep as object if needed
        vendorId: product.vendorId,
        variants: product.variants,
        quantity: product.variants.reduce(
          (acc, variant) => acc + (variant.quantity || 0),
          0
        ),
        deletedAt: new Date(), // Timestamp for deletion
      };

      // Create a backup
      await Backup.create(newBackupData);

      // Delete Product using the custom productId format
      await Product.deleteOne({ productId });

      return { productId, status: "Deleted successfully" };
    });

    const results = await Promise.all(deletePromises);
    const deletedProducts = results.filter(
      (result) => result.status === "Deleted successfully"
    );

    res.status(200).send({
      message: "Bulk products deleted successfully",
      deletedProducts,
    });
  } catch (error) {
    res.status(500).send({
      message: "Server error during bulk delete",
      error: error.message,
    });
  }
};

const deleteVariants = async (req, res) => {
  try {
    const { productId, variantSKUs, adminId } = req.body;

    if (!adminId) {
      return res
        .status(403)
        .json({ message: "Access denied. Admin ID is required." });
    }
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(403)
        .json({ message: "Invalid admin ID. Access denied." });
    }

    // Check if productId and variantSKUs are provided
    if (!productId || !Array.isArray(variantSKUs) || variantSKUs.length === 0) {
      return res.status(400).json({
        error:
          "Invalid input: productId and a non-empty array of variant SKUs are required.",
      });
    }

    // Find the product using the new productId format
    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Find the variants to be removed from product
    const variantsToRemove = product.variants.filter((variant) =>
      variantSKUs.includes(variant.variantSKU)
    );

    if (variantsToRemove.length === 0) {
      return res.status(404).json({ error: "No matching variants found." });
    }

    // Combine the removed variants into a single document for backup
    const backupData = {
      productId: product.productId, // Use the new productId format
      name: product.name,
      sellingPrice: product.sellingPrice,
      mrp: product.mrp,
      description: product.description,
      tags: product.tags,
      domainTag: product.domainTag,
      images: product.images,
      category: product.category,
      subcategory: product.subcategory,
      brandName: product.brandName,
      nutritionalInfo: JSON.stringify(product.nutritionalInfo), // Updated handling
      vendorId: product.vendorId,
      variants: variantsToRemove.map((variant) => ({
        variantSKU: variant.variantSKU,
        quantity: variant.quantity,
        color: variant.color,
        size: variant.size, // Include size if present
        sellingPrice: variant.sellingPrice,
        mrp: variant.mrp,
      })),
      quantity: variantsToRemove.reduce(
        (acc, variant) => acc + variant.quantity,
        0
      ),
      deletedAt: new Date(), // Timestamp for deletion
    };

    // Back up the combined removed variants
    await Backup.create(backupData);

    // Remove the variants from product
    product.variants = product.variants.filter(
      (variant) => !variantSKUs.includes(variant.variantSKU)
    );

    // Recalculate total quantity in product
    product.totalQuantity = product.variants.reduce(
      (acc, variant) => acc + (variant.quantity || 0),
      0
    );

    // Save the updated product
    await product.save();

    // Respond with the required structure
    res.status(200).json({
      productId: product.productId,
      variantSKUs: variantSKUs,
    });
  } catch (error) {
    console.error("Error in deleteVariants:", error.message);
    res.status(500).json({ error: error.message });
  }
};

const getCategoryDetails = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: {
            name: "$category.name",
            categorySKU: "$category.categorySKU",
            subcategories: "$category.subcategories",
            images: "$images",
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id.name",
          categorySKU: "$_id.categorySKU",
          subcategories: "$_id.subcategories",
          images: "$_id.images",
        },
      },
    ]).exec();

    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
const bulkImageUpload = async (req, res) => {
  const warnings = [];
  const processedProducts = [];
  try {
    // Retrieve vendor ID from request body
    const { vendorId } = req.body;
    for (const file of req.files) {
      const filename = file.originalname;
      console.log(`Processing file: ${filename}`);
      // Remove file extension for further processing
      const filenameWithoutExt = filename.replace(
        /\.(jpg|jpeg|png|gif|pdf)$/i,
        ""
      );
      const [productName, variantSKU] = filenameWithoutExt.split('_')
      // const [variantSKU] = filenameWithoutExt.slice(productName.length+1)
      console.log(`Product name: ${productName}, variantSKU: ${variantSKU}`);
      // Find the product by exact tag match and vendor ID
      const product = await Product.findOne({ name: productName, vendorId });
      console.log(`Product found: ${product ? product.productId : "none"}`);
      if (!product) {
        warnings.push(
          `Product name '${productName}' not found for file '${filename}'`
        );
        console.log(`Warning: ${warnings[warnings.length - 1]}`);
        continue; // Skip to the next file
      }
      // If variantSKU is provided, check for the variant
      if (variantSKU) {
        const variantIndex = product.variants.findIndex(
          (v) => v.variantSKU === variantSKU
        );
        if (variantIndex !== -1) {
          // Assign image to the specific variant
          product.variants[variantIndex].image = `\\uploadImages\\${filename}`; // Update image path for the variant
          console.log(
            `Assigned image to variant SKU '${variantSKU}': \\uploadImages\\${filename}`
          );
        } else {
          warnings.push(
            `Variant with SKU '${variantSKU}' not found for file '${filename}'`
          );
          console.log(`Warning: Variant with SKU '${variantSKU}' not found`);
          continue; // Skip to the next file
        }
      } else {
        // Assign image to the main product if no variantSKU is provided
        product.images.push(`\\uploadImages\\${filename}`); // Add the image path to the product images
        console.log(
          `Assigned image to main product: \\uploadImages\\${filename}`
        );
      }
      // Save the product with the updated images
      await product.save();
      console.log(`Saved product with ID: ${product.productId}`);
      // Add processed product
      processedProducts.push({ productId: product.productId, filename });
    }
    res.status(200).json({
      message: "Images uploaded and mapped successfully!",
      warnings: warnings.length > 0 ? warnings : undefined,
      processedProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred during image upload" });
  }
};

// upload excel data for admin
const uploadExcelToMongoDB = async (req, res) => {
  const file = req.file;
  const { adminId } = req.body;
  if (!adminId) {
    return res
      .status(403)
      .json({ message: "Access denied. Admin ID is required." });
  }
  const admin = await Admin.findById(adminId);
  if (!admin) {
    return res
      .status(403)
      .json({ message: "Invalid admin ID. Access denied." });
  }
  if (!file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  try {
    //Uncomment this if vendorId is needed
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(400).json({ message: "Invalid or missing vendor ID." });
    }

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    console.log("Parsed Excel Data:", jsonData);

    // Function to generate productId in the required format
    const generateProductId = (categorySKU, subcategorySKU, vendorId) => {
      const categoryPart = categorySKU.padStart(3, "0");
      const subcategoryPart = (subcategorySKU || "S00").padStart(3, "0");
      const vendorPart = (vendorId || "N/A").slice(-5);
      const productPart = new mongoose.Types.ObjectId().toString().slice(-5);
      return `${categoryPart}-${subcategoryPart}-${vendorPart}-${productPart}`;
    };

    const inventoryData = jsonData
      .filter((item) => item.ID && item.Stock)
      .map((item) => {
        const status =
          item.Stock > 10
            ? "in stock"
            : item.Stock > 0
            ? "low stock"
            : "out of stock";

        // Generate productId if not present
        const productId =
          item.ProductId ||
          generateProductId(
            item.Category_id,
            item.Subcategories_id,
            item.VendorId
          );

        return {
          title: item.Product || "Untitled Product",
          sellingPrice: item.Price,
          mrp: item.Price,
          description: item.Product_Description || "",
          tags: item.tags,
          domainTag: item.domainTag,
          images: item.Image ? [item.Image.trim()] : [],
          category: {
            name: item.Product_Category || "Unknown Category",
            categorySKU: item.Category_id || "C00",
            subcategories: [
              {
                name: item.Product_Sub_Category || "Unknown Subcategory",
                subcategorySKU: item.Subcategories_id || "S00",
              },
            ],
          },
          brandName: "Unknown Brand",
          nutritionalInfo: "N/A",
          vendorId: item.VendorId || "N/A",
          variants: [
            {
              color: "default",
              quantity: item.Stock,
              status: status,
              variantSKU: item.Variant_SKU || "UNKNOWN_SKU",
              size: "default",
              sellingPrice: item.Price,
              mrp: item.Price,
            },
          ],
          quantity: item.Stock,
          productId, // Add the generated or existing productId
        };
      });

    if (inventoryData.length === 0) {
      console.log("No valid data found in Excel file.");
      fs.unlinkSync(file.path);
      return res
        .status(400)
        .json({ message: "No valid data found in the file." });
    }

    // Insert or update products in bulk
    await Promise.all(
      inventoryData.map(async (data) => {
        await Product.updateOne(
          { productId: data.productId },
          { $set: data },
          { upsert: true }
        );
      })
    );

    // Remove the uploaded file
    fs.unlinkSync(file.path);
    res.status(200).json({ message: "Data successfully stored in MongoDB." });
  } catch (error) {
    console.error("Error processing file:", error);
    if (file && file.path) {
      fs.unlinkSync(file.path);
    }
    res
      .status(500)
      .json({ message: "Error processing file: " + error.message });
  }
};

// upload excel data for vendor
const uploadExcelToMongoDBVendor = async (req, res) => {
  const file = req.file;
  const { vendorId } = req.body;

  if (!file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  if (!vendorId) {
    return res.status(400).json({ message: "Vendor ID is required." });
  }

  try {
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    const inventoryData = jsonData
      .filter((item) => item.ID && item.Stock)
      .map((item) => {
        const status =
          item.Stock > 10
            ? "in stock"
            : item.Stock > 0
            ? "low stock"
            : "out of stock";

        // Function to generate productId using the same logic from pre-save
        const generateProductId = () => {
          const categoryPart = item.Category_id?.padStart(3, "0") || "C00";
          const subcategoryPart =
            item.Subcategories_id?.padStart(3, "0") || "S00";
          const vendorPart = vendorId.slice(-5);
          const productPart = new mongoose.Types.ObjectId()
            .toString()
            .slice(-5);

          return `${categoryPart}-${subcategoryPart}-${vendorPart}-${productPart}`;
        };

        const productId = item.ProductId || generateProductId();

        return {
          name: item.Product || "Untitled Product",
          sellingPrice: item.Price,
          mrp: item.Price,
          description: item.Product_Description || "",
          tags: item.tags,
          domainTag: item.domainTag,
          images: item.Image ? [item.Image.trim()] : [],
          category: {
            name: item.Product_Category || "Unknown Category",
            categorySKU: item.Category_id || "C00",
            subcategories: [
              {
                name: item.Product_Sub_Category || "Unknown Subcategory",
                subcategorySKU: item.Subcategories_id || "S00",
              },
            ],
          },
          brandName: "Unknown Brand",
          nutritionalInfo: "N/A",
          vendorId: vendorId,
          variants: [
            {
              color: "default",
              quantity: item.Stock,
              status: status,
              variantSKU: item.Variant_SKU || "UNKNOWN_SKU",
              size: "default",
              sellingPrice: item.Price,
              mrp: item.Price,
            },
          ],
          quantity: item.Stock,
          productId, // Add the generated or existing productId
        };
      });

    if (inventoryData.length === 0) {
      fs.unlinkSync(file.path);
      return res
        .status(400)
        .json({ message: "No valid data found in the file." });
    }

    // Insert or update products in bulk
    await Promise.all(
      inventoryData.map(async (data) => {
        await SubInventory.updateOne(
          { "variants.variantSKU": data.variants[0].variantSKU },
          { $set: data },
          { upsert: true }
        );
      })
    );

    fs.unlinkSync(file.path);
    res.status(200).json({ message: "Data successfully stored in MongoDB." });
  } catch (error) {
    if (file && file.path) {
      fs.unlinkSync(file.path);
    }
    res
      .status(500)
      .json({ message: "Error processing file: " + error.message });
  }
};

// Add Comment Function
const addComment = async (req, res) => {
  const { productId, userId, comment, images } = req.body;

  if (!productId || !userId) {
    return res.status(400).json({
      success: false,
      message: "productId and userId are required",
    });
  }

  try {
    let productComment = await Comment.findOne({ productId });

    if (!productComment) {
      productComment = new Comment({
        productId,
        comments: [{ userId, comment, images }],
      });
    } else {
      productComment.comments.push({ userId, comment, images });
    }

    await productComment.save();
    res.status(200).json({
      success: true,
      message: "Comment added successfully",
      data: productComment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding comment",
      error: error.message,
    });
  }
};

// Edit Comment Function
const editComment = async (req, res) => {
  const { productId } = req.params;
  const { userId, comment, images } = req.body;

  if (!productId || !userId) {
    return res.status(400).json({
      success: false,
      message: "productId and userId are required",
    });
  }

  try {
    const productComment = await Comment.findOne({
      productId,
      "comments.userId": userId,
    });

    if (!productComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you are not authorized to edit",
      });
    }

    // Find the comment by userId within the product's comments
    const userComment = productComment.comments.find(
      (c) => c.userId.toString() === userId
    );

    if (!userComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found for the specified user",
      });
    }

    userComment.comment = comment;
    userComment.images = images;
    await productComment.save();

    res.status(200).json({
      success: true,
      message: "Comment edited successfully",
      data: productComment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error editing comment",
      error: error.message,
    });
  }
};

// Delete Comment Function
const deleteComment = async (req, res) => {
  const { productId } = req.params;
  const { userId } = req.body;

  if (!productId || !userId) {
    return res.status(400).json({
      success: false,
      message: "productId and userId are required",
    });
  }

  try {
    const productComment = await Comment.findOne({ productId });

    if (!productComment) {
      return res.status(404).json({
        success: false,
        message: "No comments found for this product",
      });
    }

    const userCommentIndex = productComment.comments.findIndex(
      (c) => c.userId.toString() === userId
    );

    if (userCommentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Comment not found for the specified user",
      });
    }

    // Remove the comment
    productComment.comments.splice(userCommentIndex, 1);
    await productComment.save();

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting comment",
      error: error.message,
    });
  }
};

// Get Comments Function
const getComments = async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({
      success: false,
      message: "productId is required",
    });
  }

  try {
    const productComments = await Comment.findOne({ productId });

    if (!productComments) {
      return res.status(404).json({
        success: false,
        message: "No comments found for this product",
      });
    }

    res.status(200).json({
      success: true,
      message: "Comments retrieved successfully",
      data: productComments.comments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving comments",
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  getAllProducts,
  getProductById,
  deleteProduct,
  //getProductWithInventory,
  bulkUploadProducts,
  bulkUpdateProducts,
  bulkDeleteProducts,
  deleteVariants,
  getCategoryDetails,
  bulkImageUpload,
  uploadExcelToMongoDB,
  uploadExcelToMongoDBVendor,
  addComment,
  getComments,
  editComment,
  deleteComment,
};