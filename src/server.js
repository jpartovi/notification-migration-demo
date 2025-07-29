const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const NotificationService = require('./services/NotificationService');
const DatabaseService = require('./services/DatabaseService');
const config = require('./config/config');

const app = express();
const port = config.PORT || 3000;

// Initialize services
const db = new DatabaseService();
const notificationService = new NotificationService(db);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../package.json').version
  });
});

// Send notification endpoint
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { recipient, message, type, priority, metadata } = req.body;
    
    // Validate required fields
    if (!recipient || !message || !type) {
      return res.status(400).json({
        error: 'Missing required fields: recipient, message, type'
      });
    }

    const notificationId = uuidv4();
    const notification = {
      id: notificationId,
      recipient,
      message,
      type,
      priority: priority || 'normal',
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Process notification
    const result = await notificationService.sendNotification(notification);
    
    res.status(200).json({
      success: true,
      notificationId,
      status: result.status,
      message: 'Notification queued for delivery'
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get notification status endpoint
app.get('/api/notifications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.getNotificationStatus(id);
    
    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found'
      });
    }

    res.status(200).json(notification);
  } catch (error) {
    console.error('Error getting notification status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get notifications history endpoint
app.get('/api/notifications/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, status } = req.query;
    const history = await notificationService.getNotificationHistory({
      limit: parseInt(limit),
      offset: parseInt(offset),
      type,
      status
    });

    res.status(200).json(history);
  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Bulk send notifications endpoint
app.post('/api/notifications/bulk-send', async (req, res) => {
  try {
    const { notifications } = req.body;
    
    if (!notifications || !Array.isArray(notifications)) {
      return res.status(400).json({
        error: 'notifications array is required'
      });
    }

    const results = await notificationService.sendBulkNotifications(notifications);
    
    res.status(200).json({
      success: true,
      totalSent: results.length,
      results
    });

  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Notification service running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📧 API documentation: http://localhost:${port}/api/docs`);
});

module.exports = app;
