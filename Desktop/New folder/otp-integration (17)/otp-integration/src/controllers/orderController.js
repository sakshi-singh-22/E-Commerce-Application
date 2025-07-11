const mongoose = require("mongoose");
const Cart = require("../model/cartModel");
const User = require("../model/authmodel");
const Product = require("../model/productmodel");
const CouponService = require("../services/couponService"); // Adjust path as necessary
const Checkout = require("../model/checkoutModel");
const Order = require("../model/orderModel");
const Location = require("../model/locationModel");
const Invoice = require("../model/invoiceModel");
const Vendor = require("../model/vendorModel");
const Trip = require("../model/tripModel.js");
const Driver = require("../model/driverModel");
const axios = require('axios'); // Make sure axios is imported here
const {
  distanceCalWithWaypoints,
  distanceCal,
} = require("../utils/locationUtils.js");
const { notifyWebhooks } = require('../utils/webhookNotifier'); 
// Get All Locations
const getAllLocations = async (req, res) => {
  const { userId } = req.body; // Extract userId from the request body

  try {
    // Validate userId
    if (!userId) {
      return res
        .status(400)
        .json({ message: "User ID is required", success: false });
    }

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // Map user's locations and include locationId and other details
    const locationsWithIds = user.location.map((loc) => ({
      locationId: loc._id.toString(),
      geoCoordes: loc.geoCoordes,
      address: loc.address,
      placeName: loc.placeName,
    }));

    // Return response with locations
    res.status(200).json({
      success: true,
      locations: locationsWithIds,
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ message: "Server error", success: false });
  }
};

// Get All Payment Methods
// Get All Payment Methods
const getAllPaymentMethods = (req, res) => {
  const paymentMethods = [
    "UPI (Paytm, Google Pay)",
    "Cash on Delivery (COD)",
    "Card (Credit/Debit)",
  ];

  res.status(200).json({
    success: true,
    paymentMethods,
  });
};

