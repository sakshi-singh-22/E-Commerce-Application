const Coupon = require('../model/couponModel');
const Product = require('../model/productmodel'); // Ensure you have this model

class CouponService {
    async getCouponByCode(code) {
        console.log('Fetching coupon with code:', code);
        return await Coupon.findOne({ code });
    }

    async isCouponValid(coupon, items) {
        console.log('Validating coupon:', coupon);
        console.log('Cart items:', items);

        if (new Date() > new Date(coupon.expirationDate)) {
            console.log('Coupon expired');
            return { valid: false, message: 'Coupon expired.' };
        }

        if (coupon.usedCount >= coupon.usageLimit) {
            console.log('Usage limit reached');
            return { valid: false, message: 'Coupon usage limit reached.' };
        }

        if (coupon.applyToAllCart) {
            console.log('Coupon applies to all cart items');
            return { valid: true, applicableItems: items };
        }

        // Filter applicable items based on coupon criteria
        const applicableItems = items.filter(item => {
            const isApplicable = (
                // (!coupon.applicableCategories.length || coupon.applicableCategories.includes(item.productId.category.name)) &&
                // (!coupon.applicableSubcategories.length || coupon.applicableSubcategories.includes(item.productId.category.subcategory)) &&
                (!coupon.applicableBrands.length || coupon.applicableBrands.includes(item.productId.brandName)) &&
                (!coupon.applicableProducts.length || coupon.applicableProducts.includes(item.productId._id)) &&
                (!coupon.applyToTag.length || coupon.applyToTag.some(tag => item.productId.coupon_tags.includes(tag)))
            );
            console.log('Item:', item, 'Applicable:', isApplicable);
            return isApplicable;
        });

        if (applicableItems.length === 0) {
            console.log('No applicable items for the coupon');
            return { valid: false, message: 'No applicable items for the coupon.' };
        }

        return { valid: true, applicableItems };
    }

    async applyDiscount(coupon, items) {
        console.log('Applying discount for coupon:', coupon);
        const { valid, applicableItems = [], message } = await this.isCouponValid(coupon, items);
        if (!valid) {
            return { success: false, message };
        }

        let discount = 0;
        const total = applicableItems.reduce((sum, item) => {
            const price = item.sellingPrice || 0; // Use sellingPrice
            const quantity = item.quantity || 0;
            return sum + (price * quantity);
        }, 0);

        if (coupon.discountType === 'fixed') {
            discount = Math.min(coupon.discountValue, total);
        } else if (coupon.discountType === 'percentage') {
            discount = (total * coupon.discountValue) / 100;
        }

        console.log('Calculated discount:', discount);

        const discountedPrice = total - discount;

        console.log('Discounted price:', discountedPrice);

        return { success: true, discountedPrice, discount };
    }

    async getCouponsForCategories(categories, subcategories, brands, productIds) {
        try {
            const now = new Date();

            // Base query conditions for valid coupons
            const baseConditions = {
                expirationDate: { $gte: now },
                usageLimit: { $gt: 0 }
            };

            // If there are no specific criteria, look for coupons that apply to all cart items
            const allCartCoupons = await Coupon.find({
                ...baseConditions,
                applyToAllCart: true
            });

            // If specific criteria are provided, build the query conditions for those
            const specificConditions = [];

            if (categories.length > 0) {
                specificConditions.push({ applicableCategories: { $in: categories } });
            }
            if (subcategories.length > 0) {
                specificConditions.push({ applicableSubcategories: { $in: subcategories } });
            }
            if (brands.length > 0) {
                specificConditions.push({ applicableBrands: { $in: brands } });
            }
            if (productIds.length > 0) {
                specificConditions.push({ applicableProducts: { $in: productIds } });
            }

            // Fetch specific coupons if any criteria are provided
            const specificCriteriaCoupons = specificConditions.length > 0
                ? await Coupon.find({
                    ...baseConditions,
                    $or: specificConditions
                })
                : [];

            // Combine both all-cart and specific criteria coupons
            const allCoupons = [...allCartCoupons, ...specificCriteriaCoupons];

            console.log('Coupons fetched:', allCoupons);

            return allCoupons.map(coupon => ({
                code: coupon.code,
                name: coupon.name,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                expirationDate: coupon.expirationDate,
                applyToAllCart: coupon.applyToAllCart
            }));
        } catch (error) {
            console.error('Error fetching coupons:', error);
            throw error;
        }
    }
}

module.exports = new CouponService();
