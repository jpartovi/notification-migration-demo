# Notification Service Migration Demo

> 🚀 **A comprehensive demonstration of migrating an on-premise notification service to AWS Lambda**

This repository showcases a realistic, production-ready notification service designed to demonstrate the complete process of migrating from traditional on-premise infrastructure to AWS Lambda. Perfect for showcasing modern serverless architecture migrations.

## 🌟 Features

### Multi-Channel Notification Support
- 📧 **Email** - SMTP with HTML templates and attachments
- 📱 **SMS** - Twilio integration with message segmentation
- 📲 **Push Notifications** - Firebase Cloud Messaging integration
- 🌐 **Webhooks** - HTTP POST with retry logic and authentication

### Production-Ready Architecture
- ⚡ **Queue-based Processing** - Asynchronous notification handling
- 🗄️ **Database Persistence** - SQLite with full audit trail
- 🔒 **Security Features** - Rate limiting, CORS, input validation
- 📊 **Health Monitoring** - Built-in health checks and metrics
- 🐳 **Containerization** - Docker and Docker Compose support
- 🧪 **Testing Suite** - Comprehensive unit and integration tests

### Migration-Ready Design
- 📋 **Detailed Migration Guide** - Step-by-step AWS Lambda conversion
- 🏗️ **Modular Architecture** - Easy to decompose into microservices
- ⚙️ **Environment Configuration** - Ready for cloud deployment
- 🔄 **Mock Providers** - Development and testing without external dependencies

## 🚀 Quick Start

### Automated Setup
```bash
git clone https://github.com/jpartovi/notification-migration-demo.git
cd notification-migration-demo
./setup.sh
npm start
```

### Manual Setup

#### Prerequisites
- Node.js 16+ 
- npm 8+
- Docker (optional)

#### Installation
1. **Clone and Install**
   ```bash
   git clone https://github.com/jpartovi/notification-migration-demo.git
   cd notification-migration-demo
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Service**
   ```bash
   npm start
   # Service available at http://localhost:3000
   ```

## 📡 API Documentation

### Core Endpoints

#### Health Check
```bash
GET /health
# Returns service status and metrics
```

#### Send Notification
```bash
POST /api/notifications/send
Content-Type: application/json

{
  "recipient": "user@example.com",
  "message": "Hello from the notification service!",
  "type": "email",
  "priority": "normal",
  "metadata": {
    "subject": "Test Notification",
    "title": "Welcome!"
  }
}
```

#### Bulk Send
```bash
POST /api/notifications/bulk-send
Content-Type: application/json

{
  "notifications": [
    {
      "recipient": "+1555123456",
      "message": "SMS notification",
      "type": "sms",
      "priority": "high"
    },
    {
      "recipient": "user@example.com",
      "message": "Email notification",
      "type": "email",
      "priority": "normal"
    }
  ]
}
```

#### Get Notification Status
```bash
GET /api/notifications/{id}/status
# Returns detailed status and delivery information
```

#### Notification History
```bash
GET /api/notifications/history?limit=10&type=email&status=sent
# Returns paginated notification history with filtering
```

## 🧪 Testing

### Run Test Suite
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
```

### Demo Client
```bash
node test-client.js     # Comprehensive demo of all features
```

### Manual Testing
```bash
# Test all notification types
curl -X POST http://localhost:3000/api/notifications/send \
-H "Content-Type: application/json" \
-d '{
  "recipient": "test@example.com",
  "message": "Test notification",
  "type": "email",
  "priority": "normal"
}'
```

## 🐳 Docker Deployment

### Single Container
```bash
docker build -t notification-service .
docker run -p 3000:3000 notification-service
```

### Full Stack (with Redis)
```bash
docker-compose up -d
# Service: http://localhost:3000
# Redis: localhost:6379
```

## 📁 Project Structure

```
notification-migration-demo/
├── src/
│   ├── config/
│   │   └── config.js              # Environment configuration
│   ├── services/
│   │   ├── NotificationService.js # Core notification logic
│   │   └── DatabaseService.js     # Database operations
│   ├── providers/
│   │   ├── EmailProvider.js       # Email delivery
│   │   ├── SMSProvider.js         # SMS delivery
│   │   ├── PushProvider.js        # Push notifications
│   │   └── WebhookProvider.js     # Webhook delivery
│   └── server.js                  # Express.js server
├── tests/
│   └── notification.test.js       # Test suite
├── data/                          # SQLite database
├── logs/                          # Application logs
├── test-client.js                 # Comprehensive demo client
├── setup.sh                       # Automated setup script
├── MIGRATION.md                   # AWS Lambda migration guide
├── docker-compose.yml             # Multi-service deployment
├── Dockerfile                     # Container definition
└── README.md                      # This file
```

## 🔄 Migration to AWS Lambda

This service is specifically designed for AWS Lambda migration. See the comprehensive **[Migration Guide](MIGRATION.md)** for:

- 📋 Step-by-step migration process
- 🏗️ Infrastructure setup (CloudFormation templates)
- 🔧 Code refactoring examples
- 💰 Cost analysis and optimization
- 🔄 Rollback procedures
- 📊 Performance comparisons

### Migration Benefits
- **Cost Efficiency**: Pay only for actual usage
- **Auto Scaling**: Handle traffic spikes automatically
- **Zero Maintenance**: No server management
- **High Availability**: Built-in redundancy
- **Global Reach**: Edge locations worldwide

## 🛠️ Development

### Available Scripts
```bash
npm start           # Start the service
npm run dev         # Development mode with auto-reload
npm test            # Run test suite
npm run lint        # Code linting
npm run docker:build # Build Docker image
npm run clean       # Clean generated files
```

### Environment Variables
See `.env.example` for all available configuration options:

- **Server**: PORT, NODE_ENV
- **Database**: DATABASE_URL, connection pooling
- **Providers**: SMTP, Twilio, Firebase, webhook configs
- **Security**: JWT secrets, encryption keys
- **AWS**: Credentials for migration

## 📈 Monitoring & Observability

- **Health Checks**: `/health` endpoint with detailed metrics
- **Logging**: Structured logging with configurable levels
- **Database**: Complete audit trail of all notifications
- **Error Handling**: Comprehensive error tracking and retry logic

## 🤝 Contributing

This is a demonstration project, but improvements and suggestions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎯 Use Cases

Perfect for demonstrating:
- **Serverless Architecture Migration**
- **Microservices Decomposition**
- **Cloud-Native Development**
- **DevOps Best Practices**
- **Modern API Design**

---

**Built with ❤️ for AWS Lambda migration demonstrations**

*Ready to showcase the power of serverless architecture!* 🚀