const createOrder = async (req, res) => {
  const { cartId, locationId, paymentMethod, couponCode } = req.body;

  if (!cartId || !locationId || !paymentMethod) {
    return res.status(400).json({
      message: "Cart ID, location ID, and payment method are required",
    });
  }
  let session;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    // Fetch cart
    const cart = await Cart.findById(cartId).session(session);
    if (!cart) {
      throw new Error("Cart not found");
    }

    if (cart.items.length === 0) {
      throw new Error("Cannot place an order with an empty cart");
    }

    // Fetch user and location
    const user = await User.findById(cart.user).session(session);
    if (!user) {
      throw new Error("User not found");
    }

    const location = user.location.id(locationId);
    if (!location) {
      throw new Error("Location not found");
    }


    // Fetch product details and calculate item details
    const items = await Promise.all(
      cart.items.map(async (cartItem) => {
        const product = await Product.findOne({
          productId: cartItem.productId,
        }).session(session);
        if (!product) {
          throw new Error(`Product with ID ${cartItem.productId} not found`);
        }

        const productVariant = product.variants.find(
          (v) => v.variantSKU === cartItem.variant.variantSKU
        );
        if (!productVariant) {
          throw new Error(
            `Variant with SKU ${cartItem.variant.variantSKU} not found`
          );
        }

        if (productVariant.quantity < cartItem.quantity) {
          throw new Error(
            `Insufficient stock for product ${cartItem.productId} variant ${cartItem.variant.variantSKU}`
          );
        }

        const vendor = await Vendor.findById(product.vendorId).session(session);
        if (!vendor) {
          throw new Error(`Vendor for product ${cartItem.productId} not found`);
        }

        productVariant.quantity -= cartItem.quantity;
        await product.save({ session });

        return {
          productId: cartItem.productId,
          productName: product.name,
          brandName: product.brandName,
          productDescription: product.description,
          quantity: cartItem.quantity,
          variant: {
            variantSKU: cartItem.variant.variantSKU,
            color: productVariant.color,
            size: productVariant.size,
            sellingPrice: productVariant.sellingPrice,
            mrp: productVariant.mrp,
          },
          sellingPrice: productVariant.sellingPrice,
          totalPrice: productVariant.sellingPrice * cartItem.quantity,
          vendor: {
            vendorId: vendor._id,
            vendorName: vendor.name,
            vendorContact: {
              phone: vendor.number,
              email: vendor.email || "NA",
            },
            vendorLocation: vendor.location.address || "NA",
          },
        };
      })
    );

    // Calculate prices, discounts, and total costs
    let totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);
    let discount = 0;
    let discountDetails = null;

    if (couponCode) {
      const coupon = await CouponService.getCouponByCode(couponCode);
      if (!coupon) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Invalid or expired coupon" });
      }

      const discountResult = await CouponService.applyDiscount(
        coupon,
        items.map((item) => ({
          sellingPrice: item.sellingPrice,
          quantity: item.quantity,
        }))
      );

      if (!discountResult.success) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: discountResult.message, success: false });
      }

      discount = discountResult.discount;
      discountDetails = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        expirationDate: coupon.expirationDate,
      };
    }

    const deliveryFee = 1.5;
    const handlingCharge = 10.0;
    const gstRate = 0.18;
    const gstAmount = totalPrice * gstRate;
    const totalCost = totalPrice + deliveryFee + handlingCharge + gstAmount;
    const payableAmount = totalCost - discount;

    const roundToTwoDecimalPlaces = (number) => parseFloat(number.toFixed(2));

    // Create new order
    const newOrder = new Order({
      user: user._id,
      userDetails: {
        name: user.name,
        contact: {
          phone: user.phoneNumber,
          email: user.email,
        },
        deliveryAddress: {
          address: location.address,
          placeName: location.placeName,
          geoCoordinates: {
            latitude: location.geoCoordes.coordinates[1],
            longitude: location.geoCoordes.coordinates[0],
          },
        },
      },
      items,
      totalAmount: roundToTwoDecimalPlaces(totalPrice),
      discount: roundToTwoDecimalPlaces(discount),
      discountDetails,
      deliveryFee: roundToTwoDecimalPlaces(deliveryFee),
      handlingCharge: roundToTwoDecimalPlaces(handlingCharge),
      gstAmount: roundToTwoDecimalPlaces(gstAmount),
      totalCost: roundToTwoDecimalPlaces(totalCost),
      payableAmount: roundToTwoDecimalPlaces(payableAmount),
      paymentMethod,
      location: {
        geoCoordes: location.geoCoordes,
        address: location.address,
        placeName: location.placeName,
      },
      status: "Pending",
    });

    const savedOrder = await newOrder.save({ session });

    console.log('Order saved successfully:', savedOrder._id);

    // Clear the cart
    await Cart.findByIdAndUpdate(
      cartId,
      { $set: { items: [], payableAmount: 0 } },
      { session }
    );

    await session.commitTransaction();
   // session.endSession();

    const userDetails = {
      id: user._id,
      name: user.name,
      contact: {
        phone: user.phoneNumber,
        email: user.email,
      },
      deliveryAddress: {
        address: location.address,
        placeName: location.placeName,
        geoCoordinates: {
          latitude: location.geoCoordes.coordinates[1],
          longitude: location.geoCoordes.coordinates[0],
        },
      },
    };
        // Trigger webhook for order creation
        const webhookUrl = `${process.env.WEBHOOK_URL}/trigger-webhook`;
        console.log('Webhook URL:', webhookUrl);

        await axios.post(webhookUrl, {
            eventName: "order.created",
            data: { orderId: savedOrder._id },
        });
        console.log("Webhook triggered successfully.");

        await session.commitTransaction();
        res.status(201).json({ message: "Order created successfully", order: savedOrder });
    } catch (error) {
        console.error("Order creation failed:", error.message);
        if (session.inTransaction()) {
                await session.abortTransaction();
              }
              session.endSession();
              res.status(500).json({ message: "Order creation failed", error: error.message });
            } finally {
              if (session) {
                session.endSession();
              }
            }
          };

//    // Trigger webhook to create vendor orders
//    console.log(`Triggering webhook for order ID: ${savedOrder._id}`);
//    console.log('Webhook URL:', `${process.env.WEBHOOK_URL}`);

//    const webhookResponse = await axios.post(`${process.env.WEBHOOK_URL}`, {
//      event: 'OrderCreated', // Ensure this is included
//      data: {
//         orderId: savedOrder._id, // Ensure orderId is a string
//      },
//    });

//    console.log("Webhook triggered successfully:", webhookResponse.data);

//    res.status(201).json({
//      message: "Order created successfully",
//      order: {
//        ...savedOrder.toObject(),
//        user: userDetails,
//      },
//    });
//  } catch (error) {
//    console.error("Order creation failed:", error.message);
   
