// Generátor RSS 2.0 feedu z data/articles.json → feed.xml (repo root webu).
//
// Statický web: feed se commituje jako soubor a regeneruje cronem (refresh.yml)
// po denním transformu / publikaci článku. Respektuje publikační pravidla:
// published !== false a date <= dnes (cron běží po 06:00 UTC, takže pravidlo
// „release v 06:00“ je zachováno přirozeně).
//
// Použití:
//   node scripts/generate-feed.js            # zapíše feed.xml
//   node scripts/generate-feed.js --stdout   # jen vypíše
//   npm run generate:feed

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Kanonická doména webu (jediné místo pro změnu). Web běží na hspa-cesko.cz
// i skorezdravotnictvi.cz; kanonická (pro canonical/og:url/sitemap/feed) je
// skorezdravotnictvi.cz — sjednoceno se SITE_URL v src/page-shared.js a se
// sociálními účty (@SkoreZdravko).
export const SITE_BASE = 'https://skorezdravotnictvi.cz';

/**
 * Kanonická (clean) cesta — bez koncového `.html`. Vercel má `cleanUrls: true`,
 * takže `/x.html` se 307/308 přesměruje na `/x`; kanonické signály (canonical,
 * og:url, JSON-LD url, sitemap) proto míří na bezextenzní URL, kterou web
 * skutečně servíruje bez redirectu. (feed.xml zůstává na `.html` kvůli
 * stabilitě RSS guid.)
 */
export const canonicalPath = (p) => (p === '/' ? '/' : String(p).replace(/\.html$/, ''));
const FEED_TITLE = 'HSPA Monitor — Zdravé Česko';
const FEED_DESC = 'Hodnocení výkonnosti českého zdravotnictví podle metodiky OECD HSPA — indikátory, analýzy, články.';
const MAX_ITEMS = 30;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** RFC-822 datum pro RSS (z YYYY-MM-DD; čas publikace = 06:00 lokálně ≈ 05:00 UTC). */
function rfc822(isoDate) {
  const d = new Date(`${isoDate}T05:00:00Z`);
  return d.toUTCString();
}

/** Viditelné publikované články, nejnovější první. */
export function visibleArticles(articles, today = new Date().toISOString().slice(0, 10)) {
  return articles
    .filter(a => a.published !== false && a.date && a.date <= today && a.slug)
    .sort((a, b) => b.date.localeCompare(a.date) || String(a.slug).localeCompare(String(b.slug)));
}

export function buildRss(articles, { today, now = new Date() } = {}) {
  const items = visibleArticles(articles, today).slice(0, MAX_ITEMS).map(a => {
    const url = `${SITE_BASE}/${a.slug}`;
    const cover = `${SITE_BASE}/assets/covers/${String(a.slug).replace(/\.html$/, '.png')}`;
    return [
      '    <item>',
      `      <title>${esc(a.title)}</title>`,
      `      <link>${esc(url)}</link>`,
      `      <guid isPermaLink="true">${esc(url)}</guid>`,
      `      <pubDate>${rfc822(a.date)}</pubDate>`,
      a.perex ? `      <description>${esc(a.perex)}</description>` : null,
      a.tag ? `      <category>${esc(a.tag)}</category>` : null,
      `      <enclosure url="${esc(cover)}" type="image/png" length="0"/>`,
      '    </item>',
    ].filter(Boolean).join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${esc(FEED_TITLE)}</title>`,
    `    <link>${SITE_BASE}/</link>`,
    `    <description>${esc(FEED_DESC)}</description>`,
    '    <language>cs</language>',
    `    <lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${SITE_BASE}/feed.xml" rel="self" type="application/rss+xml"/>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

function main() {
  const stdout = process.argv.includes('--stdout');
  const articles = JSON.parse(readFileSync(resolve(ROOT, 'data/articles.json'), 'utf8')).articles ?? [];
  const xml = buildRss(articles);
  if (stdout) {
    console.log(xml);
    return;
  }
  writeFileSync(resolve(ROOT, 'feed.xml'), xml);
  const count = (xml.match(/<item>/g) ?? []).length;
  console.log(`feed.xml: ${count} položek`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
