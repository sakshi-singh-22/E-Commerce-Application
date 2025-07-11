const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product'); // Adjust the import according to your project structure

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

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
      const filenameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|pdf)$/i, '');
      const [tags, variantWithExt] = filenameWithoutExt.split('_');
      let variantSKU;

      // Check if variantWithExt exists and extract the variantSKU
      if (variantWithExt) {
        variantSKU = variantWithExt; // variantSKU will be the remaining part after '_'
      }

      // Split tags into components to match your schema
      const tagParts = tags.split('-');
      const name = tagParts[0];
      const categorySKU = tagParts[1];
      const subcategorySKU = tagParts[2] || 'S00'; // Default to 'S00' if not present
      const brandName = tagParts[3] || 'undefined'; // Default to 'undefined' if not present

      // Construct full tag without any file extension
      const fullTag = `${name}-${categorySKU}-${subcategorySKU}-${brandName}`;

      console.log(`Extracted full tag: ${fullTag}, variantSKU: ${variantSKU}`);

      // Find the product by exact tag match and vendor ID
      const product = await Product.findOne({ tags: fullTag, vendorId });

      console.log(`Product found: ${product ? product.productId : 'none'}`);

      if (!product) {
        warnings.push(`Product with complete tags '${fullTag}' not found for file '${filename}'`);
        console.log(`Warning: ${warnings[warnings.length - 1]}`);
        continue; // Skip to the next file
      }

      // Upload the image to S3
      const params = {
        Bucket: process.env.S3_BUCKET_NAME, // Your S3 bucket name
        Key: `uploadImages/${filename}`, // S3 object key (path)
        Body: fs.readFileSync(path.join(__dirname, '../uploadImages', filename)), // Read from local file system
        ContentType: file.mimetype, // File type
      };

      const uploadResult = await s3.upload(params).promise();
      console.log(`Uploaded file to S3: ${uploadResult.Location}`);

      // If variantSKU is provided, check for the variant
      if (variantSKU) {
        const variantIndex = product.variants.findIndex(v => v.variantSKU === variantSKU);
        if (variantIndex !== -1) {
          // Assign image URL to the specific variant
          product.variants[variantIndex].image = uploadResult.Location; // Update image URL for the variant
          console.log(`Assigned image to variant SKU '${variantSKU}': ${uploadResult.Location}`);
        } else {
          warnings.push(`Variant with SKU '${variantSKU}' not found for file '${filename}'`);
          console.log(`Warning: Variant with SKU '${variantSKU}' not found`);
          continue; // Skip to the next file
        }
      } else {
        // Assign image URL to the main product if no variantSKU is provided
        product.images.push(uploadResult.Location); // Add the image URL to the product images
        console.log(`Assigned image to main product: ${uploadResult.Location}`);
      }

      // Save the product with the updated images
      await product.save();
      console.log(`Saved product with ID: ${product.productId}`);

      // Add processed product
      processedProducts.push({ productId: product.productId, filename });
    }

    res.status(200).json({
      message: 'Images uploaded and mapped successfully!',
      warnings: warnings.length > 0 ? warnings : undefined,
      processedProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred during image upload' });
  }
};

// Don't forget to export your route handler
module.exports = { bulkImageUpload };
