const Product = require('../model/productmodel');

const filterBy = async (req, res) => {
    const { price, brand, category, subcategory } = req.body;
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
        const products = await Product.find(filterQuery).exec();
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { filterBy };
