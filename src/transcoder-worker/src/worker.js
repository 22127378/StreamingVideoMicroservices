/**
 * Event-Driven Transcoder Worker Daemon
 * Continuously polls Amazon SQS for transcoding jobs and processes raw video uploads.
 */

require('dotenv').config();
const path = require('path');
const { ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { sqsClient, dynamoDocClient, WORKER_CONFIG } = require('./config/aws');
const s3DownloadService = require('./services/s3DownloadService');

class TranscoderWorker {
  constructor() {
    this.isRunning = false;
    this.currentJob = null;
  }

  /**
   * Starts the worker polling loop.
   */
  async start() {
    this.isRunning = true;
    console.log('[Transcoder Worker] Started. Listening on SQS Queue:', WORKER_CONFIG.sqs.queueUrl || '(Queue URL not configured)');
    console.log('[Transcoder Worker] Long-polling interval:', WORKER_CONFIG.sqs.waitTimeSeconds, 'seconds');

    this.setupSignalHandlers();

    while (this.isRunning) {
      try {
        await this.pollAndProcess();
      } catch (error) {
        console.error('[Transcoder Worker] Error in polling loop:', error.message);
        // Wait 5 seconds before retrying on unexpected errors
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    console.log('[Transcoder Worker] Polling loop stopped gracefully.');
  }

  /**
   * Polls SQS for messages and delegates job processing.
   */
  async pollAndProcess() {
    if (!WORKER_CONFIG.sqs.queueUrl) {
      console.log('[Transcoder Worker] Idle: SQS_TRANSCODE_QUEUE_URL not set. Sleeping 10s...');
      await new Promise((r) => setTimeout(r, 10000));
      return;
    }

    const receiveParams = {
      QueueUrl: WORKER_CONFIG.sqs.queueUrl,
      MaxNumberOfMessages: WORKER_CONFIG.sqs.maxNumberOfMessages,
      WaitTimeSeconds: WORKER_CONFIG.sqs.waitTimeSeconds,
      VisibilityTimeout: WORKER_CONFIG.sqs.visibilityTimeout
    };

    const response = await sqsClient.send(new ReceiveMessageCommand(receiveParams));

    if (!response.Messages || response.Messages.length === 0) {
      // No messages in queue (idle)
      return;
    }

    for (const message of response.Messages) {
      await this.processJob(message);
    }
  }

  /**
   * Parses SQS message payload and processes the video transcode task.
   */
  async processJob(sqsMessage) {
    const messageId = sqsMessage.MessageId;
    const receiptHandle = sqsMessage.ReceiptHandle;
    console.log(`[Transcoder Worker] Received SQS Message ID: ${messageId}`);

    let jobPayload = null;
    try {
      jobPayload = this.parseMessageBody(sqsMessage.Body);
    } catch (err) {
      console.error('[Transcoder Worker] Failed to parse SQS message body:', err.message);
      // Delete unparsable poison pill message
      await this.deleteMessage(receiptHandle);
      return;
    }

    const { bucket, key } = jobPayload;
    if (!bucket || !key || !key.endsWith('.mp4')) {
      console.warn(`[Transcoder Worker] Skipping non-MP4 or invalid event: ${key}`);
      await this.deleteMessage(receiptHandle);
      return;
    }

    // Extract streamId from path pattern: raw-uploads/{userId}/{streamId}/{filename}
    const pathParts = key.split('/');
    const streamId = pathParts.length >= 3 ? pathParts[2] : path.basename(key, path.extname(key));

    const jobDir = path.join(WORKER_CONFIG.tempDir, streamId);
    const localRawFile = path.join(jobDir, 'input.mp4');

    try {
      this.currentJob = { streamId, key };

      // 1. Update DynamoDB status to PROCESSING
      await this.updateStreamStatus(streamId, 'PROCESSING', {
        processing_started_at: new Date().toISOString()
      });

      // 2. Download Raw Video from S3 Raw Bucket
      await s3DownloadService.downloadRawMedia(bucket, key, localRawFile);

      console.log(`[Transcoder Worker] Successfully prepared raw media for streamId: ${streamId}`);

      // 3. Mark successful download stage
      console.log(`[Transcoder Worker] Ready for FFmpeg multi-bitrate ABR transcode pipeline (Feature 3.2).`);

      // 4. Delete message from SQS upon successful processing
      await this.deleteMessage(receiptHandle);
      console.log(`[Transcoder Worker] Completed job for streamId: ${streamId}`);
    } catch (error) {
      console.error(`[Transcoder Worker] Job failed for streamId: ${streamId}:`, error.message);
      await this.updateStreamStatus(streamId, 'FAILED', {
        error_message: error.message,
        failed_at: new Date().toISOString()
      });
      // Do not delete message - let it retry until maxReceiveCount is exceeded to go to DLQ
    } finally {
      s3DownloadService.cleanupJobDirectory(jobDir);
      this.currentJob = null;
    }
  }

  /**
   * Normalizes SQS message body across direct JSON, EventBridge, and S3 event formats.
   */
  parseMessageBody(bodyStr) {
    const parsed = JSON.parse(bodyStr);

    // 1. Direct JSON from EventBridge Transformer
    if (parsed.bucket && parsed.key) {
      return {
        bucket: parsed.bucket,
        key: decodeURIComponent(parsed.key.replace(/\+/g, ' '))
      };
    }

    // 2. EventBridge S3 Event standard envelope
    if (parsed.detail && parsed.detail.bucket && parsed.detail.object) {
      return {
        bucket: parsed.detail.bucket.name,
        key: decodeURIComponent(parsed.detail.object.key.replace(/\+/g, ' '))
      };
    }

    // 3. Native S3 Notification envelope
    if (parsed.Records && parsed.Records[0]?.s3) {
      const record = parsed.Records[0].s3;
      return {
        bucket: record.bucket.name,
        key: decodeURIComponent(record.object.key.replace(/\+/g, ' '))
      };
    }

    throw new Error('Unsupported SQS message payload schema.');
  }

  /**
   * Updates Stream status in DynamoDB.
   */
  async updateStreamStatus(streamId, status, extraFields = {}) {
    try {
      const expressions = ['#s = :status', '#u = :updated_at'];
      const names = { '#s': 'status', '#u': 'updated_at' };
      const values = { ':status': status, ':updated_at': new Date().toISOString() };

      Object.keys(extraFields).forEach((key, index) => {
        const nameKey = `#extra_${index}`;
        const valKey = `:val_${index}`;
        expressions.push(`${nameKey} = ${valKey}`);
        names[nameKey] = key;
        values[valKey] = extraFields[key];
      });

      const params = {
        TableName: WORKER_CONFIG.tables.streams,
        Key: { stream_id: streamId },
        UpdateExpression: `SET ${expressions.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
      };

      await dynamoDocClient.send(new UpdateCommand(params));
    } catch (err) {
      console.warn(`[Transcoder Worker] Failed to update DynamoDB status for ${streamId}:`, err.message);
    }
  }

  /**
   * Deletes message from SQS Queue.
   */
  async deleteMessage(receiptHandle) {
    if (!WORKER_CONFIG.sqs.queueUrl) return;
    const deleteParams = {
      QueueUrl: WORKER_CONFIG.sqs.queueUrl,
      ReceiptHandle: receiptHandle
    };
    await sqsClient.send(new DeleteCommand(deleteParams));
  }

  setupSignalHandlers() {
    const handleShutdown = (signal) => {
      console.log(`[Transcoder Worker] Received ${signal}. Initiating graceful shutdown...`);
      this.isRunning = false;
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  }
}

const worker = new TranscoderWorker();

if (require.main === module) {
  worker.start().catch((err) => {
    console.error('[Transcoder Worker] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { TranscoderWorker, worker };
