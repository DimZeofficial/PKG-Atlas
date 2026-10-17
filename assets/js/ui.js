/**
 * PlayStation Database UI Module
 * Handles game rendering, modals, settings, profile/avatar selection, and toast notifications.
 */

// Safe localStorage wrapper — prevents crashes in private mode / blocked cookies
const LS = {
  get(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); }
    catch { /* ignore */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); }
    catch { /* ignore */ }
  },
  parse(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      if (val === null) return fallback;
      return JSON.parse(val);
    }
    catch { return fallback; }
  }
};

// The Content-Security-Policy forbids inline onerror attributes, so image fallbacks
// run through one delegated listener instead: data-fallback-src swaps in a placeholder
// image, and data-fallback-initial replaces the avatar with the first letter of its alt.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.fallbackDone) return;
  if (img.dataset.fallbackSrc) {
    img.dataset.fallbackDone = '1';
    img.src = img.dataset.fallbackSrc;
  } else if (img.hasAttribute('data-fallback-initial') && img.parentElement) {
    img.dataset.fallbackDone = '1';
    img.parentElement.textContent = (img.alt || '').charAt(0).toUpperCase();
  }
}, true);

const UI = {
  avatarsData: null,
  selectedAvatar: null,

  /**
   * Apply saved global settings (Low-res mode, Page size)
   */
  applySettings() {
    // 1. Low-res / Performance mode
    const lowResMode = LS.get('ps4_lowRes') === 'true';
    document.documentElement.setAttribute('data-low-res', lowResMode ? 'true' : 'false');

    // 2. Page size sync
    const pageSize = parseInt(LS.get('ps4_pageSize') || '24', 10);
    const pageSizeSelect = document.getElementById('pageSize');
    if (pageSizeSelect) {
      pageSizeSelect.value = String(pageSize);
    }
  },

  /**
   * Render games grid into container
   */
  renderGameGrid(games, container) {
    if (!container) return;
    if (!games || games.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <h3>No games found</h3>
          <p>Try adjusting your search query or filters.</p>
        </div>
      `;
      return;
    }
    const fragment = document.createDocumentFragment();
    games.forEach(game => {
      const card = this.createGameCard(game);
      fragment.appendChild(card);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  /**
   * Create a single game card (firmware badge removed)
   */  createGameCard(game) {
    const article = document.createElement('article');
    article.className = 'game-card reveal reveal--scale';
    article.dataset.gameId = game.id;

    const wishlist = LS.parse('ps4_wishlist', []);
    const isWishlisted = wishlist.includes(game.id);

    const collectionStatus = this.getCollectionStatus(game.id);
    const collectionIcon = this.getCollectionIcon(collectionStatus);
    const collectionLabel = this.getCollectionLabel(collectionStatus);

    const year = game.releaseDate ? new Date(game.releaseDate).getFullYear() : 'PS4';
    const genres = Array.isArray(game.genre) ? game.genre.slice(0, 2) : [];
    const size = game.size?.game || '';

    const meta = [game.id, game.region, year].filter(Boolean).join(' \u2022 ');

    article.innerHTML = `
      <div class="game-card__cover">
        <img src="${game.coverImage || ''}" alt="" loading="lazy" data-fallback-src="https://images.placeholders.dev/?width=300&amp;height=400&amp;text=PS4+PKG&amp;bgColor=%2318181b&amp;textColor=%23a1a1aa">
        <button class="game-card__collection" data-game-id="${game.id}" data-status="${collectionStatus}" title="${collectionLabel}" aria-label="Collection status: ${collectionLabel}">
          ${collectionIcon}
        </button>
        <div class="game-card__quick">
          <button class="btn btn--primary btn--download" data-game-id="${game.id}">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            Details
          </button>
          <button class="btn btn--icon btn--wishlist ${isWishlisted ? 'btn--wishlist--active' : ''}" data-game-id="${game.id}" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}" aria-label="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
            <svg width="17" height="17" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="game-card__info">
        <div class="game-card__titlerow">
          <h3 class="game-card__title" title="${game.title}">${game.title}</h3>
          ${size ? `<span class="game-card__size">${size}</span>` : ''}
        </div>
        <p class="game-card__meta">${meta}</p>
        ${genres.length ? `<p class="game-card__genres">${genres.join(' \u2022 ')}</p>` : ''}
      </div>
    `;

    // Attach collection status click handler
    const collectionEl = article.querySelector('.game-card__collection');
    if (collectionEl) {
      collectionEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const statuses = ['none', 'owned', 'playing', 'backlog'];
        const current = this.getCollectionStatus(game.id);
        const idx = statuses.indexOf(current);
        const next = statuses[(idx + 1) % statuses.length];
        this.setCollectionStatus(game.id, next);
        collectionEl.dataset.status = next;
        collectionEl.innerHTML = this.getCollectionIcon(next);
        collectionEl.title = this.getCollectionLabel(next);
        collectionEl.setAttribute('aria-label', `Collection status: ${this.getCollectionLabel(next)}`);
        UI.showToast(`"${game.title}" \u2192 ${this.getCollectionLabel(next)}`);
      });
    }

    return article;
  },

  // Newest first, capped, so the home strip stays short
  recordRecent(gameId) {
    if (!gameId) return;
    const stored = LS.parse('ps4_recent', []);
    const list = (Array.isArray(stored) ? stored : []).filter(id => id !== gameId);
    list.unshift(gameId);
    LS.set('ps4_recent', JSON.stringify(list.slice(0, 12)));
  },

  /**
   * Display game detail modal with instant 100% visibility (no hidden reveal classes)
   */
  showGameDetail(game) {
    if (!game) return;
    this.recordRecent(game.id);
    const modal = document.getElementById('gameModal');
    if (!modal) return;

    modal.querySelector('.modal__title').textContent = game.title;
    const bodyEl = modal.querySelector('.modal__body');
    bodyEl.innerHTML = this.buildDetailHTML(game);
    modal.classList.add('modal--active');

    // Attach wishlist button listener inside modal
    const modalWishlistBtn = modal.querySelector('.modal-wishlist-toggle');
    if (modalWishlistBtn) {
      modalWishlistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameId = game.id;
        let wishlist = LS.parse('ps4_wishlist', []);
        if (wishlist.includes(gameId)) {
          wishlist = wishlist.filter(id => id !== gameId);
          modalWishlistBtn.classList.remove('btn--wishlist--active');
          modalWishlistBtn.innerHTML = `
            <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg> Add to Wishlist
          `;
          UI.showToast(`Removed "${game.title}" from Wishlist`);
        } else {
          wishlist.push(gameId);
          modalWishlistBtn.classList.add('btn--wishlist--active');
          modalWishlistBtn.innerHTML = `
            <svg width="17" height="17" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg> In Wishlist
          `;
          UI.showToast(`Added "${game.title}" to Wishlist!`);
        }
        LS.set('ps4_wishlist', JSON.stringify(wishlist));
        UI.syncWishlistBadges();

        // Sync cards on page
        document.querySelectorAll(`.btn--wishlist[data-game-id="${gameId}"]`).forEach(btn => {
          if (wishlist.includes(gameId)) btn.classList.add('btn--wishlist--active');
          else btn.classList.remove('btn--wishlist--active');
        });
      });
    }

    // Collection status selector in modal
    const collectionSelect = modal.querySelector('#detailCollectionSelect');
    if (collectionSelect) {
      collectionSelect.addEventListener('change', (e) => {
        e.stopPropagation();
        const newStatus = e.target.value;
        UI.setCollectionStatus(game.id, newStatus);
        // Update game card badge
        document.querySelectorAll(`.game-card__collection[data-game-id="${game.id}"]`).forEach(el => {
          el.dataset.status = newStatus;
          el.innerHTML = UI.getCollectionIcon(newStatus);
          el.title = UI.getCollectionLabel(newStatus);
          el.setAttribute('aria-label', `Collection status: ${UI.getCollectionLabel(newStatus)}`);
        });
        UI.showToast(`"${game.title}" → ${UI.getCollectionLabel(newStatus)}`);
      });
    }

    const closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) closeBtn.focus();
  },

  /**
   * Build HTML for game detail modal / dedicated game page
   * (Removed .reveal classes so contents are immediately visible)
   * (Removed firmware references per user request)
   */
  buildDetailHTML(game) {
    if (!game) return '<div class="empty-state"><h3>Game details not available.</h3></div>';

    const wishlist = LS.parse('ps4_wishlist', []);
    const isWishlisted = wishlist.includes(game.id);

    return `
      <div class="detail__header" style="opacity:1 !important; transform:none !important;">
        <img src="${game.coverImage || ''}" alt="${game.title}" class="detail__cover" data-fallback-src="https://images.placeholders.dev/?width=300&amp;height=400&amp;text=PS4+PKG&amp;bgColor=%231a2332&amp;textColor=%2394a3b8">
        <div class="detail__meta">
          <h2>${game.title}</h2>
          <p class="detail__id">${game.id}</p>
          <div class="detail__badges">
            ${game.region ? `<span class="badge">${game.region}</span>` : ''}
            ${Array.isArray(game.genre) ? game.genre.map(g => `<span class="badge">${g}</span>`).join('') : ''}
          </div>
          ${game.description ? `<p class="detail__description">${game.description}</p>` : ''}
          <div class="detail__actions-row">
            <div class="detail__collection-selector">
              <label for="detailCollectionSelect">Status:</label>
              <select id="detailCollectionSelect" class="form-select">
                <option value="none" ${this.getCollectionStatus(game.id) === 'none' ? 'selected' : ''}>None</option>
                <option value="owned" ${this.getCollectionStatus(game.id) === 'owned' ? 'selected' : ''}>Owned</option>
                <option value="playing" ${this.getCollectionStatus(game.id) === 'playing' ? 'selected' : ''}>Playing</option>
                <option value="backlog" ${this.getCollectionStatus(game.id) === 'backlog' ? 'selected' : ''}>Backlog</option>
              </select>
            </div>
            <button class="btn btn--secondary modal-wishlist-toggle ${isWishlisted ? 'btn--wishlist--active' : ''}">
              <svg width="17" height="17" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              ${isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
            </button>
            <a href="game-detail.html?id=${game.id}" class="btn btn--primary" data-nav="smooth">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Open Game Page
            </a>
            <button class="btn btn--ghost" data-share-id="${game.id}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;"><path d="M9 9h10v10H9zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Link
            </button>
          </div>
        </div>
      </div>

      <div class="detail__downloads" style="opacity:1 !important; transform:none !important;">
        <h3>Downloads & Packages</h3>
        ${game.links?.pkgps4 ? `
          <div class="download-item" style="border-left: 3px solid var(--color-accent-primary);">
            <div class="download-item__info">
              <span class="download-item__type">PKGPS4 Database</span>
              ${game.firmware ? `<span class="download-item__notes" style="color: var(--color-accent-text); font-weight: 600;">Firmware requirements: ${game.firmware}</span>` : ''}
            </div>
            <div class="download-item__actions">
              <a href="${game.links.pkgps4}" class="btn btn--primary" target="_blank" rel="noopener">Open PKGPS4 Link ↗</a>
            </div>
          </div>
        ` : ''}
        <div class="download-item">
          <div class="download-item__info">
            <span class="download-item__type">DLPSGAME Host</span>
            ${game.links?.dlpsgame ? '' : '<span class="download-item__notes">No matching page found</span>'}
          </div>
          <div class="download-item__actions">
            ${game.links?.dlpsgame
              ? `<a href="${game.links.dlpsgame}" class="btn btn--secondary" target="_blank" rel="noopener">Open DLPSGAME Link ↗</a>`
              : `<span class="download-item__unavailable">Unavailable</span>`}
          </div>
        </div>
        ${game.links?.superpsx ? `
          <div class="download-item">
            <div class="download-item__info">
              <span class="download-item__type">SuperPSX Host</span>
              <span class="download-item__notes">Alternative Direct Package</span>
            </div>
            <div class="download-item__actions">
              <a href="${game.links.superpsx}" class="btn btn--secondary" target="_blank" rel="noopener">Open SuperPSX Link ↗</a>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="detail__info" style="opacity:1 !important; transform:none !important;">
        <h3>Game Information</h3>
        <dl class="info-grid">
          ${game.developer ? `<dt>Developer</dt><dd>${game.developer}</dd>` : ''}
          ${game.releaseDate ? `<dt>Release Date</dt><dd>${game.releaseDate}</dd>` : ''}
          ${game.firmware ? `<dt>Firmware</dt><dd><span class="badge">${game.firmware}</span></dd>` : ''}
          <dt>Password</dt><dd><code>${game.password || 'N/A'}</code></dd>
          ${Array.isArray(game.languages) && game.languages.length ? `<dt>Languages</dt><dd>${game.languages.join(', ')}</dd>` : ''}
          ${game.size?.game ? `<dt>Game Size</dt><dd>${game.size.game}</dd>` : ''}
          ${game.size?.update ? `<dt>Update Size</dt><dd>${game.size.update}</dd>` : ''}
          ${game.size?.dlc ? `<dt>DLC Size</dt><dd>${game.size.dlc}</dd>` : ''}
        </dl>
      </div>
    `;
  },

  /**
   * Close any open game modal
   */
  closeModal() {
    const modal = document.getElementById('gameModal');
    if (modal) modal.classList.remove('modal--active');
  },

  /**
   * Sync wishlist badges across header & sidebar
   */
  syncWishlistBadges() {
    const wishlist = LS.parse('ps4_wishlist', []);
    const count = wishlist.length;

    const headerBadge = document.getElementById('headerWishlistBadge');
    if (headerBadge) {
      headerBadge.textContent = count;
      headerBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    const sidebarBadge = document.getElementById('sidebarWishlistBadge');
    if (sidebarBadge) {
      sidebarBadge.textContent = count;
      sidebarBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  },

  /**
   * Collection status helper
   */
  getCollectionStatus(gameId) {
    const map = LS.parse('ps4_collection', {});
    return map[gameId] || 'none';
  },

  setCollectionStatus(gameId, status) {
    const map = LS.parse('ps4_collection', {});
    if (status === 'none') {
      delete map[gameId];
    } else {
      map[gameId] = status;
    }
    LS.set('ps4_collection', JSON.stringify(map));
  },

  getCollectionIcon(status) {
    const icons = {
      owned: '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
      playing: '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
      backlog: '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm0-4H7v-2h5v2zm0-4H7V7h5v2z"/></svg>',
      none: '<svg width="14" height="14" stroke="currentColor" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="1.5"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 9l-6 6"/></svg>'
    };
    return icons[status] || icons.none;
  },

  getCollectionLabel(status) {
    const labels = { owned: 'Owned', playing: 'Playing', backlog: 'Backlog', none: 'Set status' };
    return labels[status] || labels.none;
  },

  getCollectionIcon(status) {
    const icons = {
      owned: '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
      playing: '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
      backlog: '<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm0-4H7v-2h5v2zm0-4H7V7h5v2z"/></svg>',
      none: '<svg width="14" height="14" stroke="currentColor" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="1.5"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 9l-6 6"/></svg>'
    };
    return icons[status] || icons.none;
  },

  /**
   * Display a floating toast notification
   */
  showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;"><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01M17.5 6H6.5A4.5 4.5 0 002 10.5v3A4.5 4.5 0 006.5 18h11a4.5 4.5 0 004.5-4.5v-3A4.5 4.5 0 0017.5 6z"/></svg><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  },

  /**
   * Sync username & avatar in sidebar and header
   */
  syncProfileUI() {
    const username = LS.get('ps4_username', '');
    const avatar = LS.get('ps4_avatar', '');

    // Sidebar username
    const sidebarUserEl = document.getElementById('sidebarUsername');
    if (sidebarUserEl) sidebarUserEl.textContent = username;

    // Header username
    const headerUserEl = document.getElementById('headerUsername');
    if (headerUserEl) headerUserEl.textContent = username;

    // Sidebar avatar
    const sidebarAvatarImg = document.getElementById('userAvatarImg');
    const sidebarAvatarInitial = document.getElementById('userAvatarInitial');

    if (sidebarAvatarImg && sidebarAvatarInitial) {
      if (avatar) {
        sidebarAvatarImg.src = avatar;
        sidebarAvatarImg.style.display = 'block';
        sidebarAvatarInitial.style.display = 'none';
      } else {
        sidebarAvatarImg.style.display = 'none';
        sidebarAvatarInitial.textContent = username.charAt(0).toUpperCase();
        sidebarAvatarInitial.style.display = 'block';
      }
    }

    // Header avatar preview
    const headerAvatarPreview = document.getElementById('headerAvatarPreview');
    if (headerAvatarPreview) {
      if (avatar) {
        headerAvatarPreview.innerHTML = `<img src="${avatar}" alt="${username}" data-fallback-initial>`;
      } else {
        headerAvatarPreview.textContent = username.charAt(0).toUpperCase();
      }
    }
  },

  /**
   * Load avatars index (data/avatars.json)
   */
  async loadAvatarsData() {
    if (this.avatarsData) return this.avatarsData;
    try {
      const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
      let res;
      try {
        res = await fetch(`${basePath}/data/avatars.json`);
      } catch (e) {
        res = null;
      }
      if (!res || !res.ok) {
        res = await fetch('data/avatars.json');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.avatarsData = await res.json();
      return this.avatarsData;
    } catch (e) {
      console.warn('Could not load avatars.json:', e);
      return {};
    }
  },

  /**
   * Open Settings Modal
   * Controls: Lower Resource Mode (on/off), Games Per Page (12, 24, 48), Backup & Restore
   */
  openSettingsModal() {
    let modal = document.getElementById('settingsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'settingsModal';
      modal.innerHTML = `
        <div class="modal__content" style="max-width: 620px;">
          <div class="modal__header">
            <div>
              <h2 class="modal__title" style="display:flex; align-items:center; gap:8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H2a2 2 0 110-4h.09A1.65 1.65 0 004.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V2a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H22a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                Website Settings
              </h2>
              <p style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:2px;">
                Customize performance, display, and backup options
              </p>
            </div>
            <button class="modal__close" id="closeSettingsModal" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div class="modal__body">
            <div class="settings-list">
              <!-- Setting 1: Low-res / Lower resource mode -->
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-title" style="display:inline-flex;align-items:center;gap:7px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;"><path d="M13 2L3 14h8l-1 8 10-12h-8z"/></svg> Low Resource Mode</span>
                  <span class="setting-desc">Disables heavy blur effects and animations for maximum speed on lower-end devices</span>
                </div>
                <label class="switch">
                  <input type="checkbox" id="settingLowResToggle" />
                  <span class="slider"></span>
                </label>
              </div>

              <!-- Setting 2: Number of games on page (12, 24, 48) -->
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-title" style="display:inline-flex;align-items:center;gap:7px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;"><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01M17.5 6H6.5A4.5 4.5 0 002 10.5v3A4.5 4.5 0 006.5 18h11a4.5 4.5 0 004.5-4.5v-3A4.5 4.5 0 0017.5 6z"/></svg> Games Per Page</span>
                  <span class="setting-desc">Choose how many game cards to display before paginating</span>
                </div>
                <div class="page-size-toggle-group">
                  <button type="button" class="btn btn--secondary page-size-pill" data-size="12">12</button>
                  <button type="button" class="btn btn--secondary page-size-pill" data-size="24">24</button>
                  <button type="button" class="btn btn--secondary page-size-pill" data-size="48">48</button>
                </div>
              </div>

              <!-- Setting 3: Profile & Avatars shortcut -->
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-title" style="display:inline-flex;align-items:center;gap:7px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>PlayStation Profile &amp; Avatar</span>
                  <span class="setting-desc">Change your username or select an avatar from 450+ PS3/PS4 game collections</span>
                </div>
                <button class="btn btn--secondary" id="settingsOpenProfileBtn">
                  Edit Profile
                </button>
              </div>

              <!-- Setting 4: Backup & Restore Data -->
              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-title" style="display:inline-flex;align-items:center;gap:7px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>Backup &amp; Restore Library</span>
                  <span class="setting-desc">Export or import your saved collection, wishlist, profile, and settings as JSON</span>
                </div>
                <div style="display:inline-flex; gap:8px;">
                  <button class="btn btn--secondary" id="exportDataBtn" type="button">Export</button>
                  <label class="btn btn--secondary" style="margin:0; cursor:pointer;">
                    Import
                    <input type="file" id="importDataInput" accept=".json" style="display:none;" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#closeSettingsModal').addEventListener('click', () => {
        modal.classList.remove('modal--active');
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('modal--active');
      });

      modal.querySelector('#settingsOpenProfileBtn').addEventListener('click', () => {
        modal.classList.remove('modal--active');
        UI.openProfileModal();
      });
    }

    modal.classList.add('modal--active');

    // Populate current settings
    const lowResToggle = modal.querySelector('#settingLowResToggle');
    const pageSizePills = modal.querySelectorAll('.page-size-pill');

    const lowRes = LS.get('ps4_lowRes') === 'true';
    lowResToggle.checked = lowRes;

    const currentPageSize = LS.get('ps4_pageSize', '24');
    pageSizePills.forEach(pill => {
      if (pill.dataset.size === currentPageSize) {
        pill.classList.add('btn--primary');
        pill.classList.remove('btn--secondary');
      } else {
        pill.classList.remove('btn--primary');
        pill.classList.add('btn--secondary');
      }

      pill.onclick = () => {
        pageSizePills.forEach(p => {
          p.classList.remove('btn--primary');
          p.classList.add('btn--secondary');
        });
        pill.classList.add('btn--primary');
        pill.classList.remove('btn--secondary');

        const newSize = pill.dataset.size;
        LS.set('ps4_pageSize', newSize);
        UI.applySettings();

        // Trigger page size update on active page
        const select = document.getElementById('pageSize');
        if (select) {
          select.value = newSize;
          select.dispatchEvent(new Event('change'));
        }
        UI.showToast(`Displaying ${newSize} games per page.`);
      };
    });

    lowResToggle.onchange = () => {
      const isLow = lowResToggle.checked;
      LS.set('ps4_lowRes', isLow ? 'true' : 'false');
      UI.applySettings();
      UI.showToast(isLow ? 'Low Resource Mode enabled (Blur & effects off).' : 'High visual quality restored.');
    };

    const exportBtn = modal.querySelector('#exportDataBtn');
    if (exportBtn) {
      exportBtn.onclick = () => {
        const payload = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          collection: LS.parse('ps4_collection', {}),
          wishlist: LS.parse('ps4_wishlist', []),
          username: LS.get('ps4_username', ''),
          avatar: LS.get('ps4_avatar', ''),
          avatar_name: LS.get('ps4_avatar_name', ''),
          theme: LS.get('ps4_theme', 'dark'),
          pageSize: LS.get('ps4_pageSize', '24'),
          lowRes: LS.get('ps4_lowRes', 'false')
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `ps4_content_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        UI.showToast('Library data exported successfully.');
      };
    }

    const importInput = modal.querySelector('#importDataInput');
    if (importInput) {
      importInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (data.collection) LS.set('ps4_collection', JSON.stringify(data.collection));
            if (data.wishlist) LS.set('ps4_wishlist', JSON.stringify(data.wishlist));
            if (data.username) LS.set('ps4_username', data.username);
            if (data.avatar !== undefined) LS.set('ps4_avatar', data.avatar);
            if (data.avatar_name !== undefined) LS.set('ps4_avatar_name', data.avatar_name);
            if (data.theme) LS.set('ps4_theme', data.theme);
            if (data.pageSize) LS.set('ps4_pageSize', data.pageSize);
            if (data.lowRes !== undefined) LS.set('ps4_lowRes', data.lowRes);

            UI.applySettings();
            UI.syncProfileUI();
            UI.syncWishlistBadges();
            UI.showToast('Data imported successfully! Reloading...');
            setTimeout(() => window.location.reload(), 800);
          } catch (err) {
            UI.showToast('Failed to import: Invalid JSON file.');
          }
        };
        reader.readAsText(file);
      };
    }
  },

  /**
   * Show the first-visit notice: no cookies, where your settings live, who publishes the files.
   * Shown once per browser (ps4_notice); onNext runs when it is dismissed.
   */
  showFirstVisitNotice(onNext) {
    let modal = document.getElementById('noticeModal');
    let done = false;

    const dismiss = () => {
      if (done) return;
      done = true;
      modal.classList.remove('modal--active');
      LS.set('ps4_notice', 'v1');
      if (typeof onNext === 'function') onNext();
    };

    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'noticeModal';
      modal.innerHTML = `
        <div class="modal__content notice-modal">
          <div class="modal__header">
            <h2 class="modal__title">Cookies and credits</h2>
            <button class="modal__close" id="closeNoticeModal" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div class="modal__body">
            <p class="notice-modal__lead">PKG Atlas sets no cookies and runs no analytics or tracking.</p>
            <p>Your username, avatar, theme, lists, and recently viewed games are stored in this browser's local storage on this device. None of it is uploaded, and clearing your browser data removes all of it. Cover images load from IGDB and the font from Google Fonts, so those two services see your IP address; nothing else leaves your browser.</p>

            <h3 class="notice-modal__heading">Credits</h3>
            <p><a href="https://www.igdb.com/" target="_blank" rel="noopener">IGDB</a> provides the cover art and game metadata.</p>
            <p><a href="https://dlpsgame.com/" target="_blank" rel="noopener">DLPSGAME</a> and <a href="https://www.pkgps4.click/" target="_blank" rel="noopener">PKGPS4</a> publish the pages this site links to. Those files are theirs, not ours.</p>
            <p class="notice-modal__fine">Game titles and artwork belong to their respective owners. PKG Atlas is not connected to Sony.</p>

            <button class="btn btn--primary notice-modal__ok" id="noticeOkBtn">Got it</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#noticeOkBtn').addEventListener('click', dismiss);
      modal.querySelector('#closeNoticeModal').addEventListener('click', dismiss);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) dismiss();
      });
    }

    modal.classList.add('modal--active');
    modal.querySelector('#noticeOkBtn').focus();
    // Escape key handler in app.js closes it through this
    UI.dismissFirstVisitNotice = dismiss;
  },

  /**
   * Show Profile & Avatar Setup Modal
   */
  async openProfileModal() {
    let modal = document.getElementById('profileModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'profileModal';
      modal.innerHTML = `
        <div class="modal__content profile-modal">
          <div class="modal__header">
            <div>
              <h2 class="modal__title">PlayStation Profile & Avatars</h2>
              <p style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:2px;">
                Choose your username and an authentic PlayStation avatar
              </p>
            </div>
            <button class="modal__close" id="closeProfileModal" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
          <div class="modal__body">
            <!-- Profile Setup Bar -->
            <div class="profile-setup-bar">
              <div class="profile-preview-row">
                <div class="profile-avatar-big" id="profileBigPreview">
                  <span id="profileBigInitial">D</span>
                </div>
                <div class="profile-inputs">
                  <label class="profile-input-label">PlayStation Network ID / Username</label>
                  <input type="text" id="profileUsernameInput" class="profile-username-input" placeholder="Enter your username..." maxlength="24" />
                </div>
                <button class="btn btn--primary" id="saveProfileBtn" style="height:44px; align-self: flex-end;">
                  Save Profile
                </button>
              </div>

              <div class="profile-avatar-search-row">
                <input type="text" id="avatarSearchInput" class="profile-avatar-search" placeholder="Search games or avatar names (e.g. Ellie, Drake, Sackboy)..." />
                <select id="gameJumpSelect" class="profile-game-jump" aria-label="Jump to game">
                  <option value="">Jump to Game...</option>
                </select>
              </div>
            </div>

            <!-- Avatars Grid Sections -->
            <div class="avatar-sections-container" id="avatarSectionsContainer">
              <div style="text-align:center; padding: 40px; color:var(--color-text-secondary);">
                Loading PlayStation avatar library...
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#closeProfileModal').addEventListener('click', () => {
        modal.classList.remove('modal--active');
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('modal--active');
      });
    }

    modal.classList.add('modal--active');

    // Populate current username and avatar
    const currentUsername = LS.get('ps4_username', '');
    const currentAvatar = LS.get('ps4_avatar', '');
    const currentAvatarName = LS.get('ps4_avatar_name', '');

    const usernameInput = modal.querySelector('#profileUsernameInput');
    const previewEl = modal.querySelector('#profileBigPreview');
    usernameInput.value = currentUsername;

    this.selectedAvatar = currentAvatar ? { url: currentAvatar, name: currentAvatarName } : null;
    this.updateBigAvatarPreview(previewEl, currentAvatar, currentUsername);

    usernameInput.addEventListener('input', () => {
      if (!this.selectedAvatar) {
        this.updateBigAvatarPreview(previewEl, '', usernameInput.value.trim());
      }
    });

    // Save profile handler
    const saveBtn = modal.querySelector('#saveProfileBtn');
    saveBtn.onclick = () => {
      const newUsername = usernameInput.value.trim() || 'Player';
      LS.set('ps4_username', newUsername);
      if (this.selectedAvatar) {
        LS.set('ps4_avatar', this.selectedAvatar.url);
        LS.set('ps4_avatar_name', this.selectedAvatar.name);
      }
      this.syncProfileUI();
      modal.classList.remove('modal--active');
      this.showToast(`Profile updated! Welcome, ${newUsername}.`);
    };

    // Load and render avatar sections
    await this.renderAvatarSections(modal);
  },

  /**
   * Update the large preview circle
   */
  updateBigAvatarPreview(container, avatarUrl, username) {
    if (!container) return;
    if (avatarUrl) {
      container.innerHTML = `<img src="${avatarUrl}" alt="${username || ''}" data-fallback-initial>`;
    } else {
      const initial = (username || '').charAt(0).toUpperCase();
      container.textContent = initial;
    }
  },

  /**
   * Render avatar sections with search & jump functionality
   */
  async renderAvatarSections(modal) {
    const container = modal.querySelector('#avatarSectionsContainer');
    const gameSelect = modal.querySelector('#gameJumpSelect');
    const searchInput = modal.querySelector('#avatarSearchInput');

    const data = await this.loadAvatarsData();
    const gameNames = Object.keys(data);

    if (gameNames.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No avatars loaded</h3>
          <p>Could not load avatar data index.</p>
        </div>
      `;
      return;
    }

    // Populate Jump selector
    gameSelect.innerHTML = '<option value="">Jump to Game (' + gameNames.length + ' Games)...</option>';
    gameNames.forEach(game => {
      const opt = document.createElement('option');
      opt.value = game;
      opt.textContent = `${game} (${data[game].length})`;
      gameSelect.appendChild(opt);
    });

    gameSelect.onchange = (e) => {
      const selectedGame = e.target.value;
      if (selectedGame) {
        const targetSection = container.querySelector(`[data-game="${CSS.escape(selectedGame)}"]`);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    const currentSavedAvatar = this.selectedAvatar?.url || LS.get('ps4_avatar', '');

    // Render function with search filter
    const renderList = (filterQuery = '') => {
      container.innerHTML = '';
      const q = filterQuery.toLowerCase().trim();

      const visibleGames = gameNames.filter(game => {
        if (!q) return true;
        if (game.toLowerCase().includes(q)) return true;
        return data[game].some(a => a.name.toLowerCase().includes(q));
      });

      if (visibleGames.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h3>No avatars match "${filterQuery}"</h3>
            <p>Try searching for a different game title or character.</p>
          </div>
        `;
        return;
      }

      const maxGamesToRender = q ? visibleGames.length : 35;
      const gamesToRender = visibleGames.slice(0, maxGamesToRender);

      gamesToRender.forEach(game => {
        let avatars = data[game];
        if (q && !game.toLowerCase().includes(q)) {
          avatars = avatars.filter(a => a.name.toLowerCase().includes(q));
        }

        if (avatars.length === 0) return;

        const section = document.createElement('div');
        section.className = 'avatar-game-section';
        section.dataset.game = game;

        section.innerHTML = `
          <div class="avatar-game-header">
            <span style="display:inline-flex;align-items:center;gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;"><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01M17.5 6H6.5A4.5 4.5 0 002 10.5v3A4.5 4.5 0 006.5 18h11a4.5 4.5 0 004.5-4.5v-3A4.5 4.5 0 0017.5 6z"/></svg> ${game}</span>
            <span class="avatar-game-badge">${avatars.length} avatar${avatars.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="avatar-grid"></div>
        `;

        const grid = section.querySelector('.avatar-grid');

        avatars.forEach(item => {
          const avatarUrl = `assets/avatars/${encodeURIComponent(game)}/${encodeURIComponent(item.file)}`;
          const isSelected = currentSavedAvatar === avatarUrl || this.selectedAvatar?.url === avatarUrl;

          const card = document.createElement('div');
          card.className = `avatar-card ${isSelected ? 'avatar-card--selected' : ''}`;
          card.title = `${item.name} (${game})`;

          card.innerHTML = `
            <div class="avatar-card__img-wrap">
              <img src="${avatarUrl}" alt="${item.name}" loading="lazy" data-fallback-src="https://images.placeholders.dev/?width=60&amp;height=60&amp;text=PSN&amp;bgColor=%230a0e17&amp;textColor=%230070f3">
            </div>
            <span class="avatar-card__name">${item.name}</span>
          `;

          card.onclick = () => {
            modal.querySelectorAll('.avatar-card--selected').forEach(c => c.classList.remove('avatar-card--selected'));
            card.classList.add('avatar-card--selected');

            this.selectedAvatar = { url: avatarUrl, name: item.name };
            const previewEl = modal.querySelector('#profileBigPreview');
            const usernameInput = modal.querySelector('#profileUsernameInput');
            this.updateBigAvatarPreview(previewEl, avatarUrl, usernameInput.value.trim());
          };

          grid.appendChild(card);
        });

        container.appendChild(section);
      });

      if (!q && visibleGames.length > maxGamesToRender) {
        const moreNote = document.createElement('div');
        moreNote.style.cssText = 'text-align:center; padding: 16px; color: var(--color-text-secondary);';
        moreNote.innerHTML = `
          <p>Showing ${maxGamesToRender} of ${visibleGames.length} games. Use search above or dropdown to find any of the 450+ games!</p>
          <button class="btn btn--secondary" style="margin-top: 10px;" id="loadAllAvatarsBtn">Show All Games</button>
        `;
        moreNote.querySelector('#loadAllAvatarsBtn').onclick = () => {
          moreNote.remove();
          visibleGames.slice(maxGamesToRender).forEach(game => {
            const section = document.createElement('div');
            section.className = 'avatar-game-section';
            section.dataset.game = game;
            section.innerHTML = `
              <div class="avatar-game-header">
                <span style="display:inline-flex;align-items:center;gap:6px;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;"><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01M17.5 6H6.5A4.5 4.5 0 002 10.5v3A4.5 4.5 0 006.5 18h11a4.5 4.5 0 004.5-4.5v-3A4.5 4.5 0 0017.5 6z"/></svg> ${game}</span>
                <span class="avatar-game-badge">${data[game].length} avatars</span>
              </div>
              <div class="avatar-grid"></div>
            `;
            const grid = section.querySelector('.avatar-grid');
            data[game].forEach(item => {
              const avatarUrl = `assets/avatars/${encodeURIComponent(game)}/${encodeURIComponent(item.file)}`;
              const isSelected = currentSavedAvatar === avatarUrl || this.selectedAvatar?.url === avatarUrl;
              const card = document.createElement('div');
              card.className = `avatar-card ${isSelected ? 'avatar-card--selected' : ''}`;
              card.title = `${item.name} (${game})`;
              card.innerHTML = `
                <div class="avatar-card__img-wrap">
                  <img src="${avatarUrl}" alt="${item.name}" loading="lazy" data-fallback-src="https://images.placeholders.dev/?width=60&amp;height=60&amp;text=PSN&amp;bgColor=%230a0e17&amp;textColor=%230070f3">
                </div>
                <span class="avatar-card__name">${item.name}</span>
              `;
              card.onclick = () => {
                modal.querySelectorAll('.avatar-card--selected').forEach(c => c.classList.remove('avatar-card--selected'));
                card.classList.add('avatar-card--selected');
                this.selectedAvatar = { url: avatarUrl, name: item.name };
                const previewEl = modal.querySelector('#profileBigPreview');
                const usernameInput = modal.querySelector('#profileUsernameInput');
                this.updateBigAvatarPreview(previewEl, avatarUrl, usernameInput.value.trim());
              };
              grid.appendChild(card);
            });
            container.appendChild(section);
          });
        };
        container.appendChild(moreNote);
      }
    };

    renderList();

    let debounceTimer;
    searchInput.oninput = (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        renderList(e.target.value);
      }, 200);
    };
  }

};

// Make UI globally accessible
window.UI = UI;
