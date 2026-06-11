// Generátor sitemap.xml z data/articles.json + kurátorovaného seznamu statických
// stránek → sitemap.xml (repo root webu).
//
// Statický web: sitemap se commituje jako soubor a regeneruje cronem (refresh.yml
// / publish-articles.yml) po denním transformu / publikaci článku. Respektuje
// publikační pravidla přes visibleArticles() (sdíleno s generate-feed.js):
// published !== false a date <= dnes.
//
// Použití:
//   node scripts/generate-sitemap.js            # zapíše sitemap.xml
//   node scripts/generate-sitemap.js --stdout   # jen vypíše
//   npm run generate:sitemap

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_BASE, visibleArticles } from './generate-feed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Kurátorovaný seznam statických (sekčních) stránek. `indicator.html`,
// `rubrika.html`, `embed.html` a `404.html` se NEuvádějí — jsou to šablony
// plněné query parametrem nebo neindexovatelné stránky.
// priority: relativní důležitost; changefreq: orientační frekvence změny.
const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/clanky.html', priority: '0.9', changefreq: 'daily' },
  { loc: '/hspa-prehled.html', priority: '0.9', changefreq: 'weekly' },
  { loc: '/tematicke-linie.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/kraje.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/pojistenci.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/prevence.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/strategie.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/financovani.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/financovani-poskytovatele.html', priority: '0.6', changefreq: 'weekly' },
  { loc: '/dohodovaci-rizeni.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/kvalita-pece.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/glosar.html', priority: '0.7', changefreq: 'monthly' },
  { loc: '/jak-funguje.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/o-projektu.html', priority: '0.5', changefreq: 'monthly' },
  { loc: '/redakce.html', priority: '0.4', changefreq: 'monthly' },
  { loc: '/cesta-pacienta.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/kolonoskopie.html', priority: '0.5', changefreq: 'monthly' },
];

const TODAY = new Date().toISOString().slice(0, 10);

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${esc(SITE_BASE + loc)}</loc>`,
    lastmod ? `    <lastmod>${esc(lastmod)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

export function buildSitemap(articles, { today = TODAY } = {}) {
  const staticEntries = STATIC_PAGES.map(p => urlEntry({ ...p, lastmod: today }));
  const articleEntries = visibleArticles(articles, today).map(a =>
    urlEntry({
      loc: `/${a.slug}`,
      lastmod: a.date,
      changefreq: 'monthly',
      priority: '0.8',
    })
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...articleEntries,
    '</urlset>',
    '',
  ].join('\n');
}

function main() {
  const stdout = process.argv.includes('--stdout');
  const articles = JSON.parse(readFileSync(resolve(ROOT, 'data/articles.json'), 'utf8')).articles ?? [];
  const xml = buildSitemap(articles);
  if (stdout) {
    console.log(xml);
    return;
  }
  writeFileSync(resolve(ROOT, 'sitemap.xml'), xml);
  const count = (xml.match(/<url>/g) ?? []).length;
  console.log(`sitemap.xml: ${count} URL`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
