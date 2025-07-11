const express = require('express');
const  getProductWithinRadius  = require('../controllers/getProductsController');
const authMiddleware = require('../middleware/authmiddleware');

const router = express.Router();

router.get("/withinRadius",  getProductWithinRadius );

module.exports = router;