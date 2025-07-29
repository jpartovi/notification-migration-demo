require('dotenv').config();

const config = {
  // Server configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || 'sqlite:./notifications.db',
  DATABASE_HOST: process.env.DATABASE_HOST || 'localhost',
  DATABASE_PORT: process.env.DATABASE_PORT || 5432,
  DATABASE_NAME: process.env.DATABASE_NAME || 'notifications',
  DATABASE_USER: process.env.DATABASE_USER || 'postgres',
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || 'password',
  
  // Redis configuration (for caching and queues)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  
  // Email service configuration
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER || 'notifications@company.com',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || 'smtp_password',
  EMAIL_FROM: process.env.EMAIL_FROM || 'notifications@company.com',
  
  // SMS service configuration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
  
  // Push notification configuration
  FCM_SERVER_KEY: process.env.FCM_SERVER_KEY || '',
  APNS_KEY_ID: process.env.APNS_KEY_ID || '',
  APNS_TEAM_ID: process.env.APNS_TEAM_ID || '',
  APNS_PRIVATE_KEY: process.env.APNS_PRIVATE_KEY || '',
  
  // Webhook configuration
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'webhook_secret_key',
  WEBHOOK_TIMEOUT: parseInt(process.env.WEBHOOK_TIMEOUT) || 5000,
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Queue configuration
  QUEUE_CONCURRENCY: parseInt(process.env.QUEUE_CONCURRENCY) || 5,
  QUEUE_RETRY_ATTEMPTS: parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3,
  QUEUE_RETRY_DELAY: parseInt(process.env.QUEUE_RETRY_DELAY) || 5000,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || './logs/app.log',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'jwt_secret_key',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'encryption_key_32_characters_long',
  
  // Monitoring
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
  METRICS_ENABLED: process.env.METRICS_ENABLED === 'true',
  METRICS_PORT: parseInt(process.env.METRICS_PORT) || 9090,
  
  // Feature flags
  ENABLE_EMAIL: process.env.ENABLE_EMAIL !== 'false',
  ENABLE_SMS: process.env.ENABLE_SMS !== 'false',
  ENABLE_PUSH: process.env.ENABLE_PUSH !== 'false',
  ENABLE_WEBHOOK: process.env.ENABLE_WEBHOOK !== 'false',
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS !== 'false',
  
  // Batch processing
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 100,
  BATCH_TIMEOUT: parseInt(process.env.BATCH_TIMEOUT) || 10000,
  
  // File storage (for attachments)
  STORAGE_TYPE: process.env.STORAGE_TYPE || 'local', // local, s3, gcs
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'notification-attachments',
  STORAGE_REGION: process.env.STORAGE_REGION || 'us-east-1',
  
  // AWS configuration (for future Lambda migration)
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  
  // Database connection pool
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN) || 2,
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX) || 10,
  DB_POOL_IDLE_TIMEOUT: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
  
  // Application metadata
  APP_NAME: 'notification-service',
  APP_VERSION: '1.0.0',
  API_VERSION: 'v1'
};

// Validate required configuration
const requiredEnvVars = [];

if (config.NODE_ENV === 'production') {
  requiredEnvVars.push(
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'WEBHOOK_SECRET'
  );
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}

module.exports = config;
