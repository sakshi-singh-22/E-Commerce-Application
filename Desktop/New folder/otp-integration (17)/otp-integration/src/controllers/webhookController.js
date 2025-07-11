const axios = require('axios');

const eventWebhookMap = {
    "order.created": process.env.ORDER_CREATED_WEBHOOK_URL || "http://localhost:3001/webhook/orderCreated",
    "order.updated": process.env.ORDER_UPDATED_WEBHOOK_URL || "http://localhost:3001/webhook/orderUpdated",
    "vendor.order.created": process.env.VENDOR_ORDER_CREATED_WEBHOOK_URL || "http://localhost:3001/webhook/vendorOrderCreated",
};

const triggerWebhook = async (req, res) => {
    const { eventName, data } = req.body;

    if (!eventName || !data) {
        return res.status(400).json({ message: "Event name and data are required" });
    }

    const webhookUrl = eventWebhookMap[eventName];
    if (!webhookUrl) {
        return res.status(400).json({ message: "Unknown event name" });
    }

    try {
        const response = await axios.post(webhookUrl, data);
        res.status(200).json({
            message: "Webhook triggered successfully",
            response: response.data,
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to trigger webhook",
            error: error.message,
        });
    }
};

module.exports = { triggerWebhook };
