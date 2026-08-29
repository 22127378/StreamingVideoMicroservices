/**
 * StreamForge Frontend Main Application
 * Handles SPA Routing, Navigation, State Management, and View Rendering.
 */

import { api } from './api.js';
import { MOCK_CHANNELS, MOCK_CATEGORIES, MOCK_FEATURED_STREAM } from './mockData.js';

class StreamForgeApp {
  constructor() {
    this.currentUser = null;
    this.currentChannel = null;
    this.channels = [];
    this.categories = [];
    this.currentView = 'browse';
    this.isSidebarCollapsed = false;

    this.init();
  }

  async init() {
    this.bindGlobalEvents();
    await this.checkAuthStatus();
    await this.loadInitialData();
    this.handleRoute();
  }

  bindGlobalEvents() {
    // Hash Change Navigation
    window.addEventListener('hashchange', () => this.handleRoute());

    // Navigation Links
    document.getElementById('nav-brand-btn')?.addEventListener('click', () => this.navigate('browse'));
    document.getElementById('nav-browse-btn')?.addEventListener('click', () => this.navigate('browse'));
    document.getElementById('nav-categories-btn')?.addEventListener('click', () => this.navigate('categories'));
    document.getElementById('nav-vods-btn')?.addEventListener('click', () => this.navigate('vods'));
    document.getElementById('nav-studio-btn')?.addEventListener('click', () => this.navigate('studio'));

    // Sidebar Toggle
    document.getElementById('sidebar-toggle-btn')?.addEventListener('click', () => this.toggleSidebar());

    // Search Bar Filter
    document.getElementById('search-input')?.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Auth Modal Handlers
    this.bindAuthModalEvents();
  }

  toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    if (this.isSidebarCollapsed) {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
  }

  navigate(view, param = null) {
    if (param) {
      window.location.hash = `#${view}/${param}`;
    } else {
      window.location.hash = `#${view}`;
    }
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || 'browse';
    const [view, param] = hash.split('/');

    this.currentView = view;
    this.updateActiveNavLinks(view);

    switch (view) {
      case 'browse':
        this.renderBrowseView();
        break;
      case 'categories':
        this.renderCategoriesView();
        break;
      case 'vods':
        this.renderVodsView();
        break;
      case 'watch':
        this.renderWatchView(param);
        break;
      case 'studio':
        this.renderStudioView();
        break;
      default:
        this.renderBrowseView();
        break;
    }
  }

  updateActiveNavLinks(activeView) {
    document.querySelectorAll('.nav-link').forEach((link) => link.classList.remove('active'));
    if (activeView === 'browse') document.getElementById('nav-browse-btn')?.classList.add('active');
    if (activeView === 'categories') document.getElementById('nav-categories-btn')?.classList.add('active');
    if (activeView === 'vods') document.getElementById('nav-vods-btn')?.classList.add('active');
  }

  async checkAuthStatus() {
    try {
      const data = await api.getMe();
      if (data && data.user) {
        this.currentUser = data.user;
        this.currentChannel = data.channel;
        this.renderUserHeader(true);
      } else {
        this.renderUserHeader(false);
      }
    } catch (e) {
      this.renderUserHeader(false);
    }
  }

  renderUserHeader(isLoggedIn) {
    const unlogged = document.getElementById('auth-unlogged');
    const logged = document.getElementById('auth-logged');
    if (!unlogged || !logged) return;

    if (isLoggedIn && this.currentUser) {
      unlogged.style.display = 'none';
      logged.style.display = 'flex';
      document.getElementById('header-user-avatar').src = this.currentUser.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user';
      document.getElementById('header-user-name').textContent = this.currentUser.displayName || this.currentUser.username;
    } else {
      unlogged.style.display = 'flex';
      logged.style.display = 'none';
    }
  }

  async loadInitialData() {
    this.channels = await api.getChannels();
    this.categories = await api.getCategories();
    this.renderSidebar();
  }

