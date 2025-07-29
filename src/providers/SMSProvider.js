const config = require('../config/config');

class SMSProvider {
  constructor() {
    // In a real implementation, you would initialize Twilio client here
    this.client = this.initializeTwilioClient();
  }

  initializeTwilioClient() {
    if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
      // Mock client for development/testing
      return {
        messages: {
          create: async (options) => {
            console.log('📱 Mock SMS sent:', options);
            return {
              sid: 'mock_message_' + Date.now(),
              status: 'sent',
              to: options.to,
              from: options.from,
              body: options.body
            };
          }
        }
      };
    }

    // Real Twilio client would be initialized here
    // const twilio = require('twilio');
    // return twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    
    // For demo purposes, return mock client
    return this.createMockClient();
  }

  createMockClient() {
    return {
      messages: {
        create: async (options) => {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Simulate occasional failures
          if (Math.random() < 0.05) { // 5% failure rate
            throw new Error('SMS delivery failed: Network timeout');
          }

          return {
            sid: 'SM' + Math.random().toString(36).substr(2, 9),
            status: 'sent',
            to: options.to,
            from: options.from,
            body: options.body,
            dateCreated: new Date().toISOString()
          };
        }
      }
    };
  }

  async send(notification) {
    try {
      console.log(`📱 Sending SMS notification to ${notification.recipient}`);

      // Validate phone number format
      if (!this.isValidPhoneNumber(notification.recipient)) {
        throw new Error('Invalid phone number format');
      }

      // Truncate message if too long (SMS limit is typically 160 characters)
      const message = this.formatSMSMessage(notification);

      const messageOptions = {
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: notification.recipient
      };

      // Add media URL if present (MMS)
      if (notification.metadata && notification.metadata.mediaUrl) {
        messageOptions.mediaUrl = notification.metadata.mediaUrl;
      }

      // Send SMS
      const result = await this.client.messages.create(messageOptions);

      console.log(`✅ SMS sent successfully: ${result.sid}`);
      
      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        provider: 'sms',
        timestamp: new Date().toISOString(),
        deliveryInfo: {
          to: result.to,
          from: result.from,
          segments: this.calculateSMSSegments(message)
        }
      };

    } catch (error) {
      console.error(`❌ SMS sending failed:`, error);
      
      return {
        success: false,
        error: error.message,
        provider: 'sms',
        timestamp: new Date().toISOString()
      };
    }
  }

  formatSMSMessage(notification) {
    let message = notification.message;
    
    // Add urgency indicator for high priority messages
    if (notification.priority === 'high') {
      message = `🚨 URGENT: ${message}`;
    }

    // Add app name signature if configured
    if (notification.metadata && notification.metadata.includeSignature !== false) {
      message += `\n\n- ${config.APP_NAME}`;
    }

    // Truncate if message is too long
    const maxLength = 1600; // Allow for concatenated SMS
    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 3) + '...';
    }

    return message;
  }

  isValidPhoneNumber(phoneNumber) {
    // Basic phone number validation (international format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  calculateSMSSegments(message) {
    // Standard SMS is 160 characters, concatenated SMS is 153 characters per segment
    if (message.length <= 160) {
      return 1;
    }
    return Math.ceil(message.length / 153);
  }

  async getDeliveryStatus(messageId) {
    try {
      // In a real implementation, you would fetch from Twilio API
      // const message = await this.client.messages(messageId).fetch();
      
      // Mock delivery status
      const statuses = ['sent', 'delivered', 'failed', 'undelivered'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      return {
        messageId,
        status: randomStatus,
        timestamp: new Date().toISOString(),
        errorCode: randomStatus === 'failed' ? '30008' : null,
        errorMessage: randomStatus === 'failed' ? 'Unknown error' : null
      };
    } catch (error) {
      return {
        messageId,
        status: 'unknown',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testConnection() {
    try {
      // In a real implementation, you might send a test message or validate credentials
      if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
        return {
          success: false,
          error: 'Twilio credentials not configured'
        };
      }

      return {
        success: true,
        message: 'SMS provider connection successful',
        accountSid: config.TWILIO_ACCOUNT_SID.substring(0, 10) + '...' // Partial SID for security
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Utility method to format phone numbers
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming US)
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // Add + if missing
    if (digits.length > 10 && !phoneNumber.startsWith('+')) {
      return `+${digits}`;
    }
    
    return phoneNumber;
  }

  // Utility method to validate SMS content
  validateSMSContent(message) {
    const issues = [];
    
    if (message.length > 1600) {
      issues.push('Message exceeds maximum length for concatenated SMS');
    }
    
    // Check for potentially problematic characters
    const problematicChars = /[^\x00-\x7F]/g;
    if (problematicChars.test(message)) {
      issues.push('Message contains non-ASCII characters that may cause encoding issues');
    }
    
    return {
      valid: issues.length === 0,
      issues,
      segments: this.calculateSMSSegments(message)
    };
  }
}

module.exports = SMSProvider;
