/**
 * WebSocket Live Chat Gateway & Real-time Viewer Presence Tracker
 * Manages channel chat rooms, real-time messaging, emotes, user badges, and viewer counts.
 */

const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET } = require('../middlewares/authMiddleware');
const dynamoService = require('../services/dynamoService');

// Predefined Emotes dictionary
const EMOTES_CATALOG = {
  ':pog:': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f632.png',
  ':kekw:': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f923.png',
  ':hype:': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f389.png',
  ':heart:': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png',
  ':fire:': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png',
  ':gg:': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c6.png',
  ':cool:': 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f60e.png'
};

class ChatGateway {
  constructor() {
    this.wss = null;
    // Map of channelId -> Set of connected WebSocket client objects
    this.rooms = new Map();
    // Map of client ws -> metadata object { id, userId, username, displayName, badges, channelId, isAlive }
    this.clientMeta = new Map();
  }

  /**
   * Initializes WebSocket Server on top of the HTTP Server instance.
   * @param {import('http').Server} server 
   */
  init(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Heartbeat check every 30 seconds to clean up dead connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const meta = this.clientMeta.get(ws);
        if (!meta || meta.isAlive === false) {
          return ws.terminate();
        }
        meta.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(this.heartbeatInterval);
    });

    console.log('⚡ [ChatGateway] WebSocket Server initialized on path /ws');
  }

  handleConnection(ws, req) {
    const url = new URL(req.url, 'http://localhost');
    const channelId = url.searchParams.get('channelId') || 'general';
    const token = url.searchParams.get('token');

    // Authenticate user or create guest profile
    let user = {
      userId: `guest_${uuidv4().slice(0, 8)}`,
      username: `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
      displayName: `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=guest',
      badges: [],
      isGuest: true
    };

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = {
          userId: decoded.userId,
          username: decoded.username,
          displayName: decoded.username,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${decoded.username}`,
          badges: ['subscriber'],
          isGuest: false
        };
      } catch (err) {
        // Invalid token - fall back to guest
      }
    }

    const meta = {
      ...user,
      channelId,
      isAlive: true
    };

    this.clientMeta.set(ws, meta);
    this.joinRoom(channelId, ws);

    // Setup Event Listeners on client socket
    ws.on('pong', () => {
      const m = this.clientMeta.get(ws);
      if (m) m.isAlive = true;
    });

    ws.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        this.handleMessage(ws, message);
      } catch (err) {
        console.error('[ChatGateway] Invalid message format:', err.message);
      }
    });

    ws.on('close', () => {
      this.leaveRoom(channelId, ws);
      this.clientMeta.delete(ws);
    });

    // Send Welcome & Initial Room State
    ws.send(JSON.stringify({
      type: 'INIT_CONNECTED',
      data: {
        user: meta,
        channelId,
        emotes: EMOTES_CATALOG,
        viewerCount: this.getRoomViewerCount(channelId)
      }
    }));
  }

  joinRoom(channelId, ws) {
    if (!this.rooms.has(channelId)) {
      this.rooms.set(channelId, new Set());
    }
    this.rooms.get(channelId).add(ws);

    // Broadcast updated viewer count to room
    this.broadcastViewerCount(channelId);
  }

  leaveRoom(channelId, ws) {
    if (this.rooms.has(channelId)) {
      const room = this.rooms.get(channelId);
      room.delete(ws);
      if (room.size === 0) {
        this.rooms.delete(channelId);
      } else {
        this.broadcastViewerCount(channelId);
      }
    }
  }

  getRoomViewerCount(channelId) {
    return this.rooms.has(channelId) ? this.rooms.get(channelId).size : 0;
  }

  broadcastViewerCount(channelId) {
    const count = this.getRoomViewerCount(channelId);
    this.broadcastToRoom(channelId, {
      type: 'VIEWER_COUNT_UPDATE',
      data: {
        channelId,
        viewerCount: count
      }
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

      case 'SEND_REACTION':
        this.broadcastToRoom(meta.channelId, {
          type: 'REACTION_FLOAT',
          data: {
            emote: msg.data.emote || '❤️',
            userId: meta.userId
          }
        });
        break;

      default:
        break;
    }
  }

  handleChatMessage(senderMeta, data) {
    const rawText = (data?.text || '').trim();
    if (!rawText || rawText.length > 500) return;

    // Check badges (e.g. broadcaster if sender is channel owner)
    const badges = [...senderMeta.badges];
    if (senderMeta.channelId.includes(senderMeta.userId)) {
      if (!badges.includes('broadcaster')) badges.unshift('broadcaster');
    }

    const chatPayload = {
      type: 'CHAT_MESSAGE',
      data: {
        id: `msg_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
        channelId: senderMeta.channelId,
        sender: {
          userId: senderMeta.userId,
          username: senderMeta.username,
          displayName: senderMeta.displayName,
          avatarUrl: senderMeta.avatarUrl,
          badges: badges,
          isGuest: senderMeta.isGuest
        },
        text: rawText,
        color: this.getUserColor(senderMeta.username),
        timestamp: new Date().toISOString()
      }
    };

    this.broadcastToRoom(senderMeta.channelId, chatPayload);
  }

  broadcastToRoom(channelId, payload) {
    if (!this.rooms.has(channelId)) return;

    const messageStr = JSON.stringify(payload);
    const clients = this.rooms.get(channelId);

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  getUserColor(username) {
    const colors = [
      '#9146FF', '#00F0FF', '#FF007A', '#00FF66',
      '#FFB800', '#FF4D4D', '#A970FF', '#5C16C5'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}

module.exports = new ChatGateway();
