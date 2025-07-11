const multer = require('multer'); // Add this line
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

// Configure AWS S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


// Set storage engine for Multer
const driverDocumentUpload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'dodash-products', // Replace with your S3 bucket name
    key: function (req, file, cb) {
      cb(null, `drivers/${Date.now()}_${file.originalname}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false); // Reject the file
    }
  }
});

module.exports = driverDocumentUpload;
