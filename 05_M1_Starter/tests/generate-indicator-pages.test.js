// Testy generátoru per-indikátorových stránek (scripts/generate-indicator-pages.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPage } from '../scripts/generate-indicator-pages.js';
import { SITE_BASE } from '../scripts/generate-feed.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const verifiedInd = {
  id: 'test_ind', name: 'Testovací indikátor', area: 'Výsledky', domain: 'Zdravotní stav',
  value: 79.9, unit: 'let', year: 2024, direction: 'higher_is_better', signal: 'warn',
  trend: [{ year: 2022, value: 79.5 }, { year: 2024, value: 79.9 }],
  benchmark: { oecd: 81.1, eu: 80.9 }, verification_status: 'verified',
  source: { name: 'ČSÚ', url: 'https://csu.cz', origin: 'live', fetched_at: '2026-06-01T00:00:00Z' },
};
const card = { definition: 'Definice indikátoru.', frequency: 'yearly', stewards: ['ČSÚ'], importance: 'Proč to měříme.' };

test('buildPage: verified indikátor je indexovatelný, má Dataset + canonical + h1', () => {
  const { slug, html, indexable } = buildPage(verifiedInd, card);
  assert.equal(slug, 'indikator-test_ind.html');
  assert.equal(indexable, true);
  assert.match(html, /<meta name="robots" content="index, follow">/);
  assert.ok(html.includes(`<link rel="canonical" href="${SITE_BASE}/indikator-test_ind">`));
  assert.match(html, /<h1>Testovací indikátor<\/h1>/);
  const m = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/);
  assert.ok(m, 'má JSON-LD');
  const ld = JSON.parse(m[1]);
  const ds = ld['@graph'].find(n => n['@type'] === 'Dataset');
  assert.ok(ds, 'obsahuje Dataset');
  assert.equal(ds.variableMeasured.value, 79.9);
  assert.equal(ds.temporalCoverage, '2022/2024');
  assert.ok(ld['@graph'].some(n => n['@type'] === 'BreadcrumbList'));
});

test('buildPage: ilustrativní (seed) indikátor je noindex a bez Dataset', () => {
  const seed = { ...verifiedInd, verification_status: undefined, source: { name: 'seed', origin: 'seed' } };
  const { html, indexable } = buildPage(seed, card);
  assert.equal(indexable, false);
  assert.match(html, /<meta name="robots" content="noindex, follow">/);
  assert.ok(!/"@type": "Dataset"/.test(html), 'ilustrativní nemá Dataset JSON-LD');
  // canonical i h1 ale zůstávají
  assert.match(html, /<h1>Testovací indikátor<\/h1>/);
});

test('buildPage: brand v topbaru je .brand-title (ne <h1>)', () => {
  const { html } = buildPage(verifiedInd, card);
  assert.ok(!/class="brand-link"><h1/.test(html), 'brand nesmí být <h1>');
  assert.match(html, /<p class="brand-title">/);
  assert.equal((html.match(/<h1>/g) || []).length, 1, 'právě jeden <h1> = název indikátoru');
});

// Smoke test: každý vygenerovaný indikator-*.html má validní JSON-LD (kde je).
test('vygenerované indikator-*.html mají validní JSON-LD', () => {
  const files = readdirSync(ROOT).filter(f => /^indikator-.*\.html$/.test(f));
  assert.ok(files.length > 100, `očekáváno >100 stránek (nalezeno ${files.length})`);
  for (const f of files) {
    const html = readFileSync(resolve(ROOT, f), 'utf8');
    const m = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/);
    if (m) assert.doesNotThrow(() => JSON.parse(m[1]), `nevalidní JSON-LD v ${f}`);
    assert.match(html, /<link rel="canonical"/, `${f} má canonical`);
  }
});