//    // Log the error response if it's an Axios error
//    if (error.response) {
//      console.log('Error Response Data:', error.response.data);
//      console.log('Error Status Code:', error.response.status);
//      console.log('Error Headers:', error.response.headers);
//    }


//     if (session.inTransaction()) {
//       await session.abortTransaction();
//     }
//     session.endSession();
//     res.status(500).json({ message: "Order creation failed", error: error.message });
//   } finally {
//     if (session) {
//       session.endSession();
//     }
//   }
// };

// Update Order Status
const updateOrderStatus = async (req, res) => {
  const { orderId, status } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({ message: "Order ID and status are required" });
  }

  const session = await mongoose.startSession();
  try {
    await session.startTransaction();

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Order not found" });
    }

    const validStatuses = [
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Assigned",
    ];

    if (!validStatuses.includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid status" });
    }

    if (status === "Confirmed") {
      if (!order.items || order.items.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({ message: "No items available to confirm" });
      }

      let finalItemArray = [];
      for (const finalItem of order.items) {
        if (finalItem.vendorOrderStatus === "Accepted By Vendor") {
          finalItemArray.push(finalItem);
        }
      }

      if (finalItemArray.length > 0) {
        order.finalItems = finalItemArray;

        const totalPrice = order.finalItems.reduce((sum, item) => sum + item.totalPrice, 0);
        let discount = 0;

        if (order.discountDetails) {
          const coupon = await CouponService.getCouponByCode(order.discountDetails.code);
          if (coupon) {
            const discountResult = await CouponService.applyDiscount(
              coupon,
              finalItemArray.map((item) => ({
                sellingPrice: item.sellingPrice,
                quantity: item.quantity,
              }))
            );
            if (discountResult.success) {
              discount = discountResult.discount;
            }
          }
        }

        const deliveryFee = 1.5;
        const handlingCharge = 10.0;
        const gstRate = 0.18;
        const gstAmount = totalPrice * gstRate;
        const totalCost = totalPrice + deliveryFee + handlingCharge + gstAmount;
        const payableAmount = totalCost - discount;

        const roundToTwoDecimalPlaces = (number) => parseFloat(number.toFixed(2));

        order.totalAmount = roundToTwoDecimalPlaces(totalPrice);
        order.discount = roundToTwoDecimalPlaces(discount);
        order.deliveryFee = roundToTwoDecimalPlaces(deliveryFee);
        order.handlingCharge = roundToTwoDecimalPlaces(handlingCharge);
        order.gstAmount = roundToTwoDecimalPlaces(gstAmount);
        order.totalCost = roundToTwoDecimalPlaces(totalCost);
        order.payableAmount = roundToTwoDecimalPlaces(payableAmount);

        const invoiceData = {
          orderId: order._id,
          customerName: order.userDetails.name,
          deliveryAddress: order.userDetails.deliveryAddress.address,
          contactInfo: {
            phone: order.userDetails.contact.phone,
            email: order.userDetails.contact.email,
          },
          products: order.finalItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productDescription: item.productDescription,
            quantity: item.quantity,
            unitPrice: item.sellingPrice,
            discount: 0,
            productTotal: item.totalPrice,
            vendorName: item.vendor.vendorName,
            vendorId: item.vendor.vendorId,
            vendorLocation: item.vendor.vendorLocation,
            vendorContact: item.vendor.vendorContact,
          })),
          taxDetails: gstAmount,
          deliveryCharges: deliveryFee,
          subtotal: totalPrice,
          totalAmount: payableAmount,
          paymentMethod: order.paymentMethod,
        };

        const invoice = new Invoice(invoiceData);
        await invoice.save({ session });

        try {
          await updateStockUtil(order, session);
        } catch (error) {
          console.error("while updating order status, Error updating stock:", error);
          await session.abortTransaction();
          return res.status(500).json({
            message: "while updating order status, Failed to update stock",
            error: error.message,
          });
        }
      } else {
        await cancelOrderUtil(order, session);
        order.status = "Cancelled";
        order.statusHistory.push({ status: "Cancelled", updatedAt: new Date() });
        await order.save({ session });
        await session.commitTransaction();
        return res.status(400).json({ message: "No final Items, Order is cancelled", success: false });
      }

      order.status = status; 
      order.statusHistory.push({ status, updatedAt: new Date() });
      await order.save({ session });

    } else {
      order.status = status;
      order.statusHistory.push({ status, updatedAt: new Date() });
      await order.save({ session });
    }

    await session.commitTransaction(); // Commit after all updates

    // Call the webhook after committing the transaction
    if (status === "Confirmed") {
      try {
        console.log('Webhook URL:', `${process.env.WEBHOOK_URL}/order-status-update`);
        await axios.post(`${process.env.WEBHOOK_URL}/order-status-update`, {
          orderId: order._id,
          status: 'Confirmed',
        });
        console.log("Webhook called successfully for order status update.");
      } catch (error) {
        console.error("Error calling webhook to assign order:", error.message);
        if (error.response) {
          console.log('Error Response Data:', error.response.data);
          console.log('Error Status Code:', error.response.status);
          console.log('Error Headers:', error.response.headers);
        }
        return res.status(500).json({
          message: "Order status updated but failed to notify webhook for assigning order",
          error: error.message,
        });
      }
    }

    return res.status(200).json({ message: "Order status updated successfully", order });

  } catch (error) {
    console.error("Error updating order status:", error.message);
    await session.abortTransaction();
    return res.status(500).json({
      message: "Failed to update order status",
      error: error.message,
    });
  } finally {
    session.endSession(); // End the session
  }
};


