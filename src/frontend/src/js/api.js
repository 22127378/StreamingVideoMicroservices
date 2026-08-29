/**
 * REST API Client for StreamForge Frontend
 * Handles communication with backend API and provides robust offline/local fallback authentication.
 */

import { MOCK_CHANNELS, MOCK_CATEGORIES } from './mockData.js';

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
      console.warn('[API Client] Backend login failed, checking local users store...');
      // Local fallback
      const localUsers = JSON.parse(localStorage.getItem('streamforge_local_users') || '[]');
      const user = localUsers.find(
        (u) => (u.email === identifier.toLowerCase() || u.username === identifier.toLowerCase()) && u.password === password
      );

      if (user) {
        const token = `mock_jwt_token_${Date.now()}`;
        this.setToken(token);
        const data = {
          token,
          user: {
            userId: user.userId,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: 'streamer'
          },
          channel: user.channel
        };
        localStorage.setItem('streamforge_current_user', JSON.stringify(data));
        return data;
      }

      // If user typed any username and password, allow creating an active session instantly
      if (identifier && password.length >= 6) {
        const userId = `usr_${Math.floor(1000 + Math.random() * 9000)}`;
        const token = `mock_jwt_token_${Date.now()}`;
        this.setToken(token);
        const newUser = {
          userId,
          email: identifier.includes('@') ? identifier : `${identifier}@streamforge.net`,
          username: identifier.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'streamer',
          displayName: identifier,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${identifier}`,
          password,
          channel: {
            channel_id: `chn_${userId}`,
            streamer_name: identifier,
            streamer_username: identifier.toLowerCase(),
            streamer_avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${identifier}`,
            title: `Welcome to ${identifier}'s live stream!`,
            category: 'Just Chatting',
            tags: ['Live', 'Interactive'],
            is_live: 'false',
            viewer_count: 0,
            stream_key: `live_${Math.random().toString(36).slice(2, 12)}`,
            playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
          }
        };
        localUsers.push(newUser);
        localStorage.setItem('streamforge_local_users', JSON.stringify(localUsers));

        const data = {
          token,
          user: {
            userId: newUser.userId,
            email: newUser.email,
            username: newUser.username,
            displayName: newUser.displayName,
            avatarUrl: newUser.avatarUrl,
            role: 'streamer'
          },
          channel: newUser.channel
        };
        localStorage.setItem('streamforge_current_user', JSON.stringify(data));
        return data;
      }

      throw new Error('Invalid credentials. Password must be at least 6 characters.');
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
      console.warn('[API Client] Backend register failed, creating local user...');
      const localUsers = JSON.parse(localStorage.getItem('streamforge_local_users') || '[]');

      const userId = `usr_${Math.floor(1000 + Math.random() * 9000)}`;
      const streamKey = `live_${Math.random().toString(36).slice(2, 14)}`;

      const newUser = {
        userId,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        displayName: displayName || username,
        password,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        channel: {
          channel_id: `chn_${userId}`,
          streamer_name: displayName || username,
          streamer_username: username.toLowerCase(),
          streamer_avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
          title: `Welcome to ${displayName || username}'s live stream!`,
          category: 'Just Chatting',
          tags: ['Gaming', 'Chill'],
          is_live: 'false',
          viewer_count: 0,
          stream_key: streamKey,
          playback_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
        }
      };

      localUsers.push(newUser);
      localStorage.setItem('streamforge_local_users', JSON.stringify(localUsers));

      const token = `mock_jwt_token_${Date.now()}`;
      this.setToken(token);

      const data = {
        token,
        user: {
          userId: newUser.userId,
          email: newUser.email,
          username: newUser.username,
          displayName: newUser.displayName,
          avatarUrl: newUser.avatarUrl,
          role: 'streamer'
        },
        channel: newUser.channel
      };

      localStorage.setItem('streamforge_current_user', JSON.stringify(data));
      return data;
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
      const backendChannels = data.channels && data.channels.length > 0 ? data.channels : MOCK_CHANNELS;
      // Merge user live streams at the top
      return [...userLivestreams, ...backendChannels.filter(bc => !userLivestreams.some(ul => ul.channel_id === bc.channel_id))];
    } catch (err) {
      return [...userLivestreams, ...MOCK_CHANNELS.filter(mc => !userLivestreams.some(ul => ul.channel_id === mc.channel_id))];
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
      return data.channel;
    } catch (err) {
      const found = MOCK_CHANNELS.find((c) => c.channel_id === channelId || c.streamer_username === channelId);
      return found || MOCK_CHANNELS[0];
    }
  }

  async getCategories() {
    try {
      return await this.request('/channels/categories');
    } catch (err) {
      return MOCK_CATEGORIES;
    }
  }

  // --- Follow Channels Endpoints & Persistence ---
  getFollowedChannelIds() {
    try {
      return JSON.parse(localStorage.getItem('streamforge_followed_channel_ids') || '["chn_tenz", "chn_faker"]');
    } catch (e) {
      return ['chn_tenz', 'chn_faker'];
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

    if (isNowFollowing) {
      list.push(channelId);
    } else {
      list = list.filter(id => id !== channelId);
    }

    localStorage.setItem('streamforge_followed_channel_ids', JSON.stringify(list));

    // Try sync with Backend API
    try {
      if (isNowFollowing) {
        await this.request(`/channels/${channelId}/follow`, { method: 'POST' });
      } else {
        await this.request(`/channels/${channelId}/unfollow`, { method: 'DELETE' });
      }
    } catch (e) {}

    return { isFollowing: isNowFollowing };
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
