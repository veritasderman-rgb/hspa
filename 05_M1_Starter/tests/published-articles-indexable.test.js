// Publikovaný článek musí být indexovatelný.
//
// Kontext: `scripts/publish-scheduled.js` (applyPublishToHtml) při publikaci
// srovnává <meta name="robots"> na "index, follow". Články, které se do
// korpusu dostaly mimo tuhle cestu, si ale draftový `noindex` nesly dál —
// na webu normálně visely, ale `scripts/generate-sitemap.js` je přes
// isIndexable vyřadil ze sitemapy a vyhledávače je ignorovaly. Noční sken
// tenhle stav nehledá (kouká na obsah, ne na hlavičku), takže to sedm článků
// vydrželo měsíce. Tenhle test drží korpus i po ručních publikacích.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractRobots } from '../ingest/validate-articles.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('extractRobots čte obsah meta robots', () => {
  assert.equal(extractRobots('<meta name="robots" content="index, follow">'), 'index, follow');
  assert.equal(extractRobots('<meta name="robots" content="noindex, nofollow">'), 'noindex, nofollow');
  assert.equal(extractRobots('<meta name="description" content="x">'), null);
});

test('žádný publikovaný článek nemá robots noindex', () => {
  const { articles } = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8'),
  );
  const offenders = [];
  for (const a of articles) {
    if (a.published === false) continue;
    const file = path.join(ROOT, a.slug);
    if (!fs.existsSync(file)) continue; // existenci hlídá validate-articles.js
    const robots = extractRobots(fs.readFileSync(file, 'utf8'));
    if (robots && /noindex/i.test(robots)) offenders.push(`${a.slug} → "${robots}"`);
  }
  assert.deepEqual(
    offenders,
    [],
    `publikované články s noindex (vypadnou ze sitemapy i z vyhledávačů):\n  ${offenders.join('\n  ')}`,
  );
});
