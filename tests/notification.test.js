const request = require('supertest');
const app = require('../src/server');

describe('Notification Service', () => {
  beforeAll(async () => {
    // Setup test database or mock dependencies
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Health Check', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Send Notification', () => {
    test('POST /api/notifications/send should create email notification', async () => {
      const notificationData = {
        recipient: 'test@example.com',
        message: 'Test notification message',
        type: 'email',
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .send(notificationData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('notificationId');
      expect(response.body).toHaveProperty('status', 'queued');
    });

    test('POST /api/notifications/send should validate required fields', async () => {
      const invalidData = {
        message: 'Test message',
        type: 'email'
        // missing recipient
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('POST /api/notifications/send should create SMS notification', async () => {
      const notificationData = {
        recipient: '+1555123456',
        message: 'Test SMS message',
        type: 'sms',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .send(notificationData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('notificationId');
    });
  });

  describe('Bulk Send', () => {
    test('POST /api/notifications/bulk-send should handle multiple notifications', async () => {
      const notifications = [
        {
          recipient: 'user1@example.com',
          message: 'Message 1',
          type: 'email',
          priority: 'normal'
        },
        {
          recipient: '+1555123456',
          message: 'Message 2',
          type: 'sms',
          priority: 'normal'
        }
      ];

      const response = await request(app)
        .post('/api/notifications/bulk-send')
        .send({ notifications })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('totalSent', 2);
      expect(response.body.results).toHaveLength(2);
    });

    test('POST /api/notifications/bulk-send should validate notifications array', async () => {
      const response = await request(app)
        .post('/api/notifications/bulk-send')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Notification History', () => {
    test('GET /api/notifications/history should return notifications', async () => {
      const response = await request(app)
        .get('/api/notifications/history')
        .expect(200);

      expect(response.body).toHaveProperty('notifications');
    });

    test('GET /api/notifications/history should support query parameters', async () => {
      const response = await request(app)
        .get('/api/notifications/history?limit=5&type=email')
        .expect(200);

      expect(response.body).toHaveProperty('notifications');
      expect(response.body).toHaveProperty('limit', 5);
    });
  });

  describe('Notification Status', () => {
    test('GET /api/notifications/:id/status should return 404 for non-existent notification', async () => {
      const response = await request(app)
        .get('/api/notifications/non-existent-id/status')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Notification not found');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
    });
  });
});

describe('Notification Providers', () => {
  const EmailProvider = require('../src/providers/EmailProvider');
  const SMSProvider = require('../src/providers/SMSProvider');
  const PushProvider = require('../src/providers/PushProvider');
  const WebhookProvider = require('../src/providers/WebhookProvider');

  describe('EmailProvider', () => {
    test('should create email provider instance', () => {
      const provider = new EmailProvider();
      expect(provider).toBeInstanceOf(EmailProvider);
    });

    test('should generate email subject', () => {
      const provider = new EmailProvider();
      const notification = {
        priority: 'high',
        metadata: { subject: 'Custom Subject' }
      };
      
      const subject = provider.generateSubject(notification);
      expect(subject).toBe('Custom Subject');
    });
  });

  describe('SMSProvider', () => {
    test('should validate phone numbers', () => {
      const provider = new SMSProvider();
      
      expect(provider.isValidPhoneNumber('+1555123456')).toBe(true);
      expect(provider.isValidPhoneNumber('invalid')).toBe(false);
    });

    test('should calculate SMS segments', () => {
      const provider = new SMSProvider();
      
      expect(provider.calculateSMSSegments('Short message')).toBe(1);
      expect(provider.calculateSMSSegments('A'.repeat(200))).toBe(2);
    });
  });
});
