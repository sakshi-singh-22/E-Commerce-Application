const express = require('express');
const { searchProduct,
        autocompleteProduct
      } = require('../controllers/searchController')
const router = express.Router();
router.get('/searchBar',searchProduct)
router.get('/autocomplete',autocompleteProduct)
module.exports = router;