const admin = require('firebase-admin');
const config = require('../config/config');

class PushProvider {
  constructor() {
    this.firebaseApp = this.initializeFirebase();
  }

  initializeFirebase() {
    if (admin.apps.length === 0) {
      if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test' || !process.env.FIREBASE_ADMIN_SDK_KEY) {
        // Mock Firebase for development/testing
        return this.mockFirebaseApp();
      } else {
        // Initialize Firebase Admin SDK
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY);

        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
    }
    return admin.app();
  }

  mockFirebaseApp() {
    console.warn('⚠️ Using mock Firebase service for push notifications');
    return {
      messaging: () => ({
        send: (message) => {
          console.log('📱 Mock push notification sent:', message);
          return Promise.resolve({
            success: true,
            messageId: 'mock_message_' + Date.now(),
          });
        }
      })
    };
  }

  async send(notification) {
    try {
      console.log(`📲 Sending push notification to ${notification.recipient}`);

      const message = {
        notification: {
          title: notification.metadata?.title || 'New Notification',
          body: notification.message
        },
        token: notification.recipient,
        data: notification.metadata?.data || {}
      };

      const response = await this.firebaseApp.messaging().send(message);

      console.log(`✅ Push notification sent successfully: ${response}`);

      return {
        success: true,
        provider: 'push',
        messageId: response.messageId
      };
    } catch (error) {
      console.error(`❌ Push notification sending failed:`, error);
      return {
        success: false,
        provider: 'push',
        error: error.message
      };
    }
  }

  async testConnection() {
    try {
      if (!this.firebaseApp) {
        throw new Error('Firebase app not initialized');
      }
      console.log('✅ Firebase app initialized successfully');
      return {
        success: true,
        message: 'Push provider connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getDeliveryStatus(messageId) {
    // In real implementation, check delivery status via Firebase API
    return {
      messageId,
      status: 'unknown', // Firebase doesn't provide a way to check delivery status via SDK
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = PushProvider;
