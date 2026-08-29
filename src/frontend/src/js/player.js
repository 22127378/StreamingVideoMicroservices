/**
 * StreamForge HLS.js Live Player Controller
 * Handles Adaptive Bitrate Playback, Quality Switcher, Low-Latency Live Sync, and Telemetry.
 */

import Hls from 'hls.js';
import { api } from './api.js';
import { MOCK_CHANNELS } from './mockData.js';

class PlayerController {
  constructor() {
    this.hls = null;
    this.video = null;
    this.currentChannel = null;
    this.isStatsOpen = false;
    this.statsInterval = null;
  }

  /**
   * Mounts the Watch Page layout and initializes HLS playback for a channel.
   * @param {string} channelId 
   */
  async mount(channelId) {
    const main = document.getElementById('main-content');
    if (!main) return;

    let channel = await api.getChannelById(channelId);
    if (!channel) {
      channel = MOCK_CHANNELS[0];
    }
    this.currentChannel = channel;

    // Render Watch Page Structure (Video Column + Chat Column)
    main.innerHTML = `
      <div class="watch-layout fade-in">
        <!-- Left Video & Streamer Details Column -->
        <div class="watch-video-column">
          <!-- Video Player Container -->
          <div class="player-container" id="player-container">
            <video id="streamforge-video" class="player-video" playsinline></video>

            <!-- VIP Locked Overlay -->
            <div class="vip-lock-overlay" id="vip-lock-overlay">
              <svg class="vip-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <h2 style="font-size: 1.4rem; font-weight: 800;">Subscriber VIP Stream Only</h2>
              <p style="color: var(--text-secondary); max-width: 400px; font-size: 0.9rem;">
                This premium stream is protected by Amazon CloudFront Signed Cookies. Unlock with active VIP membership to watch in 1080p60.
              </p>
              <button class="btn btn-primary" id="btn-unlock-vip" style="padding: 10px 24px; font-size: 0.95rem;">
                Unlock VIP Stream
              </button>
            </div>

            <!-- Stats for Nerds Panel -->
            <div class="player-stats-panel" id="player-stats-panel">
              <div style="font-weight: bold; color: var(--text-primary); margin-bottom: 4px;">StreamForge Telemetry</div>
              <div>Playback URL: <span id="stat-url" style="color: var(--text-secondary);"></span></div>
              <div>Resolution: <span id="stat-resolution">--</span></div>
              <div>Current Bitrate: <span id="stat-bitrate">--</span></div>
              <div>Buffer Length: <span id="stat-buffer">--</span></div>
              <div>Dropped Frames: <span id="stat-dropped">0</span></div>
              <div>Latency to Live Edge: <span id="stat-latency">--</span></div>
            </div>

            <!-- Player Controls Overlay -->
            <div class="player-controls-overlay" id="player-controls">
              <!-- Top Bar -->
              <div class="player-top-bar">
                <div class="player-stream-info">
                  <img class="player-streamer-avatar" src="${channel.streamer_avatar}" alt="${channel.streamer_name}">
                  <div>
                    <div class="player-streamer-name">${channel.streamer_name}</div>
                    <div class="player-category-tag">${channel.category}</div>
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn-icon" id="btn-toggle-stats" title="Toggle Stream Stats" style="background: rgba(0,0,0,0.5); color: #fff;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  </button>
                </div>
              </div>

              <!-- Bottom Bar -->
              <div class="player-bottom-bar">
                <!-- Seekbar -->
                <div class="player-progress-container" id="player-progress">
                  <div class="player-progress-bar" id="player-progress-bar"></div>
                </div>

                <!-- Toolbar Actions -->
                <div class="player-toolbar">
                  <div class="player-toolbar-left">
                    <button class="player-btn" id="btn-play-pause" title="Play / Pause">
                      <svg id="icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      <svg id="icon-pause" style="display: none;" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    </button>

                    <div class="player-live-sync" id="btn-live-sync" title="Sync to Live Edge">
                      <span class="live-dot"></span>
                      <span>LIVE</span>
                    </div>

                    <div class="player-volume-wrapper">
                      <button class="player-btn" id="btn-volume-toggle" title="Mute / Unmute">
                        <svg id="icon-vol-high" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        <svg id="icon-vol-mute" style="display: none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                      </button>
                      <input type="range" class="player-volume-slider" id="player-volume" min="0" max="1" step="0.05" value="0.8">
                    </div>
                  </div>

                  <div class="player-toolbar-right">
                    <!-- Quality Menu Selector -->
                    <div class="quality-menu-container">
                      <button class="player-btn" id="btn-quality-menu" title="Quality Settings">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                      </button>
                      <div class="quality-popup-menu" id="quality-popup-menu">
                        <div class="quality-menu-item active" data-quality-index="-1">Auto (ABR)</div>
                        <!-- Populated dynamically by Hls manifest levels -->
                      </div>
                    </div>

                    <!-- Fullscreen Button -->
                    <button class="player-btn" id="btn-fullscreen" title="Fullscreen">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Streamer Info & Metadata Container -->
          <div class="stream-meta-container">
            <div class="stream-meta-header">
              <div class="stream-author-wrapper">
                <img class="stream-author-avatar" src="${channel.streamer_avatar}" alt="${channel.streamer_name}">
                <div>
                  <h1 class="stream-meta-title">${channel.title}</h1>
                  <p class="stream-meta-streamer">${channel.streamer_name} <span class="badge-tag" style="margin-left: 6px;">${channel.category}</span></p>
                  <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
                    ${(channel.tags || []).map(t => `<span class="badge-tag">${t}</span>`).join('')}
                  </div>
                </div>
              </div>
              <div class="stream-actions">
                <button class="btn btn-primary" id="btn-follow-streamer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  <span id="follow-btn-text">Follow</span>
                </button>
                <button class="btn btn-outline" id="btn-share-stream" title="Copy Stream Link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Live Chat Column Container (Mounted by chat.js in Feature 4.4) -->
        <div id="live-chat-column" style="width: var(--chat-width); height: 100%; border-left: 1px solid var(--border-subtle); display: flex; flex-direction: column; background-color: var(--bg-secondary);">
          <!-- Live chat rendered here -->
        </div>
      </div>
    `;

    this.video = document.getElementById('streamforge-video');

    // Check if watching active local hardware camera / screen broadcast
    const { webrtcHub } = await import('./webrtcHub.js');
    if (channel.is_user_broadcast && webrtcHub.hasActiveStream()) {
      console.log('[PlayerController] Playing Real-time Hardware Device Broadcast Stream (Camera/Screen).');
      if (this.hls) this.hls.destroy();
      this.video.srcObject = webrtcHub.getCurrentStream();
      this.video.play().catch(() => {});
      this.updatePlayPauseIcon(true);

      const statsRes = document.getElementById('stat-resolution');
      const statsBitrate = document.getElementById('stat-bitrate');
      if (statsRes) statsRes.textContent = '1920x1080 (Real Device Stream)';
      if (statsBitrate) statsBitrate.textContent = 'Direct Hardware Capture (0ms Latency)';
    } else {
      this.initHls(channel.playback_url || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
    }

    this.bindPlayerEvents();

    // Mount Live Chat component
    import('./chat.js').then(({ chatController }) => {
      chatController.mount(channel.channel_id);
    });
  }

  initHls(streamUrl) {
    if (this.hls) {
      this.hls.destroy();
    }

    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5
      });

