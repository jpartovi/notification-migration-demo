const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailProvider {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
      // Use Ethereal for testing in development
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass'
        }
      });
    }

    // Production SMTP configuration
    return nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async send(notification) {
    try {
      console.log(`📧 Sending email notification to ${notification.recipient}`);

      const mailOptions = {
        from: config.EMAIL_FROM,
        to: notification.recipient,
        subject: this.generateSubject(notification),
        html: this.generateEmailBody(notification),
        text: notification.message,
        priority: this.mapPriority(notification.priority)
      };

      // Add attachments if present
      if (notification.metadata && notification.metadata.attachments) {
        mailOptions.attachments = notification.metadata.attachments;
      }

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Email sent successfully: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        provider: 'email',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Email sending failed:`, error);
      
      return {
        success: false,
        error: error.message,
        provider: 'email',
        timestamp: new Date().toISOString()
      };
    }
  }

  generateSubject(notification) {
    if (notification.metadata && notification.metadata.subject) {
      return notification.metadata.subject;
    }

    // Generate subject based on priority and type
    const priorityPrefix = notification.priority === 'high' ? '[URGENT] ' : '';
    return `${priorityPrefix}Notification from ${config.APP_NAME}`;
  }

  generateEmailBody(notification) {
    const { message, metadata = {} } = notification;
    const { title, buttonText, buttonUrl, unsubscribeUrl } = metadata;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Notification</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #007bff;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .message {
              background-color: white;
              padding: 20px;
              border-radius: 5px;
              margin-bottom: 20px;
              border-left: 4px solid #007bff;
            }
            .button {
              display: inline-block;
              background-color: #007bff;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              font-size: 12px;
              color: #6c757d;
              text-align: center;
            }
            .priority-high {
              border-left-color: #dc3545;
            }
            .priority-high .header {
              background-color: #dc3545;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title || 'Notification'}</h1>
          </div>
          <div class="content">
            <div class="message ${notification.priority === 'high' ? 'priority-high' : ''}">
              <p>${message}</p>
            </div>
            
            ${buttonText && buttonUrl ? `
              <div style="text-align: center;">
                <a href="${buttonUrl}" class="button">${buttonText}</a>
              </div>
            ` : ''}
            
            <div class="footer">
              <p>This notification was sent by ${config.APP_NAME}</p>
              <p>Notification ID: ${notification.id}</p>
              <p>Sent at: ${new Date().toLocaleString()}</p>
              
              ${unsubscribeUrl ? `
                <p><a href="${unsubscribeUrl}">Unsubscribe from these notifications</a></p>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  mapPriority(priority) {
    switch (priority) {
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email provider connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getDeliveryStatus(messageId) {
    // In a real implementation, you might query your email provider's API
    // For now, we'll return a mock status
    return {
      messageId,
      status: 'delivered', // delivered, bounced, complained, etc.
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = EmailProvider;
