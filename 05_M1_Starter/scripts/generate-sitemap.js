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

// Stránky, které do sitemap ZÁMĚRNĚ nepatří, s důvodem. Hlídá test
// `sitemap: každá indexovatelná stránka je v STATIC_PAGES nebo ve výjimkách`,
// aby nová sekční stránka nemohla tiše vypadnout z indexace (stalo se
// u vestniky-mz a jak-se-rozhoduje: byly ručně v sitemap.xml, ale ne tady,
// takže je týdenní cron při přegenerování zahodil).
// `typ: 'noindex'` znamená „nepatří sem, DOKUD je stránka noindex" — test
// ověřuje, že takový soubor noindex skutečně má. Kdyby ho někdo publikoval
// (robots → index), výjimka přestane platit a test si vyžádá zápis do
// STATIC_PAGES. `typ: 'sablona'` je trvalé: šablony plněné query parametrem
// do sitemapy nepatří ani jako indexovatelné.
export const SITEMAP_EXCLUDED = {
  '/indicator.html': { typ: 'sablona', duvod: 'šablona plněná ?id= — statické varianty jsou indikator-*.html' },
  '/rubrika.html': { typ: 'sablona', duvod: 'šablona plněná ?id=' },
  '/pracovni-skupina.html': { typ: 'sablona', duvod: 'šablona plněná ?id=' },
  '/pracovni-osoba.html': { typ: 'sablona', duvod: 'šablona plněná ?id=' },
  '/embed.html': { typ: 'sablona', duvod: 'vkládaný widget, ne samostatná stránka' },
  '/404.html': { typ: 'sablona', duvod: 'chybová stránka' },
  '/konference.html': { typ: 'noindex', duvod: 'akce, ne evergreen obsah' },
  '/konference-prezentace.html': { typ: 'noindex', duvod: 'podklad k prezentaci' },
  '/tiskovazprava.html': { typ: 'noindex', duvod: 'jednorázový podklad pro média' },
};

// Kurátorovaný seznam statických (sekčních) stránek.
// priority: relativní důležitost; changefreq: orientační frekvence změny.
// Exportováno — sdílené jako jediný zdroj pravdy se section-page SEO injektorem.
export const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/clanky.html', priority: '0.9', changefreq: 'daily' },
  { loc: '/hspa-prehled.html', priority: '0.9', changefreq: 'weekly' },
  { loc: '/tematicke-linie.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/kraje.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/pracovni-skupiny.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/pracovni-osoby.html', priority: '0.6', changefreq: 'weekly' },
  { loc: '/pracovni-ukoly.html', priority: '0.6', changefreq: 'weekly' },
  { loc: '/pojistenci.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/prevence.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/vedra.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/strategie.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/tyden.html', priority: '0.6', changefreq: 'weekly' },
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
  { loc: '/vestniky-mz.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/jak-se-rozhoduje.html', priority: '0.7', changefreq: 'monthly' },
  { loc: '/kompas.html', priority: '0.7', changefreq: 'monthly' },
  { loc: '/diagnoza.html', priority: '0.6', changefreq: 'weekly' },
  { loc: '/pro-pacienty.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/pro-novinare.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/pro-badatele.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/pro-politiku.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/vyhlaska.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/simulator.html', priority: '0.6', changefreq: 'monthly' },
  { loc: '/kviz.html', priority: '0.5', changefreq: 'monthly' },
  { loc: '/autor-florence.html', priority: '0.4', changefreq: 'monthly' },
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

export function buildSitemap(articles, { today = TODAY, isIndexable = () => true, indicatorPages = [], awarenessWeeks = [], ppoGroups = [], ppoOsoby = [] } = {}) {
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
  // Týdny zdraví: každý ready/archived týden má trvalou landing page
  // /tyden?id=… (archiv proběhlých mezinárodních dnů zůstává odkazovatelný).
  // Drafty se vynechávají — nemají ještě publikovatelný obsah.
  const awarenessEntries = awarenessWeeks
    .filter(w => w.id && (w.status === 'ready' || w.status === 'archived'))
    .map(w => urlEntry({
      loc: `/tyden?id=${encodeURIComponent(w.id)}`,
      lastmod: w.end && w.end < today ? w.end : today,
      changefreq: w.end && w.end < today ? 'yearly' : 'weekly',
      priority: '0.5',
    }));
  // Pracovní skupiny MZ: každá skupina má trvalou stránku /pracovni-skupina?id=…
  // (data/ppo.json; „vynechano" builder do datasetu vůbec nepouští).
  const ppoEntries = ppoGroups
    .filter(g => g.id != null)
    .map(g => urlEntry({
      loc: `/pracovni-skupina?id=${g.id}`,
      lastmod: g.posledni_aktivita || today,
      changefreq: 'monthly',
      priority: '0.4',
    }));
  // Osoby (/pracovni-osoba?id=…): jen spojky (≥2 členství) a osoby
  // s kurátorovanými externími odkazy — ne všech ~1 000 tenkých profilů.
  const ppoOsobyEntries = ppoOsoby
    .filter(p => p.id != null && ((p.clenstvi ?? []).length >= 2 || p.externi))
    .map(p => urlEntry({
      loc: `/pracovni-osoba?id=${p.id}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.3',
    }));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...articleEntries,
    ...indicatorEntries,
    ...awarenessEntries,
    ...ppoEntries,
    ...ppoOsobyEntries,
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
  const awarenessWeeks = JSON.parse(readFileSync(resolve(ROOT, 'data/awareness-weeks.json'), 'utf8')).weeks ?? [];
  const ppoGroups = existsSync(resolve(ROOT, 'data/ppo.json'))
    ? (JSON.parse(readFileSync(resolve(ROOT, 'data/ppo.json'), 'utf8')).skupiny ?? [])
    : [];
  const ppoOsoby = existsSync(resolve(ROOT, 'data/ppo-osoby.json'))
    ? (JSON.parse(readFileSync(resolve(ROOT, 'data/ppo-osoby.json'), 'utf8')).osoby ?? [])
    : [];
  const xml = buildSitemap(articles, { isIndexable: isIndexablePage, indicatorPages, awarenessWeeks, ppoGroups, ppoOsoby });
  if (stdout) {
    console.log(xml);
    return;
  }
  writeFileSync(resolve(ROOT, 'sitemap.xml'), xml);
  const count = (xml.match(/<url>/g) ?? []).length;
  console.log(`sitemap.xml: ${count} URL`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
