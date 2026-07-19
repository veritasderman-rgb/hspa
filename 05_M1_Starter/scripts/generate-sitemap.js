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

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_BASE, visibleArticles, canonicalPath } from './generate-feed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Stránka může být publikovaná a viditelná na webu, ale přitom mít v HTML
// `<meta name="robots" content="noindex…">` (typicky review-pending obsah, který
// je zatím záměrně mimo index). Takovou stránku do sitemapy NEDÁVÁME — jinak
// bychom posílali protichůdný signál ("submitted URL marked noindex").
const NOINDEX_RE = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i;

/** Mapuje URL cestu sitemapy na HTML soubor v repu (`/` → index.html). */
function locToFile(loc) {
  const rel = loc === '/' ? 'index.html' : loc.replace(/^\//, '');
  return resolve(ROOT, rel);
}

/** true, pokud stránka nemá `noindex` (chybějící soubor bereme jako indexovatelný). */
export function isIndexablePage(loc) {
  const file = locToFile(loc);
  if (!existsSync(file)) return true;
  return !NOINDEX_RE.test(readFileSync(file, 'utf8'));
}

// Kurátorovaný seznam statických (sekčních) stránek. `indicator.html`,
// `rubrika.html`, `embed.html` a `404.html` se NEuvádějí — jsou to šablony
// plněné query parametrem nebo neindexovatelné stránky.
// priority: relativní důležitost; changefreq: orientační frekvence změny.
// Exportováno — sdílené jako jediný zdroj pravdy se section-page SEO injektorem.
export const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/clanky.html', priority: '0.9', changefreq: 'daily' },
  { loc: '/hspa-prehled.html', priority: '0.9', changefreq: 'weekly' },
  { loc: '/tematicke-linie.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/kraje.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/pojistenci.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/prevence.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/strategie.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/hra.html', priority: '0.7', changefreq: 'monthly' },
  { loc: '/reditel.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/pribeh-pacienta.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/legislativa.html', priority: '0.6', changefreq: 'weekly' },
  { loc: '/barometr.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/financovani.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/financovani-poskytovatele.html', priority: '0.6', changefreq: 'weekly' },
  { loc: '/dohodovaci-rizeni.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/kvalita-pece.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/glosar.html', priority: '0.7', changefreq: 'monthly' },
  { loc: '/jak-funguje.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/o-projektu.html', priority: '0.5', changefreq: 'monthly' },
  { loc: '/redakce.html', priority: '0.4', changefreq: 'monthly' },
  { loc: '/cesta-pacienta.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/model-systemu.html', priority: '0.6', changefreq: 'monthly' },
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

export function buildSitemap(articles, { today = TODAY, isIndexable = () => true, indicatorPages = [] } = {}) {
  // Pozn.: isIndexable() čte robots meta z HTML, proto mu předáváme `.html` loc;
  // do sitemapy ale zapisujeme kanonickou (clean) URL přes canonicalPath().
  const staticEntries = STATIC_PAGES
    .filter(p => isIndexable(p.loc))
    .map(p => urlEntry({ ...p, loc: canonicalPath(p.loc), lastmod: today }));
  const articleEntries = visibleArticles(articles, today)
    .filter(a => isIndexable(`/${a.slug}`))
    .map(a =>
      urlEntry({
        loc: canonicalPath(`/${a.slug}`),
        lastmod: a.date,
        changefreq: 'monthly',
        priority: '0.8',
      })
    );
  // Per-indikátorové stránky (indikator-{id}.html). Noindex (ilustrativní)
  // se vyřadí přes isIndexable, který čte robots meta z HTML.
  const indicatorEntries = indicatorPages
    .filter(loc => isIndexable(loc))
    .map(loc => urlEntry({ loc: canonicalPath(loc), lastmod: today, changefreq: 'monthly', priority: '0.6' }));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...articleEntries,
    ...indicatorEntries,
    '</urlset>',
    '',
  ].join('\n');
}

function main() {
  const stdout = process.argv.includes('--stdout');
  const articles = JSON.parse(readFileSync(resolve(ROOT, 'data/articles.json'), 'utf8')).articles ?? [];
  const indicators = JSON.parse(readFileSync(resolve(ROOT, 'data/indicators.json'), 'utf8')).indicators ?? [];
  // Jen indikátory s reálně existující statickou stránkou. Indikátor může mít
  // jen metodickou kartu (indicators/{id}.json) bez vygenerované HTML stránky —
  // takový by jinak skončil v sitemapě jako 404 (isIndexable u chybějícího
  // souboru vrací true, aby nevyřazoval kurátorované statické stránky).
  const indicatorPages = indicators
    .map(i => `/indikator-${i.id}.html`)
    .filter(loc => existsSync(resolve(ROOT, loc.replace(/^\//, ''))));
  const xml = buildSitemap(articles, { isIndexable: isIndexablePage, indicatorPages });
  if (stdout) {
    console.log(xml);
    return;
  }
  writeFileSync(resolve(ROOT, 'sitemap.xml'), xml);
  const count = (xml.match(/<url>/g) ?? []).length;
  console.log(`sitemap.xml: ${count} URL`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
