const express = require('express');
const { filterBy } = require('../controllers/filterController'); // Ensure filterBy is imported correctly
const router = express.Router();

router.get('/forProducts', filterBy); // Fixed quote issue

module.exports = router;

