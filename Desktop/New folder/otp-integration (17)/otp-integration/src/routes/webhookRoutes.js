const express = require('express');
const { triggerWebhook } = require('../controllers/webhookController');
const router = express.Router();
const { createVendorOrders } = require('../controllers/vendorOrderController');

// Route for triggering the webhook
router.post('/trigger-webhook', triggerWebhook);

// This route will respond to the order created event
router.post('/orderCreated', async(req, res) => {
    try{
        console.log(req.body);
    const result = await createVendorOrders({ params: { orderId: req.body.orderId } }, res);
    console.log(result.message);
    console.log('Order created webhook received:', req.body);
    res.status(200).json({ message: 'Order created webhook received' });
} catch (error) {
            console.error('Error processing webhook:', error);
            return res.status(500).send({ message: 'Error processing webhook' });
        }
    
});

module.exports = router;


// const express = require('express');
// const router = express.Router();
// const webhookController = require('../controllers/webhookController');

// // Route to handle vendor notifications from webhook
// router.post('/vendor-notify', webhookController.createVendorOrderFromWebhook);

// // Route to handle order confirmation webhook
// router.post('/vendor-notify/order-status-update', webhookController.updateOrderStatusWebhook);

// module.exports = router;




// const express = require('express');
// const router = express.Router();
// const webhookController = require('../controllers/webhookController');

// // Route to register new webhooks
// router.post("/register", webhookController.registerWebhook);

// // Route to handle vendor notifications, e.g., OrderCreated event
// router.post('/vendor-notify', async (req, res) => {
//     const { event, data } = req.body;

//     if (!event || !data || !data.orderId) {
//         return res.status(400).send({ message: 'Event, data, and orderId are required.' });
//     }

//     try {
//         if (event === 'OrderCreated') {
//             const result = await webhookController.createVendorOrderFromWebhook(data.orderId);
//             console.log(result.message);
//             return res.status(200).send('Webhook processed successfully');
//         }
//         return res.status(400).send({ message: 'Unhandled event type.' });
//     } catch (error) {
//         console.error('Error processing webhook:', error);
//         return res.status(500).send({ message: 'Error processing webhook' });
//     }
// });

// // Route to handle order status update notifications within vendor-notify
// router.post('/vendor-notify/order-status-update', webhookController.updateOrderStatusWebhook);

// module.exports = router;
