/**
 * Main Application Orchestrator
 * Coordinates database, animations, theme switching, settings, profile setup, and page interactions.
 */
document.addEventListener('DOMContentLoaded', async () => {
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

  // 1. Initialize Database
  const db = new GameDatabase();
  await db.load();

  // 2. Initial UI Sync (Profile, Wishlist Badges, Themes, Settings)
  UI.applySettings();
  UI.syncProfileUI();
  UI.syncWishlistBadges();

  // Process hash AFTER database is loaded and UI is initialized
  if (window.location.pathname.includes('search.html')) {
    let initialQuery = '';
    if (window.location.hash) {
      const hash = window.location.hash.slice(1);
      if (hash.startsWith('/search/')) {
        initialQuery = decodeURIComponent(hash.slice(8).replace(/\/$/, ''));
      } else if (hash.startsWith('q=')) {
        initialQuery = decodeURIComponent(hash.slice(2));
      }
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      initialQuery = urlParams.get('q') || '';
    }
    if (initialQuery) {
      // Use setTimeout to ensure DOM is ready and searchInput exists
      setTimeout(() => {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.value = initialQuery;
          db.updateFilter('searchQuery', initialQuery);
          applyFilterAndReset();
        }
      }, 0);
    }

    // Listen for hash changes (back/forward, direct link, manual hash change)
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);
      let query = '';
      if (hash.startsWith('/search/')) {
        query = decodeURIComponent(hash.slice(8).replace(/\/$/, ''));
      } else if (hash.startsWith('q=')) {
        query = decodeURIComponent(hash.slice(2));
      }
      if (query && query !== (db.filters.searchQuery || '')) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.value = query;
          db.updateFilter('searchQuery', query);
          applyFilterAndReset();
        }
      }
    });

  }
  // 3. First-time visit: Prompt to choose username & avatar at the start
  if (!LS.get('ps4_username')) {
    setTimeout(() => {
      UI.openProfileModal();
    }, 400);
  }

  // 4. Wire Profile modal triggers
  const profileTriggers = [
    document.getElementById('userProfileBtn'),
    document.getElementById('profileOpenBtn'),
    document.getElementById('sidebarProfileLink')
  ];
  profileTriggers.forEach(btn => {
    if (btn) btn.addEventListener('click', (e) => {
      e.preventDefault();
      UI.openProfileModal();
    });
  });

  // 5. Wire Settings modal triggers
  const settingsTriggers = [
    document.getElementById('sidebarSettingsLink'),
    document.getElementById('headerSettingsBtn')
  ];
  settingsTriggers.forEach(btn => {
    if (btn) btn.addEventListener('click', (e) => {
      e.preventDefault();
      UI.openSettingsModal();
    });
  });

  // 6. Ambient Falling Orbs Background
  function setupOrbs() {
    let container = document.querySelector('.orbs-bg');
    if (!container) {
      container = document.createElement('div');
      container.className = 'orbs-bg';
      document.body.prepend(container);
    }
    if (container.dataset.initialized) return;
    container.dataset.initialized = 'true';

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const orbCount = isMobile ? 6 : 10;
    const palette = ['#0070f3', '#00b4d8', '#8b5cf6', '#a855f7', '#ff007f', '#10b981', '#f97316'];

    for (let i = 0; i < orbCount; i++) {
      const orb = document.createElement('div');
      orb.className = 'orb';
      const size = Math.floor(140 + Math.random() * 180);
      const x = Math.floor(Math.random() * 95);
      const dx = Math.floor((Math.random() * 60) - 30);
      const duration = (22 + Math.random() * 14).toFixed(1);
      const delay = (Math.random() * 18).toFixed(1);

      orb.style.setProperty('--size', `${size}px`);
      orb.style.setProperty('--x', `${x}%`);
      orb.style.setProperty('--dx', `${dx}px`);
      orb.style.setProperty('--duration', `${duration}s`);
      orb.style.setProperty('--delay', `-${delay}s`);
      orb.style.setProperty('--orb-color', palette[i % palette.length]);

      container.appendChild(orb);
    }
  }
  setupOrbs();

  // 7. Smooth Scroll & Staggered Reveal Observer for Grid Cards
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px -20px 0px'
  });

  function attachScrollReveals(parent = document) {
    const elements = parent.querySelectorAll('.reveal');
    elements.forEach((el, i) => {
      if (!el.style.getPropertyValue('--reveal-delay')) {
        el.style.setProperty('--reveal-delay', `${Math.min(i % 16, 10) * 35}ms`);
      }
      revealObserver.observe(el);
    });
  }

  // Trigger initial elements on page
  attachScrollReveals();

  // 8. Page Entrance and Smooth In-Between Navigation
  requestAnimationFrame(() => {
    document.body.classList.add('page-loaded');
  });

  function navigateSmoothly(url) {
    document.body.classList.add('page-fade-out');
    setTimeout(() => {
      window.location.href = url;
    }, 180);
  }

  document.querySelectorAll('a[data-nav="smooth"], .sidebar__nav-item[href$=".html"], .top-header__nav-link[href$=".html"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      navigateSmoothly(href);
    });
  });

  // 9. Themes Switching (10 Fully-Working PlayStation Themes)
  const themeToggle = document.getElementById('themeToggle');

  const themes = [
    { value: 'dark', label: 'Dark Navy', icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z', logo: 'dark_navy' },
    { value: 'light', label: 'PS5 Clean', icon: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M16 12a4 4 0 11-8 0 4 4 0 018 0z', logo: 'ps5clean' },
    { value: 'ocean', label: 'Ocean Trench', icon: 'M2 7c2 2.5 4.5 3.5 7 3.5S14 9.5 17 7s4.5-3.5 5-3.5M2 13c2 2.5 4.5 3.5 7 3.5s5-1 8-3.5 4.5-3.5 5-3.5M2 19c2 2.5 4.5 3.5 7 3.5s5-1 8-3.5 4.5-3.5 5-3.5', logo: 'ocean' },
    { value: 'cyberpunk', label: 'Cyberpunk', icon: 'M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z', logo: 'cyberpunk' },
    { value: 'forest', label: 'Emerald Forest', icon: 'M12 2L6 11h3v7h6v-7h3zM12 18v4', logo: 'emerald' },
    { value: 'amber', label: 'Molten Amber', icon: 'M12 2c3.2 4.4 5.5 7.2 5.5 10a5.5 5.5 0 11-11 0c0-2.8 2.3-5.6 5.5-10z', logo: 'molten' },
    { value: 'violet', label: 'Cosmic Violet', icon: 'M12 3a9 9 0 109 9c0-2-4.5-3.5-9-3.5S3 10 3 12a9 9 0 009-9z', logo: 'violet' },
    { value: 'sunset', label: 'Synth Sunset', icon: 'M12 4a5 5 0 015 5v1H7V9a5 5 0 015-5zM3 18h18M6 14h12', logo: 'sunset' },
    { value: 'classic', label: 'Classic PS', icon: 'M6 12h4M8 10v4M15 13h.01M18 11h.01M17.5 6H6.5A4.5 4.5 0 002 10.5v3A4.5 4.5 0 006.5 18h11a4.5 4.5 0 004.5-4.5v-3A4.5 4.5 0 0017.5 6z', logo: 'classicPS' },
    { value: 'catppuccin', label: 'Catppuccin', icon: 'M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 17.9 21 15 21S9 17.9 9 15c0-1.25.5-2.43 1.35-3.26v0C9.31 9.97 5.6 7.05 4.3 6.02A2.1 2.1 0 018.6 4a7.24 7.24 0 013.4 1z', logo: 'catppuccin' }
  ];

  function themeIconSVG(themeObj) {
    const d = (themeObj && themeObj.icon) || themes[0].icon;
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  }

  function applyTheme(themeName) {
    const themeObj = themes.find(t => t.value === themeName) || themes[0];
    document.documentElement.setAttribute('data-theme', themeObj.value);
    LS.set('ps4_theme', themeObj.value);

    if (themeToggle) themeToggle.innerHTML = themeIconSVG(themeObj);

    // Tab favicon and sidebar mark follow the active theme
    const faviconLink = document.querySelector('link[rel="icon"]');
    if (faviconLink) faviconLink.href = `favicon_${themeObj.logo}.png`;
    document.querySelectorAll('.sidebar__logo-img').forEach(img => {
      const src = `logo_${themeObj.logo}.png`;
      if (img.getAttribute('src') !== src) img.src = src;
    });

    const orbs = document.querySelectorAll('.orb');
    orbs.forEach(orb => {
      orb.style.removeProperty('--orb-color');
    });
  }

  const initialTheme = LS.get('ps4_theme', 'dark');
  applyTheme(initialTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const idx = themes.findIndex(t => t.value === current);
      const nextTheme = themes[(idx + 1) % themes.length];
      applyTheme(nextTheme.value);
      UI.showToast(`Theme: ${nextTheme.label}`);
    });
  }

  // 10. Dedicated Game Detail Page (game-detail.html)
  const gameDetailContainer = document.getElementById('gameDetailContainer');
  if (gameDetailContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');
    const game = gameId ? db.getGameById(gameId) : null;

    if (game) {
      document.title = `PS4 Database - ${game.title}`;
      gameDetailContainer.innerHTML = `
        <div style="margin-bottom: var(--space-lg);">
          <a href="search.html" class="btn btn--secondary" data-nav="smooth">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back to Store
          </a>
        </div>
        ${UI.buildDetailHTML(game)}
      `;

      // Wishlist toggle listener on dedicated page
      const wishlistBtn = gameDetailContainer.querySelector('.modal-wishlist-toggle');
      if (wishlistBtn) {
        wishlistBtn.addEventListener('click', () => {
          let wishlist = LS.parse('ps4_wishlist', []);
          if (wishlist.includes(game.id)) {
            wishlist = wishlist.filter(id => id !== game.id);
            wishlistBtn.classList.remove('btn--wishlist--active');
            wishlistBtn.innerHTML = `
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg> Add to Wishlist
            `;
            UI.showToast(`Removed "${game.title}" from Wishlist`);
          } else {
            wishlist.push(game.id);
            wishlistBtn.classList.add('btn--wishlist--active');
            wishlistBtn.innerHTML = `
              <svg width="17" height="17" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg> In Wishlist
            `;
            UI.showToast(`Added "${game.title}" to Wishlist!`);
          }
          LS.set('ps4_wishlist', JSON.stringify(wishlist));
          UI.syncWishlistBadges();
        });
      }
    } else {
      gameDetailContainer.innerHTML = `
        <div class="empty-state">
          <h3>Game Not Found</h3>
          <p>The requested game ID could not be located in the database.</p>
          <a href="search.html" class="btn btn--primary" style="margin-top: var(--space-md);" data-nav="smooth">Browse Games</a>
        </div>
      `;
    }
  }

  // 11. Dedicated Wishlist Page (wishlist.html)
  const wishlistGrid = document.getElementById('wishlistGrid');
  if (wishlistGrid) {
    function renderWishlistPage() {
      const wishlist = LS.parse('ps4_wishlist', []);
      const savedGames = db.games.filter(g => wishlist.includes(g.id));

      const countEl = document.getElementById('wishlistCountText');
      if (countEl) {
        countEl.textContent = `${savedGames.length} game${savedGames.length !== 1 ? 's' : ''} saved`;
      }

      if (savedGames.length === 0) {
        wishlistGrid.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            <h3>Your Wishlist is Empty</h3>
            <p>Save games you want to download later by clicking the heart icon on any game card.</p>
            <a href="search.html" class="btn btn--primary" style="margin-top: var(--space-md);" data-nav="smooth">Browse Games</a>
          </div>
        `;
        return;
      }

      UI.renderGameGrid(savedGames, wishlistGrid);
      attachScrollReveals(wishlistGrid);
    }

    renderWishlistPage();

    const clearWishlistBtn = document.getElementById('clearWishlistBtn');
    if (clearWishlistBtn) {
      clearWishlistBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your entire wishlist?')) {
          LS.set('ps4_wishlist', JSON.stringify([]));
          UI.syncWishlistBadges();
          renderWishlistPage();
          UI.showToast('Wishlist cleared.');
        }
      });
    }
  }


  // 11b. Collection pages (backlog, playing, owned, library)
  const collectionGrid = document.getElementById('collectionGrid');
  const libraryGrid = document.getElementById('libraryGrid');
  if (collectionGrid || libraryGrid) {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const targetGrid = libraryGrid || collectionGrid;
    const countText = document.getElementById('collectionCountText') || document.getElementById('libraryCountText');
    
    function renderCollectionPage() {
      const collection = LS.parse('ps4_collection', {});
      let games = [];
      
      if (page === 'backlog.html') {
        games = db.games.filter(g => collection[g.id] === 'backlog');
        if (countText) countText.textContent = `${games.length} game${games.length !== 1 ? 's' : ''} in backlog`;
      } else if (page === 'playing.html') {
        games = db.games.filter(g => collection[g.id] === 'playing');
        if (countText) countText.textContent = `${games.length} game${games.length !== 1 ? 's' : ''} playing`;
      } else if (page === 'owned.html') {
        games = db.games.filter(g => collection[g.id] === 'owned');
        if (countText) countText.textContent = `${games.length} game${games.length !== 1 ? 's' : ''} owned`;
      } else if (page === 'library.html') {
        games = db.games.filter(g => collection[g.id] && collection[g.id] !== 'none');
        if (countText) countText.textContent = `${games.length} game${games.length !== 1 ? 's' : ''} in library`;
      }
      
      if (games.length === 0) {
        targetGrid.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <h3>No Games Found</h3>
            <p>Mark games as owned/playing/backlog by clicking the status icon on any game card.</p>
            <a href="search.html" class="btn btn--primary" style="margin-top: var(--space-md);" data-nav="smooth">Browse Games</a>
          </div>
        `;
        return;
      }
      
      UI.renderGameGrid(games, targetGrid);
      attachScrollReveals(targetGrid);
    }
    
    renderCollectionPage();
  }


  // 12. Pagination & Filtering for Store & Home (index.html & search.html)
  const gridContainer = document.getElementById('gameGrid');
  const searchInput = document.getElementById('searchInput');
  const pageSizeSelect = document.getElementById('pageSize');
  const paginationEl = document.getElementById('pagination');
  const sortSelect = document.getElementById('sortSelect');

  if (gridContainer) {
    // Read saved page size or default to 24 (options: 12, 24, 48)
    const savedPageSize = parseInt(LS.get('ps4_pageSize') || pageSizeSelect?.value || '24', 10);
    const validSizes = [12, 24, 48];
    const initialPageSize = validSizes.includes(savedPageSize) ? savedPageSize : 24;

    if (pageSizeSelect) {
      pageSizeSelect.value = String(initialPageSize);
    }

    const state = {
      pageSize: initialPageSize,
      currentPage: 1,
      results: db.games
    };

    function renderMainGrid() {
      const total = state.results.length;
      const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

      if (state.currentPage > totalPages) state.currentPage = totalPages;
      if (state.currentPage < 1) state.currentPage = 1;

      const start = (state.currentPage - 1) * state.pageSize;
      const end = start + state.pageSize;
      const pageItems = state.results.slice(start, end);

      UI.renderGameGrid(pageItems, gridContainer);
      updateResultCount(total, start, end);
      renderPaginationControls(totalPages);

      attachScrollReveals(gridContainer);
    }

    function updateResultCount(total, start, end) {
      const el = document.getElementById('resultCount');
      if (!el) return;
      if (total === 0) {
        el.textContent = 'No games found';
      } else {
        el.textContent = `Showing ${start + 1}–${Math.min(end, total)} of ${total} games`;
      }
    }

    function renderPaginationControls(totalPages) {
      if (!paginationEl) return;
      paginationEl.innerHTML = '';
      if (totalPages <= 1) return;

      const createBtn = (label, page, opts = {}) => {
        const btn = document.createElement('button');
        btn.className = 'pagination__btn' + (opts.active ? ' active' : '');
        btn.textContent = label;
        if (opts.disabled) btn.disabled = true;
        if (!opts.disabled && !opts.active) {
          btn.addEventListener('click', () => {
            state.currentPage = page;
            renderMainGrid();
            window.scrollTo({ top: gridContainer.offsetTop - 90, behavior: 'smooth' });
          });
        }
        return btn;
      };

      const createEllipsis = () => {
        const span = document.createElement('span');
        span.className = 'pagination__ellipsis';
        span.textContent = '…';
        return span;
      };

      paginationEl.appendChild(createBtn('‹ Prev', state.currentPage - 1, { disabled: state.currentPage === 1 }));

      const current = state.currentPage;
      const delta = 2;
      const range = [];
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
          range.push(i);
        }
      }

      let last;
      for (const i of range) {
        if (last) {
          if (i - last === 2) paginationEl.appendChild(createBtn(String(last + 1), last + 1, { active: last + 1 === current }));
          else if (i - last > 2) paginationEl.appendChild(createEllipsis());
        }
        paginationEl.appendChild(createBtn(String(i), i, { active: i === current }));
        last = i;
      }

      paginationEl.appendChild(createBtn('Next ›', state.currentPage + 1, { disabled: state.currentPage === totalPages }));
    }

    function applyFilterAndReset() {
      state.results = db.applyFilters();
      state.currentPage = 1;
      renderMainGrid();
      // Update URL hash with search query
      const query = db.filters.searchQuery || '';
      if (window.location.pathname.includes('search.html')) {
        const newHash = query ? `#/search/${encodeURIComponent(query)}/` : '';
        if (window.location.hash !== newHash) {
          history.replaceState(null, '', newHash);
        }
      }
    }

    // Read URL query on search page
    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          db.updateFilter('searchQuery', e.target.value.trim());
          applyFilterAndReset();
        }, 220);
      });

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const q = e.target.value.trim();
          if (window.location.pathname.includes('search.html')) {
            db.updateFilter('searchQuery', q);
            applyFilterAndReset();
          } else {
            // Navigate to search page with hash
            navigateSmoothly(`search.html#/search/${encodeURIComponent(q)}/`);
          }
        }
      });
    }

    const homeSearchBtn = document.getElementById('homeSearchBtn');
    if (homeSearchBtn && searchInput) {
      homeSearchBtn.addEventListener('click', () => {
        const q = searchInput.value.trim();
        navigateSmoothly(`search.html#/search/${encodeURIComponent(q)}/`);
      });
    }

    // Listen for hash changes (back/forward navigation, direct link)
    window.addEventListener('hashchange', () => {
      if (searchInput && window.location.pathname.includes('search.html')) {
        const hash = window.location.hash.slice(1);
        let query = '';
        if (hash.startsWith('/search/')) {
          query = decodeURIComponent(hash.slice(8).replace(/\/$/, ''));
        } else if (hash.startsWith('q=')) {
          query = decodeURIComponent(hash.slice(2));
        }
        if (query !== (db.filters.searchQuery || '')) {
          searchInput.value = query;
          db.updateFilter('searchQuery', query);
          applyFilterAndReset();
        }
      }
    });

    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        const newSize = parseInt(e.target.value, 10);
        state.pageSize = newSize;
        state.currentPage = 1;
        LS.set('ps4_pageSize', String(newSize));
        renderMainGrid();
      });
    }

    if (sortSelect) {
      // Options carry "<field>:<direction>" so every field sorts both ways
      sortSelect.addEventListener('change', (e) => {
        const [sortBy, sortOrder] = String(e.target.value).split(':');
        if (!sortBy) return;
        db.updateFilter('sortBy', sortBy);
        db.updateFilter('sortOrder', sortOrder === 'desc' ? 'desc' : 'asc');
        applyFilterAndReset();
      });
    }

    // Size range filter inputs
    const sizeMin = document.getElementById('sizeRangeMin');
    const sizeMax = document.getElementById('sizeRangeMax');
    const sizeHide = document.getElementById('sizeFilterHidePlaceholder');
    const sizeClear = document.getElementById('sizeFilterClear');

    function updateSizeFilterUI() {
      const min = sizeMin ? sizeMin.value.trim() : '';
      const max = sizeMax ? sizeMax.value.trim() : '';
      const hasValues = min !== '' || max !== '';
      if (sizeClear) sizeClear.style.display = hasValues ? 'inline-flex' : 'none';
    }

    function applySizeFilter() {
      const min = sizeMin ? (sizeMin.value.trim() === '' ? null : parseFloat(sizeMin.value)) : null;
      const max = sizeMax ? (sizeMax.value.trim() === '' ? null : parseFloat(sizeMax.value)) : null;
      const hide = sizeHide ? sizeHide.checked : false;
      db.updateFilter('sizeRangeMin', min);
      db.updateFilter('sizeRangeMax', max);
      db.updateFilter('hidePlaceholderSizes', hide);
      applyFilterAndReset();
      updateSizeFilterUI();
    }

    [sizeMin, sizeMax].forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          updateSizeFilterUI();
        });
        input.addEventListener('change', applySizeFilter);
      }
    });

    if (sizeHide) {
      sizeHide.addEventListener('change', applySizeFilter);
    }

    if (sizeClear) {
      sizeClear.addEventListener('click', () => {
        if (sizeMin) sizeMin.value = '';
        if (sizeMax) sizeMax.value = '';
        if (sizeHide) sizeHide.checked = false;
        db.updateFilter('sizeRangeMin', null);
        db.updateFilter('sizeRangeMax', null);
        db.updateFilter('hidePlaceholderSizes', false);
        applyFilterAndReset();
        updateSizeFilterUI();
      });
    }



    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        if (searchInput) searchInput.value = '';
        db.filters.genre = [];
        db.filters.searchQuery = '';
        applyFilterAndReset();
      });
    }

    // Initial render
    state.results = db.games;
    renderMainGrid();
  }

  // 13. Modal Close Listeners
  const gameModal = document.getElementById('gameModal');
  if (gameModal) {
    gameModal.querySelector('.modal__close')?.addEventListener('click', () => UI.closeModal());
    gameModal.addEventListener('click', (e) => {
      if (e.target === gameModal) UI.closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      UI.closeModal();
      document.getElementById('profileModal')?.classList.remove('modal--active');
      document.getElementById('settingsModal')?.classList.remove('modal--active');
    }
  });

  // 14. Global Card Click & Wishlist Delegations
  document.addEventListener('click', (e) => {
    const downloadBtn = e.target.closest('.btn--download');
    const wishlistBtn = e.target.closest('.btn--wishlist');
    const gameCard = e.target.closest('.game-card');

    if (downloadBtn) {
      e.stopPropagation();
      const game = db.getGameById(downloadBtn.dataset.gameId);
      if (game) UI.showGameDetail(game);
      return;
    }

    if (wishlistBtn) {
      e.stopPropagation();
      const gameId = wishlistBtn.dataset.gameId;
      const game = db.getGameById(gameId);
      let wishlist = LS.parse('ps4_wishlist', []);

      if (wishlist.includes(gameId)) {
        wishlist = wishlist.filter(id => id !== gameId);
        wishlistBtn.classList.remove('btn--wishlist--active');
        const heartSvg = wishlistBtn.querySelector('svg');
        if (heartSvg) heartSvg.setAttribute('fill', 'none');
        UI.showToast(`Removed from Wishlist`);

        if (window.location.pathname.includes('wishlist.html') && gameCard) {
          gameCard.classList.add('card-removing');
          setTimeout(() => {
            gameCard.remove();
            const remaining = document.querySelectorAll('#wishlistGrid .game-card:not(.card-removing)');
            if (remaining.length === 0) {
              const countEl = document.getElementById('wishlistCountText');
              if (countEl) countEl.textContent = '0 games saved';
              const grid = document.getElementById('wishlistGrid');
              if (grid) {
                grid.innerHTML = `
                  <div class="empty-state">
                    <svg class="empty-state__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                    <h3>Your Wishlist is Empty</h3>
                    <p>Save games you want to download later by clicking the heart icon on any game card.</p>
                    <a href="search.html" class="btn btn--primary" style="margin-top: var(--space-md);" data-nav="smooth">Browse Games</a>
                  </div>
                `;
              }
            } else {
              const countEl = document.getElementById('wishlistCountText');
              if (countEl) countEl.textContent = `${remaining.length} game${remaining.length !== 1 ? 's' : ''} saved`;
            }
          }, 320);
        }
      } else {
        wishlist.push(gameId);
        wishlistBtn.classList.add('btn--wishlist--active');
        const heartSvg = wishlistBtn.querySelector('svg');
        if (heartSvg) heartSvg.setAttribute('fill', 'currentColor');
        UI.showToast(`Saved "${game ? game.title : 'Game'}" to Wishlist!`);
      }

      LS.set('ps4_wishlist', JSON.stringify(wishlist));
      UI.syncWishlistBadges();
      return;
    }

    if (gameCard) {
      const game = db.getGameById(gameCard.dataset.gameId);
      if (game) UI.showGameDetail(game);
    }
  });

});
