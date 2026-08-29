/**
 * AWS SDK v3 Configuration for Transcoder Worker
 * Configured to use IAM Roles for Service Accounts (IRSA) on EKS Pods.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');
const { SQSClient } = require('@aws-sdk/client-sqs');

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const baseConfig = {
  region: AWS_REGION
};

const rawDynamo = new DynamoDBClient(baseConfig);
const dynamoDocClient = DynamoDBDocumentClient.from(rawDynamo, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true
  },
  unmarshallOptions: {
    wrapNumbers: false
  }
});

const s3Client = new S3Client(baseConfig);
const sqsClient = new SQSClient(baseConfig);

const WORKER_CONFIG = {
  region: AWS_REGION,
  sqs: {
    queueUrl: process.env.SQS_TRANSCODE_QUEUE_URL || '',
    waitTimeSeconds: parseInt(process.env.SQS_WAIT_TIME_SECONDS || '20', 10),
    maxNumberOfMessages: parseInt(process.env.SQS_MAX_MESSAGES || '1', 10),
    visibilityTimeout: parseInt(process.env.SQS_VISIBILITY_TIMEOUT || '300', 10)
  },
  buckets: {
    rawMedia: process.env.S3_RAW_MEDIA_BUCKET || 'streamforge-raw-media',
    hlsDelivery: process.env.S3_HLS_DELIVERY_BUCKET || 'streamforge-hls-delivery'
  },
  tables: {
    streams: process.env.DYNAMODB_TABLE_STREAMS || 'StreamForge_Streams'
  },
  tempDir: process.env.WORKER_TEMP_DIR || '/tmp/streamforge-transcode'
};

module.exports = {
  dynamoDocClient,
  s3Client,
  sqsClient,
  WORKER_CONFIG
};
