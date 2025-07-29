# Migration Guide: On-Premise to AWS Lambda

This guide provides step-by-step instructions for migrating the notification service from an on-premise setup to AWS Lambda.

## Migration Overview

The notification service will be decomposed into several Lambda functions:

1. **Notification API Handler** - Handles incoming HTTP requests
2. **Notification Processor** - Processes notifications from SQS queue
3. **Status Checker** - Provides notification status and history
4. **Bulk Processor** - Handles bulk notification requests

## Pre-Migration Checklist

- [ ] AWS Account setup with appropriate permissions
- [ ] AWS CLI configured
- [ ] Serverless Framework or AWS SAM installed
- [ ] Database migration plan (SQLite → DynamoDB/RDS)
- [ ] Environment variables documented
- [ ] Third-party service credentials secured

## Step 1: Database Migration

### Option A: Amazon DynamoDB (Recommended)
```javascript
// DynamoDB table structure
const notificationTable = {
  TableName: 'Notifications',
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' }
  ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'status', AttributeType: 'S' },
    { AttributeName: 'createdAt', AttributeType: 'S' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'StatusIndex',
      KeySchema: [
        { AttributeName: 'status', KeyType: 'HASH' },
        { AttributeName: 'createdAt', KeyType: 'RANGE' }
      ]
    }
  ]
};
```

### Option B: Amazon RDS
- Create RDS PostgreSQL instance
- Migrate schema from SQLite
- Update connection strings

## Step 2: Infrastructure Setup

### AWS Services Required:
- **AWS Lambda** - Function execution
- **Amazon API Gateway** - HTTP API endpoints
- **Amazon SQS** - Message queuing
- **Amazon DynamoDB** - Notification storage
- **Amazon SES** - Email delivery
- **Amazon SNS** - SMS and push notifications
- **AWS Systems Manager Parameter Store** - Configuration management

### CloudFormation Template (Basic):
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  NotificationQueue:
    Type: AWS::SQS::Queue
    Properties:
      VisibilityTimeoutSeconds: 300
      MessageRetentionPeriod: 1209600
      
  NotificationTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: Notifications
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
```

## Step 3: Code Refactoring

### Lambda Function Structure:
```
lambda/
├── api-handler/
│   ├── index.js
│   ├── package.json
│   └── layers/
├── processor/
│   ├── index.js
│   ├── package.json
│   └── layers/
└── shared/
    ├── database.js
    ├── providers/
    └── utils/
