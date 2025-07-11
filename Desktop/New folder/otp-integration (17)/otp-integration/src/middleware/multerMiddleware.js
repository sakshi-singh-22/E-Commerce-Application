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

// Configure multer storage engine with S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'dodash-products',
    key: function (req, file, cb) {
      cb(null, `vendors/${Date.now()}_${file.originalname}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and MP4 files are allowed.'), false);
    }
  },
});

module.exports = upload;
