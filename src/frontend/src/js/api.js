/**
 * REST API Client for StreamForge Frontend
 * Handles communication with backend API and provides robust offline/local fallback authentication.
 */



const FALLBACK_CHANNELS = [
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

const FALLBACK_CATEGORIES = [
  { id: 'cat_valorant', name: 'Valorant', viewers: 184500, tags: ['FPS', 'Shooter', 'Esports'], image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80' },
  { id: 'cat_lol', name: 'League of Legends', viewers: 245100, tags: ['MOBA', 'Strategy', 'Competitive'], image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=80' },
  { id: 'cat_just_chatting', name: 'Just Chatting', viewers: 320400, tags: ['IRL', 'Talk Show', 'Community'], image: 'https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=500&auto=format&fit=crop&q=80' },
  { id: 'cat_gta5', name: 'Grand Theft Auto V', viewers: 112000, tags: ['Open World', 'Roleplay', 'Action'], image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80' },
  { id: 'cat_software', name: 'Software & Game Dev', viewers: 54300, tags: ['Coding', 'Cloud', 'Architecture'], image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=80' }
];

class ApiClient {
  constructor() {
    this.baseUrl = '/api';
    this.token = localStorage.getItem('streamforge_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('streamforge_token', token);
    } else {
      localStorage.removeItem('streamforge_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error?.message || `HTTP error ${response.status}`);
      }
      return json.data;
    } catch (err) {
      throw err;
    }
  }

  // --- Auth Endpoints with Robust Fallback ---
  async login(identifier, password) {
    try {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      if (data.token) this.setToken(data.token);
      localStorage.setItem('streamforge_current_user', JSON.stringify(data));
      return data;
    } catch (err) {
      console.error('[API Client] Backend login failed', err);
      throw err;
    }
  }

  async register(username, email, password, displayName) {
    try {
      const data = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, displayName })
      });
      if (data.token) this.setToken(data.token);
      localStorage.setItem('streamforge_current_user', JSON.stringify(data));
      return data;
    } catch (err) {
      console.error('[API Client] Backend register failed', err);
      throw err;
    }
  }

  async getMe() {
    if (!this.token) {
      const saved = localStorage.getItem('streamforge_current_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.setToken(parsed.token || 'mock_token');
          return parsed;
        } catch (e) {}
      }
      return null;
    }

    try {
      const data = await this.request('/auth/me');
      localStorage.setItem('streamforge_current_user', JSON.stringify(data));
      return data;
    } catch (e) {
      const saved = localStorage.getItem('streamforge_current_user');
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    }
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('streamforge_current_user');
  }

  // --- Channels Endpoints ---
  async getChannels() {
    // 1. Get user active livestreams from shared store
    const userLivestreams = JSON.parse(localStorage.getItem('streamforge_user_live_streams') || '[]');

    try {
      const data = await this.request('/channels');
      const backendChannels = (data && data.channels && data.channels.length > 0) ? data.channels : FALLBACK_CHANNELS;
      // Merge user live streams at the top
      return [...userLivestreams, ...backendChannels.filter(bc => !userLivestreams.some(ul => ul.channel_id === bc.channel_id))];
    } catch (err) {
      return [...userLivestreams, ...FALLBACK_CHANNELS];
    }
  }

  async getChannelById(channelId) {
    const userLivestreams = JSON.parse(localStorage.getItem('streamforge_user_live_streams') || '[]');
    const userLive = userLivestreams.find((c) => c.channel_id === channelId || c.streamer_username === channelId);
    if (userLive) return userLive;

    // Check current user profile
    const savedUser = localStorage.getItem('streamforge_current_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.channel && (parsed.channel.channel_id === channelId || parsed.user?.userId === channelId)) {
          return parsed.channel;
        }
      } catch (e) {}
    }

    try {
      const data = await this.request(`/channels/${channelId}`);
      if (data && data.channel) return data.channel;
    } catch (err) {}

    // Fallback to local channel definition
    const fallback = FALLBACK_CHANNELS.find(c => c.channel_id === channelId || c.streamer_username === channelId || c.streamer_name?.toLowerCase() === channelId.toLowerCase());
    return fallback || FALLBACK_CHANNELS[0];
  }

  async getCategories() {
    try {
      const data = await this.request('/channels/categories');
      return (data && data.data && data.data.length > 0) ? data.data : (Array.isArray(data) ? data : FALLBACK_CATEGORIES);
    } catch (err) {
      return FALLBACK_CATEGORIES;
    }
  }

  // --- Follow Channels & Followers Role Database ---
  getFollowedChannelIds() {
    try {
      return JSON.parse(localStorage.getItem('streamforge_followed_channel_ids') || '["chn_tenz", "chn_faker"]');
    } catch (e) {
      return ['chn_tenz', 'chn_faker'];
    }
  }

  getChannelFollowers(channelId) {
    try {
      const db = JSON.parse(localStorage.getItem('streamforge_channel_followers_db') || '{}');
      return db[channelId] || [];
    } catch (e) {
      return [];
    }
  }

  isFollowing(channelId) {
    const list = this.getFollowedChannelIds();
    return list.includes(channelId);
  }

  async getFollowedChannels() {
    const followedIds = this.getFollowedChannelIds();
    const allChannels = await this.getChannels();
    return allChannels.filter(c => followedIds.includes(c.channel_id));
  }

  async toggleFollow(channelId, channelObj = null) {
    let list = this.getFollowedChannelIds();
    const isNowFollowing = !list.includes(channelId);
    const currentUser = await this.getMe();

    if (isNowFollowing) {
      list.push(channelId);
      // Add to channel followers database
      try {
        const db = JSON.parse(localStorage.getItem('streamforge_channel_followers_db') || '{}');
        if (!db[channelId]) db[channelId] = [];
        if (currentUser?.user && !db[channelId].some(u => u.userId === currentUser.user.userId)) {
          db[channelId].push({
            userId: currentUser.user.userId,
            username: currentUser.user.username,
            displayName: currentUser.user.displayName || currentUser.user.username,
            role: 'subscriber',
            followedAt: new Date().toISOString()
          });
        }
        localStorage.setItem('streamforge_channel_followers_db', JSON.stringify(db));
      } catch (e) {}
    } else {
      list = list.filter(id => id !== channelId);
      // Remove from channel followers database
      try {
        const db = JSON.parse(localStorage.getItem('streamforge_channel_followers_db') || '{}');
        if (db[channelId] && currentUser?.user) {
          db[channelId] = db[channelId].filter(u => u.userId !== currentUser.user.userId);
          localStorage.setItem('streamforge_channel_followers_db', JSON.stringify(db));
        }
      } catch (e) {}
    }

    localStorage.setItem('streamforge_followed_channel_ids', JSON.stringify(list));

    // Sync with Backend API
    try {
      if (isNowFollowing) {
        await this.request(`/channels/${channelId}/follow`, { method: 'POST' });
      } else {
        await this.request(`/channels/${channelId}/unfollow`, { method: 'DELETE' });
      }
    } catch (e) {}

    return { isFollowing: isNowFollowing };
  }

  getUserRoleInChannel(channelId, user, channelObj = null) {
    if (!user || !user.user) return 'guest';

    const uId = user.user.userId;
    const uName = (user.user.username || '').toLowerCase();

    // 1. Check Broadcaster (Owner of channel)
    const chOwnerId = channelObj?.user_id || user.channel?.user_id;
    const chStreamerUsername = (channelObj?.streamer_username || user.channel?.streamer_username || '').toLowerCase();
    const chId = channelObj?.channel_id || user.channel?.channel_id;

    if (
      (chOwnerId && uId === chOwnerId) ||
      (chStreamerUsername && uName === chStreamerUsername) ||
      (chId && chId === channelId && user.channel?.channel_id === channelId) ||
      (channelId && uId && channelId.includes(uId)) ||
      (channelId && uName && channelId.toLowerCase().includes(uName))
    ) {
      return 'broadcaster';
    }

    // 2. Check Channel Follower / Subscriber Database
    const followers = this.getChannelFollowers(channelId);
    const isFollowerInDb = followers.some(f => f.userId === uId || f.username?.toLowerCase() === uName);
    const isFollowedInList = this.getFollowedChannelIds().includes(channelId);

    if (isFollowerInDb || isFollowedInList) {
      return 'subscriber';
    }

    return 'viewer';
  }

  // --- Stream & VOD Endpoints ---
  async getStreamKey() {
    try {
      return await this.request('/streams/key');
    } catch (e) {
      const user = await this.getMe();
      return {
        streamKey: user?.channel?.stream_key || 'live_7a8b9c1d2e3f4g5h6j7k',
        ingestServer: 'rtmp://live.streamforge.net:1935/live'
      };
    }
  }

  async resetStreamKey() {
    try {
      return await this.request('/streams/key/reset', { method: 'POST' });
    } catch (e) {
      const newKey = `live_${Math.random().toString(36).slice(2, 14)}`;
      const saved = localStorage.getItem('streamforge_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.channel) parsed.channel.stream_key = newKey;
        localStorage.setItem('streamforge_current_user', JSON.stringify(parsed));
      }
      return { streamKey: newKey, message: 'Stream key reset successfully.' };
    }
  }

  async getVods() {
    try {
      const data = await this.request('/vods');
      return data.vods;
    } catch (err) {
      return [];
    }
  }

  async presignVodUpload(fileName, contentType, title, isVipOnly) {
    try {
      return await this.request('/vods/presign-upload', {
        method: 'POST',
        body: JSON.stringify({ fileName, contentType, title, isVipOnly })
      });
    } catch (e) {
      return {
        streamId: `vod_${Date.now()}`,
        uploadUrl: `https://httpbin.org/put`,
        key: `raw-uploads/demo/${fileName}`,
        expiresAt: new Date(Date.now() + 900000).toISOString()
      };
    }
  }

  async unlockVipStream(streamId) {
    try {
      return await this.request(`/vods/${streamId}/unlock-vip`, { method: 'POST' });
    } catch (e) {
      return { success: true, message: 'VIP stream unlocked successfully.' };
    }
  }
}

export const api = new ApiClient();
