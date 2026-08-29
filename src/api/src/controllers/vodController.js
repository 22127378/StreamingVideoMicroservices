/**
 * VOD (Video on Demand) Controller
 * Handles Video uploads via S3 Presigned URLs, VOD catalog browsing, and Tier-gated Signed Cookies.
 */

const { v4: uuidv4 } = require('uuid');
const dynamoService = require('../services/dynamoService');
const s3Service = require('../services/s3Service');
const cloudfrontService = require('../services/cloudfrontService');
const { AWS_CONFIG } = require('../config/aws');

class VodController {
  /**
   * Generates a direct Presigned PUT URL allowing the browser/studio to upload a raw MP4 to S3.
   */
  async presignUpload(req, res, next) {
    try {
      const { title, fileName, contentType, isVipOnly } = req.body;
      const userId = req.user.userId;

      if (!fileName) {
        return res.status(400).json({
          success: false,
          error: { message: 'fileName is required.' }
        });
      }

      const streamId = `vod_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const userChannel = await dynamoService.getChannelByStreamerId(userId);

      // 1. Generate S3 Direct Presigned Upload URL
      const presignedData = await s3Service.getPresignedUploadUrl(
        userId,
        streamId,
        fileName,
        contentType || 'video/mp4'
      );

      // 2. Create Stream Record in DynamoDB with status 'PROCESSING'
      const domain = AWS_CONFIG.cloudfront.domainName || 'cdn.streamforge.net';
      const cdnUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      const isVip = isVipOnly === true || isVipOnly === 'true';

      const streamRecord = {
        stream_id: streamId,
        channel_id: userChannel ? userChannel.channel_id : userId,
        uploader_id: userId,
        uploader_name: req.user.displayName || req.user.username,
        title: title || fileName.replace(/\.[^/.]+$/, ''),
        raw_s3_key: presignedData.key,
        status: 'PROCESSING', // PROCESSING -> READY (updated by Transcoder Worker)
        is_vip_only: isVip,
        playback_url: `${cdnUrl}/hls/${isVip ? 'vip/' : ''}${streamId}/master.m3u8`,
        thumbnail_url: `${cdnUrl}/hls/${isVip ? 'vip/' : ''}${streamId}/thumbnail.jpg`,
        created_at: new Date().toISOString()
      };

      await dynamoService.createStream(streamRecord);

      res.status(200).json({
        success: true,
        data: {
          streamId,
          uploadUrl: presignedData.uploadUrl,
          s3Key: presignedData.key,
          expiresAt: presignedData.expiresAt,
          streamRecord
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves VODs list for a channel or recent trending videos.
   */
  async listVods(req, res, next) {
    try {
      const { channelId } = req.query;

      let vods = [];
      if (channelId) {
        vods = await dynamoService.getStreamsByChannelId(channelId, 20);
      } else {
        // Return demo & recent VODs
        vods = [
          {
            stream_id: 'vod_demo_valorant_final',
            channel_id: 'chn_streamer_tenz',
            uploader_name: 'TenZ',
            title: 'VCT Champions Grand Finals - Radiant Clutch Highlights',
            status: 'READY',
            duration_seconds: 3820,
            views_count: 245000,
            is_vip_only: false,
            playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60',
            created_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            stream_id: 'vod_demo_coding_live',
            channel_id: 'chn_streamer_dev',
            uploader_name: 'TechLeadPro',
            title: 'Building a Full-Scale Video Platform with AWS EKS & KEDA',
            status: 'READY',
            duration_seconds: 7200,
            views_count: 89000,
            is_vip_only: true, // VIP tier-gated demo!
            playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            thumbnail_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=60',
            created_at: new Date(Date.now() - 172800000).toISOString()
          }
        ];
      }

      res.status(200).json({
        success: true,
        data: {
          vods,
          count: vods.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves single VOD details by ID.
   */
  async getVodById(req, res, next) {
    try {
      const { id } = req.params;
      const vod = await dynamoService.getStreamById(id);

      if (!vod) {
        // Return simulated mock VOD for preview if not in local DB
        return res.status(200).json({
          success: true,
          data: {
            stream_id: id,
            title: 'Stream Highlights & Replay',
            status: 'READY',
            is_vip_only: false,
            playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: vod
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generates and attaches CloudFront Signed Cookies for Tier-gated VIP stream access.
   */
  async unlockVipStream(req, res, next) {
    try {
      const { id: streamId } = req.params;

      // Generate CloudFront signed cookies for /hls/vip/*
      const signedCookies = cloudfrontService.generateSignedCookies();
      cloudfrontService.setSignedCookies(res, signedCookies);

      res.status(200).json({
        success: true,
        data: {
          message: 'VIP access unlocked! CloudFront Signed Cookies attached to session.',
          streamId,
          expiresInHours: 6,
          cookiesSet: Object.keys(signedCookies).filter(k => k !== 'isSimulated')
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VodController();
