#!/usr/bin/env node
// Druhý výstup repa: samostatný web pohotovostí (PLAN-POHOTOVOSTI-DOMENA.md).
//
// PROČ: kdo hledá pohotovost, přichází z Googlu na dotaz „pohotovost Klatovy“,
// je ve stresu a HSPA Monitor ho nezajímá. Dostane jednu obrazovku, 155
// nahoře, žádnou navigaci dashboardu, žádný newsletter ani popupy, offline
// režim a vlastní adresu. Data, engine i okresní builder zůstávají jedny —
// tenhle skript z nich jen vyrobí druhý výstupní adresář, který nasadí
// druhý Vercel projekt (root 05_M1_Starter, build `npm run
// build:pohotovosti-site`, output `dist-pohotovosti`).
//
// Co vzniká v dist-pohotovosti/:
//   index.html            ← pohotovosti.html (jen <main> + FAQ JSON-LD) v odlehčeném shellu
//   <okres>.html          ← pohotovost-<okres>.html (75 stránek) v témže shellu
//   src/                  ← pohotovosti.js, pohotovosti-engine.js, pohotovost-okres.js,
//                           styles.min.css, page-shared.js (= src/pohotovosti-shell.js),
//                           analytics.js (Plausible jen když je v konfiguraci doména)
//   data/                 ← jen datasety pohotovostí (+ gazetteer obcí, dojezdy, geojson krajů)
//   assets/               ← echarts, značka
//   sw-pohotovosti.js     ← tentýž service worker s cestami samostatného webu
//   manifest.webmanifest, robots.txt, sitemap.xml, 404.html, vercel.json
//
// Konfigurace (doména, název, odkazy zpět na HSPA): data/pohotovosti-site.json.
// Odkazy: pohotovosti.html → /, pohotovost-<okres>.html → /<okres>,
// ostatní stránky HSPA Monitoru → absolutní URL na skorezdravotnictvi.cz.
//
// CLI: node scripts/build-pohotovosti-site.js [--out cesta]

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');
export const DEFAULT_OUT = resolve(ROOT, 'dist-pohotovosti');

export const SRC_FILES = ['pohotovosti.js', 'pohotovosti-engine.js', 'pohotovost-okres.js', 'styles.min.css'];
export const DATA_FILES = ['pohotovosti.json', 'pohotovosti-akutni.json', 'pohotovosti-okresy.json', 'obce-gps.json', 'dojezdy.json', 'cz-regions.geojson'];
export const ASSET_FILES = ['assets/vendor/echarts.min.js', 'assets/brand/favicon.svg', 'assets/brand/favicon-32.png', 'assets/brand/apple-touch-icon.png', 'assets/brand/og-default.png', 'assets/brand/compass-mark.svg'];

