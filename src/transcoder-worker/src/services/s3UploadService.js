/**
 * S3 HLS Media Uploader Service
 * Recursively uploads generated HLS playlists (.m3u8), video segments (.ts), and thumbnails to S3 HLS Delivery bucket.
 */

const fs = require('fs');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, WORKER_CONFIG } = require('../config/aws');

class S3UploadService {
  /**
   * Uploads the entire transcoded HLS directory to S3 HLS Delivery Bucket.
   * @param {string} localDir - Local directory containing .m3u8, .ts, .jpg files
   * @param {string} streamId - Unique stream ID
   * @param {boolean} isVip - Whether the stream is tier-gated VIP
   * @returns {Promise<string[]>} List of uploaded S3 keys
   */
  async uploadHlsPackage(localDir, streamId, isVip = false) {
    const s3Prefix = `hls/${isVip ? 'vip/' : ''}${streamId}`;
    const uploadedKeys = [];

    const files = fs.readdirSync(localDir);
    console.log(`[S3 Uploader] Uploading ${files.length} HLS artifacts to s3://${WORKER_CONFIG.buckets.hlsDelivery}/${s3Prefix}/`);

    for (const fileName of files) {
      const localFilePath = path.join(localDir, fileName);
      if (fs.statSync(localFilePath).isDirectory()) continue;

      const s3Key = `${s3Prefix}/${fileName}`;
      const contentType = this.getContentType(fileName);
      const cacheControl = this.getCacheControl(fileName);

      const fileBuffer = fs.readFileSync(localFilePath);

      const command = new PutObjectCommand({
        Bucket: WORKER_CONFIG.buckets.hlsDelivery,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
        CacheControl: cacheControl
      });

      await s3Client.send(command);
      uploadedKeys.push(s3Key);
    }

    console.log(`[S3 Uploader] Successfully uploaded ${uploadedKeys.length} items for stream ${streamId}`);
    return uploadedKeys;
  }

  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case '.m3u8':
        return 'application/x-mpegURL';
      case '.ts':
        return 'video/MP2T';
      case '.m4s':
      case '.mp4':
        return 'video/mp4';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.vtt':
        return 'text/vtt';
      default:
        return 'application/octet-stream';
    }
  }

  getCacheControl(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.m3u8') {
      // Manifests must have short cache duration for live/adaptive syncing
      return 'public, max-age=2, must-revalidate';
    }
    // Immutable TS video chunks can be aggressively cached for 1 year
    return 'public, max-age=31536000, immutable';
  }
}

module.exports = new S3UploadService();
