const axios = require('axios');
const Webhook = require('../model/webhookModel');

// Notify all webhooks about an event
const notifyWebhooks = async (event, payload) => {
  try {
    // Find all webhooks listening to the specific event
    const webhooks = await Webhook.find({ events: event });

    // Notify each webhook endpoint
    await Promise.all(webhooks.map(async (webhook) => {
      try {
        await axios.post(webhook.url, {
          event,
          data: payload
        });
      } catch (err) {
        console.error(`Failed to notify webhook ${webhook.url}:`, err);
      }
    }));
  } catch (err) {
    console.error('Error notifying webhooks:', err);
  }
};

module.exports = {
  notifyWebhooks
};
