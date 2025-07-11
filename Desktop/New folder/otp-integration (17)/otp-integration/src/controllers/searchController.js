const Product = require('../model/productmodel')
const searchProduct = async (req, res) => {
    const { queryText, price, brand, category, subcategory } = req.body
    const searchField = 'name'
    const filterQuery = {};
    if (price) {
        filterQuery.sellingPrice = { $gte: price.min, $lte: price.max };
    }
    if (brand) {
        filterQuery.brandName = { $in: brand };
    }
    if (category) {
        filterQuery['category.name'] = category;
    }
    if (subcategory) {
        filterQuery['category.subcategories.name'] = subcategory;
    }
    try {
        const response = await Product.aggregate()
        .search({
            index: 'productSearchIndex',
            text: {
                query: queryText,
                path: searchField,
                fuzzy: {
                    maxEdits: 2,
                    prefixLength: 2
                }
        }}).match(filterQuery).exec();
        res.status(201).json({ message: response });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
}
const autocompleteProduct = async (req, res) => {
    const { searchTerm } = req.body
    const searchField = 'name'
    try {
        const results = await Product.aggregate([
            {
                $search: {
                    index: "productAutocompleteIndex",
                    autocomplete: {
                        query: searchTerm,
                        path: searchField,
                        fuzzy: {
                            maxEdits: 2,
                            prefixLength: 3
                        }
                    }
                }
            },
            { $limit: 5 }
        ]).exec();
        res.status(201).json({ message: results });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
}
module.exports = {
    searchProduct,
    autocompleteProduct
  };