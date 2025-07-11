const axios = require('axios');
const Webhook = require('../model/webhookModel');

async function notifyWebhooks(event, data) {
    // Check if event and data are provided
    if (!event || !data) {
        console.error('Event and data are required to notify webhooks.');
        return;
    }

    // Retrieve all registered webhooks for the specific event
    const webhooks = await Webhook.find({ events: event });

    for (const webhook of webhooks) {
        const payload = {
            event, // The event type (e.g., 'OrderCreated')
            data,  // The data related to the event (e.g., order ID)
        };

        try {
            const response = await axios.post(webhook.url, payload);
            console.log(`Webhook sent successfully: ${response.status} ${response.statusText}`);
            // Optionally update the status of the webhook in your database
            webhook.status = 'processed';
            await webhook.save();
        } catch (error) {
            console.error(`Failed to send webhook: ${error.message}`);
            webhook.status = 'failed';
            await webhook.save();
        }
    }
}

module.exports = {
    notifyWebhooks,
};
