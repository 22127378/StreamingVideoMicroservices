/**
 * S3 Storage Service
 * Generates Presigned URLs for direct browser-to-S3 uploads and downloads.
 */

const { PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, AWS_CONFIG } = require('../config/aws');

class S3Service {
  /**
   * Generates a Presigned PUT URL allowing the client browser to upload a raw video directly to S3 Raw bucket.
   * @param {string} userId - ID of the uploading user
   * @param {string} streamId - Unique ID of the video/stream
   * @param {string} fileName - Original file name (e.g. video.mp4)
   * @param {string} contentType - MIME type (e.g. video/mp4)
   * @returns {Promise<{ uploadUrl: string, key: string, bucket: string, expiresAt: string }>}
   */
  async getPresignedUploadUrl(userId, streamId, fileName, contentType = 'video/mp4') {
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `raw-uploads/${userId}/${streamId}/${sanitizedFileName}`;
    const expiresInSeconds = 900; // 15 minutes validity

    const command = new PutObjectCommand({
      Bucket: AWS_CONFIG.buckets.rawMedia,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        'user-id': userId,
        'stream-id': streamId,
        'original-filename': encodeURIComponent(fileName)
      }
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    return {
      uploadUrl,
      bucket: AWS_CONFIG.buckets.rawMedia,
      key: objectKey,
      expiresAt
    };
  }

  /**
   * Generates a Presigned GET URL for secure media download.
   */
  async getPresignedDownloadUrl(bucket, key, expiresInSeconds = 3600) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Checks if an S3 object exists.
   */
  async objectExists(bucket, key) {
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }
}

module.exports = new S3Service();
