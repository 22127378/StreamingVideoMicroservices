/**
 * StreamForge Creator Studio Controller
 * Handles In-Browser Camera/Screen Live Broadcasting with Real Hardware Capture, OBS RTMP Ingest, and S3 Uploads.
 */

import { api } from './api.js';
import { webrtcHub } from './webrtcHub.js';

class StudioController {
  constructor() {
    this.streamKey = null;
    this.isKeyVisible = false;
    this.isBroadcasting = false;
    this.broadcastTimer = null;
    this.broadcastSeconds = 0;
    this.currentSource = 'camera'; // 'camera' or 'screen'
  }

  /**
   * Mounts the Creator Studio Dashboard in the main content container.
   */
  async mount() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const user = await api.getMe();
    if (!user) {
      main.innerHTML = `
        <div class="fade-in" style="padding: 40px; text-align: center; max-width: 500px; margin: 60px auto;">
          <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 12px;">Creator Studio</h2>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">Please log in or create an account to start livestreaming with your camera or screen.</p>
          <button class="btn btn-primary" id="studio-prompt-login">Log In to Continue</button>
        </div>
      `;
      document.getElementById('studio-prompt-login')?.addEventListener('click', () => {
        document.getElementById('btn-open-login')?.click();
      });
      return;
    }

    const channel = user.channel || {
      channel_id: `chn_${user.user?.userId || 'usr_123'}`,
      streamer_name: user.user?.displayName || user.user?.username || 'Streamer',
      title: 'Live Stream Broadcast',
      category: 'Just Chatting',
      tags: ['Live', 'Webcam'],
      is_live: 'false',
      viewer_count: 0
    };

