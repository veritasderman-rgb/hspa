// Každá kořenová HTML stránka smí mít nejvýš jeden <link rel="canonical">
// a nejvýš jeden og:url, a oba musí mít tvar, který používá sitemap:
// SITE_BASE + cesta bez „.html" (vercel.json má cleanUrls, takže adresa
// s příponou jen přesměrovává). V 11/2026 mělo 57 článků dva různé canonicaly —
// ručně psaný s „.html" a injektovaný bez přípony.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_BASE, canonicalPath } from '../scripts/generate-feed.js';
import { stripHandwrittenCanonical } from '../ingest/scripts/inject-article-seo.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bezKomentaru = (h) => h.replace(/<!--[\s\S]*?-->/g, '');
const tagy = (h, re) => [...bezKomentaru(h).matchAll(/<(?:link|meta)\b[^>]*>/gi)].map((m) => m[0]).filter((t) => re.test(t));
const CANON = /rel=["']canonical["']/i;
const OGURL = /property=["']og:url["']/i;
const hodnota = (t) => (t.match(/(?:href|content)=["']([^"']+)["']/) || [])[1];

test('žádná stránka nemá dva canonicaly ani dva og:url a tvar odpovídá sitemapě', () => {
  const chyby = [];
  for (const f of readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
    const html = readFileSync(resolve(ROOT, f), 'utf8');
    const ocekavana = `${SITE_BASE}${canonicalPath(f === 'index.html' ? '/' : `/${f}`)}`;
    for (const [nazev, re] of [['canonical', CANON], ['og:url', OGURL]]) {
      const nalezene = tagy(html, re);
      if (nalezene.length > 1) chyby.push(`${f}: ${nalezene.length}× ${nazev}`);
      for (const t of nalezene) {
        const u = hodnota(t);
        if (u && u.startsWith(SITE_BASE) && u !== ocekavana) chyby.push(`${f}: ${nazev} „${u}", čeká se „${ocekavana}"`);
      }
    }
  }
  assert.deepEqual(chyby, []);
});

test('stripHandwrittenCanonical odstraní ruční tagy a injektované nechá', () => {
  const html = [
    '<head>',
    '<meta property="og:url" content="https://skorezdravotnictvi.cz/clanek-x.html">',
    '<link rel="canonical" href="https://skorezdravotnictvi.cz/clanek-x.html">',
    '<link rel="stylesheet" href="src/styles.min.css">',
    '  <link rel="canonical" href="https://skorezdravotnictvi.cz/clanek-x" data-seo-injected="1">',
    '  <meta property="og:url" content="https://skorezdravotnictvi.cz/clanek-x" data-seo-injected="1">',
    '</head>',
  ].join('\n');
  const out = stripHandwrittenCanonical(html);
  assert.equal(tagy(out, CANON).length, 1);
  assert.equal(tagy(out, OGURL).length, 1);
  assert.match(out, /rel="stylesheet"/);
  assert.match(out, /data-seo-injected="1"/);
  assert.equal(stripHandwrittenCanonical(out), out, 'idempotentní');
});
