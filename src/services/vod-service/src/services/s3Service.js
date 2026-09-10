const { PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, AWS_CONFIG } = require('../../../shared/config/aws');

class S3Service {
  async getPresignedUploadUrl(userId, streamId, fileName, contentType = 'video/mp4') {
    const key = `raw-uploads/${userId}/${streamId}/${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const command = new PutObjectCommand({
      Bucket: AWS_CONFIG.buckets.rawMedia,
      Key: key,
      ContentType: contentType,
      Metadata: { 'user-id': userId, 'stream-id': streamId }
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return { uploadUrl, key, bucket: AWS_CONFIG.buckets.rawMedia, expiresAt: new Date(Date.now() + 900000).toISOString() };
  }

  async objectExists(bucket, key) {
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = new S3Service();
