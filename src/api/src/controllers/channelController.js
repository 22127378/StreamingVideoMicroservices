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

class ChannelController {
  async getChannels(req, res, next) {
    try {
      const liveChannels = await dynamoService.listLiveChannels(20);

      // If no live channels in DB, return curated high-quality channels for instant preview
      res.status(200).json({
        success: true,
        data: {
          channels: liveChannels,
          count: liveChannels.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getChannelById(req, res, next) {
    try {
      const { id } = req.params;
      let channel = await dynamoService.getChannelById(id);

      if (!channel) {
        // Try looking up by streamerId
        channel = await dynamoService.getChannelByStreamerId(id);
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
        isFollowing = await dynamoService.isFollowing(req.user.userId, channel.channel_id);
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
