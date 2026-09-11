/**
 * Channel Controller
 * Handles channel listings, category exploration, channel profiles, and follower interactions.
 */

const dynamoService = require('../services/dynamoService');

const TOP_CATEGORIES = [
  {
    id: 'cat_valorant',
    name: 'Valorant',
    viewers: 142300,
    tags: ['FPS', 'Shooter', 'Esports'],
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'cat_lol',
    name: 'League of Legends',
    viewers: 218500,
    tags: ['MOBA', 'Strategy', 'Competitive'],
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'cat_just_chatting',
    name: 'Just Chatting',
    viewers: 312000,
    tags: ['IRL', 'Talk Show', 'Community'],
    image: 'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'cat_gta5',
    name: 'Grand Theft Auto V',
    viewers: 95400,
    tags: ['Open World', 'Roleplay', 'Action'],
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'cat_software',
    name: 'Software & Game Dev',
    viewers: 48200,
    tags: ['Coding', 'Tech', 'Educational'],
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60'
  }
];

const DEFAULT_CHANNELS = [
  {
    channel_id: 'chn_tenz_live',
    streamer_name: 'TenZ',
    streamer_username: 'tenz',
    streamer_avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
    title: 'VCT Champions 2026 Grand Finals Watchparty | Radiant Ranked Games',
    category: 'Valorant',
    tags: ['Radiant', 'Ranked', 'English', 'Esports'],
    viewer_count: 84290,
    is_live: 'true',
    playback_url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    backup_playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    bio: 'Professional Valorant Player & Content Creator for Sentinels.'
  },
  {
    channel_id: 'chn_faker_live',
    streamer_name: 'Faker',
    streamer_username: 'faker',
    streamer_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
    title: 'T1 Faker - Challenger Mid Lane Solo Queue',
    category: 'League of Legends',
    tags: ['T1', 'Challenger', 'Mid', 'Korean'],
    viewer_count: 98400,
    is_live: 'true',
    playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    backup_playback_url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    thumbnail_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80',
    bio: 'The Unkillable Demon King. 4x World Champion.'
  },
  {
    channel_id: 'chn_shroud_live',
    streamer_name: 'shroud',
    streamer_username: 'shroud',
    streamer_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    title: 'Testing New Competitive Meta | FPS Aim God',
    category: 'Valorant',
    tags: ['Aim', 'FPS', 'PC'],
    viewer_count: 52100,
    is_live: 'true',
    playback_url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    backup_playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnail_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
    bio: 'Former CS:GO Pro, Full-time Streamer & Human Aimbot.'
  },
  {
    channel_id: 'chn_techlead_live',
    streamer_name: 'TechLeadPro',
    streamer_username: 'techlead',
    streamer_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    title: 'Live Coding: Event-Driven Video Transcoder with AWS EKS & KEDA',
    category: 'Software & Game Dev',
    tags: ['AWS', 'Kubernetes', 'Terraform', 'NodeJS'],
    viewer_count: 14200,
    is_live: 'true',
    playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    backup_playback_url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    thumbnail_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    bio: 'Principal Cloud Architect & Senior DevOps Engineer.'
  }
];

class ChannelController {
  async getChannels(req, res, next) {
    try {
      let liveChannels = [];
      try {
        liveChannels = await dynamoService.listLiveChannels(20);
      } catch (dbErr) {
        console.warn('[ChannelController] DynamoDB unavailable, using fallback curated channels:', dbErr.message);
      }

      // If no live channels in DB or DB offline, return curated high-quality channels for instant preview
      const channels = (liveChannels && liveChannels.length > 0) ? liveChannels : DEFAULT_CHANNELS;

      res.status(200).json({
        success: true,
        data: {
          channels,
          count: channels.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getChannelById(req, res, next) {
    try {
      const { id } = req.params;
      let channel = null;

      try {
        channel = await dynamoService.getChannelById(id);
        if (!channel) {
          channel = await dynamoService.getChannelByStreamerId(id);
        }
      } catch (dbErr) {
        console.warn('[ChannelController] DynamoDB unavailable for getChannelById, searching fallback channels:', dbErr.message);
      }

      if (!channel) {
        channel = DEFAULT_CHANNELS.find(c => c.channel_id === id || c.streamer_username === id || c.streamer_name?.toLowerCase() === id.toLowerCase()) || null;
      }

      if (!channel) {
        return res.status(404).json({
          success: false,
          error: { message: 'Channel not found.' }
        });
      }

      // Check if current authenticated user is following this channel
      let isFollowing = false;
      if (req.user) {
        try {
          isFollowing = await dynamoService.isFollowing(req.user.userId, channel.channel_id);
        } catch (fErr) {}
      }

      res.status(200).json({
        success: true,
        data: {
          channel,
          isFollowing
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: TOP_CATEGORIES
      });
    } catch (error) {
      next(error);
    }
  }

  async getChannelsByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const channels = await dynamoService.listChannelsByCategory(category, 20);

      res.status(200).json({
        success: true,
        data: {
          category,
          channels
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleFollow(req, res, next) {
    try {
      const { id: channelId } = req.params;
      const userId = req.user.userId;

      const isFollowing = await dynamoService.isFollowing(userId, channelId);

      if (isFollowing) {
        await dynamoService.unfollowChannel(userId, channelId);
        await dynamoService.updateChannel(channelId, {
          follower_count: Math.max(0, (req.body.currentFollowers || 1) - 1)
        });
        return res.status(200).json({
          success: true,
          data: { isFollowing: false, message: 'Unfollowed channel successfully.' }
        });
      } else {
        await dynamoService.followChannel(userId, channelId);
        await dynamoService.updateChannel(channelId, {
          follower_count: (req.body.currentFollowers || 0) + 1
        });
        return res.status(200).json({
          success: true,
          data: { isFollowing: true, message: 'Followed channel successfully.' }
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async updateChannel(req, res, next) {
    try {
      const { id: channelId } = req.params;
      const userId = req.user.userId;

      const channel = await dynamoService.getChannelById(channelId);
      if (!channel) {
        return res.status(404).json({
          success: false,
          error: { message: 'Channel not found.' }
        });
      }

      if (channel.streamer_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden. You do not own this channel.' }
        });
      }

      const { title, category, tags } = req.body;
      const updateData = {};
      if (title) updateData.title = title;
      if (category) updateData.category = category;
      if (tags) updateData.tags = tags;

      const updated = await dynamoService.updateChannel(channelId, updateData);

      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChannelController();
