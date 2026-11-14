const CatalogURLs = {
  hosts: {
    coverImage: ['images.igdb.com'],
    pkgps4: ['www.pkgps4.click'],
    dlpsgame: ['dlpsgame.com'],
    superpsx: ['www.superpsx.com']
  },
  valid(value, field) {
    if (typeof value !== 'string' || !value || /[\s\\<>"'`]/.test(value)) return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.port === '' &&
        !url.username && !url.password && !url.hash &&
        (this.hosts[field] || []).includes(url.hostname) &&
        url.href === value;
    } catch {
      return false;
    }
  }
};

function safeSearchHash(hash) {
  const value = hash.startsWith('/search/') ? hash.slice(8).replace(/\/$/, '') :
    hash.startsWith('q=') ? hash.slice(2) : '';
  try { return decodeURIComponent(value); }
  catch { return ''; }
}

function safeAvatarPath(value) {
  return typeof value === 'string' && value.length <= 500 &&
    /^assets\/avatars\/(?:[A-Za-z0-9._%!'()*~-]+)\/(?:[A-Za-z0-9._%!'()*~-]+\.(?:png|jpg|jpeg|webp))$/i.test(value) &&
    !/%(?:2f|5c|2e)/i.test(value) &&
    !value.split('/').some(part => part === '.' || part === '..');
}

function validBackupFileSize(size) {
  return Number.isInteger(size) && size >= 0 && size <= 1024 * 1024;
}

function validateBackup(data) {
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const string = (value, max) => typeof value === 'string' && value.length <= max;
  const id = value => typeof value === 'string' && /^(?:CUSA|PPSA)\d{5}$/.test(value);
  if (!record(data) || Object.keys(data).some(key => ![
    'version', 'exportedAt', 'collection', 'wishlist', 'username', 'avatar',
    'avatar_name', 'theme', 'pageSize', 'lowRes'
  ].includes(key)) || data.version !== '1.0' ||
      !string(data.exportedAt, 40) || !Number.isFinite(Date.parse(data.exportedAt)) ||
      !record(data.collection) || Object.keys(data.collection).length > 10000 ||
      !Object.entries(data.collection).every(([key, status]) =>
        id(key) && ['owned', 'playing', 'backlog'].includes(status)) ||
      !Array.isArray(data.wishlist) || data.wishlist.length > 10000 ||
      !data.wishlist.every(id) || !string(data.username, 100) ||
      !string(data.avatar, 500) || (data.avatar && !safeAvatarPath(data.avatar)) ||
      !string(data.avatar_name, 150) ||
      !['dark', 'light', 'ocean', 'cyberpunk', 'forest', 'amber', 'violet',
        'sunset', 'classic', 'catppuccin'].includes(data.theme) ||
      !['12', '24', '48'].includes(data.pageSize) ||
      !['true', 'false'].includes(data.lowRes)) return false;
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CatalogURLs, safeSearchHash, safeAvatarPath, validBackupFileSize, validateBackup };
}