const updateStockUtil = async (order, session) => {
  try {
      await Promise.all(
          order.items.map(async (item) => {
              if (item.vendorOrderStatus === 'Rejected By Vendor' ){
                  const product = await Product.findOne({ productId: item.productId, vendorId: item.vendor.vendorId }).session(session);
                  if (!product) {
                      throw new Error(`Product with ID ${item.productId} not found`);
                  }

                  // Find the specific variant and update quantity
                  const productVariant = product.variants.find((v) => v.variantSKU === item.variant.variantSKU);
                  if (!productVariant) {
                      throw new Error(`Variant with SKU ${item.variant.variantSKU} not found`);
                  }

                  // Restore stock
                  productVariant.quantity += item.quantity;
                  await product.save({ session }); // Save product changes within the transaction
              }      
          })
      );
    
  } catch (error) {
      throw error;
  } 
};

const cancelOrderUtil = async (order, session) => {
  try {
      await Promise.all(
        order.items.map(async (item) => {  
              const product = await Product.findOne({ productId: item.productId, vendorId: item.vendor.vendorId }).session(session);
              if (!product) {
                  throw new Error(`Product with ID ${item.productId} not found`);
              }

              // Find the specific variant and update quantity
              const productVariant = product.variants.find((v) => v.variantSKU === item.variant.variantSKU);
              if (!productVariant) {
                  throw new Error(`Variant with SKU ${item.variant.variantSKU} not found`);
              }

              // Restore stock
              productVariant.quantity += item.quantity;
              await product.save({ session }); // Save product changes within the transaction
          })
      );
  } catch (error) {
      throw error;
  } 
};

// Cancel Order (User-Only Version)
const cancelOrder = async (req, res) => {
  const { orderId } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction(); // Start a transaction session

  try {
    // Fetch the order based on orderId
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction(); // Abort the transaction
      session.endSession(); // End the session
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if the order is in a cancellable status
    const cancellableStatuses = ["Pending"];
    const nonCancellableStatuses = ["Confirmed", "Shipped", "Delivered", "Cancelled", "Assigned"];

    if (cancellableStatuses.includes(order.status)) {
      // Proceed with cancellation
      await Promise.all(
        order.items.map(async (item) => {
          const product = await Product.findOne({ productId: item.productId }).session(session);
          if (!product) {
            throw new Error(`Product with ID ${item.productId} not found`);
          }

          // Find the specific variant and update quantity
          const productVariant = product.variants.find((v) => v.variantSKU === item.variant.variantSKU);
          if (!productVariant) {
            throw new Error(`Variant with SKU ${item.variant.variantSKU} not found`);
          }

          productVariant.quantity += item.quantity; // Restore stock
          await product.save({ session }); // Save product changes within the transaction
        })
      );

      // Mark the order as canceled
      order.status = "Cancelled";
      await order.save({ session });

      await session.commitTransaction(); // Commit the transaction
      session.endSession(); // End the session

      return res.status(200).json({ message: "Order canceled successfully", order });
    }

    // If the status is non-cancellable
    if (nonCancellableStatuses.includes(order.status)) {
      await session.abortTransaction(); // Abort the transaction
      session.endSession(); // End the session
      return res.status(400).json({ message: "Order cannot be canceled at this stage" });
    }

  } catch (error) {
    await session.abortTransaction(); // Abort the transaction in case of an error
    session.endSession(); // End the session
    console.error("Error canceling order:", error.message);
    res.status(500).json({ message: "Failed to cancel order", error: error.message });
  }
};