export function loadConfig(root = ROOT) {
  return JSON.parse(readFileSync(resolve(root, 'data/pohotovosti-site.json'), 'utf8'));
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function between(html, startRe, endRe, label) {
  const s = html.search(startRe);
  if (s < 0) throw new Error(`${label}: začátek nenalezen`);
  const e = html.slice(s).search(endRe);
  if (e < 0) throw new Error(`${label}: konec nenalezen`);
  return html.slice(s, s + e);
}

function metaContent(html, attr, value) {
  const re = new RegExp(`<meta\\s+${attr}="${value}"\\s+content="([^"]*)"`, 'i');
  const m = re.exec(html);
  return m ? m[1] : '';
}

/**
 * Přepis odkazů uvnitř obsahu na adresy samostatného webu:
 *   pohotovosti.html[#x]      → /[#x]
 *   pohotovost-<okres>.html   → /<okres>
 *   index.html / *.html       → absolutní URL na HSPA Monitoru (bez .html, cleanUrls)
 *   src/, assets/, data/      → absolutní cesty od kořene
 */
export function rewriteLinks(html, cfg) {
  const hspa = cfg.operator.url.replace(/\/$/, '');
  return html
    .replace(/href="pohotovosti\.html(#[^"]*)?"/g, (_, h) => `href="/${h ?? ''}"`)
    .replace(/href="pohotovost-([a-z0-9-]+)\.html(#[^"]*)?"/g, (_, slug, h) => `href="/${slug}${h ?? ''}"`)
    .replace(/href="index\.html"/g, `href="${hspa}/"`)
    .replace(/href="([a-z0-9-]+)\.html(\?[^"#]*)?(#[^"]*)?"/g, (_, page, q, h) => `href="${hspa}/${page}${q ?? ''}${h ?? ''}"`)
    .replace(/(src|href)="(src|assets|data)\//g, '$1="/$2/');
}

/** Kompas značky z page-shared.js (renderBrandMark ho na HSPA vkládá za běhu; tady je statický). */
function brandCompassSvg(root = ROOT) {
  const src = readFileSync(resolve(root, 'src/page-shared.js'), 'utf8');
  const m = /const BRAND_COMPASS_SVG = `([\s\S]*?)`;/.exec(src);
  return m ? m[1] : '';
}

function shell({ cfg, title, description, canonicalPath, headExtra = '', main, moduleSrc, dataStamp }) {
  const url = `${cfg.url}${canonicalPath}`;
  const siteCfg = {
    standalone: true,
    host: cfg.host, url: cfg.url, name: cfg.name,
    operator: cfg.operator, hspa_links: cfg.hspa_links, data_stamp: dataStamp,
  };
  return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${cfg.url}/assets/brand/og-default.png">
<meta property="og:locale" content="cs_CZ">
<meta name="theme-color" content="${esc(cfg.theme_color || '#1f1a14')}">
<link rel="canonical" href="${url}">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="stylesheet" href="/src/styles.min.css">
<script>window.POH_SITE=${JSON.stringify(siteCfg).replace(/</g, '\\u003c')};</script>
${headExtra}</head>
<body class="poh-standalone">
<a class="skip-link" href="#content">Přeskočit na hlavní obsah</a>

<header class="topbar poh-site-topbar">
  <div class="brand">
    <a href="/" class="brand-link"><span class="brand-logo brand-compass" aria-hidden="true">${brandCompassSvg()}</span><p class="brand-title">${esc(cfg.name)}
      <small>${esc(cfg.tagline)}</small>
    </p></a>
  </div>
  <nav class="poh-site-nav" aria-label="Rychlé odkazy">
    <a href="tel:155" class="poh-site-155"><strong>155</strong> ohrožení života</a>
    <a href="${esc(cfg.operator.url)}" rel="noopener" class="poh-site-hspa">HSPA Monitor ↗</a>
  </nav>
</header>

${main}

<footer class="bottom" id="siteFooter"></footer>

<script type="module" src="${moduleSrc}"></script>
</body>
</html>
`;
}

function buildIndex(cfg, dataStamp) {
  const html = readFileSync(resolve(ROOT, 'pohotovosti.html'), 'utf8');
  const title = `Kde je nejbližší pohotovost, která má otevřeno · ${cfg.name}`;
  const description = metaContent(html, 'name', 'description') || cfg.description;
  const faq = between(html, /<!-- poh-faq:start/, /<!-- poh-faq:end -->/, 'FAQ JSON-LD') + '<!-- poh-faq:end -->\n';
  const main = between(html, /<main id="content">/, /<\/main>/, '<main>') + '</main>';
  const headExtra = `<script src="/assets/vendor/echarts.min.js" defer></script>\n${faq}`;
  return shell({ cfg, title, description, canonicalPath: '/', headExtra, main: rewriteLinks(main, cfg), moduleSrc: '/src/pohotovosti.js', dataStamp });
}

function buildOkres(cfg, o, dataStamp) {
  const file = resolve(ROOT, `pohotovost-${o.slug}.html`);
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const titleM = /<title>([^<]*)<\/title>/.exec(html);
  const title = (titleM ? titleM[1] : `Pohotovost ${o.okres}`).replace(/\s*·\s*HSPA Monitor$/, ` · ${cfg.name}`);
  const description = metaContent(html, 'name', 'description');
  const ld = between(html, /<script type="application\/ld\+json">/, /<\/script>/, 'JSON-LD') + '</script>\n';
  const main = between(html, /<main id="content">/, /<\/main>/, '<main>') + '</main>';
  return shell({ cfg, title, description, canonicalPath: `/${o.slug}`, headExtra: ld, main: rewriteLinks(main, cfg), moduleSrc: '/src/pohotovost-okres.js', dataStamp });
}

/** Service worker samostatného webu: tatáž logika, jiné cesty. */
export function buildServiceWorker(cfg, okresy, dataStamp) {
  let sw = readFileSync(resolve(ROOT, 'sw-pohotovosti.js'), 'utf8');
  const precache = [
    '/', '/index.html',
    ...DATA_FILES.filter(f => f === 'pohotovosti.json' || f === 'obce-gps.json').map(f => `/data/${f}`),
    '/src/styles.min.css', '/src/pohotovosti.js', '/src/pohotovosti-engine.js', '/src/pohotovost-okres.js',
    '/src/analytics.js', '/src/page-shared.js', '/manifest.webmanifest',
  ];
  const allow = [
    '/^\\/$/',
    '/^\\/index\\.html$/',
    '/^\\/[a-z0-9-]+(\\.html)?$/',
    '/^\\/data\\/(pohotovosti[a-z0-9-]*|obce-gps|dojezdy)\\.json$/',
    '/^\\/data\\/cz-regions\\.geojson$/',
    '/^\\/src\\/[a-z0-9-]+\\.js$/',
    '/^\\/src\\/styles\\.min\\.css$/',
    '/^\\/assets\\//',
    '/^\\/manifest\\.webmanifest$/',
  ];
  const rep = (s, re, to, label) => { if (!re.test(s)) throw new Error(`SW: ${label} nenalezeno`); return s.replace(re, to); };
  sw = rep(sw, /const VERSION = '[^']*';/, `const VERSION = 'standalone-${dataStamp.slice(0, 10)}';`, 'VERSION');
  sw = rep(sw, /const PRECACHE = \[[\s\S]*?\n\];/, `const PRECACHE = [\n${precache.map(p => `  '${p}',`).join('\n')}\n];`, 'PRECACHE');
  sw = rep(sw, /const ALLOW = \[[\s\S]*?\n\];/, `const ALLOW = [\n${allow.map(a => `  ${a},`).join('\n')}\n];`, 'ALLOW');
  sw = rep(sw, /const page = \(await cache\.match\('\/pohotovosti'\)\) \?\? \(await cache\.match\('\/pohotovosti\.html'\)\);/, `const page = (await cache.match('/')) ?? (await cache.match('/index.html'));`, 'fallback');
  sw = sw.replace('// Service worker stránky pohotovostí — offline cache.', `// Service worker samostatného webu ${cfg.host} — vygenerováno scripts/build-pohotovosti-site.js\n// z sw-pohotovosti.js (cesty samostatného webu: / a /<okres>). NEEDITOVAT ručně.`);
  void okresy;
  return sw;
}

function analyticsModule(cfg) {
  const domain = cfg.analytics?.plausible_domain;
  if (!domain) {
    return `// Samostatný web pohotovostí: žádné měření (data/pohotovosti-site.json → analytics.plausible_domain je null).\nexport {};\n`;
  }
  return `// Samostatný web pohotovostí: Plausible (bezcookieové měření), doména z data/pohotovosti-site.json.
if (typeof document !== 'undefined' && !/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)) {
  const s = document.createElement('script');
  s.defer = true; s.dataset.domain = ${JSON.stringify(domain)}; s.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(s);
}
export {};
`;
}

function vercelJson(cfg) {
  const plausible = cfg.analytics?.plausible_domain ? ' https://plausible.io' : '';
  const csp = `default-src 'self'; script-src 'self' 'unsafe-inline'${plausible}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'${plausible}; frame-ancestors 'none'; base-uri 'self'`;
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    cleanUrls: true,
    trailingSlash: false,
    headers: [
      { source: '/(.*)', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=(), camera=()' },
        { key: 'Content-Security-Policy', value: csp },
      ] },
      { source: '/data/(.*).json', headers: [{ key: 'Cache-Control', value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' }] },
      { source: '/src/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }] },
      { source: '/sw-pohotovosti.js', headers: [{ key: 'Cache-Control', value: 'no-cache, max-age=0, must-revalidate' }] },
    ],
  };
}

function manifest(cfg) {
  return {
    name: cfg.name, short_name: cfg.short_name, description: cfg.description, lang: 'cs',
    start_url: '/', scope: '/', display: 'standalone',
    background_color: cfg.background_color || '#ffffff', theme_color: cfg.theme_color || '#1f1a14',
    icons: [
      { src: '/assets/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { src: '/assets/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { src: '/assets/brand/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  };
}

function sitemap(cfg, okresy, dataStamp) {
  const lastmod = dataStamp.slice(0, 10);
  const urls = [{ loc: `${cfg.url}/`, priority: '1.0', changefreq: 'daily' },
    ...okresy.map(o => ({ loc: `${cfg.url}/${o.slug}`, priority: '0.8', changefreq: 'weekly' }))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
}

function notFound(cfg) {
  return shell({ cfg, title: `Stránka nenalezena · ${cfg.name}`, description: cfg.description, canonicalPath: '/404', main: `<main id="content">
  <section class="ed-hero ed-hero-slim"><div class="ed-hero-content">
    <div class="ed-kicker">404</div>
    <h1 class="ed-hero-headline">Tahle stránka tu není</h1>
    <p class="ed-hero-lead">Pohotovost najdete přes <a href="/">vyhledávání podle města nebo polohy</a>. V ohrožení života volejte <a href="tel:155">155</a>.</p>
  </div></section>
</main>`, moduleSrc: '/src/pohotovost-okres.js', dataStamp: null }).replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex">');
}

function dirSize(dir) {
  let n = 0;
  for (const f of readdirSync(dir)) { const p = join(dir, f); const st = statSync(p); n += st.isDirectory() ? dirSize(p) : st.size; }
  return n;
}

/**
 * Sestaví celý výstup. Vrací manifest výstupu (soubory, počty) pro testy.
 */
export function build({ out = DEFAULT_OUT, root = ROOT, quiet = false } = {}) {
  const cfg = loadConfig(root);
  const okresManifest = JSON.parse(readFileSync(resolve(root, 'data/pohotovosti-okresy.json'), 'utf8'));
  const pohData = JSON.parse(readFileSync(resolve(root, 'data/pohotovosti.json'), 'utf8'));
  const dataStamp = pohData.generated_at || okresManifest.generated_at || '1970-01-01T00:00:00Z';
  const okresy = okresManifest.okresy ?? [];

  rmSync(out, { recursive: true, force: true });
  for (const d of ['src', 'data', 'assets/vendor', 'assets/brand']) mkdirSync(join(out, d), { recursive: true });

  const written = [];
  const put = (rel, content) => { writeFileSync(join(out, rel), content); written.push(rel); };

  put('index.html', buildIndex(cfg, dataStamp));
  let okresCount = 0, okresMissing = [];
  for (const o of okresy) {
    const page = buildOkres(cfg, o, dataStamp);
    if (!page) { okresMissing.push(o.slug); continue; }
    put(`${o.slug}.html`, page); okresCount++;
  }
  for (const f of SRC_FILES) { copyFileSync(resolve(root, 'src', f), join(out, 'src', f)); written.push(`src/${f}`); }
  copyFileSync(resolve(root, 'src/pohotovosti-shell.js'), join(out, 'src/page-shared.js')); written.push('src/page-shared.js');
  put('src/analytics.js', analyticsModule(cfg));
  for (const f of DATA_FILES) {
    const p = resolve(root, 'data', f);
    if (existsSync(p)) { copyFileSync(p, join(out, 'data', f)); written.push(`data/${f}`); }
  }
  for (const f of ASSET_FILES) {
    const p = resolve(root, f);
    if (existsSync(p)) { copyFileSync(p, join(out, f)); written.push(f); }
  }
  put('sw-pohotovosti.js', buildServiceWorker(cfg, okresy, dataStamp));
  put('manifest.webmanifest', JSON.stringify(manifest(cfg), null, 2) + '\n');
  put('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${cfg.url}/sitemap.xml\n`);
  put('sitemap.xml', sitemap(cfg, okresy, dataStamp));
  put('404.html', notFound(cfg));
  put('vercel.json', JSON.stringify(vercelJson(cfg), null, 2) + '\n');

  const summary = { out, host: cfg.host, files: written.length, okresy: okresCount, okresMissing, bytes: dirSize(out), dataStamp };
  if (!quiet) {
    console.log(`Samostatný web pohotovostí → ${out}`);
    console.log(`  doména ${cfg.host} · ${written.length} souborů · ${okresCount} okresních stránek · ${(summary.bytes / 1024 / 1024).toFixed(1)} MB · data k ${dataStamp.slice(0, 10)}`);
    if (okresMissing.length) console.log(`  ⚠️ chybí okresní stránky: ${okresMissing.join(', ')} (spusť npm run build:pohotovosti-okresy)`);
  }
  return summary;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  build({ out: i > 0 ? resolve(process.cwd(), process.argv[i + 1]) : DEFAULT_OUT });
}
