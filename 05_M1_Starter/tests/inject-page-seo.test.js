// Testy SEO injektoru sekčních stránek (ingest/scripts/inject-page-seo.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_JSONLD } from '../ingest/scripts/inject-page-seo.js';
import { STATIC_PAGES } from '../scripts/generate-sitemap.js';
import { SITE_BASE, canonicalPath } from '../scripts/generate-feed.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function locToFile(loc) {
  return resolve(ROOT, loc === '/' ? 'index.html' : loc.replace(/^\//, ''));
}

test('SITE_JSONLD: Organization + WebSite, propojené přes publisher @id', () => {
  assert.equal(SITE_JSONLD['@context'], 'https://schema.org');
  const org = SITE_JSONLD['@graph'].find(n => n['@type'] === 'Organization');
  const site = SITE_JSONLD['@graph'].find(n => n['@type'] === 'WebSite');
  assert.ok(org && site);
  assert.equal(site.publisher['@id'], org['@id'], 'WebSite.publisher míří na Organization @id');
  assert.ok(Array.isArray(org.sameAs) && org.sameAs.length > 0, 'Organization má sameAs');
  assert.ok(org.url.startsWith(SITE_BASE));
});

test('SITE_JSONLD: serializovatelné do validního JSON', () => {
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(SITE_JSONLD)));
});

test('každá sekční stránka má právě jeden self-canonical na kanonické doméně', () => {
  for (const { loc } of STATIC_PAGES) {
    const file = locToFile(loc);
    if (!existsSync(file)) continue;
    const html = readFileSync(file, 'utf8');
    const canon = [...html.matchAll(/<link[^>]*rel=["']canonical["'][^>]*>/gi)];
    assert.equal(canon.length, 1, `${loc} má mít právě 1 canonical (má ${canon.length})`);
    const href = canon[0][0].match(/href=["']([^"']+)["']/)[1];
    assert.equal(href, `${SITE_BASE}${canonicalPath(loc)}`, `${loc} canonical musí být self (clean) na ${SITE_BASE}`);
  }
});

test('každá sekční stránka má validní JSON-LD a og:url', () => {
  for (const { loc } of STATIC_PAGES) {
    const file = locToFile(loc);
    if (!existsSync(file)) continue;
    const html = readFileSync(file, 'utf8');
    assert.ok(/<meta[^>]*property=["']og:url["']/i.test(html), `${loc} má og:url`);
    for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(m[1]), `nevalidní JSON-LD v ${loc}`);
    }
  }
});
