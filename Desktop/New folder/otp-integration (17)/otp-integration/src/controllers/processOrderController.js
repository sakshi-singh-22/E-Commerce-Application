// File: src/controllers/processOrder.js

const checkout = require('../controllers/checkoutController');
const createOrder = require('../controllers/orderController');

const processOrder = async (req, res) => {
  try {
    const { orderData } = await checkout(req, res);
    const order = await createOrder(orderData);

    res.status(200).json({
      success: true,
      orderId: order._id,
      message: 'Order created successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing order', success: false });
  }
};

module.exports = processOrder;
