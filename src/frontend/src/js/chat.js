/**
 * StreamForge Realtime Live Chat Controller
 * Manages WebSocket chat rooms, message stream, text badges, auto-scrolling, and viewer counting.
 */

import { api } from './api.js';

class ChatController {
  constructor() {
    this.ws = null;
    this.currentChannelId = null;
    this.messagesContainer = null;
    this.isAutoScroll = true;
    this.reconnectTimer = null;
  }

  /**
   * Mounts the live chat panel and connects to WebSocket.
   * @param {string} channelId 
   */
  mount(channelId) {
    this.currentChannelId = channelId;
    const container = document.getElementById('live-chat-column');
    if (!container) return;

    container.innerHTML = `
      <div class="chat-panel">
        <!-- Chat Header -->
        <div class="chat-header">
          <span class="chat-header-title">Stream Chat</span>
          <div class="chat-viewer-counter" title="Live Viewers Connected">
            <span class="live-pulse"></span>
            <span id="chat-online-count">0</span>
          </div>
        </div>

        <!-- Chat Messages Container -->
        <div class="chat-messages-container" id="chat-messages-box">
          <div class="chat-system-message">
            Welcome to the StreamForge live chat room! Please follow community guidelines and be respectful.
          </div>
        </div>

        <!-- Scroll to Bottom Pill Button -->
        <div class="chat-scroll-bottom-btn" id="btn-scroll-bottom">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          <span>More messages below</span>
        </div>

        <!-- Chat Input Footer -->
        <div class="chat-footer">
          <form id="chat-send-form" class="chat-input-wrapper">
            <input 
              type="text" 
              class="chat-input" 
              id="chat-input-field" 
              placeholder="Send a message..." 
              autocomplete="off" 
              maxlength="500"
            >
            <button type="submit" class="chat-send-btn" id="btn-send-chat" title="Send Message">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
          <div class="chat-footer-meta">
            <span>Slow Mode: Off</span>
            <span id="chat-user-indicator">Connected as Guest</span>
          </div>
        </div>
      </div>
    `;

    this.messagesContainer = document.getElementById('chat-messages-box');
    this.bindEvents();
    this.connectWebSocket();
  }

  bindEvents() {
    const form = document.getElementById('chat-send-form');
    const input = document.getElementById('chat-input-field');
    const scrollBtn = document.getElementById('btn-scroll-bottom');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      this.sendMessage(text);
      input.value = '';
    });

    // Detect user manual scroll to toggle auto-scroll
    this.messagesContainer?.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
      this.isAutoScroll = isAtBottom;

      if (isAtBottom) {
        scrollBtn?.classList.remove('visible');
      } else {
        scrollBtn?.classList.add('visible');
      }
    });

    scrollBtn?.addEventListener('click', () => {
      this.scrollToBottom();
      scrollBtn.classList.remove('visible');
    });
  }

  connectWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    const token = api.getToken();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?channelId=${this.currentChannelId}${token ? `&token=${token}` : ''}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[ChatController] Connected to channel room: ${this.currentChannelId}`);
        const userIndicator = document.getElementById('chat-user-indicator');
        if (userIndicator) {
          userIndicator.textContent = token ? 'Connected (Authenticated)' : 'Connected as Guest';
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleIncomingPayload(payload);
        } catch (e) {
          console.error('[ChatController] Invalid JSON payload from server:', e);
        }
      };

      this.ws.onclose = () => {
        console.warn('[ChatController] WebSocket disconnected. Retrying in 4s...');
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          if (window.location.hash.startsWith('#watch/')) {
            this.connectWebSocket();
          }
        }, 4000);
      };

      this.ws.onerror = () => {
        // Provide demo simulated messages if server is offline
        this.startDemoChatStream();
      };
    } catch (err) {
      this.startDemoChatStream();
    }
  }

  handleIncomingPayload(payload) {
    switch (payload.type) {
      case 'INIT_CONNECTED':
        this.updateViewerCount(payload.data.viewerCount || 1);
        break;

      case 'VIEWER_COUNT_UPDATE':
        this.updateViewerCount(payload.data.viewerCount);
        break;

      case 'CHAT_MESSAGE':
        this.appendMessage(payload.data);
        break;

      default:
        break;
    }
  }

  sendMessage(text) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        data: { text }
      }));
    } else {
      // Fallback local append
      this.appendMessage({
        id: `local_${Date.now()}`,
        sender: {
          username: 'You',
          badges: ['subscriber'],
          isGuest: false
        },
        text,
        color: '#9146FF',
        timestamp: new Date().toISOString()
      });
    }
  }

  appendMessage(msg) {
    if (!this.messagesContainer) return;

    const time = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const badgesHtml = (msg.sender?.badges || []).map((b) => `<span class="badge-chat ${b}">${b}</span>`).join('');
    const usernameColor = msg.color || '#9146FF';

    const row = document.createElement('div');
    row.className = 'chat-message-row';
    row.innerHTML = `
      <span class="chat-timestamp">${time}</span>
      ${badgesHtml}
      <span class="chat-username" style="color: ${usernameColor};">${msg.sender?.displayName || msg.sender?.username || 'Guest'}:</span>
      <span class="chat-text">${this.escapeHtml(msg.text)}</span>
    `;

    this.messagesContainer.appendChild(row);

    // Keep max 200 messages in DOM for smooth performance
    if (this.messagesContainer.children.length > 200) {
      this.messagesContainer.removeChild(this.messagesContainer.children[0]);
    }

    if (this.isAutoScroll) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  updateViewerCount(count) {
    const counter = document.getElementById('chat-online-count');
    if (counter) {
      counter.textContent = this.formatNumber(count);
    }
  }

  startDemoChatStream() {
    // Generate simulated dynamic chat messages for preview when offline
    if (this.demoInterval) clearInterval(this.demoInterval);

    const demoSenders = [
      { name: 'ViperMain', color: '#00F0FF', badges: ['subscriber'], texts: ['Insane clutch right there!', 'Let us go!!', 'Great aim!'] },
      { name: 'CloudArchitect', color: '#00F59B', badges: ['moderator'], texts: ['Welcome everyone to the stream!', 'Audio and 1080p stream looking crisp.'] },
      { name: 'RadiantGamer', color: '#FFB800', badges: ['vip'], texts: ['GG WP!', 'What sensitivity are you using?'] },
      { name: 'SentinelsFan', color: '#FF4655', badges: ['subscriber'], texts: ['TenZ is unreal today!', 'Next level crosshair placement.'] }
    ];

    this.demoInterval = setInterval(() => {
      if (!window.location.hash.startsWith('#watch/')) {
        clearInterval(this.demoInterval);
        return;
      }
      const randomSender = demoSenders[Math.floor(Math.random() * demoSenders.length)];
      const randomText = randomSender.texts[Math.floor(Math.random() * randomSender.texts.length)];

      this.appendMessage({
        id: `demo_${Date.now()}`,
        sender: {
          username: randomSender.name,
          displayName: randomSender.name,
          badges: randomSender.badges
        },
        text: randomText,
        color: randomSender.color,
        timestamp: new Date().toISOString()
      });
    }, 4500);
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}

export const chatController = new ChatController();
