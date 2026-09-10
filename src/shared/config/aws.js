/**
 * Shared AWS SDK v3 Configuration
 * Used by all StreamForge microservices.
 * Each service only initialises the AWS clients it needs.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');
const { CloudFrontClient } = require('@aws-sdk/client-cloudfront');

const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';

const baseConfig = { region: AWS_REGION };

// DynamoDB
const rawDynamoClient = new DynamoDBClient(baseConfig);
const dynamoDocClient = DynamoDBDocumentClient.from(rawDynamoClient, {
  marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
  unmarshallOptions: { wrapNumbers: false }
});

// S3 (used by vod-service only)
const s3Client = new S3Client(baseConfig);

// CloudFront (used by vod-service only)
const cloudFrontClient = new CloudFrontClient(baseConfig);

const AWS_CONFIG = {
  region: AWS_REGION,
  tables: {
    users:    process.env.DYNAMODB_TABLE_USERS    || 'StreamForge_Users',
    channels: process.env.DYNAMODB_TABLE_CHANNELS || 'StreamForge_Channels',
    streams:  process.env.DYNAMODB_TABLE_STREAMS  || 'StreamForge_Streams',
    follows:  process.env.DYNAMODB_TABLE_FOLLOWS  || 'StreamForge_Follows'
  },
  buckets: {
    rawMedia:    process.env.S3_RAW_MEDIA_BUCKET    || 'streamforge-raw-media',
    hlsDelivery: process.env.S3_HLS_DELIVERY_BUCKET || 'streamforge-hls-delivery'
  },
  cloudfront: {
    domainName:    process.env.CLOUDFRONT_DOMAIN          || '',
    keyPairId:     process.env.CLOUDFRONT_KEY_PAIR_ID     || '',
    privateKeyPem: process.env.CLOUDFRONT_PRIVATE_KEY_PEM || ''
  }
};

module.exports = { dynamoDocClient, s3Client, cloudFrontClient, AWS_CONFIG };
