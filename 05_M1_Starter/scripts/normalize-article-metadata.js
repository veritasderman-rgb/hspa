// Normalizace metadat článků v data/articles.json podle řízených slovníků.
//
//   node scripts/normalize-article-metadata.js          # zapíše změny
//   node scripts/normalize-article-metadata.js --check  # jen report, exit 1 při driftu
//
// Co normalizuje:
//   1. `tag` — historické volné tagy → kanonický label podle data/tags.json
//      (mapa `aliases`). Neznámý tag mimo slovník i aliasy nechává být —
//      ten chytí ingest/validate-articles.js jako fail.
//   2. `kind` — sjednocení na enum: `clanek`→`article`, `analyza`→`analysis`,
//      chybějící → `article` (výchozí druh textu).
//
// Idempotentní — druhý běh nic nezmění. Používá ho jednorázová migrace
// i nightly rutina (--check jako drift detektor).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const KIND_ALIASES = { clanek: 'article', analyza: 'analysis' };
const KIND_DEFAULT = 'article';

const checkOnly = process.argv.includes('--check');

const tagsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tags.json'), 'utf8'));
const canonical = new Set(tagsData.tags.map(t => t.label));
const aliases = tagsData.aliases ?? {};

const articlesFile = path.join(ROOT, 'data', 'articles.json');
const data = JSON.parse(fs.readFileSync(articlesFile, 'utf8'));

let tagChanges = 0;
let kindChanges = 0;
const unknown = [];

for (const a of data.articles ?? []) {
  if (a.tag && !canonical.has(a.tag)) {
    if (aliases[a.tag]) {
      if (!checkOnly) a.tag = aliases[a.tag];
      tagChanges++;
    } else {
      unknown.push(`${a.id ?? '?'} (${a.slug}): tag="${a.tag}"`);
    }
  }
  const normalizedKind = KIND_ALIASES[a.kind] ?? a.kind ?? KIND_DEFAULT;
  if (a.kind !== normalizedKind) {
    if (!checkOnly) a.kind = normalizedKind;
    kindChanges++;
  }
}

console.log(`tag: ${tagChanges} ${checkOnly ? 'k normalizaci' : 'normalizováno'}, kind: ${kindChanges} ${checkOnly ? 'k normalizaci' : 'normalizováno'}`);
if (unknown.length) {
  console.error(`Neznámé tagy mimo slovník i aliasy (${unknown.length}) — doplň do data/tags.json:`);
  for (const u of unknown) console.error('  ✗ ' + u);
}

if (checkOnly) {
  process.exit(tagChanges + kindChanges + unknown.length > 0 ? 1 : 0);
}

if (tagChanges + kindChanges > 0) {
  fs.writeFileSync(articlesFile, JSON.stringify(data, null, 2) + '\n');
  console.log('data/articles.json zapsáno.');
} else {
  console.log('Beze změn.');
}
if (unknown.length) process.exit(1);
