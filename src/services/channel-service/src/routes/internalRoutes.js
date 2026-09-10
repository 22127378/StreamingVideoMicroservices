/**
 * Internal routes — only callable from within the cluster (no public auth required).
 * Used by auth-service to create channels and fetch channel by user on login.
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const dynamoService = require('../services/dynamoService');

// Guard: only accept requests from other internal services
const internalOnly = (req, res, next) => {
  if (req.headers['x-internal-service']) return next();
  return res.status(403).json({ success: false, error: { message: 'Internal endpoint.' } });
};

// POST /internal/channels — called by auth-service after user register
router.post('/channels', internalOnly, async (req, res, next) => {
  try {
    const { user_id, username, display_name, avatar_url, stream_key } = req.body;
    const channelId = `chn_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const channel = await dynamoService.createChannel({
      channel_id:        channelId,
      streamer_id:       user_id,
      streamer_name:     display_name,
      streamer_username: username,
      streamer_avatar:   avatar_url,
      title:             `Welcome to ${display_name}'s stream!`,
      category:          'Just Chatting',
      tags:              ['English', 'Gaming'],
      is_live:           'false',
      viewer_count:      0,
      follower_count:    0,
      stream_key:        stream_key,
      playback_url:      `https://${process.env.CLOUDFRONT_DOMAIN || 'cdn.streamforge.net'}/hls/${user_id}/master.m3u8`
    });
    res.status(201).json({ success: true, data: channel });
  } catch (e) { next(e); }
});

// GET /internal/channels/by-user/:userId — called by auth-service on login / getMe
router.get('/channels/by-user/:userId', internalOnly, async (req, res, next) => {
  try {
    const channel = await dynamoService.getChannelByStreamerId(req.params.userId);
    res.json({ success: true, data: channel });
  } catch (e) { next(e); }
});

module.exports = router;
