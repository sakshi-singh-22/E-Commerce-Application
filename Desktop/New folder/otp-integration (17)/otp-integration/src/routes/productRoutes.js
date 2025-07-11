const express = require('express');
const productController = require('../controllers/ProductController'); // path 
const vendorMiddleware = require('../middleware/vendorMiddleware'); 
const multer = require('multer');
const path = require('path');
const router = express.Router();
const upload = require('../middleware/multerConfig'); // Import multer configuration


// Additional routes for bulk operations (accessible only to vendors)
router.post('/bulk-upload',  productController.bulkUploadProducts);

router.put('/bulk-update',  productController.bulkUpdateProducts);

router.delete('/bulk-delete', productController.bulkDeleteProducts);

//route to delete varient

router.delete("/delete-variants",  productController.deleteVariants);

router.get("/categories", productController.getCategoryDetails);

// CRUD routes for products (accessible only to vendors)
router.post('/',  productController.createProduct);

router.get('/', productController.getAllProducts);

router.get('/:id',  productController.getProductById);

router.put('/:id', productController.updateProduct);

router.delete('/:id', productController.deleteProduct);

// Set up multer for file upload
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   fileFilter: (req, file, cb) => {
//     const ext = path.extname(file.originalname).toLowerCase();
//     if (ext !== '.png' && ext !== '.jpeg' && ext !== '.jpg') {
//       return cb(new Error('Only PNG and JPEG images are allowed'), false);
//     }
//     cb(null, true);
//   },
// });


// Route for bulk image upload
router.post('/upload-images', upload.array('images', 100), productController.bulkImageUpload);



// product comment
router.post("/comments", productController.addComment);
router.get("/comments/:productId", productController.getComments);
router.put("/comments/:productId", productController.editComment);
router.delete("/comments/:productId", productController.deleteComment);


module.exports = router;

