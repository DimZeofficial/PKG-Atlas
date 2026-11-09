/**
 * Data Management Layer
 * Handles fetching, filtering, and sorting of game data.
 */
class GameDatabase {
  constructor() {
    this.games = [];
    this.filteredGames = [];
    this.filters = {
      genre: [],
      firmware: [],
      searchQuery: '',
      sortBy: 'title',
      sortOrder: 'asc',
      sizeRangeMin: null,
      sizeRangeMax: null,
      hidePlaceholderSizes: false
    };
  }

  /**
   * Load games from the JSON file.
   * Automatically handles localhost, subpaths, and GitHub Pages hosting.
   */
  async load() {
    try {
      const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
      const primaryUrl = `${basePath}/data/games.json`;
      console.log('📂 Fetching games from:', primaryUrl);

      let response;
      try {
        response = await fetch(primaryUrl);
      } catch (e) {
        response = null;
      }

      if (!response || !response.ok) {
        // Fallback to relative path
        response = await fetch('data/games.json');
      }

      if (!response.ok) throw new Error(`Failed to load games data (${response.status})`);
      const data = await response.json();
      this.games = data.games || [];
      this.filteredGames = [...this.games];
      return this;
    } catch (error) {
      console.error('Error loading game database:', error);
      this.games = [];
      this.filteredGames = [];
      return this;
    }
  }

  /**
   * Parse size strings like "28.40 GB", "725.35 MB", "15 GB" into GB numeric value.
   * Returns NaN if parsing fails.
   */
  parseSizeToGB(s) {
    if (!s) return NaN;
    const m = s.match(/^([\d.]+)\s*(GB|MB|KB|TB)$/i);
    if (!m) return NaN;
    const num = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    const mult = {KB: 1/1024, MB: 1/1024, GB: 1, TB: 1024}[unit] ?? 1;
    return num * mult;
  }

  /**
   * Apply current filters and sorting to the game list.
   */
  applyFilters() {
    const query = (this.filters.searchQuery || '').toLowerCase().trim();
    const { sizeRangeMin, sizeRangeMax, hidePlaceholderSizes } = this.filters;
    const matchScores = new Map();

    this.filteredGames = this.games.filter(game => {
      // Genre filter
      if (this.filters.genre.length > 0 && 
          !(game.genre || []).some(g => this.filters.genre.includes(g))) return false;
      
      // Firmware filter (matches clean version numbers e.g. 5.05, 9.00, 9.50)
      if (this.filters.firmware.length > 0) {
        const gameFw = (game.firmware || '').toLowerCase();
        const matchesFw = this.filters.firmware.some(selected => {
          const major = selected.split('.')[0];
          return gameFw.includes(selected) ||
                 gameFw.includes(`${major}.xx`) ||
                 gameFw.includes(`${major} or higher`) ||
                 gameFw.includes(`${major}.0`) ||
                 gameFw.includes(`${major}+`);
        });
        if (!matchesFw) return false;
      }
      
      // Size range filter
      const sizeStr = game.size?.game;
      const sizeGB = this.parseSizeToGB(sizeStr);
      if (!isNaN(sizeGB)) {
        if (sizeRangeMin !== null && sizeGB < sizeRangeMin) return false;
        if (sizeRangeMax !== null && sizeGB > sizeRangeMax) return false;
      }
      // Hide placeholder sizes (15 GB)
      if (hidePlaceholderSizes && sizeStr === '15 GB') return false;
      
      // Search query — scored so the closest title match sorts first
      if (query) {
        const score = this.searchScore(game, query);
        if (score === null) return false;
        matchScores.set(game, score);
      }

      return true;
    });

    this.sortGames();
    // Relevance first while a query is active; the sort is stable, so the
    // chosen sort order still breaks ties inside each tier.
    if (query) {
      this.filteredGames.sort((a, b) => matchScores.get(a) - matchScores.get(b));
    }
    return this.filteredGames;
  }

  /**
   * Rank a game against a search query. Lower is better; null means no match.
   * Developer needs a word-start hit for short queries: plain substring
   * matching made "gta" match "Eggtart" and outrank the actual GTA titles.
   */
  searchScore(game, query) {
    const title = (game.title || '').toLowerCase();
    const id = (game.id || '').toLowerCase();
    const slug = (game.slug || '').toLowerCase();
    const developer = (game.developer || '').toLowerCase();
    const publisher = (game.publisher || '').toLowerCase();
    const firmware = (game.firmware || '').toLowerCase();
    const aliases = (game.aliases || []).map(a => String(a).toLowerCase());

    const startsWord = text => text.split(/[^a-z0-9]+/).some(word => word.startsWith(query));
    const matchesCredit = text => startsWord(text) || (query.length >= 4 && text.includes(query));

    if (title === query) return 0;
    if (title.startsWith(query)) return 1;
    if (startsWord(title)) return 2;
    if (aliases.some(alias => alias === query)) return 3;
    if (aliases.some(alias => alias.startsWith(query))) return 4;
    if (title.includes(query)) return 5;
    if (aliases.some(alias => alias.includes(query))) return 6;
    if (id === query) return 7;
    if (id.includes(query) || slug.includes(query)) return 8;
    if (matchesCredit(developer) || matchesCredit(publisher)) return 9;
    if (firmware.includes(query)) return 10;
    return null;
  }

  /**
   * Sort the filtered games based on current sort settings.
   */
  sortGames() {
    const { sortBy, sortOrder } = this.filters;
    this.filteredGames.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      // Handle nested properties (e.g., 'size.game')
      if (sortBy.includes('.')) {
        const [parent, child] = sortBy.split('.');
        valueA = a[parent]?.[child] ?? '';
        valueB = b[parent]?.[child] ?? '';
      }
      
      const aNum = this.parseSizeToGB(valueA);
      const bNum = this.parseSizeToGB(valueB);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        // numeric comparison (ascending or descending)
        const diff = sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
        if (diff !== 0) return diff;
      }
      // fallback to string comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Update a specific filter and re-apply.
   */
  updateFilter(key, value) {
    this.filters[key] = value;
    return this.applyFilters();
  }

  /**
   * Get a single game by its ID.
   */
  getGameById(id) {
    if (!id) return null;
    const key = id.toLowerCase();
    return this.games.find(game => game.id.toLowerCase() === key)
      || this.games.find(game => (game.legacyId || '').toLowerCase() === key)
      || null;
  }
}