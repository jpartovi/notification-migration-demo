#!/usr/bin/env node

/**
 * Test client for the notification service
 * This demonstrates how to interact with the notification API
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

class NotificationTestClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async healthCheck() {
    try {
      console.log('🔍 Checking service health...');
      const response = await this.client.get('/health');
      console.log('✅ Service is healthy:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      throw error;
    }
  }

  async sendEmailNotification() {
    try {
      console.log('📧 Sending email notification...');
      const response = await this.client.post('/api/notifications/send', {
        recipient: 'user@example.com',
        message: 'This is a test email notification from the demo service!',
        type: 'email',
        priority: 'normal',
        metadata: {
          subject: 'Test Notification',
          title: 'Welcome!',
          buttonText: 'View Details',
          buttonUrl: 'https://example.com/details'
        }
      });
      console.log('✅ Email notification sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Email notification failed:', error.message);
      throw error;
    }
  }

  async sendSMSNotification() {
    try {
      console.log('📱 Sending SMS notification...');
      const response = await this.client.post('/api/notifications/send', {
        recipient: '+1555123456',
        message: 'Hello! This is a test SMS from the notification service.',
        type: 'sms',
        priority: 'high',
        metadata: {
          includeSignature: true
        }
      });
      console.log('✅ SMS notification sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ SMS notification failed:', error.message);
      throw error;
    }
  }

  async sendPushNotification() {
    try {
      console.log('📲 Sending push notification...');
      const response = await this.client.post('/api/notifications/send', {
        recipient: 'device_token_here',
        message: 'You have a new update available!',
        type: 'push',
        priority: 'normal',
        metadata: {
          title: 'App Update',
          data: {
            updateVersion: '1.2.0',
            releaseNotes: 'Bug fixes and improvements'
          }
        }
      });
      console.log('✅ Push notification sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Push notification failed:', error.message);
      throw error;
    }
  }

  async sendWebhookNotification() {
    try {
      console.log('🌐 Sending webhook notification...');
      const response = await this.client.post('/api/notifications/send', {
        recipient: 'https://webhook.site/test-endpoint',
        message: 'This is a webhook notification test',
        type: 'webhook',
        priority: 'normal',
        metadata: {
          event: 'user.signup',
          data: {
            userId: '12345',
            email: 'user@example.com',
            timestamp: new Date().toISOString()
          }
        }
      });
      console.log('✅ Webhook notification sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Webhook notification failed:', error.message);
      throw error;
    }
  }

  async sendBulkNotifications() {
    try {
      console.log('📦 Sending bulk notifications...');
      const notifications = [
        {
          recipient: 'user1@example.com',
          message: 'Welcome to our service!',
          type: 'email',
          priority: 'normal'
        },
        {
          recipient: '+1555123456',
          message: 'Your account has been created successfully.',
          type: 'sms',
          priority: 'normal'
        },
        {
          recipient: 'device_token_1',
          message: 'Welcome! Enable notifications to stay updated.',
          type: 'push',
          priority: 'low'
        }
      ];

      const response = await this.client.post('/api/notifications/bulk-send', {
        notifications
      });
      console.log('✅ Bulk notifications sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Bulk notifications failed:', error.message);
      throw error;
    }
  }

  async getNotificationStatus(notificationId) {
    try {
      console.log(`🔍 Checking status for notification ${notificationId}...`);
      const response = await this.client.get(`/api/notifications/${notificationId}/status`);
      console.log('📊 Notification status:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      throw error;
    }
  }

  async getNotificationHistory() {
    try {
      console.log('📚 Fetching notification history...');
      const response = await this.client.get('/api/notifications/history', {
        params: {
          limit: 10,
          offset: 0
        }
      });
      console.log('📋 Recent notifications:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ History fetch failed:', error.message);
      throw error;
    }
  }

  async runFullDemo() {
    console.log('🚀 Starting notification service demo...\n');

    try {
      // Health check
      await this.healthCheck();
      console.log('');

      // Send different types of notifications
      const emailResult = await this.sendEmailNotification();
      console.log('');

      const smsResult = await this.sendSMSNotification();
      console.log('');

      const pushResult = await this.sendPushNotification();
      console.log('');

      const webhookResult = await this.sendWebhookNotification();
      console.log('');

      // Send bulk notifications
      await this.sendBulkNotifications();
      console.log('');

      // Wait a bit for processing
      console.log('⏳ Waiting for notifications to process...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('');

      // Check status of first notification
      if (emailResult.notificationId) {
        await this.getNotificationStatus(emailResult.notificationId);
        console.log('');
      }

      // Get history
      await this.getNotificationHistory();

      console.log('🎉 Demo completed successfully!');

    } catch (error) {
      console.error('💥 Demo failed:', error.message);
      process.exit(1);
    }
  }
}

// Run demo if called directly
if (require.main === module) {
  const client = new NotificationTestClient();
  client.runFullDemo();
}

module.exports = NotificationTestClient;
