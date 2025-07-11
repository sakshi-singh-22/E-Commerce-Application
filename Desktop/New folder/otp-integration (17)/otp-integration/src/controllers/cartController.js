const Cart = require('../model/cartModel');
const coupon = require('../model/couponModel');
const Product = require('../model/productmodel'); 
const CouponService = require('../services/couponService'); // Import 

const createOrRetrieveCart = async (req, res) => {
  const { userId } = req.body; // Extract userId from the request body

  try {
    // Check if the userId is provided
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required', success: false });
    }

    // Find or create the cart for the user
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      // Create a new cart if none exists
      cart = new Cart({ user: userId });
    }

    let totalPayableAmount = 0;
    let invalidItems = [];
    let updatedCartItems = [];

    // Check stock availability and calculate total payableAmount
    if (cart.items.length > 0) {
      const productIds = cart.items.map(item => item.productId);
      const products = await Product.find({ productId: { $in: productIds } });

      for (const item of cart.items) {
        const product = products.find(p => p.productId === item.productId);
        if (product) {
          const productVariant = product.variants.find(v => v.variantSKU === item.variant.variantSKU);
          if (productVariant) {
            if (productVariant.quantity < item.quantity) {
              invalidItems.push({
                productId: item.productId,
                variantSKU: item.variant.variantSKU
              });
            } else {
              totalPayableAmount += item.payableAmount;

              // Add product and variant details to the item for response
              updatedCartItems.push({
                productId: item.productId,
                productName: product.name,
                brandName: product.brandName,
                quantity: item.quantity,
                payableAmount: item.payableAmount,
                variant: {
                  color: productVariant.color,
                  variantSKU: productVariant.variantSKU,
                  size: productVariant.size,
                  sellingPrice: productVariant.sellingPrice,
                  mrp: productVariant.mrp
                }
              });
            }
          }
        }
      }

      // Handle invalid items with insufficient stock
      if (invalidItems.length > 0) {
        return res.status(400).json({
          message: 'Some items in the cart have insufficient stock.',
          success: false,
          invalidItems
        });
      }
    }

    // Update the cart's payableAmount
    cart.payableAmount = totalPayableAmount;

    // Save the cart
    await cart.save();

    // Calculate the total quantity of items in the cart
    const totalQuantity = updatedCartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Return the updated cart with product and variant details
    res.status(200).json({
      success: true,
      cart: {
        _id: cart._id, // Include cart ID
        user: cart.user, // Include user ID
        payableAmount: cart.payableAmount, // Include total payable amount
        items: updatedCartItems, // Include updated items with product details
        totalQuantity, // Include total quantity of items
        createdAt: cart.createdAt, // Include createdAt timestamp
        updatedAt: cart.updatedAt // Include updatedAt timestamp
      }
    });
  } catch (error) {
    // Log the error and send a 500 status with a generic message
    console.error('Error creating or retrieving cart:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const addItemToCart = async (req, res) => {
  try {
    const { userId, productId, variant = {} } = req.body;

    if (!variant.variantSKU) {
      return res.status(400).json({ message: 'variantSKU is required', success: false });
    }

    // Fetch the cart for the user by userId from the body
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found', success: false });
    }

    // Fetch the product and its variants
    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found', success: false });
    }

    // Find the correct variant
    const productVariant = product.variants.find(v => v.variantSKU === variant.variantSKU);
    if (!productVariant) {
      return res.status(404).json({ message: 'Variant not found', success: false });
    }

    // Get the available quantity for the variant
    const totalAvailableQuantity = productVariant.quantity;

    // Check if the item already exists in the cart
    const existingItemIndex = cart.items.findIndex(item =>
      item.productId === productId && item.variant.variantSKU === variant.variantSKU
    );

    if (existingItemIndex > -1) {
      let existingItem = cart.items[existingItemIndex];
      const newQuantity = existingItem.quantity + variant.quantity;

      if (newQuantity > totalAvailableQuantity) {
        return res.status(400).json({ message: 'Quantity exceeds available stock', success: false });
      }

      // Update existing item
      existingItem.quantity = newQuantity;
      existingItem.payableAmount = productVariant.sellingPrice * newQuantity;
    } else {
      // Add new item to the cart
      if (variant.quantity <= totalAvailableQuantity) {
        const payableAmount = productVariant.sellingPrice * variant.quantity;
        cart.items.push({
          productId,
          quantity: variant.quantity,
          payableAmount,
          variant: {
            variantSKU: productVariant.variantSKU,
            color: productVariant.color,
            size: productVariant.size,
            sellingPrice: productVariant.sellingPrice,
            mrp: productVariant.mrp,
            quantity: productVariant.quantity
          }
        });
      } else {
        return res.status(400).json({ message: 'Quantity exceeds available stock', success: false });
      }
    }

    // Recalculate total payableAmount for the cart
    cart.payableAmount = cart.items.reduce((total, item) => total + item.payableAmount, 0);

    // Save the cart
    await cart.save();

    // Prepare the updated cart response
    const products = await Product.find({ productId: { $in: cart.items.map(item => item.productId) } });

    // Modify cart items to include product and variant details
    const updatedCartItems = cart.items.map(item => {
      const product = products.find(p => p.productId === item.productId);
      if (product) {
        const productVariant = product.variants.find(v => v.variantSKU === item.variant.variantSKU);
        if (productVariant) {
          return {
            productId: item.productId,
            productName: product.name,
            brandName: product.brandName,
            quantity: item.quantity,
            payableAmount: item.payableAmount,
            variant: {
              color: productVariant.color,
              variantSKU: productVariant.variantSKU,
              size: productVariant.size,
              sellingPrice: productVariant.sellingPrice,
              mrp: productVariant.mrp
            }
          };
        }
      }
      return item; // Return the item as is if product or variant is not found
    });

    // Calculate the total quantity of items in the cart
    const totalQuantity = updatedCartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Return the updated cart with user, payableAmount, and item details
    res.status(200).json({
      success: true,
      cart: {
        _id: cart._id, // Include cart ID
        user: cart.user, // Include user ID
        payableAmount: cart.payableAmount, // Include total payable amount
        items: updatedCartItems, // Include updated items with product details
        totalQuantity, // Include total quantity of items
        createdAt: cart.createdAt, // Include createdAt timestamp
        updatedAt: cart.updatedAt // Include updatedAt timestamp
      }
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const removeItemFromCart = async (req, res) => {
  const { userId, productId, variant } = req.body;

  try {
    // Find the cart associated with the user by userId from the body
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found', success: false });
    }

    // Find the index of the item to be removed
    const itemIndex = cart.items.findIndex(item => {
      return item.productId === productId &&
             (!variant || (item.variant && item.variant.variantSKU === variant.variantSKU));
    });

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart', success: false });
    }

    // Remove the item from the cart
    cart.items.splice(itemIndex, 1);

    // Recalculate payableAmount
    const totalPayableAmount = cart.items.reduce((total, item) => total + item.payableAmount, 0);
    cart.payableAmount = totalPayableAmount;

    // Save the updated cart
    await cart.save();

    res.status(200).json({ success: true, message: 'Item removed from cart', cart: {
      _id: cart._id, // Include cart ID
      user: cart.user, // Include user ID // Include total payable amount
      items: cart.items, // Include updated items with product details // Include total quantity of items
      createdAt: cart.createdAt, // Include createdAt timestamp
      updatedAt: cart.updatedAt // Include updatedAt timestamp
    } });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const updateItemQuantity = async (req, res) => {
  try {
    const { userId, productId, variant = {} } = req.body;

    if (!variant.variantSKU) {
      return res.status(400).json({ message: 'variantSKU is required', success: false });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found', success: false });
    }

    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found', success: false });
    }

    const productVariant = product.variants.find(v => v.variantSKU === variant.variantSKU);
    if (!productVariant) {
      return res.status(404).json({ message: 'Variant not found for this product', success: false });
    }

    const totalAvailableQuantity = productVariant.quantity;
    const sellingPrice = productVariant.sellingPrice;

    const itemIndex = cart.items.findIndex(
      item => item.productId === productId && item.variant.variantSKU === variant.variantSKU
    );

    if (itemIndex > -1) {
      let item = cart.items[itemIndex];

      if (variant.quantity > totalAvailableQuantity) {
        return res.status(400).json({ message: 'Quantity exceeds available stock', success: false });
      }

      if (variant.quantity > 0) {
        item.quantity = variant.quantity;
        item.variant = variant;
        // Update the item's payableAmount
        item.payableAmount = item.quantity * sellingPrice;
      } else {
        cart.items.splice(itemIndex, 1);
      }

      // Recalculate the total payableAmount for the cart
      const totalPayableAmount = cart.items.reduce((total, item) => total + item.payableAmount, 0);
      cart.payableAmount = totalPayableAmount;

      await cart.save();
      res.status(200).json({ success: true,   cart: {
        _id: cart._id, // Include cart ID
        user: cart.user, // Include user ID
        createdAt: cart.createdAt, // Include createdAt timestamp
        updatedAt: cart.updatedAt // Include updatedAt timestamp
      },updatedItem: item, });
    } else {
      res.status(404).json({ message: 'Item not found in cart', success: false });
    }
  } catch (error) {
    console.error('Error updating item quantity:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};


// Apply coupon to the cart
// Apply coupon to the cart
const applyCoupon = async (req, res) => {
  const { couponCode } = req.body;

  try {
    console.log('Applying coupon:', couponCode);

    // Fetch the coupon details by the coupon code
    const coupon = await CouponService.getCouponByCode(couponCode);
    if (!coupon) {
      return res.status(400).json({ message: 'Invalid or expired coupon', success: false });
    }

    // Fetch the user's cart without using populate to avoid ObjectId casting issues
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found', success: false });
    }

    // Manually fetch the product details using productId as a string
    const productIds = cart.items.map(item => item.productId);
    const products = await Product.find({ productId: { $in: productIds } });

    // Map product details to cart items
    cart.items = cart.items.map(item => {
      const product = products.find(p => p.productId === item.productId);
      if (product) {
        const productVariant = product.variants.find(v => v.variantSKU === item.variant.variantSKU);
        return {
          ...item,
          productId: product, // Attach the full product details
          variant: productVariant // Attach the variant details
        };
      }
      return item; // Return the item as is if product or variant is not found
    });

    // Check for any invalid items that might not have a valid productId or sellingPrice
    if (cart.items.some(item => !item.variant || !item.variant.sellingPrice)) {
      return res.status(400).json({ message: 'Some cart items are missing product details', success: false });
    }

    // Calculate the total price of the items in the cart using the variant sellingPrice
    const totalPrice = cart.items.reduce((sum, item) => {
      return sum + (item.variant.sellingPrice * item.quantity);
    }, 0);

    // Apply the coupon discount to the total price
    const { success, discount, message } = await CouponService.applyDiscount(
      coupon,
      cart.items.map(item => ({
        sellingPrice: item.variant.sellingPrice,
        quantity: item.quantity,
      }))
    );

    if (!success) {
      return res.status(400).json({ message, success: false });
    }

    // Calculate additional charges and the final payable amount
    const deliveryFee = 1.50; // Example delivery fee
    const handlingCharge = 10.00; // Example handling charge
    const gstRate = 0.18; // GST rate of 18%
    const gstAmount = totalPrice * gstRate; // Calculate GST amount based on total price
    const totalCost = totalPrice + deliveryFee + handlingCharge + gstAmount; // Total cost before discount
    const payableAmount = totalCost - discount; // Final payable amount after applying discount

    // Round values to two decimal places
    const roundToTwoDecimalPlaces = (number) => {
      return parseFloat(number.toFixed(2));
    };

    const roundedTotalPrice = roundToTwoDecimalPlaces(totalPrice);
    const roundedGstAmount = roundToTwoDecimalPlaces(gstAmount);
    const roundedTotalCost = roundToTwoDecimalPlaces(totalCost);
    const roundedPayableAmount = roundToTwoDecimalPlaces(payableAmount);

    // Send the response with the updated cart summary
    res.status(200).json({
      success: true,
      totalPrice: roundedTotalPrice,
      discount: roundToTwoDecimalPlaces(discount),
      deliveryFee: roundToTwoDecimalPlaces(deliveryFee),
      handlingCharge: roundToTwoDecimalPlaces(handlingCharge),
      gstAmount: roundedGstAmount,
      totalCost: roundedTotalCost,
      payableAmount: roundedPayableAmount,
    });

  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

const getCartSummary = async (req, res) => {
  const { userId, couponCode } = req.body;  // Take userId from the body

  try {
    // Fetch the user's cart using the provided userId from the body
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found', success: false });
    }

    // Manually fetch the product details using productId as a string
    const productIds = cart.items.map(item => item.productId);
    const products = await Product.find({ productId: { $in: productIds } });

    // Process cart items and check stock availability
    let totalPrice = 0;
    let invalidItems = [];

    cart.items = cart.items.map(item => {
      const product = products.find(p => p.productId === item.productId);
      if (product) {
        const productVariant = product.variants.find(v => v.variantSKU === item.variant.variantSKU);
        if (productVariant) {
          if (productVariant.quantity < item.quantity) {
            invalidItems.push({
              productId: item.productId,
              variantSKU: item.variant.variantSKU,
            });
            return null; // Mark this item as invalid
          }
          totalPrice += productVariant.sellingPrice * item.quantity;
          return {
            productId: product,
            productName: product.name,
            brandName: product.brandName,
            payableAmount: item.variant.sellingPrice * item.quantity,
            variant: {
              variantSKU: productVariant.variantSKU,
              color: productVariant.color,
              size: productVariant.size,
              sellingPrice: productVariant.sellingPrice,
              mrp: productVariant.mrp,
              quantity: item.quantity,
            },
            quantity: item.quantity
          };
        }
      }
      return null; // Mark this item as invalid
    }).filter(item => item !== null); // Remove invalid items

    // Handle invalid items
    if (invalidItems.length > 0) {
      return res.status(400).json({
        message: 'Some items in the cart have insufficient stock.',
        success: false,
        invalidItems
      });
    }

    let discount = 0;
    let discountDetails = null;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await CouponService.getCouponByCode(couponCode);
      if (!coupon) {
        return res.status(400).json({ message: 'Invalid or expired coupon', success: false });
      }

      // Apply the coupon discount based on the cart items
      const discountResult = await CouponService.applyDiscount(coupon, cart.items.map(item => ({
        ...(item.toObject()),
        sellingPrice: item.variant.sellingPrice,
        quantity: item.quantity,
      })));

      if (!discountResult.success) {
        return res.status(400).json({ message: discountResult.message, success: false });
      }

      discount = discountResult.discount;
      discountDetails = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        expirationDate: coupon.expirationDate,
      };
    }

    // Calculate additional charges and the final payable amount
    const deliveryFee = 1.50; // Static delivery fee
    const handlingCharge = 10.00; // Static handling charge
    const gstRate = 0.18; // GST rate of 18%
    const gstAmount = totalPrice * gstRate; // Calculate GST amount based on total price
    const totalCost = totalPrice + deliveryFee + handlingCharge + gstAmount; // Total cost before discount
    const payableAmount = totalCost - discount; // Final payable amount after applying discount

    // Round values to two decimal places
    const roundToTwoDecimalPlaces = (number) => {
      return parseFloat(number.toFixed(2));
    };
    const roundedTotalPrice = roundToTwoDecimalPlaces(totalPrice);
    const roundedGstAmount = roundToTwoDecimalPlaces(gstAmount);
    const roundedTotalCost = roundToTwoDecimalPlaces(totalCost);
    const roundedPayableAmount = roundToTwoDecimalPlaces(payableAmount);

    // Second Part: Calculate and update other cart values
    cart.totalPrice = roundedTotalPrice;
    cart.discount = roundToTwoDecimalPlaces(discount);
    cart.discountDetails = discountDetails;
    cart.deliveryFee = roundToTwoDecimalPlaces(deliveryFee);
    cart.handlingCharge = roundToTwoDecimalPlaces(handlingCharge);
    cart.gstAmount = roundedGstAmount;
    cart.totalCost = roundedTotalCost;
    cart.payableAmount = roundedPayableAmount;

    // Save the updated cart (both items and calculated values) to the database
    for (item of cart.items){
       item.productId = item.productId.productId
    }
    await cart.save();

    // Send the response with the cart summary
    res.status(200).json({
      success: true,
      totalPrice: roundedTotalPrice,
      discount: roundToTwoDecimalPlaces(discount),
      discountDetails,
      deliveryFee: roundToTwoDecimalPlaces(deliveryFee),
      handlingCharge: roundToTwoDecimalPlaces(handlingCharge),
      gstAmount: roundedGstAmount,
      totalCost: roundedTotalCost,
      payableAmount: roundedPayableAmount,
      items: cart.items,
    });
  } catch (error) {
    console.error('Error getting cart summary:', error);
    res.status(500).json({ message: 'Server error', success: false });
  }
};


module.exports = {
  createOrRetrieveCart,
  addItemToCart,
  removeItemFromCart,
  updateItemQuantity,
  getCartSummary,
  applyCoupon
};



// if (productVariant.quantity < cartItem.quantity) {
//   throw new Error(
//     `Insufficient stock for product ${cartItem.productId} variant ${cartItem.variant.variantSKU}`
//   );
// }

//     // Second Part: Calculate and update other cart values
// cart.totalPrice = roundedTotalPrice;
// cart.discount = roundToTwoDecimalPlaces(discount);
// cart.discountDetails = discountDetails;
// cart.deliveryFee = roundToTwoDecimalPlaces(deliveryFee);
// cart.handlingCharge = roundToTwoDecimalPlaces(handlingCharge);
// cart.gstAmount = roundedGstAmount;
// cart.totalCost = roundedTotalCost;
// cart.payableAmount = roundedPayableAmount;

// // Save the updated cart (both items and calculated values) to the database
// await cart.save();