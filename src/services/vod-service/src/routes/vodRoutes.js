const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const dynamoService     = require('../services/dynamoService');
const s3Service         = require('../services/s3Service');
const cloudfrontService = require('../services/cloudfrontService');
const { makeAuthMiddleware } = require('../../../shared/middleware/authMiddleware');
const { authenticate } = makeAuthMiddleware(dynamoService);
const { AWS_CONFIG }   = require('../../../shared/config/aws');

// POST /api/vods/presign
router.post('/presign', authenticate, async (req, res, next) => {
  try {
    const { title, fileName, contentType, isVipOnly } = req.body;
    if (!fileName) return res.status(400).json({ success: false, error: { message: 'fileName is required.' } });

    const streamId = `vod_${uuidv4().replace(/-/g,'').slice(0,16)}`;
    const userId   = req.user.userId;
    const channel  = await dynamoService.getChannelByStreamerId(userId);
    const presigned = await s3Service.getPresignedUploadUrl(userId, streamId, fileName, contentType || 'video/mp4');

    const domain = AWS_CONFIG.cloudfront.domainName || 'cdn.streamforge.net';
    const cdnUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    const isVip  = isVipOnly === true || isVipOnly === 'true';

    const record = await dynamoService.createStream({
      stream_id:     streamId,
      channel_id:    channel?.channel_id || userId,
      uploader_id:   userId,
      uploader_name: req.user.displayName || req.user.username,
      title:         title || fileName.replace(/\.[^/.]+$/, ''),
      raw_s3_key:    presigned.key,
      status:        'PROCESSING',
      is_vip_only:   isVip,
      playback_url:  `${cdnUrl}/hls/${isVip ? 'vip/' : ''}${streamId}/master.m3u8`,
      thumbnail_url: `${cdnUrl}/hls/${isVip ? 'vip/' : ''}${streamId}/thumbnail.jpg`
    });

    res.json({ success: true, data: { streamId, uploadUrl: presigned.uploadUrl, s3Key: presigned.key, expiresAt: presigned.expiresAt, streamRecord: record } });
  } catch (e) { next(e); }
});

// GET /api/vods
router.get('/', async (req, res, next) => {
  try {
    const { channelId } = req.query;
    const vods = channelId ? await dynamoService.getStreamsByChannelId(channelId, 20) : [];
    res.json({ success: true, data: { vods, count: vods.length } });
  } catch (e) { next(e); }
});

// GET /api/vods/:id
router.get('/:id', async (req, res, next) => {
  try {
    const vod = await dynamoService.getStreamById(req.params.id);
    if (!vod) return res.status(404).json({ success: false, error: { message: 'VOD not found.' } });
    res.json({ success: true, data: vod });
  } catch (e) { next(e); }
});

// POST /api/vods/:id/unlock
router.post('/:id/unlock', authenticate, async (req, res, next) => {
  try {
    const cookies = cloudfrontService.generateSignedCookies();
    cloudfrontService.setSignedCookies(res, cookies);
    res.json({ success: true, data: { message: 'VIP access unlocked.', streamId: req.params.id } });
  } catch (e) { next(e); }
});

module.exports = router;