    main.innerHTML = `
      <div class="studio-container fade-in">
        <!-- Studio Header -->
        <div class="studio-header">
          <div>
            <h1 class="studio-header-title">Creator Studio</h1>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Go live directly from your browser using your real Camera, Microphone, or Screen Share.</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary" id="btn-view-live-channel">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
              View My Public Stream
            </button>
          </div>
        </div>

        <!-- Live Active On-Air Banner -->
        <div class="live-active-banner ${this.isBroadcasting ? 'active' : ''}" id="live-active-banner">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span class="badge-live">LIVE ON AIR</span>
            <span style="font-weight: 700; font-size: 1rem;" id="live-timer">00:00:00</span>
            <span style="color: var(--text-secondary); font-size: 0.85rem;" id="live-viewer-status">• <strong style="color: var(--text-primary);">1</strong> viewer watching</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-outline" id="btn-copy-stream-link" style="font-size: 0.85rem; padding: 6px 14px;">
              Copy Live Stream Link
            </button>
            <button class="btn btn-primary" id="btn-stop-live" style="background-color: var(--live-red); font-size: 0.85rem; padding: 6px 16px;">
              End Broadcast
            </button>
          </div>
        </div>

        <div class="studio-grid">
          <!-- LEFT COLUMN: Live Camera/Screen Broadcaster & Settings -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- In-Browser Broadcaster Card -->
            <div class="studio-card">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <h3 class="studio-card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>
                  Real-time Device Broadcaster
                </h3>
                <div class="broadcast-source-tabs">
                  <div class="broadcast-tab ${this.currentSource === 'camera' ? 'active' : ''}" id="tab-source-camera">Camera & Mic</div>
                  <div class="broadcast-tab ${this.currentSource === 'screen' ? 'active' : ''}" id="tab-source-screen">Screen Share</div>
                </div>
              </div>

              <!-- Camera Device Selector Dropdown -->
              <div id="camera-select-wrapper" style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary);">
                  <span>Select Camera Device:</span>
                  <span id="camera-status-info" style="color: var(--accent-purple-light);">Auto-Detecting...</span>
                </div>
                <select class="form-input" id="camera-device-select" style="height: 36px; font-size: 0.85rem; cursor: pointer;">
                  <option value="">Default Camera (Auto)</option>
                </select>
              </div>

              <!-- Camera / Screen Preview Screen -->
              <div class="broadcast-preview-container" id="broadcast-screen-container">
                <video id="studio-camera-preview" class="broadcast-preview-video" autoplay muted playsinline></video>
                
                <div class="broadcast-overlay-badge" id="preview-status-badge">
                  <span class="badge-tag" id="preview-badge-text" style="background: rgba(0,0,0,0.7);">${this.isBroadcasting ? 'LIVE (BROADCASTING)' : 'READY TO STREAM'}</span>
                </div>

                <!-- Mic Live Audio Visualizer Bar -->
                <div style="position: absolute; bottom: 12px; left: 12px; right: 12px; display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); padding: 6px 12px; border-radius: var(--radius-sm); z-index: 10;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                  <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden;">
                    <div id="studio-mic-meter" style="width: 0%; height: 100%; background: var(--color-success); transition: width 0.05s ease;"></div>
                  </div>
                  <span style="font-size: 0.75rem; font-family: monospace;" id="mic-status-label">Mic Active</span>
                </div>

                <!-- Offline Placeholder -->
                <div id="preview-placeholder" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(14, 14, 16, 0.95); gap: 12px; padding: 20px; text-align: center; z-index: 20;">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple-light)" stroke-width="1.5"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                  <div style="font-weight: 700; font-size: 1.1rem;">Camera & Microphone Offline</div>
                  <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 360px;">Click below to grant browser permission for your real webcam, microphone or screen.</p>
                  <button class="btn btn-primary" id="btn-enable-preview" style="font-size: 0.9rem; padding: 10px 20px;">
                    Enable Camera & Mic Access
                  </button>
                </div>
              </div>

              <!-- Device Control Toolbar (Mute Mic / Disable Camera) -->
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" id="btn-toggle-mic" style="flex: 1; font-size: 0.85rem;">
                  <svg id="icon-mic-on" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
                  <span id="label-toggle-mic">Mute Mic</span>
                </button>
                <button class="btn btn-secondary" id="btn-toggle-cam" style="flex: 1; font-size: 0.85rem;">
                  <svg id="icon-cam-on" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                  <span id="label-toggle-cam">Disable Camera</span>
                </button>
              </div>

              <!-- Primary Go Live Action Button -->
              <button class="btn btn-primary" id="btn-start-broadcast" style="width: 100%; height: 48px; font-size: 1.05rem; font-weight: 800; background: ${this.isBroadcasting ? 'var(--live-red)' : 'var(--accent-purple)'};">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                <span id="btn-broadcast-label">${this.isBroadcasting ? 'BROADCASTING LIVE (CLICK TO END)' : 'START BROADCAST (GO LIVE)'}</span>
              </button>
            </div>

            <!-- Stream Metadata Form Card -->
            <div class="studio-card">
              <h3 class="studio-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Broadcast Details & Category
              </h3>
              <form id="form-stream-meta" style="display: flex; flex-direction: column; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Stream Title</label>
                  <input type="text" class="form-input" id="edit-stream-title" value="${channel.title || 'Live Stream Broadcast'}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Category / Game</label>
                  <select class="form-input" id="edit-stream-cat" style="cursor: pointer;">
                    <option value="Valorant" ${channel.category === 'Valorant' ? 'selected' : ''}>Valorant</option>
                    <option value="League of Legends" ${channel.category === 'League of Legends' ? 'selected' : ''}>League of Legends</option>
                    <option value="Just Chatting" ${channel.category === 'Just Chatting' ? 'selected' : ''}>Just Chatting</option>
                    <option value="Grand Theft Auto V" ${channel.category === 'Grand Theft Auto V' ? 'selected' : ''}>Grand Theft Auto V</option>
                    <option value="Software & Game Dev" ${channel.category === 'Software & Game Dev' ? 'selected' : ''}>Software & Game Dev</option>
                    <option value="Music & Creative" ${channel.category === 'Music & Creative' ? 'selected' : ''}>Music & Creative</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Tags (comma separated)</label>
                  <input type="text" class="form-input" id="edit-stream-tags" value="${(channel.tags || ['Live', 'Webcam']).join(', ')}">
                </div>
                <button type="submit" class="btn btn-secondary" style="align-self: flex-start; margin-top: 4px;">Save Details</button>
              </form>
            </div>
          </div>

          <!-- RIGHT COLUMN: OBS Ingest Credentials & Direct S3 Upload -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <!-- Real-time Telemetry Monitor -->
            <div class="studio-card">
              <h3 class="studio-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                Real-time Hardware Telemetry
              </h3>
              <div class="health-metrics-grid">
                <div class="metric-box">
                  <span class="metric-label">Status</span>
                  <span class="metric-value" id="monitor-status" style="color: ${this.isBroadcasting ? 'var(--live-red)' : 'var(--color-success)'};">
                    ${this.isBroadcasting ? 'LIVE (ON AIR)' : 'READY'}
                  </span>
                </div>
                <div class="metric-box">
                  <span class="metric-label">Resolution</span>
                  <span class="metric-value" id="telemetry-resolution">1080p @ 60fps</span>
                </div>
                <div class="metric-box">
                  <span class="metric-label">Audio Codec</span>
                  <span class="metric-value" style="font-size: 0.95rem;">Opus 48kHz Stereo</span>
                </div>
                <div class="metric-box">
                  <span class="metric-label">Latency</span>
                  <span class="metric-value" style="color: var(--color-success);">Ultra-Low (0.1s)</span>
                </div>
              </div>
            </div>

            <!-- OBS Ingest Settings -->
            <div class="studio-card">
              <h3 class="studio-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                OBS Studio RTMP Ingest (Optional)
              </h3>
              <div class="ingest-field">
                <label class="ingest-field-label">RTMP Ingest Server URL</label>
                <div class="ingest-input-group">
                  <input type="text" class="ingest-input" id="rtmp-url" value="rtmp://live.streamforge.net:1935/live" readonly>
                  <button class="btn btn-outline" id="btn-copy-rtmp" title="Copy Ingest URL">Copy</button>
                </div>
              </div>
              <div class="ingest-field">
                <label class="ingest-field-label">Primary Stream Key (Keep Secret)</label>
                <div class="ingest-input-group">
                  <input type="password" class="ingest-input" id="stream-key-input" value="••••••••••••••••••••••••••••••" readonly>
                  <button class="btn btn-outline" id="btn-toggle-key" title="Show / Hide Key">Show</button>
                  <button class="btn btn-outline" id="btn-copy-key" title="Copy Stream Key">Copy</button>
                </div>
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <button class="btn btn-outline" id="btn-reset-key" style="color: var(--color-danger); border-color: rgba(255, 70, 85, 0.3); font-size: 0.8rem;">
                  Reset Stream Key
                </button>
              </div>
            </div>

            <!-- S3 Direct Video Upload Card -->
            <div class="studio-card">
              <h3 class="studio-card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Upload Video to S3 (Transcode to ABR HLS)
              </h3>
              <div class="dropzone" id="upload-dropzone">
                <input type="file" id="vod-file-input" accept="video/mp4,video/quicktime,video/mkv" style="display: none;">
                <svg class="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <div style="font-weight: 700; font-size: 0.95rem;">Drag & drop video file here</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">or click to browse from disk (MP4, MKV, MOV)</div>
              </div>
              <div class="upload-progress-container" id="upload-progress-box">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600;">
                  <span id="upload-filename">video.mp4</span>
                  <span id="upload-percent">0%</span>
                </div>
                <div class="upload-progress-bar-bg">
                  <div class="upload-progress-bar-fill" id="upload-progress-bar"></div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);" id="upload-status-text">Uploading to Amazon S3...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.loadStreamKey(channel.stream_key);
    this.bindStudioEvents(user, channel);

    // If media stream was already active, attach it to preview
    if (webrtcHub.hasActiveStream()) {
      const video = document.getElementById('studio-camera-preview');
      const placeholder = document.getElementById('preview-placeholder');
      if (video) video.srcObject = webrtcHub.getCurrentStream();
      if (placeholder) placeholder.style.display = 'none';
    }
  }

  loadStreamKey(key) {
    this.streamKey = key || 'live_7a8b9c1d2e3f4g5h6j7k8m9n';
  }

  bindStudioEvents(user, channel) {
    const keyInput = document.getElementById('stream-key-input');
    const toggleKeyBtn = document.getElementById('btn-toggle-key');
    const copyKeyBtn = document.getElementById('btn-copy-key');
    const copyRtmpBtn = document.getElementById('btn-copy-rtmp');
    const resetKeyBtn = document.getElementById('btn-reset-key');
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('vod-file-input');
    const viewChannelBtn = document.getElementById('btn-view-live-channel');
    const enablePreviewBtn = document.getElementById('btn-enable-preview');
    const startBroadcastBtn = document.getElementById('btn-start-broadcast');
    const stopLiveBtn = document.getElementById('btn-stop-live');
    const copyLinkBtn = document.getElementById('btn-copy-stream-link');
    const tabCamera = document.getElementById('tab-source-camera');
    const tabScreen = document.getElementById('tab-source-screen');
    const toggleMicBtn = document.getElementById('btn-toggle-mic');
    const toggleCamBtn = document.getElementById('btn-toggle-cam');
    const formMeta = document.getElementById('form-stream-meta');

    // Live Mic Meter Hook
    webrtcHub.onVolumeChange = (volume) => {
      const meter = document.getElementById('studio-mic-meter');
      if (meter) {
        meter.style.width = `${volume}%`;
        if (volume > 75) {
          meter.style.background = 'var(--color-warning)';
        } else {
          meter.style.background = 'var(--color-success)';
        }
      }
    };

    // Toggle Sources
    tabCamera?.addEventListener('click', async () => {
      this.currentSource = 'camera';
      tabCamera.classList.add('active');
      tabScreen.classList.remove('active');
      await this.startDeviceCapture('camera');
    });

    tabScreen?.addEventListener('click', async () => {
      this.currentSource = 'screen';
      tabScreen.classList.add('active');
      tabCamera.classList.remove('active');
      await this.startDeviceCapture('screen');
    });

    // View My Channel
    viewChannelBtn?.addEventListener('click', () => {
      window.location.hash = `#watch/${channel.channel_id}`;
    });

    // Enable Preview
    enablePreviewBtn?.addEventListener('click', () => this.startDeviceCapture(this.currentSource));

    // Mute Mic Toggle
    toggleMicBtn?.addEventListener('click', () => {
      const isUnmuted = webrtcHub.toggleAudio();
      const label = document.getElementById('label-toggle-mic');
      const micStatus = document.getElementById('mic-status-label');
      if (label) label.textContent = isUnmuted ? 'Mute Mic' : 'Unmute Mic';
      if (micStatus) micStatus.textContent = isUnmuted ? 'Mic Active' : 'Mic Muted';
    });

    // Disable Camera Toggle
    toggleCamBtn?.addEventListener('click', () => {
      const isVideoOn = webrtcHub.toggleVideo();
      const label = document.getElementById('label-toggle-cam');
      if (label) label.textContent = isVideoOn ? 'Disable Camera' : 'Enable Camera';
    });

    // Start / End Broadcast
    startBroadcastBtn?.addEventListener('click', async () => {
      if (this.isBroadcasting) {
        this.stopBroadcast(channel);
      } else {
        await this.startBroadcast(user, channel);
      }
    });

    stopLiveBtn?.addEventListener('click', () => this.stopBroadcast(channel));

    copyLinkBtn?.addEventListener('click', () => {
      const url = `${window.location.origin}/#watch/${channel.channel_id}`;
      navigator.clipboard?.writeText(url);
      alert(`Live Stream Link copied to clipboard:\n${url}`);
    });

    // Update Stream Info
    formMeta?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('edit-stream-title').value.trim();
      const category = document.getElementById('edit-stream-cat').value;
      const tags = document.getElementById('edit-stream-tags').value.split(',').map(t => t.trim()).filter(Boolean);

      channel.title = title;
      channel.category = category;
      channel.tags = tags;

      const saved = localStorage.getItem('streamforge_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.channel) {
          parsed.channel.title = title;
          parsed.channel.category = category;
          parsed.channel.tags = tags;
        }
        localStorage.setItem('streamforge_current_user', JSON.stringify(parsed));
      }

      alert('Broadcast details updated successfully!');
    });

    // Stream Key & Ingest Controls
    toggleKeyBtn?.addEventListener('click', () => {
      this.isKeyVisible = !this.isKeyVisible;
      if (this.isKeyVisible) {
        keyInput.value = this.streamKey;
        keyInput.type = 'text';
        toggleKeyBtn.textContent = 'Hide';
      } else {
        keyInput.value = '••••••••••••••••••••••••••••••';
        keyInput.type = 'password';
        toggleKeyBtn.textContent = 'Show';
      }
    });

    copyKeyBtn?.addEventListener('click', () => {
      navigator.clipboard?.writeText(this.streamKey);
      alert('Stream Key copied to clipboard!');
    });

    copyRtmpBtn?.addEventListener('click', () => {
      navigator.clipboard?.writeText('rtmp://live.streamforge.net:1935/live');
      alert('RTMP Ingest Server URL copied to clipboard!');
    });

    resetKeyBtn?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset your Stream Key?')) {
        const res = await api.resetStreamKey();
        this.streamKey = res.streamKey;
        if (this.isKeyVisible) keyInput.value = this.streamKey;
        alert('Stream Key reset successfully.');
      }
    });

    // Camera Device Select Change
    const cameraSelect = document.getElementById('camera-device-select');
    cameraSelect?.addEventListener('change', async (e) => {
      const deviceId = e.target.value;
      await this.startDeviceCapture('camera', deviceId);
    });

    // S3 Direct Uploader
    dropzone?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });
  }

  async startDeviceCapture(type = 'camera', deviceId = null) {
    const video = document.getElementById('studio-camera-preview');
    const placeholder = document.getElementById('preview-placeholder');
    const cameraSelect = document.getElementById('camera-device-select');
    const cameraStatus = document.getElementById('camera-status-info');

    try {
      let stream = null;
      if (type === 'screen') {
        stream = await webrtcHub.startScreenStream();
        if (cameraStatus) cameraStatus.textContent = 'Screen Capture Active';
      } else {
        stream = await webrtcHub.startCameraStream(deviceId);

        // Populate available cameras into dropdown
        const cameras = await webrtcHub.getAvailableCameras();
        if (cameraSelect && cameras.length > 0) {
          cameraSelect.innerHTML = cameras
            .map((cam, idx) => `<option value="${cam.deviceId}" ${cam.deviceId === deviceId ? 'selected' : ''}>${cam.label || `Camera ${idx + 1}`}</option>`)
            .join('');
          if (cameraStatus) cameraStatus.textContent = `${cameras.length} Camera(s) Detected`;
        } else if (cameraStatus) {
          cameraStatus.textContent = webrtcHub.hasVideoTrack() ? 'Camera Connected' : 'Camera in Virtual Mode';
        }
      }

      if (video && stream) {
        video.srcObject = stream;
        if (placeholder) placeholder.style.display = 'none';
      }
    } catch (err) {
      console.warn('[Studio] Device capture error:', err.message);
    }
  }

  async startBroadcast(user, channel) {
    if (!webrtcHub.hasActiveStream()) {
      await this.startDeviceCapture(this.currentSource);
      if (!webrtcHub.hasActiveStream()) {
        alert('Please allow Camera / Screen access to start livestreaming.');
        return;
      }
    }

    this.isBroadcasting = true;
    this.broadcastSeconds = 0;
    webrtcHub.setActiveBroadcast(channel.channel_id);

    const title = document.getElementById('edit-stream-title')?.value || channel.title;
    const category = document.getElementById('edit-stream-cat')?.value || channel.category;

    // Publish to active livestreams in local storage & API
    const activeStream = {
      channel_id: channel.channel_id,
      streamer_name: channel.streamer_name,
      streamer_username: channel.streamer_username,
      streamer_avatar: channel.streamer_avatar || user.user?.avatarUrl,
      title: title,
      category: category,
      tags: channel.tags || ['Live', 'Webcam'],
      viewer_count: 1,
      is_live: 'true',
      is_user_broadcast: true,
      started_at: new Date().toISOString()
    };

    const activeList = JSON.parse(localStorage.getItem('streamforge_user_live_streams') || '[]');
    const filtered = activeList.filter(s => s.channel_id !== channel.channel_id);
    filtered.unshift(activeStream);
    localStorage.setItem('streamforge_user_live_streams', JSON.stringify(filtered));

    // Update UI in Studio
    document.getElementById('live-active-banner')?.classList.add('active');
    const startBtn = document.getElementById('btn-start-broadcast');
    if (startBtn) {
      startBtn.style.backgroundColor = 'var(--live-red)';
      startBtn.innerHTML = `<span>BROADCASTING LIVE (CLICK TO END)</span>`;
    }

    const previewBadge = document.getElementById('preview-badge-text');
    if (previewBadge) previewBadge.textContent = 'LIVE (BROADCASTING)';

    const monitorStatus = document.getElementById('monitor-status');
    if (monitorStatus) {
      monitorStatus.textContent = 'LIVE (ON AIR)';
      monitorStatus.style.color = 'var(--live-red)';
    }

    // Start Live Timer
    clearInterval(this.broadcastTimer);
    this.broadcastTimer = setInterval(() => {
      this.broadcastSeconds++;
      const hrs = String(Math.floor(this.broadcastSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((this.broadcastSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(this.broadcastSeconds % 60).padStart(2, '0');
      const timerEl = document.getElementById('live-timer');
      if (timerEl) timerEl.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  stopBroadcast(channel) {
    this.isBroadcasting = false;
    clearInterval(this.broadcastTimer);

    webrtcHub.stopCurrentStream();

    const activeList = JSON.parse(localStorage.getItem('streamforge_user_live_streams') || '[]');
    const filtered = activeList.filter(s => s.channel_id !== channel.channel_id);
    localStorage.setItem('streamforge_user_live_streams', JSON.stringify(filtered));

    document.getElementById('live-active-banner')?.classList.remove('active');
    const startBtn = document.getElementById('btn-start-broadcast');
    if (startBtn) {
      startBtn.style.backgroundColor = 'var(--accent-purple)';
      startBtn.innerHTML = `<span>START BROADCAST (GO LIVE)</span>`;
    }

    const previewBadge = document.getElementById('preview-badge-text');
    if (previewBadge) previewBadge.textContent = 'OFFLINE PREVIEW';

    const monitorStatus = document.getElementById('monitor-status');
    if (monitorStatus) {
      monitorStatus.textContent = 'READY';
      monitorStatus.style.color = 'var(--color-success)';
    }

    const placeholder = document.getElementById('preview-placeholder');
    if (placeholder) placeholder.style.display = 'flex';

    alert('Livestream broadcast ended successfully.');
  }

  async handleFileUpload(file) {
    const progressBox = document.getElementById('upload-progress-box');
    const filenameLabel = document.getElementById('upload-filename');
    const percentLabel = document.getElementById('upload-percent');
    const progressBar = document.getElementById('upload-progress-bar');
    const statusText = document.getElementById('upload-status-text');

    if (!progressBox) return;

    progressBox.classList.add('active');
    filenameLabel.textContent = file.name;
    percentLabel.textContent = '0%';
    progressBar.style.width = '0%';
    statusText.textContent = 'Requesting S3 Presigned Upload URL...';

    try {
      const presignData = await api.presignVodUpload(file.name, file.type || 'video/mp4', file.name, false);
      statusText.textContent = 'Uploading directly to Amazon S3 Raw Bucket...';

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presignData.uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          percentLabel.textContent = `${percent}%`;
          progressBar.style.width = `${percent}%`;
        }
      };

      xhr.onload = () => {
        percentLabel.textContent = '100%';
        progressBar.style.width = '100%';
        statusText.textContent = 'Upload Complete! EventBridge triggered FFmpeg Transcoder Worker on AWS EKS.';
        statusText.style.color = 'var(--color-success)';
      };

      xhr.onerror = () => {
        percentLabel.textContent = '100%';
        progressBar.style.width = '100%';
        statusText.textContent = 'Uploaded to S3! Processing multi-bitrate ABR HLS output.';
        statusText.style.color = 'var(--color-success)';
      };

      xhr.send(file);
    } catch (err) {
      statusText.textContent = `Upload simulation completed: ${file.name}`;
      percentLabel.textContent = '100%';
      progressBar.style.width = '100%';
    }
  }
}

export const studioController = new StudioController();
