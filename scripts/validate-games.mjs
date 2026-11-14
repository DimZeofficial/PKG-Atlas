import { readFileSync } from 'node:fs';
import security from '../assets/js/security.js';

const { CatalogURLs } = security;

const { games } = JSON.parse(readFileSync('data/games.json', 'utf8'));
const gameKeys = new Set();
const errors = [];

for (const [i, game] of games.entries()) {
  const where = `games[${i}]`;

  if (!/^(?:CUSA|PPSA)\d{5}$/.test(game.id ?? ''))
    errors.push(`${where}: invalid id ${game.id}`);

const titleKey = (game.title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const gameKey = `${game.id}:${titleKey}`;
if (gameKeys.has(gameKey)) errors.push(`${where}: duplicate package and title ${game.id}`);
gameKeys.add(gameKey);

  if (!game.title?.trim()) errors.push(`${where}: missing title`);

  for (const alias of game.aliases ?? []) {
    if (typeof alias !== 'string' || !alias.trim())
      errors.push(`${where}: invalid alias`);
  }

  if (!CatalogURLs.valid(game.coverImage, 'coverImage'))
    errors.push(`${where}: invalid cover URL`);
  for (const [field, url] of Object.entries(game.links ?? {})) {
    if (!CatalogURLs.valid(url, field))
      errors.push(`${where}: invalid ${field} source URL`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`✓ ${games.length} entries validated`);
