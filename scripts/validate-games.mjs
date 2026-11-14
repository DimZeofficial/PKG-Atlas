import { readFileSync } from 'node:fs';

const { games } = JSON.parse(readFileSync('data/games.json', 'utf8'));
const ids = new Set();
const errors = [];

for (const [i, game] of games.entries()) {
  const where = `games[${i}]`;

  if (!/^CU[SA]\d{5}$|^PPSA\d{5}$/.test(game.id ?? ''))
    errors.push(`${where}: invalid id ${game.id}`);

  if (ids.has(game.id)) errors.push(`${where}: duplicate id ${game.id}`);
  ids.add(game.id);

  if (!game.title?.trim()) errors.push(`${where}: missing title`);

  for (const alias of game.aliases ?? []) {
    if (typeof alias !== 'string' || !alias.trim())
      errors.push(`${where}: invalid alias`);
  }

  for (const url of Object.values(game.links ?? {})) {
    try { new URL(url); }
    catch { errors.push(`${where}: invalid source URL ${url}`); }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`✓ ${games.length} entries validated`);