  renderSidebar() {
    const followedContainer = document.getElementById('sidebar-followed-list');
    const recContainer = document.getElementById('sidebar-recommended-list');
    if (!followedContainer || !recContainer) return;

    // Render Followed List
    followedContainer.innerHTML = this.channels.slice(0, 3).map((ch) => this.renderSidebarChannelItem(ch)).join('');

    // Render Recommended List
    recContainer.innerHTML = this.channels.slice(3).map((ch) => this.renderSidebarChannelItem(ch)).join('');

    // Add click listeners to sidebar items
    document.querySelectorAll('.channel-item[data-channel-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const chId = el.getAttribute('data-channel-id');
        this.navigate('watch', chId);
      });
    });
  }

  renderSidebarChannelItem(channel) {
    const isLive = channel.is_live === 'true';
    return `
      <div class="channel-item" data-channel-id="${channel.channel_id}" title="${channel.streamer_name} - ${channel.category}">
        <div class="channel-avatar-wrapper">
          <img class="channel-avatar" src="${channel.streamer_avatar}" alt="${channel.streamer_name}">
          ${isLive ? '<div class="live-indicator-dot"></div>' : ''}
        </div>
        <div class="channel-info">
          <span class="channel-name">${channel.streamer_name}</span>
          <span class="channel-category">${channel.category}</span>
        </div>
        ${isLive ? `
          <div class="channel-metrics">
            <span class="dot"></span>
            <span>${this.formatNumber(channel.viewer_count)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // --- VIEW RENDERERS ---

  renderBrowseView() {
    const main = document.getElementById('main-content');
    const featured = this.channels[0] || MOCK_FEATURED_STREAM;

    main.innerHTML = `
      <div class="browse-container fade-in" style="padding-bottom: 40px;">
        <!-- Hero Featured Stream Spotlight -->
        <section class="hero-featured" style="padding: 24px 24px 0 24px;">
          <div class="hero-card" style="display: flex; background-color: var(--bg-primary); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-md);">
            <div class="hero-player-side" style="flex: 2; position: relative; aspect-ratio: 16/9; background: #000; cursor: pointer;" id="hero-player-action">
              <img src="${featured.thumbnail_url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Featured Stream">
              <div style="position: absolute; top: 16px; left: 16px;">
                <span class="badge-live">LIVE</span>
              </div>
              <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); transition: background 0.2s;">
                <button class="btn btn-primary" style="padding: 12px 24px; font-size: 1rem; border-radius: var(--radius-full);">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  Watch Stream
                </button>
              </div>
            </div>
            <div class="hero-info-side" style="flex: 1; padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <img src="${featured.streamer_avatar}" style="width: 44px; height: 44px; border-radius: var(--radius-full); object-fit: cover;">
                  <div>
                    <h3 style="font-weight: 700; font-size: 1.1rem; color: var(--accent-purple-light);">${featured.streamer_name}</h3>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">${featured.category}</p>
                  </div>
                </div>
                <h2 style="font-size: 1.25rem; font-weight: 800; line-height: 1.3; margin-bottom: 12px;">${featured.title}</h2>
                <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">${featured.bio || 'Streaming live now on StreamForge Cloud-Native Platform.'}</p>
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 16px;">
                ${featured.tags.map(t => `<span class="badge-tag">${t}</span>`).join('')}
              </div>
            </div>
          </div>
        </section>

        <!-- Top Categories Section -->
        <section style="padding: 32px 24px 0 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h2 style="font-size: 1.3rem; font-weight: 800;"><span style="color: var(--accent-purple);">Top</span> Categories</h2>
            <button class="btn btn-secondary" style="font-size: 0.85rem;" id="btn-see-all-cats">View All</button>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px;">
            ${this.categories.map(cat => `
              <div class="category-card" data-category="${cat.name}" style="cursor: pointer; transition: transform 0.2s;">
                <div style="aspect-ratio: 3/4; border-radius: var(--radius-md); overflow: hidden; background: var(--bg-surface); border: 1px solid var(--border-subtle); margin-bottom: 8px;">
                  <img src="${cat.image}" style="width: 100%; height: 100%; object-fit: cover;" alt="${cat.name}">
                </div>
                <h4 style="font-weight: 700; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cat.name}</h4>
                <p style="font-size: 0.75rem; color: var(--text-muted);">${this.formatNumber(cat.viewers)} viewers</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Live Channels Grid Section -->
        <section style="padding: 32px 24px 0 24px;">
          <h2 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 16px;"><span style="color: var(--live-red);">Live</span> Channels We Think You'll Like</h2>
          <div class="card-grid" style="padding: 0;">
            ${this.channels.map(ch => this.renderStreamCard(ch)).join('')}
          </div>
        </section>
      </div>
    `;

    // Event listeners on Browse View
    document.getElementById('hero-player-action')?.addEventListener('click', () => this.navigate('watch', featured.channel_id));
    document.getElementById('btn-see-all-cats')?.addEventListener('click', () => this.navigate('categories'));

    document.querySelectorAll('.stream-card[data-channel-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-channel-id');
        this.navigate('watch', id);
      });
    });

    document.querySelectorAll('.category-card[data-category]').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-category');
        this.navigate('categories', encodeURIComponent(cat));
      });
    });
  }

  renderStreamCard(channel) {
    return `
      <div class="stream-card" data-channel-id="${channel.channel_id}">
        <div class="thumbnail-wrapper">
          <img class="thumbnail-img" src="${channel.thumbnail_url}" alt="${channel.title}">
          <div class="thumbnail-overlay-top">
            <span class="badge-live">LIVE</span>
          </div>
          <div class="thumbnail-overlay-bottom">
            ${this.formatNumber(channel.viewer_count)} viewers
          </div>
        </div>
        <div class="stream-card-meta">
          <img class="stream-card-avatar" src="${channel.streamer_avatar}" alt="${channel.streamer_name}">
          <div class="stream-card-details">
            <h4 class="stream-card-title">${channel.title}</h4>
            <p class="stream-card-streamer">${channel.streamer_name}</p>
            <p class="stream-card-category">${channel.category}</p>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
              ${channel.tags.slice(0, 2).map(t => `<span class="badge-tag">${t}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderCategoriesView() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="categories-container fade-in" style="padding: 24px;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 24px;">Categories & Games</h1>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px;">
          ${this.categories.map(cat => `
            <div class="category-card" data-category="${cat.name}" style="cursor: pointer;">
              <div style="aspect-ratio: 3/4; border-radius: var(--radius-md); overflow: hidden; background: var(--bg-surface); border: 1px solid var(--border-subtle); margin-bottom: 10px;">
                <img src="${cat.image}" style="width: 100%; height: 100%; object-fit: cover;" alt="${cat.name}">
              </div>
              <h3 style="font-weight: 700; font-size: 1rem;">${cat.name}</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px;">${this.formatNumber(cat.viewers)} viewers</p>
              <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${cat.tags.map(t => `<span class="badge-tag">${t}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.querySelectorAll('.category-card[data-category]').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-category');
        // Filter channels by this category
        const filtered = this.channels.filter(c => c.category === cat);
        this.renderCategoryChannels(cat, filtered);
      });
    });
  }

  renderCategoryChannels(categoryName, channelsList) {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="fade-in" style="padding: 24px;">
        <button class="btn btn-secondary" id="btn-back-categories" style="margin-bottom: 16px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          All Categories
        </button>
        <h1 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 24px;">${categoryName} Streams</h1>
        <div class="card-grid" style="padding: 0;">
          ${channelsList.length > 0 ? channelsList.map(ch => this.renderStreamCard(ch)).join('') : '<p style="color: var(--text-muted);">No live streams currently broadcasting in this category.</p>'}
        </div>
      </div>
    `;

    document.getElementById('btn-back-categories')?.addEventListener('click', () => this.renderCategoriesView());
    document.querySelectorAll('.stream-card[data-channel-id]').forEach(card => {
      card.addEventListener('click', () => this.navigate('watch', card.getAttribute('data-channel-id')));
    });
  }

  renderVodsView() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="vods-container fade-in" style="padding: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <h1 style="font-size: 1.75rem; font-weight: 800;">Recent VODs & Replays</h1>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Transcoded with AWS EventBridge & FFmpeg Spot Pipeline</span>
        </div>
        <div class="card-grid" style="padding: 0;">
          <div class="stream-card" id="vod-card-1" style="cursor: pointer;">
            <div class="thumbnail-wrapper">
              <img class="thumbnail-img" src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800" alt="VOD">
              <div class="thumbnail-overlay-top"><span class="badge-tag" style="background: rgba(0,0,0,0.8); color: #fff;">1:03:40</span></div>
              <div class="thumbnail-overlay-bottom">245K views</div>
            </div>
            <div class="stream-card-meta">
              <img class="stream-card-avatar" src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200">
              <div class="stream-card-details">
                <h4 class="stream-card-title">VCT Champions Grand Finals - Radiant Clutch Highlights</h4>
                <p class="stream-card-streamer">TenZ</p>
                <p class="stream-card-category">Valorant</p>
              </div>
            </div>
          </div>
          <div class="stream-card" id="vod-card-2" style="cursor: pointer;">
            <div class="thumbnail-wrapper">
              <img class="thumbnail-img" src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800" alt="VOD">
              <div class="thumbnail-overlay-top"><span class="badge-vip">VIP ONLY</span></div>
              <div class="thumbnail-overlay-bottom">89K views</div>
            </div>
            <div class="stream-card-meta">
              <img class="stream-card-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200">
              <div class="stream-card-details">
                <h4 class="stream-card-title">Building a Full-Scale Video Platform with AWS EKS & KEDA</h4>
                <p class="stream-card-streamer">TechLeadPro</p>
                <p class="stream-card-category">Software & Game Dev</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('vod-card-1')?.addEventListener('click', () => this.navigate('watch', 'chn_tenz_live'));
    document.getElementById('vod-card-2')?.addEventListener('click', () => this.navigate('watch', 'chn_techlead_live'));
  }

  renderWatchView(channelId) {
    // Placeholder - will be fully expanded in Feature 4.3 (Player) & Feature 4.4 (Live Chat)
    window.location.hash = `#watch/${channelId || 'chn_tenz_live'}`;
    import('./player.js').then(({ playerController }) => {
      playerController.mount(channelId || 'chn_tenz_live');
    });
  }

  renderStudioView() {
    // Placeholder - will be expanded in Feature 4.5 (Studio)
    import('./studio.js').then(({ studioController }) => {
      studioController.mount();
    });
  }

  handleSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      if (this.currentView === 'browse') this.renderBrowseView();
      return;
    }

    const filtered = this.channels.filter(ch =>
      ch.streamer_name.toLowerCase().includes(q) ||
      ch.category.toLowerCase().includes(q) ||
      ch.title.toLowerCase().includes(q)
    );

    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="fade-in" style="padding: 24px;">
        <h2 style="font-size: 1.3rem; font-weight: 800; margin-bottom: 16px;">Search Results for "${query}"</h2>
        <div class="card-grid" style="padding: 0;">
          ${filtered.length > 0 ? filtered.map(ch => this.renderStreamCard(ch)).join('') : '<p style="color: var(--text-muted);">No channels matched your search query.</p>'}
        </div>
      </div>
    `;

    document.querySelectorAll('.stream-card[data-channel-id]').forEach(card => {
      card.addEventListener('click', () => this.navigate('watch', card.getAttribute('data-channel-id')));
    });
  }

  bindAuthModalEvents() {
    const modal = document.getElementById('auth-modal');
    const openLoginBtn = document.getElementById('btn-open-login');
    const openRegBtn = document.getElementById('btn-open-register');
    const tabLogin = document.getElementById('modal-tab-login');
    const tabReg = document.getElementById('modal-tab-register');
    const formLogin = document.getElementById('form-login');
    const formReg = document.getElementById('form-register');
    const alertBox = document.getElementById('auth-alert');
    const logoutBtn = document.getElementById('btn-logout');

    const openModal = (mode = 'login') => {
      modal.classList.add('open');
      alertBox.style.display = 'none';
      if (mode === 'login') {
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
        formLogin.style.display = 'flex';
        formReg.style.display = 'none';
      } else {
        tabReg.classList.add('active');
        tabLogin.classList.remove('active');
        formReg.style.display = 'flex';
        formLogin.style.display = 'none';
      }
    };

    const closeModal = () => {
      modal.classList.remove('open');
      alertBox.style.display = 'none';
    };

    openLoginBtn?.addEventListener('click', () => openModal('login'));
    openRegBtn?.addEventListener('click', () => openModal('register'));
    tabLogin?.addEventListener('click', () => openModal('login'));
    tabReg?.addEventListener('click', () => openModal('register'));

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // User Avatar / Menu trigger in header -> navigate to Studio
    document.getElementById('user-menu-trigger')?.addEventListener('click', () => {
      this.navigate('studio');
    });

    // Form Submissions
    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('login-identifier').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const data = await api.login(identifier, password);
        this.currentUser = data.user;
        this.currentChannel = data.channel;
        this.renderUserHeader(true);
        closeModal();
        if (this.currentView === 'studio') {
          this.renderStudioView();
        }
      } catch (err) {
        alertBox.textContent = err.message || 'Login failed. Please check your credentials.';
        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(255, 70, 85, 0.2)';
        alertBox.style.color = '#ff4655';
      }
    });

    formReg?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value.trim();
      const displayName = document.getElementById('reg-displayname').value.trim() || username;
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;

      try {
        const data = await api.register(username, email, password, displayName);
        this.currentUser = data.user;
        this.currentChannel = data.channel;
        this.renderUserHeader(true);
        closeModal();
        if (this.currentView === 'studio') {
          this.renderStudioView();
        }
      } catch (err) {
        alertBox.textContent = err.message || 'Registration failed.';
        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(255, 70, 85, 0.2)';
        alertBox.style.color = '#ff4655';
      }
    });

    logoutBtn?.addEventListener('click', () => {
      api.logout();
      this.currentUser = null;
      this.currentChannel = null;
      this.renderUserHeader(false);
      this.navigate('browse');
    });
  }

  formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}

// Instantiate and Export Singleton App
export const app = new StreamForgeApp();
