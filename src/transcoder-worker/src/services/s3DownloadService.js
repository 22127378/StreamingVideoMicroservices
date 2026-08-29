/**
 * S3 Download & Local File Service
 * Handles streaming downloads of raw media files from S3 Raw bucket to worker local disk.
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, WORKER_CONFIG } = require('../config/aws');

class S3DownloadService {
  /**
   * Ensures the local scratch directory exists.
   */
  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Downloads a video object from S3 Raw bucket to a local file.
   * @param {string} bucket - S3 Bucket Name
   * @param {string} key - S3 Object Key (e.g. raw-uploads/usr_123/vod_456/video.mp4)
   * @param {string} localFilePath - Local destination file path
   * @returns {Promise<string>} Destination local file path
   */
  async downloadRawMedia(bucket, key, localFilePath) {
    const dir = path.dirname(localFilePath);
    this.ensureDirectory(dir);

    console.log(`[Worker Downloader] Starting download: s3://${bucket}/${key} -> ${localFilePath}`);

    const command = new GetObjectCommand({
      Bucket: bucket || WORKER_CONFIG.buckets.rawMedia,
      Key: key
    });

    const response = await s3Client.send(command);

    const writeStream = fs.createWriteStream(localFilePath);
    await pipeline(response.Body, writeStream);

    console.log(`[Worker Downloader] Download complete: ${localFilePath} (${fs.statSync(localFilePath).size} bytes)`);
    return localFilePath;
  }

  /**
   * Cleans up local scratch directory for a processed job.
   */
  cleanupJobDirectory(jobDir) {
    try {
      if (fs.existsSync(jobDir)) {
        fs.rmSync(jobDir, { recursive: true, force: true });
        console.log(`[Worker Downloader] Cleaned up temporary directory: ${jobDir}`);
      }
    } catch (err) {
      console.warn(`[Worker Downloader] Failed to cleanup directory ${jobDir}:`, err.message);
    }
  }
}

module.exports = new S3DownloadService();