```

### API Handler Lambda (api-handler/index.js):
```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    
    // Validate request
    if (!body.recipient || !body.message || !body.type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Create notification record
    const notification = {
      id: generateId(),
      ...body,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Save to DynamoDB
    await saveNotification(notification);
    
    // Send to SQS for processing
    await queueNotification(notification);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        notificationId: notification.id
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

### Processor Lambda (processor/index.js):
```javascript
const NotificationProcessor = require('../shared/NotificationProcessor');

exports.handler = async (event) => {
  const processor = new NotificationProcessor();
  
  for (const record of event.Records) {
    try {
      const notification = JSON.parse(record.body);
      await processor.processNotification(notification);
    } catch (error) {
      console.error('Processing failed:', error);
      // Dead letter queue will handle retries
    }
  }
};
```

## Step 4: Provider Adaptations

### Email Provider (using SES):
```javascript
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

class EmailProvider {
  constructor() {
    this.ses = new SESClient({ region: process.env.AWS_REGION });
  }

  async send(notification) {
    const command = new SendEmailCommand({
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: [notification.recipient]
      },
      Message: {
        Subject: { Data: this.generateSubject(notification) },
        Body: {
          Html: { Data: this.generateEmailBody(notification) }
        }
      }
    });

    return await this.ses.send(command);
  }
}
```

### SMS Provider (using SNS):
```javascript
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

class SMSProvider {
  constructor() {
    this.sns = new SNSClient({ region: process.env.AWS_REGION });
  }

  async send(notification) {
    const command = new PublishCommand({
      PhoneNumber: notification.recipient,
      Message: notification.message
    });

    return await this.sns.send(command);
  }
}
```

## Step 5: Configuration Management

### Environment Variables Migration:
```javascript
// config/lambda-config.js
module.exports = {
  NOTIFICATION_QUEUE_URL: process.env.NOTIFICATION_QUEUE_URL,
  DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
  SES_REGION: process.env.AWS_REGION,
  SNS_REGION: process.env.AWS_REGION,
  // ... other configs
};
```

### Parameter Store Integration:
```javascript
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

async function getParameter(name) {
  const ssm = new SSMClient({ region: process.env.AWS_REGION });
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true
  });
  
  const result = await ssm.send(command);
  return result.Parameter.Value;
}
```

## Step 6: Deployment

### Using Serverless Framework:
```yaml
# serverless.yml
service: notification-service

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    DYNAMODB_TABLE_NAME: !Ref NotificationTable
    NOTIFICATION_QUEUE_URL: !Ref NotificationQueue

functions:
  api:
    handler: api-handler/index.handler
    events:
      - http:
          path: /api/notifications/{proxy+}
          method: ANY
          cors: true
  
  processor:
    handler: processor/index.handler
    events:
      - sqs:
          arn: !GetAtt NotificationQueue.Arn
          batchSize: 10

resources:
  Resources:
    NotificationTable:
      Type: AWS::DynamoDB::Table
      # ... table definition
    
    NotificationQueue:
      Type: AWS::SQS::Queue
      # ... queue definition
```

### Deployment Commands:
```bash
# Install Serverless Framework
npm install -g serverless

# Deploy the service
serverless deploy

# Deploy individual functions
serverless deploy function -f api
```

## Step 7: Testing and Validation

### Lambda Testing:
```bash
# Test API handler locally
serverless invoke local -f api -p test-events/send-notification.json

# Test processor
serverless invoke local -f processor -p test-events/sqs-event.json
```

### Integration Testing:
```javascript
// Use the existing test-client.js with new Lambda API Gateway endpoint
const client = new NotificationTestClient('https://your-api-gateway-url.amazonaws.com');
await client.runFullDemo();
```

## Step 8: Monitoring and Logging

### CloudWatch Integration:
- Lambda function logs automatically go to CloudWatch
- Set up custom metrics for notification processing
- Create dashboards for monitoring

### Example Custom Metrics:
```javascript
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

async function recordMetric(metricName, value, unit = 'Count') {
  const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION });
  
  const command = new PutMetricDataCommand({
    Namespace: 'NotificationService',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date()
    }]
  });
  
  await cloudwatch.send(command);
}
```

## Step 9: Performance Optimization

### Cold Start Mitigation:
- Use provisioned concurrency for critical functions
- Implement connection pooling
- Minimize package size

### Cost Optimization:
- Set appropriate memory allocation
- Use reserved concurrency limits
- Implement proper retry logic

## Step 10: Rollback Plan

### Blue-Green Deployment:
1. Keep on-premise service running
2. Route small percentage of traffic to Lambda
3. Gradually increase Lambda traffic
4. Monitor for issues
5. Full cutover when confident

### Rollback Procedure:
```bash
# Revert to previous version
serverless deploy --stage production --alias previous

# Or redirect traffic back to on-premise
# Update load balancer/DNS settings
```

## Migration Checklist

- [ ] Infrastructure deployed
- [ ] Database migrated
- [ ] Code deployed and tested
- [ ] Monitoring setup
- [ ] Performance validated
- [ ] Security reviewed
- [ ] Documentation updated
- [ ] Team trained
- [ ] Rollback plan tested
- [ ] Go-live scheduled

## Cost Considerations

### On-Premise vs Lambda:
- **On-Premise**: Fixed server costs, maintenance, scaling complexity
- **Lambda**: Pay-per-execution, auto-scaling, reduced maintenance

### Estimated Lambda Costs:
- API Gateway requests: $3.50 per million
- Lambda invocations: $0.20 per 1M requests
- Lambda duration: $0.0000166667 per GB-second
- DynamoDB: Pay-per-request or provisioned capacity

## Conclusion

This migration transforms a traditional server-based notification service into a serverless, auto-scaling solution. The Lambda-based architecture provides better scalability, reduced operational overhead, and cost efficiency for variable workloads.
