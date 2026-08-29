/**
 * AWS SDK v3 Configuration & Client Initialization
 * Uses AWS IAM Roles for Service Accounts (IRSA) on EKS with fallback to environment variables.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');
const { SQSClient } = require('@aws-sdk/client-sqs');
const { CloudFrontClient } = require('@aws-sdk/client-cloudfront');

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Base AWS Client Config
const baseConfig = {
  region: AWS_REGION
};

// 1. DynamoDB Client & DocumentClient
const rawDynamoClient = new DynamoDBClient(baseConfig);
const dynamoDocClient = DynamoDBDocumentClient.from(rawDynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true
  },
  unmarshallOptions: {
    wrapNumbers: false
  }
});

// 2. S3 Client (Raw uploads & HLS bucket operations)
const s3Client = new S3Client(baseConfig);

// 3. SQS Client (Transcode Queue)
const sqsClient = new SQSClient(baseConfig);

// 4. CloudFront Client
const cloudFrontClient = new CloudFrontClient(baseConfig);

// Table Names & Bucket Names from Environment
const AWS_CONFIG = {
  region: AWS_REGION,
  tables: {
    users: process.env.DYNAMODB_TABLE_USERS || 'StreamForge_Users',
    channels: process.env.DYNAMODB_TABLE_CHANNELS || 'StreamForge_Channels',
    streams: process.env.DYNAMODB_TABLE_STREAMS || 'StreamForge_Streams',
    follows: process.env.DYNAMODB_TABLE_FOLLOWS || 'StreamForge_Follows'
  },
  buckets: {
    rawMedia: process.env.S3_RAW_MEDIA_BUCKET || 'streamforge-raw-media',
    hlsDelivery: process.env.S3_HLS_DELIVERY_BUCKET || 'streamforge-hls-delivery'
  },
  sqs: {
    transcodeQueueUrl: process.env.SQS_TRANSCODE_QUEUE_URL || ''
  },
  cloudfront: {
    domainName: process.env.CLOUDFRONT_DOMAIN || '',
    keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID || '',
    privateKeyPem: process.env.CLOUDFRONT_PRIVATE_KEY_PEM || ''
  }
};

module.exports = {
  dynamoDocClient,
  rawDynamoClient,
  s3Client,
  sqsClient,
  cloudFrontClient,
  AWS_CONFIG
};
