/**
 * REST API Client for StreamForge Frontend
 * Handles communication with backend API and provides graceful fallback to mock data.
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
      console.warn(`[API Client] Request to ${endpoint} failed (${err.message}). Using local fallback if available.`);
      throw err;
    }
  }

  // --- Auth Endpoints ---
  async login(identifier, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async register(username, email, password, displayName) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, displayName })
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async getMe() {
    if (!this.token) return null;
    try {
      return await this.request('/auth/me');
    } catch (e) {
      this.setToken(null);
      return null;
    }
  }

  // --- Channels Endpoints ---
  async getChannels() {
    try {
      const data = await this.request('/channels');
      return data.channels && data.channels.length > 0 ? data.channels : MOCK_CHANNELS;
    } catch (err) {
      return MOCK_CHANNELS;
    }
  }

  async getChannelById(channelId) {
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

  async toggleFollow(channelId, currentFollowers) {
    return await this.request(`/channels/${channelId}/follow`, {
      method: 'POST',
      body: JSON.stringify({ currentFollowers })
    });
  }

  // --- Stream & VOD Endpoints ---
  async getStreamKey() {
    return await this.request('/streams/key');
  }

  async resetStreamKey() {
    return await this.request('/streams/key/reset', { method: 'POST' });
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
    return await this.request('/vods/presign-upload', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType, title, isVipOnly })
    });
  }

  async unlockVipStream(streamId) {
    return await this.request(`/vods/${streamId}/unlock-vip`, { method: 'POST' });
  }
}

export const api = new ApiClient();
