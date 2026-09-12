// Drift test k issue #1184: `perex` v data/articles.json musí u publikovaných
// článků odpovídat `description` v JSON-LD v HTML.
//
// PROČ: denní a noční rutiny upravují meta description i JSON-LD přímo
// v clanek-*.html, zatímco registr zůstával na původním znění. Běh
// `npm run seo:articles` pak články vracel k zastaralému popisu. Zdrojem pravdy
// je HTML; tenhle test hlídá, že se registr od něj znovu nerozjede.
//
// Články bez injektovaného JSON-LD (nebo s prázdným description) se přeskočí —
// u nich žádný popis v HTML není a `perex` je jediný zdroj.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractJsonLdDescription } from '../ingest/scripts/inject-article-seo.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function shorten(value, max = 120) {
  const s = String(value ?? '');
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

test('perex v articles.json odpovídá JSON-LD description v HTML', () => {
  const { articles } = JSON.parse(readFileSync(resolve(ROOT, 'data/articles.json'), 'utf8'));
  const mismatches = [];
  let checked = 0;

  for (const article of articles) {
    if (article.published === false) continue;
    const htmlPath = resolve(ROOT, article.slug);
    if (!existsSync(htmlPath)) continue;

    const description = extractJsonLdDescription(readFileSync(htmlPath, 'utf8'));
    if (!description) continue; // článek bez JSON-LD description — nesrovnáváme

    checked++;
    if (article.perex !== description) {
      mismatches.push(
        `${article.slug}\n    perex:       ${shorten(article.perex)}\n    description: ${shorten(description)}`,
      );
    }
  }

  assert.ok(checked > 50, `očekáván JSON-LD description u většiny článků (nalezeno ${checked})`);
  assert.deepEqual(
    mismatches,
    [],
    `perex v data/articles.json se rozešel s JSON-LD description v HTML (zdroj pravdy je HTML, issue #1184):\n  ${mismatches.join('\n  ')}`,
  );
});
