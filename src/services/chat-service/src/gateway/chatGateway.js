/**
 * chat-service — WebSocket Gateway
 * Migrated from src/api/src/websocket/chatGateway.js with role-based badge resolution
 * using the Follows DynamoDB table directly (no cross-service HTTP call needed).
 */

const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const dynamoService = require('../services/dynamoService');

const JWT_SECRET = process.env.JWT_SECRET || 'streamforge-dev-secret-key-2026-secure';

class ChatGateway {
  constructor() {
    this.wss        = null;
    this.rooms      = new Map();  // channelId -> Set<ws>
    this.clientMeta = new Map();  // ws -> metadata
  }

  init(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

    // Heartbeat: remove dead connections every 30s
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const meta = this.clientMeta.get(ws);
        if (!meta || meta.isAlive === false) return ws.terminate();
        meta.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => clearInterval(this.heartbeatInterval));
    console.log('[chat-service] WebSocket Gateway initialized on /ws');
  }

  async handleConnection(ws, req) {
    const url       = new URL(req.url, 'http://localhost');
    const channelId = url.searchParams.get('channelId') || 'general';
    const token     = url.searchParams.get('token');

    // Default: guest profile
    let user = {
      userId:      `guest_${uuidv4().slice(0, 8)}`,
      username:    `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
      displayName: `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
      avatarUrl:   `https://api.dicebear.com/7.x/bottts/svg?seed=guest_${Date.now()}`,
      isGuest:     true
    };

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const dbUser  = await dynamoService.getUserById(decoded.userId);
        if (dbUser) {
          user = {
            userId:      dbUser.user_id,
            username:    dbUser.username,
            displayName: dbUser.display_name,
            avatarUrl:   dbUser.avatar_url,
            isGuest:     false
          };
        }
      } catch (_) { /* Invalid token → stay as guest */ }
    }

    // Resolve role from Follows DB
    let role = 'viewer';
    if (!user.isGuest) {
      const isOwner = channelId && channelId.includes(user.userId);
      if (isOwner) {
        role = 'broadcaster';
      } else {
        try {
          const following = await dynamoService.isFollowing(user.userId, channelId);
          if (following) role = 'subscriber';
        } catch (_) { /* Non-critical */ }
      }
    }

    const meta = { ...user, channelId, role, isAlive: true };
    this.clientMeta.set(ws, meta);
    this.joinRoom(channelId, ws);

    ws.on('pong', () => { const m = this.clientMeta.get(ws); if (m) m.isAlive = true; });
    ws.on('message', (raw) => {
      try { this.handleMessage(ws, JSON.parse(raw.toString())); }
      catch (e) { console.error('[chat-service] Invalid msg:', e.message); }
    });
    ws.on('close', () => {
      this.leaveRoom(channelId, ws);
      this.clientMeta.delete(ws);
    });

    ws.send(JSON.stringify({
      type: 'INIT_CONNECTED',
      data: { user: meta, channelId, role, viewerCount: this.getViewerCount(channelId) }
    }));
  }

  joinRoom(channelId, ws) {
    if (!this.rooms.has(channelId)) this.rooms.set(channelId, new Set());
    this.rooms.get(channelId).add(ws);
    this.broadcastViewerCount(channelId);
  }

  leaveRoom(channelId, ws) {
    if (!this.rooms.has(channelId)) return;
    const room = this.rooms.get(channelId);
    room.delete(ws);
    if (room.size === 0) this.rooms.delete(channelId);
    else this.broadcastViewerCount(channelId);
  }

  getViewerCount(channelId) {
    return this.rooms.has(channelId) ? this.rooms.get(channelId).size : 0;
  }

  getRoomCount() {
    return this.rooms.size;
  }

  broadcastViewerCount(channelId) {
    this.broadcastToRoom(channelId, {
      type: 'VIEWER_COUNT_UPDATE',
      data: { channelId, viewerCount: this.getViewerCount(channelId) }
    });
  }

  handleMessage(ws, msg) {
    const meta = this.clientMeta.get(ws);
    if (!meta) return;

    switch (msg.type) {
      case 'CHAT_MESSAGE':
        this.handleChatMessage(meta, msg.data);
        break;
      case 'SWITCH_ROOM':
        if (msg.data?.channelId && msg.data.channelId !== meta.channelId) {
          this.leaveRoom(meta.channelId, ws);
          meta.channelId = msg.data.channelId;
          this.joinRoom(meta.channelId, ws);
        }
        break;
    }
  }

  handleChatMessage(meta, data) {
    const text = (data?.text || '').trim();
    if (!text || text.length > 500) return;

    // Badge assignment from resolved role
    const badges = [];
    let color = '#ADADB8';

    if (meta.role === 'broadcaster') {
      badges.push('broadcaster');
      color = '#FF4655';
    } else if (meta.role === 'subscriber') {
      badges.push('subscriber');
      color = '#00F0FF';
    } else if (!meta.isGuest) {
      color = this.getUserColor(meta.username);
    }

    this.broadcastToRoom(meta.channelId, {
      type: 'CHAT_MESSAGE',
      data: {
        id:        `msg_${uuidv4().replace(/-/g,'').slice(0,16)}`,
        channelId: meta.channelId,
        sender: {
          userId:      meta.userId,
          username:    meta.username,
          displayName: meta.displayName,
          avatarUrl:   meta.avatarUrl,
          badges,
          isGuest:     meta.isGuest
        },
        text,
        color,
        timestamp: new Date().toISOString()
      }
    });
  }

  broadcastToRoom(channelId, payload) {
    if (!this.rooms.has(channelId)) return;
    const msg = JSON.stringify(payload);
    this.rooms.get(channelId).forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
  }

  getUserColor(username) {
    const colors = ['#9146FF', '#00F0FF', '#FF007A', '#00FF66', '#FFB800', '#FF4D4D', '#A970FF', '#5C16C5'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
}

module.exports = new ChatGateway();
