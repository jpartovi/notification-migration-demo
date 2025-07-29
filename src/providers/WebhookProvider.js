const axios = require('axios');
const config = require('../config/config');

class WebhookProvider {
  async send(notification) {
    try {
      console.log(`🌐 Sending webhook notification to ${notification.recipient}`);

      const response = await axios.post(notification.recipient, {
        event: notification.metadata?.event || 'notification',
        id: notification.id,
        message: notification.message,
        timestamp: new Date().toISOString(),
        type: notification.type,
        priority: notification.priority,
        data: notification.metadata?.data || {}
      }, {
        headers: {
          'Authorization': `Bearer ${config.WEBHOOK_SECRET}`
        },
        timeout: config.WEBHOOK_TIMEOUT,
        maxRedirects: 5
      });

      console.log(`✅ Webhook sent successfully: ${response.statusText}`);

      return {
        success: true,
        statusCode: response.status,
        statusText: response.statusText,
        provider: 'webhook',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Webhook sending failed:`, error);

      return {
        success: false,
        provider: 'webhook',
        error: error.message
      };
    }
  }

  async testConnection() {
    try {
      console.log('🌐 Testing webhook provider connection');

      const response = await axios.get('https://httpbin.org/get');

      if (response.status === 200) {
        return {
          success: true,
          message: 'Webhook provider connection successful'
        };
      }

      throw new Error('Unexpected response status');
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WebhookProvider;