// Cancel Order
const cancelOrderByAdmin = async (req, res) => {
  const { orderId } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction(); // Start a transaction session

  try {
    // Fetch the order based on orderId
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction(); // Abort the transaction
      session.endSession(); // End the session
      return res.status(404).json({ message: "Order not found" });
    }
    
    const pendingStatus = ["Pending"];
    const otherStatuses = ["Confirmed", "Shipped", "Delivered", "Cancelled", "Assigned"];
 
    if ( pendingStatus.includes(order.status) ) {
         // Fetch product details and update stock
        await Promise.all(
          order.items.map(async (item) => {
            const product = await Product.findOne({
              productId: item.productId,
            }).session(session);
            if (!product) {
              throw new Error(`Product with ID ${item.productId} not found`);
            }

            // Find the specific variant and update quantity
            const productVariant = product.variants.find(
              (v) => v.variantSKU === item.variant.variantSKU
            );
            if (!productVariant) {
              throw new Error(
                `Variant with SKU ${item.variant.variantSKU} not found`
              );
            }

            productVariant.quantity += item.quantity; // Restore stock
            await product.save({ session }); // Save product changes within the transaction
          })
        );
    }

    if ( otherStatuses.includes(order.status) ) {    
        // Fetch product details and update stock
        await Promise.all(
          order.finalItems.map(async (item) => {
            const product = await Product.findOne({
              productId: item.productId,
            }).session(session);
            if (!product) {
              throw new Error(`Product with ID ${item.productId} not found`);
            }

            // Find the specific variant and update quantity
            const productVariant = product.variants.find(
              (v) => v.variantSKU === item.variant.variantSKU
            );
            if (!productVariant) {
              throw new Error(
                `Variant with SKU ${item.variant.variantSKU} not found`
              );
            }

            productVariant.quantity += item.quantity; // Restore stock
            await product.save({ session }); // Save product changes within the transaction
          })
        );
    } 
   
    // Mark the order as canceled
    order.status = "Cancelled";
    await order.save({ session });

    await session.commitTransaction(); // Commit the transaction
    session.endSession(); // End the session

    res.status(200).json({ message: "Order canceled successfully", order });
  } catch (error) {
    await session.abortTransaction(); // Abort the transaction in case of an error
    session.endSession(); // End the session
    console.error("Error canceling order:", error.message);
    res
      .status(500)
      .json({ message: "Failed to cancel order", error: error.message });
  }
};

// Get Order History
const getOrderHistory = async (req, res) => {
  const { userId } = req.body; // Extract userId from the request body

  try {
    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Find orders by user ID and populate product details
    const orders = await Order.find({ user: userId })
      .populate("items.productId") // Populate product details
      .sort({ createdAt: -1 }); // Sort by latest first

    // Send the order history
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching order history:", error);
    res.status(500).json({ message: "Failed to fetch order history" });
  }
};