      this.hls.loadSource(streamUrl);
      this.hls.attachMedia(this.video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        this.populateQualityMenu(data.levels);
        this.video.play().catch(() => {
          // Autoplay policy prevented playback, video stays paused
          this.updatePlayPauseIcon(false);
        });
      });

      this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        this.updateStats();
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS.js] Network error encountered, attempting recovery...');
              this.hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS.js] Media error encountered, recovering...');
              this.hls.recoverMediaError();
              break;
            default:
              console.error('[HLS.js] Fatal unrecoverable error:', data);
              this.hls.destroy();
              break;
          }
        }
      });
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      this.video.src = streamUrl;
      this.video.play().catch(() => {});
    }
  }

  populateQualityMenu(levels) {
    const menu = document.getElementById('quality-popup-menu');
    if (!menu) return;

    let itemsHtml = `<div class="quality-menu-item active" data-quality-index="-1">Auto (ABR)</div>`;

    levels.forEach((lvl, index) => {
      const label = lvl.height ? `${lvl.height}p` : `${Math.round(lvl.bitrate / 1000)}k`;
      itemsHtml += `<div class="quality-menu-item" data-quality-index="${index}">${label}</div>`;
    });

    menu.innerHTML = itemsHtml;

    menu.querySelectorAll('.quality-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-quality-index'), 10);
        menu.querySelectorAll('.quality-menu-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        if (this.hls) {
          this.hls.currentLevel = idx; // -1 for Auto, index for locked variant
        }
        menu.classList.remove('open');
      });
    });
  }

  bindPlayerEvents() {
    const playPauseBtn = document.getElementById('btn-play-pause');
    const liveSyncBtn = document.getElementById('btn-live-sync');
    const volumeToggleBtn = document.getElementById('btn-volume-toggle');
    const volumeSlider = document.getElementById('player-volume');
    const qualityMenuBtn = document.getElementById('btn-quality-menu');
    const qualityMenu = document.getElementById('quality-popup-menu');
    const fullscreenBtn = document.getElementById('btn-fullscreen');
    const toggleStatsBtn = document.getElementById('btn-toggle-stats');
    const statsPanel = document.getElementById('player-stats-panel');
    const unlockVipBtn = document.getElementById('btn-unlock-vip');
    const followBtn = document.getElementById('btn-follow-streamer');
    const shareBtn = document.getElementById('btn-share-stream');

    // Play / Pause Toggle
    playPauseBtn?.addEventListener('click', () => {
      if (this.video.paused) {
        this.video.play();
        this.updatePlayPauseIcon(true);
      } else {
        this.video.pause();
        this.updatePlayPauseIcon(false);
      }
    });

    this.video?.addEventListener('play', () => this.updatePlayPauseIcon(true));
    this.video?.addEventListener('pause', () => this.updatePlayPauseIcon(false));

    // Live Sync Button
    liveSyncBtn?.addEventListener('click', () => {
      if (this.hls && this.hls.liveSyncPosition) {
        this.video.currentTime = this.hls.liveSyncPosition;
      }
    });

    // Volume Controls
    volumeSlider?.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      this.video.volume = vol;
      this.video.muted = vol === 0;
      this.updateVolumeIcon(vol > 0);
    });

    volumeToggleBtn?.addEventListener('click', () => {
      this.video.muted = !this.video.muted;
      this.updateVolumeIcon(!this.video.muted && this.video.volume > 0);
    });

    // Quality Selector Popup Toggle
    qualityMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      qualityMenu.classList.toggle('open');
    });

    document.addEventListener('click', () => qualityMenu?.classList.remove('open'));

    // Fullscreen Toggle
    fullscreenBtn?.addEventListener('click', () => {
      const container = document.getElementById('player-container');
      if (!document.fullscreenElement) {
        container.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });

    // Stats for Nerds
    toggleStatsBtn?.addEventListener('click', () => {
      this.isStatsOpen = !this.isStatsOpen;
      if (this.isStatsOpen) {
        statsPanel.classList.add('open');
        this.startStatsUpdater();
      } else {
        statsPanel.classList.remove('open');
        clearInterval(this.statsInterval);
      }
    });

    // VIP Unlock
    unlockVipBtn?.addEventListener('click', async () => {
      try {
        await api.unlockVipStream(this.currentChannel.channel_id);
        document.getElementById('vip-lock-overlay')?.classList.remove('open');
        this.initHls(this.currentChannel.playback_url);
      } catch (err) {
        alert('VIP unlock request failed.');
      }
    });

    // Follow Button
    followBtn?.addEventListener('click', async () => {
      const textSpan = document.getElementById('follow-btn-text');
      const isFollowing = textSpan.textContent === 'Following';

      if (isFollowing) {
        textSpan.textContent = 'Follow';
        followBtn.classList.remove('btn-secondary');
        followBtn.classList.add('btn-primary');
      } else {
        textSpan.textContent = 'Following';
        followBtn.classList.remove('btn-primary');
        followBtn.classList.add('btn-secondary');
      }

      try {
        await api.toggleFollow(this.currentChannel.channel_id, this.currentChannel.viewer_count);
      } catch (e) {
        // Fallback smooth visual feedback
      }
    });

    // Share Button
    shareBtn?.addEventListener('click', () => {
      navigator.clipboard?.writeText(window.location.href);
      alert('Stream link copied to clipboard!');
    });
  }

  updatePlayPauseIcon(isPlaying) {
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const container = document.getElementById('player-container');
    if (!iconPlay || !iconPause || !container) return;

    if (isPlaying) {
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
      container.classList.remove('paused');
    } else {
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
      container.classList.add('paused');
    }
  }

  updateVolumeIcon(hasSound) {
    const iconHigh = document.getElementById('icon-vol-high');
    const iconMute = document.getElementById('icon-vol-mute');
    if (!iconHigh || !iconMute) return;

    if (hasSound) {
      iconHigh.style.display = 'block';
      iconMute.style.display = 'none';
    } else {
      iconHigh.style.display = 'none';
      iconMute.style.display = 'block';
    }
  }

  startStatsUpdater() {
    clearInterval(this.statsInterval);
    this.statsInterval = setInterval(() => this.updateStats(), 1000);
    this.updateStats();
  }

  updateStats() {
    if (!this.isStatsOpen) return;
    const statUrl = document.getElementById('stat-url');
    const statRes = document.getElementById('stat-resolution');
    const statBitrate = document.getElementById('stat-bitrate');
    const statBuffer = document.getElementById('stat-buffer');
    const statLatency = document.getElementById('stat-latency');

    if (statUrl) statUrl.textContent = this.currentChannel?.playback_url?.slice(0, 45) + '...';
    if (this.video) {
      if (statRes) statRes.textContent = `${this.video.videoWidth}x${this.video.videoHeight}`;
      if (statBuffer && this.video.buffered.length > 0) {
        const buffered = this.video.buffered.end(this.video.buffered.length - 1) - this.video.currentTime;
        statBuffer.textContent = `${buffered.toFixed(2)} s`;
      }
    }

    if (this.hls) {
      const currentLevel = this.hls.levels[this.hls.currentLevel];
      if (currentLevel && statBitrate) {
        statBitrate.textContent = `${Math.round(currentLevel.bitrate / 1000)} kbps (${currentLevel.height}p)`;
      }
      if (statLatency && this.hls.latency) {
        statLatency.textContent = `${this.hls.latency.toFixed(2)} s`;
      }
    }
  }
}

export const playerController = new PlayerController();
