// Doplní do <head> sekčních (ne-článkových) stránek SEO/GEO prvky, které se v
// ručně psaných HTML nedají snadno udržovat konzistentně:
//
//   - <link rel="canonical" href="ABSOLUTNÍ URL">     (jen pokud chybí)
//   - <meta property="og:url" content="ABSOLUTNÍ URL"> (jen pokud chybí)
//   - <script type="application/ld+json"> s @graph (Organization + WebSite)
//     (jen pokud stránka zatím žádný JSON-LD nemá — ručně doplněný schema
//      necháme být, viz kvalita-pece.html s WebPage)
//
// Strukturovaná data jsou STATICKÁ v HTML (ne injektovaná JS za běhu), aby je
// viděly i ne-JS crawlery a AI odpovědní enginy (GEO). Organization je shodná
// s `publisher` v článkovém NewsArticle (jedna entita napříč webem).
//
// Seznam stránek = STATIC_PAGES z generate-sitemap.js (jediný zdroj pravdy).
// Idempotentní (značka data-seo-injected). Neupravuje canonical/og:url/JSON-LD,
// které už ve stránce existují.
//
// Použití:
//   node ingest/scripts/inject-page-seo.js          — všechny sekční stránky
//   node ingest/scripts/inject-page-seo.js /glosar.html

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_BASE, canonicalPath } from '../../scripts/generate-feed.js';
import { STATIC_PAGES } from '../../scripts/generate-sitemap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// Oficiální profily (sjednoceno s SOCIAL_LINKS v src/page-shared.js) → sameAs.
const SAME_AS = [
  'https://www.facebook.com/profile.php?id=61590403735200',
  'https://x.com/SkoreZdravko',
  'https://www.instagram.com/skorezdravotnictvi/',
];

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_BASE}/#organization`,
  name: 'HSPA Monitor',
  alternateName: 'Skóre zdravotnictví',
  url: `${SITE_BASE}/`,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_BASE}/assets/brand/og-default.png`,
  },
  sameAs: SAME_AS,
};

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_BASE}/#website`,
  name: 'HSPA Monitor — Zdravé Česko',
  url: `${SITE_BASE}/`,
  inLanguage: 'cs-CZ',
  publisher: { '@id': `${SITE_BASE}/#organization` },
};

export const SITE_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [ORGANIZATION, WEBSITE],
};

/** Mapuje URL cestu (`/` → index.html) na HTML soubor v repu. */
function locToFile(loc) {
  const rel = loc === '/' ? 'index.html' : loc.replace(/^\//, '');
  return resolve(ROOT, rel);
}

export function processPage(loc) {
  const file = locToFile(loc);
  if (!existsSync(file)) return { status: 'skip-no-html', loc };

  let html = readFileSync(file, 'utf8');
  const url = `${SITE_BASE}${canonicalPath(loc)}`;
  const added = [];

  // Idempotence — odstraň dřívější injektáž.
  html = html.replace(/\n\s*<(?:link|meta)[^>]*data-seo-injected="1"[^>]*>/g, '');
  html = html.replace(/\n\s*<script type="application\/ld\+json" data-seo-injected="1">[\s\S]*?<\/script>/g, '');

  const parts = [];

  // canonical + og:url — tyhle sekční stránky jsou vždy self-canonical na
  // kanonické doméně. Případné ručně psané canonical/og:url NORMALIZUJEME
  // (přepíšeme), protože v praxi obsahují chyby (špatná doména, nebo dokonce
  // odkaz na jinou stránku — tematicke-linie mířila na hspa-prehled).
  const hadCanonical = /<link[^>]*rel=["']canonical["'][^>]*>/i.test(html);
  html = html.replace(/[ \t]*<link[^>]*rel=["']canonical["'][^>]*>\s*\n?/gi, '');
  const hadOgUrl = /<meta[^>]*property=["']og:url["'][^>]*>/i.test(html);
  html = html.replace(/[ \t]*<meta[^>]*property=["']og:url["'][^>]*>\s*\n?/gi, '');

  parts.push(`  <link rel="canonical" href="${url}" data-seo-injected="1">`);
  added.push(hadCanonical ? 'canonical(fix)' : 'canonical');
  parts.push(`  <meta property="og:url" content="${url}" data-seo-injected="1">`);
  added.push(hadOgUrl ? 'og:url(fix)' : 'og:url');

  // JSON-LD Organization+WebSite — jen pokud stránka žádný JSON-LD nemá
  // (ručně doplněný schema, např. WebPage na kvalita-pece.html, necháme být).
  if (!/<script[^>]*type=["']application\/ld\+json["']/i.test(html)) {
    parts.push(`  <script type="application/ld+json" data-seo-injected="1">\n${JSON.stringify(SITE_JSONLD, null, 2)}\n  </script>`);
    added.push('json-ld');
  }

  html = html.replace('</head>', `${parts.join('\n')}\n</head>`);
  writeFileSync(file, html);
  return { status: 'updated', loc, added };
}

function main() {
  const arg = process.argv[2];
  const locs = arg ? [arg.startsWith('/') ? arg : `/${arg}`] : STATIC_PAGES.map(p => p.loc);

  const counts = {};
  for (const loc of locs) {
    const r = processPage(loc);
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.status === 'updated') console.log(`✓ ${loc} (+${r.added.join(', ')})`);
    else if (r.status !== 'nothing-to-add') console.log(`× ${loc} — ${r.status}`);
  }
  console.log('\nSummary:');
  for (const [k, v] of Object.entries(counts)) if (v > 0) console.log(`  ${k}: ${v}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
