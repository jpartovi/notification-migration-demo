const EmailProvider = require('../providers/EmailProvider');
const SMSProvider = require('../providers/SMSProvider');
const PushProvider = require('../providers/PushProvider');
const WebhookProvider = require('../providers/WebhookProvider');
const config = require('../config/config');

class NotificationService {
  constructor(database) {
    this.db = database;
    this.providers = this.initializeProviders();
    this.queue = [];
    this.processing = false;
    
    // Start processing queue
    this.startQueueProcessor();
  }

  initializeProviders() {
    const providers = {};

    if (config.ENABLE_EMAIL) {
      providers.email = new EmailProvider();
    }

    if (config.ENABLE_SMS) {
      providers.sms = new SMSProvider();
    }

    if (config.ENABLE_PUSH) {
      providers.push = new PushProvider();
    }

    if (config.ENABLE_WEBHOOK) {
      providers.webhook = new WebhookProvider();
    }

    return providers;
  }

  async sendNotification(notification) {
    try {
      // Store notification in database
      await this.db.saveNotification(notification);
      
      // Add to processing queue
      this.queue.push(notification);
      
      console.log(`📧 Notification ${notification.id} queued for delivery`);
      
      return {
        status: 'queued',
        id: notification.id,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error queueing notification:', error);
      throw error;
    }
  }

  async sendBulkNotifications(notifications) {
    const results = [];
    
    for (const notificationData of notifications) {
      try {
        const notification = {
          ...notificationData,
          id: notificationData.id || require('uuid').v4(),
          timestamp: new Date().toISOString(),
          status: 'pending'
        };
        
        const result = await this.sendNotification(notification);
        results.push({
          id: notification.id,
          status: 'queued',
          result
        });
      } catch (error) {
        results.push({
          id: notificationData.id || 'unknown',
          status: 'error',
          error: error.message
        });
      }
    }
    
    return results;
  }

  async processNotification(notification) {
    try {
      console.log(`🔄 Processing notification ${notification.id} of type ${notification.type}`);
      
      // Update status to processing
      notification.status = 'processing';
      await this.db.updateNotification(notification.id, { status: 'processing' });
      
      const provider = this.providers[notification.type];
      
      if (!provider) {
        throw new Error(`No provider found for notification type: ${notification.type}`);
      }
      
      // Send notification via appropriate provider
      const result = await provider.send(notification);
      
      // Update notification status
      const finalStatus = result.success ? 'sent' : 'failed';
      notification.status = finalStatus;
      notification.providerResponse = result;
      notification.sentAt = new Date().toISOString();
      
      await this.db.updateNotification(notification.id, {
        status: finalStatus,
        providerResponse: result,
        sentAt: notification.sentAt
      });
      
      console.log(`✅ Notification ${notification.id} ${finalStatus}`);
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to process notification ${notification.id}:`, error);
      
      // Update status to failed
      notification.status = 'failed';
      notification.error = error.message;
      notification.failedAt = new Date().toISOString();
      
      await this.db.updateNotification(notification.id, {
        status: 'failed',
        error: error.message,
        failedAt: notification.failedAt
      });
      
      throw error;
    }
  }

  async startQueueProcessor() {
    setInterval(async () => {
      if (this.processing || this.queue.length === 0) {
        return;
      }
      
      this.processing = true;
      
      try {
        const batch = this.queue.splice(0, config.BATCH_SIZE);
        console.log(`📦 Processing batch of ${batch.length} notifications`);
        
        const promises = batch.map(notification => 
          this.processNotification(notification).catch(error => {
            console.error(`Error processing notification ${notification.id}:`, error);
            return { error: error.message, notificationId: notification.id };
          })
        );
        
        await Promise.allSettled(promises);
      } catch (error) {
        console.error('Error processing notification batch:', error);
      } finally {
        this.processing = false;
      }
    }, 1000); // Process every second
  }

  async getNotificationStatus(id) {
    try {
      const notification = await this.db.getNotification(id);
      return notification;
    } catch (error) {
      console.error('Error getting notification status:', error);
      throw error;
    }
  }

  async getNotificationHistory(options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        type,
        status,
        recipient,
        startDate,
        endDate
      } = options;
      
      const history = await this.db.getNotifications({
        limit,
        offset,
        type,
        status,
        recipient,
        startDate,
        endDate
      });
      
      return history;
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  }

  async getStatistics(timeframe = '24h') {
    try {
      const stats = await this.db.getNotificationStatistics(timeframe);
      return {
        timeframe,
        ...stats,
        queueSize: this.queue.length,
        processing: this.processing
      };
    } catch (error) {
      console.error('Error getting notification statistics:', error);
      throw error;
    }
  }

  async retryFailedNotification(id) {
    try {
      const notification = await this.db.getNotification(id);
      
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      if (notification.status !== 'failed') {
        throw new Error('Only failed notifications can be retried');
      }
      
      // Reset notification status and add back to queue
      notification.status = 'pending';
      notification.retryCount = (notification.retryCount || 0) + 1;
      delete notification.error;
      delete notification.failedAt;
      
      await this.db.updateNotification(id, {
        status: 'pending',
        retryCount: notification.retryCount
      });
      
      this.queue.push(notification);
      
      return {
        success: true,
        message: 'Notification queued for retry',
        retryCount: notification.retryCount
      };
    } catch (error) {
      console.error('Error retrying notification:', error);
      throw error;
    }
  }

  async getHealth() {
    const queueSize = this.queue.length;
    const isHealthy = queueSize < 1000; // Arbitrary threshold
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      queueSize,
      processing: this.processing,
      providers: Object.keys(this.providers),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = NotificationService;