// Reorder
const reOrder = async (req, res) => {
  const { orderId } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction(); // Start a transaction session

  try {
    // Fetch the order to be reordered
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction(); // Abort the transaction
      session.endSession(); // End the session
      return res.status(404).json({ message: "Order not found" });
    }

    // Fetch product details and create new cart items
    const cartItems = await Promise.all(
      order.items.map(async (item) => {
        const product = await Product.findOne({
          productId: item.productId,
        }).session(session);
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // Find the specific variant and check availability
        const productVariant = product.variants.find(
          (v) => v.variantSKU === item.variant.variantSKU
        );
        if (!productVariant) {
          throw new Error(
            `Variant with SKU ${item.variant.variantSKU} not found`
          );
        }

        // Calculate the payable amount based on the variant's selling price
        const payableAmount = productVariant.sellingPrice * item.quantity;

        return {
          productId: item.productId,
          quantity: item.quantity,
          payableAmount,
          variant: {
            color: productVariant.color,
            size: productVariant.size,
            variantSKU: productVariant.variantSKU,
            sellingPrice: productVariant.sellingPrice,
            mrp: productVariant.mrp,
            quantity: item.quantity,
          },
        };
      })
    );

    // Calculate total payable amount
    const totalPayableAmount = cartItems.reduce(
      (acc, item) => acc + item.payableAmount,
      0
    );

    // Check if a cart already exists for this user
    let existingCart = await Cart.findOne({ user: order.user }).session(
      session
    );

    if (existingCart) {
      // Update the existing cart with new items and payable amount
      existingCart.items = cartItems;
      existingCart.payableAmount = totalPayableAmount;
      existingCart.paymentMethod = order.paymentMethod;
      existingCart.status = "Pending";
      await existingCart.save({ session });
    } else {
      // Create a new cart if none exists
      existingCart = new Cart({
        user: order.user,
        items: cartItems,
        payableAmount: totalPayableAmount,
        paymentMethod: order.paymentMethod,
        status: "Pending",
      });
      await existingCart.save({ session });
    }

    await session.commitTransaction(); // Commit the transaction
    session.endSession(); // End the session

    // Respond with the new or updated cart
    res.status(201).json({
      message: "Cart created/updated successfully",
      cart: existingCart,
    });
  } catch (error) {
    await session.abortTransaction(); // Abort the transaction in case of an error
    session.endSession(); // End the session
    console.error("Error reordering:", error);
    res
      .status(500)
      .json({ message: "Failed to reorder", error: error.message });
  }
};

const getDeliveryTimeEstimation = async (req, res) => {
  const { userId, orderId } = req.body
  
  try {

      const order = await Order.findById( orderId);
      if(!order){
        return res.status(404).send({ message: " Order is not found" })
      }
      if (!order.user.equals(userId)) {
        return res.status(403).json({
          message: "You do not have permission to access this order. The provided userId does not match the order's userId."
        });
      }
      
      const trip =  await Trip.findOne({orderId: orderId})
      if (!trip) {
        return res.status(404).json({ message: "Order's trip not found" });
      }
      
      const driver = await Driver.findById(trip.driver);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      if(order.status === "Assigned"){
        const driverCurrLoc = { 
          latitude: driver.currentLocation.coordinates[1], 
          longitude : driver.currentLocation.coordinates[0]
        }
        
        const vendorWayspoints = trip.pickupLocations.map(loc => ({ 
          latitude: loc.geoCoordinates.coordinates[1] ,
          longitude: loc.geoCoordinates.coordinates[0]
        }))
        
        const deliveryLoc = { 
          latitude :order.location.geoCoordes.coordinates[1], 
          longitude :order.location.geoCoordes.coordinates[0] 
        }
        const data = {
            origin: driverCurrLoc,
            destination: deliveryLoc,
            waypoints: vendorWayspoints
        };
        
        const responseData = await distanceCalWithWaypoints(data);
  
        return res.status(201).json({ orderStatus: order.status, data: responseData });
      }

      if (order.status === "Shipped") {
        const driverCurrLoc = { 
          latitude: driver.currentLocation.coordinates[1], 
          longitude : driver.currentLocation.coordinates[0]
        }
        const deliveryLoc = { 
          latitude :order.location.geoCoordes.coordinates[1], 
          longitude :order.location.geoCoordes.coordinates[0] 
        }
  
        const data = {
            origin: driverCurrLoc,
            destination: deliveryLoc,
        };
  
        const responseData = await distanceCal(data);
  
       return res.status(201).json({ orderStatus: order.status, data: responseData });
      }

      if (order.status === "Delivered") {
        return res.status(201).json({ orderStatus: order.status, message: `orderId - ${orderId} is delivered` });
      }

      if (order.status === "Cancelled") {
        return res.status(201).json({ orderStatus: order.status, message: `orderId - ${orderId} is Cancelled` });
      }

    return res.status(400).json({ message: "Invalid order status" });
     
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
};

const checkOrderItemsStatus = async (orderId) => {
  const order = await Order.findById(orderId);

  const allItemsUpdated = order.items.every(item => 
    item.vendorOrderStatus === 'Accepted By Vendor' || 
    item.vendorOrderStatus === 'Rejected By Vendor'
  );

  if (allItemsUpdated) {
    order.orderUpdated = true;
    await order.save();
  }
};

// Call this function from wherever you're updating the vendor order status


module.exports = {
  getAllLocations,
  getAllPaymentMethods,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderHistory,
  reOrder,
  getDeliveryTimeEstimation,
};