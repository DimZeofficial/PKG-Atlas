const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { CatalogURLs, safeSearchHash, safeAvatarPath, validBackupFileSize, validateBackup } =
  require('../assets/js/security.js');

test('catalog URLs allow only HTTPS on the exact host for each field', () => {
  assert.equal(CatalogURLs.valid('https://images.igdb.com/igdb/image/upload/t_cover_big/x.jpg', 'coverImage'), true);
  assert.equal(CatalogURLs.valid('https://www.pkgps4.click/game/', 'pkgps4'), true);
  assert.equal(CatalogURLs.valid('https://dlpsgame.com/game/', 'dlpsgame'), true);
  for (const url of [
    'javascript:alert(1)', 'http://www.pkgps4.click/game/',
    'https://www.pkgps4.click.evil.test/game/',
    'https://www.pkgps4.click@evil.test/game/',
    'https://evil.test@www.pkgps4.click/game/',
    'https://www.pkgps4.click:444/game/',
    'https://www.pkgps4.click/game/" onclick="alert(1)',
    'https://www.pkgps4.click/game/#fragment',
    '//www.pkgps4.click/game/'
  ]) assert.equal(CatalogURLs.valid(url, 'pkgps4'), false, url);
  assert.equal(CatalogURLs.valid('https://www.pkgps4.click/game/', 'coverImage'), false);
  assert.equal(CatalogURLs.valid('https://www.pkgps4.click/game/', 'unknown'), false);
});

test('malformed search hashes do not throw or become search text', () => {
  assert.equal(safeSearchHash('/search/hello%20world/'), 'hello world');
  assert.equal(safeSearchHash('q=Bloodborne'), 'Bloodborne');
  assert.equal(safeSearchHash('q=%ZZ'), '');
  assert.equal(safeSearchHash('/search/%E0%A4%A'), '');
});

const backup = () => ({
  version: '1.0', exportedAt: new Date().toISOString(),
  collection: { CUSA12345: 'owned' }, wishlist: ['PPSA12345'],
  username: '<img src=x onerror=alert(1)>', avatar: '',
  avatar_name: '', theme: 'dark', pageSize: '24', lowRes: 'false'
});

test('backup schema rejects malformed and hostile state before import', () => {
  assert.equal(validBackupFileSize(1024 * 1024), true);
  assert.equal(validBackupFileSize(1024 * 1024 + 1), false);
  assert.equal(validBackupFileSize(-1), false);
  assert.equal(validateBackup(backup()), true);
  for (const change of [
    b => { b.collection.CUSA12345 = 'admin'; },
    b => { Object.defineProperty(b.collection, '__proto__', { value: 'owned', enumerable: true }); },
    b => { b.wishlist = ['invalid']; },
    b => { b.avatar = 'javascript:alert(1)'; },
    b => { b.avatar = 'assets/avatars/..%2Fsecret/x.png'; },
    b => { b.theme = 'dark" onmouseover="alert(1)'; },
    b => { b.username = 'a'.repeat(101); },
    b => { b.pageSize = '99999'; },
    b => { b.lowRes = true; },
    b => { b.extra = 'unexpected'; }
  ]) {
    const value = backup();
    change(value);
    assert.equal(validateBackup(value), false);
  }
  assert.equal(safeAvatarPath('assets/avatars/FINAL%20FANTASY/cloud.png'), true);
});

test('all catalog URLs conform to the same renderer allowlist', () => {
  const { games } = JSON.parse(readFileSync('data/games.json', 'utf8'));
  for (const game of games) {
    assert.equal(CatalogURLs.valid(game.coverImage, 'coverImage'), true, game.id);
    for (const [field, url] of Object.entries(game.links || {}))
      assert.equal(CatalogURLs.valid(url, field), true, `${game.id} ${field}`);
  }
});

test('all shipped avatar paths remain usable under path validation', () => {
  const avatars = JSON.parse(readFileSync('data/avatars.json', 'utf8'));
  for (const [game, items] of Object.entries(avatars))
    for (const item of items)
      assert.equal(safeAvatarPath(`assets/avatars/${encodeURIComponent(game)}/${encodeURIComponent(item.file)}`),
        true, `${game}/${item.file}`);
});

test('cards, details, and profile text cannot create markup from data', () => {
  const encode = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const element = () => ({
    dataset: {},
    get content() { return this; },
    set textContent(value) { this.innerHTML = encode(value); },
    setAttribute(name, value) { this[name] = value; },
    get outerHTML() { return `<span data-value="${encode(this['data-value'])}"></span>`; },
    querySelector() { return null; },
    replaceChildren(...children) { this.children = children; }
  });
  const sandbox = {
    document: { createElement: element, addEventListener() {} },
    localStorage: { getItem() { return null; } },
    CatalogURLs, safeAvatarPath, validateBackup, URL, window: {}
  };
  vm.runInNewContext(readFileSync('assets/js/ui.js', 'utf8') + '\nglobalThis.testUI = UI;', sandbox);
  const game = {
    id: 'CUSA12345', title: '"><img src=x onerror=alert(1)>',
    description: '<script>alert(1)</script>', coverImage: 'javascript:alert(1)',
    aliases: ['<svg onload=alert(1)>'], genre: ['<img src=x>'],
    links: { pkgps4: 'javascript:alert(1)', dlpsgame: 'https://dlpsgame.com/game/' }
  };
  const card = sandbox.testUI.createGameCard(game).innerHTML;
  const detail = sandbox.testUI.buildDetailElement(game).innerHTML;
  for (const html of [card, detail]) {
    assert.doesNotMatch(html, /<script>|<img src=x|<svg onload|javascript:alert/);
    assert.match(html, /&lt;img src=x/);
  }
  assert.match(detail, /href="https:\/\/dlpsgame.com\/game\/"/);
  assert.doesNotMatch(detail, /Open PKGPS4 Link/);
  const preview = element();
  sandbox.testUI.updateBigAvatarPreview(preview, 'assets/avatars/GAME/hero.png', game.title);
  assert.equal(preview.children[0].alt, game.title);
  assert.equal(preview.children[0].src, 'assets/avatars/GAME/hero.png');
});
