/**
 * channel-service — Channel Controller
 */
const { v4: uuidv4 } = require('uuid');
const dynamoService = require('../services/dynamoService');

const TOP_CATEGORIES = [
  { id: 'cat_valorant',    name: 'Valorant',              viewers: 142300, tags: ['FPS', 'Shooter', 'Esports'] },
  { id: 'cat_lol',         name: 'League of Legends',     viewers: 218500, tags: ['MOBA', 'Strategy'] },
  { id: 'cat_just_chatting', name: 'Just Chatting',       viewers: 312000, tags: ['IRL', 'Talk Show'] },
  { id: 'cat_gta5',        name: 'Grand Theft Auto V',    viewers: 95400,  tags: ['Open World', 'Roleplay'] },
  { id: 'cat_software',    name: 'Software & Game Dev',   viewers: 48200,  tags: ['Coding', 'Tech'] }
];

class ChannelController {
  async getChannels(req, res, next) {
    try {
      const channels = await dynamoService.listLiveChannels(20);
      res.json({ success: true, data: { channels, count: channels.length } });
    } catch (e) { next(e); }
  }

  async getChannelById(req, res, next) {
    try {
      const { id } = req.params;
      let channel = await dynamoService.getChannelById(id);
      if (!channel) channel = await dynamoService.getChannelByStreamerId(id);
      if (!channel) return res.status(404).json({ success: false, error: { message: 'Channel not found.' } });

      let isFollowing = false;
      if (req.user) isFollowing = await dynamoService.isFollowing(req.user.userId, channel.channel_id);

      res.json({ success: true, data: { channel, isFollowing } });
    } catch (e) { next(e); }
  }

  async getCategories(req, res, next) {
    res.json({ success: true, data: TOP_CATEGORIES });
  }

  async getChannelsByCategory(req, res, next) {
    try {
      const channels = await dynamoService.listChannelsByCategory(req.params.category, 20);
      res.json({ success: true, data: { category: req.params.category, channels } });
    } catch (e) { next(e); }
  }

  async toggleFollow(req, res, next) {
    try {
      const { id: channelId } = req.params;
      const userId = req.user.userId;
      const isFollowing = await dynamoService.isFollowing(userId, channelId);

      if (isFollowing) {
        await dynamoService.unfollowChannel(userId, channelId);
        await dynamoService.updateChannel(channelId, { follower_count: Math.max(0, (req.body.currentFollowers || 1) - 1) });
        return res.json({ success: true, data: { isFollowing: false } });
      } else {
        await dynamoService.followChannel(userId, channelId);
        await dynamoService.updateChannel(channelId, { follower_count: (req.body.currentFollowers || 0) + 1 });
        return res.json({ success: true, data: { isFollowing: true } });
      }
    } catch (e) { next(e); }
  }

  async updateChannel(req, res, next) {
    try {
      const { id: channelId } = req.params;
      const channel = await dynamoService.getChannelById(channelId);
      if (!channel) return res.status(404).json({ success: false, error: { message: 'Channel not found.' } });
      if (channel.streamer_id !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: { message: 'Forbidden.' } });
      }
      const { title, category, tags } = req.body;
      const update = {};
      if (title)    update.title    = title;
      if (category) update.category = category;
      if (tags)     update.tags     = tags;
      const updated = await dynamoService.updateChannel(channelId, update);
      res.json({ success: true, data: updated });
    } catch (e) { next(e); }
  }

  async getFollowers(req, res, next) {
    try {
      const followers = await dynamoService.getFollowersByChannel(req.params.id);
      res.json({ success: true, data: { followers, count: followers.length } });
    } catch (e) { next(e); }
  }
}

module.exports = new ChannelController();
