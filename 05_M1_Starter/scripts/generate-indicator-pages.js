// Generátor statických per-indikátorových stránek `indikator-{id}.html` (root webu).
//
// Proč: ~139 indikátorů dnes sdílí jedinou JS šablonu `indicator.html?id=…` bez
// statického obsahu → nejsou samostatně indexovatelné a AI enginy z nich nic
// nevyčtou. Tyto lehké statické stránky nesou klíčový obsah (název, hodnota,
// rok, benchmark, definice, význam, metodika, zdroj) + Dataset JSON-LD, a
// odkazují na interaktivní `indicator.html?id=…` (graf trendu + krajská mapa).
//
// Plochá struktura (vše v rootu) kvůli relativním cestám sdílené nav/footer JS.
// Ilustrativní (seed) indikátory dostanou `noindex` — neindexujeme neověřená
// čísla jako autoritativní; sitemap je díky tomu sám vynechá.
//
// Použití: node scripts/generate-indicator-pages.js [--dry]

import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_BASE, canonicalPath } from './generate-feed.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

const PAGE_PREFIX = 'indikator-';

const DIRECTION_LABEL = {
  higher_is_better: 'vyšší hodnota je lepší',
  lower_is_better: 'nižší hodnota je lepší',
  context_dependent: 'závisí na kontextu',
};
const SIGNAL_LABEL = { good: 'dobré', warn: 'na pozoru', bad: 'špatné', neutral: 'neutrální' };
const FREQ_LABEL = { yearly: 'ročně', quarterly: 'čtvrtletně', monthly: 'měsíčně' };
const STATUS_LABEL = { verified: 'Ověřeno', preliminary: 'Předběžné', illustrative: 'Ilustrativní' };

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function cz(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
}
/** markdown-light: prázdný řádek → odstavec, **tučně**. */
function narrative(text) {
  if (!text) return '';
  return String(text).split(/\n\n+/).map(p =>
    `<p>${esc(p).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`
  ).join('\n');
}

function resolveStatus(ind) {
  const ex = ind?.verification_status;
  if (ex === 'verified' || ex === 'preliminary' || ex === 'illustrative') return ex;
  if (ex) return 'preliminary';
  const origin = ind?.source?.origin;
  if (origin === 'seed') return 'illustrative';
  if (origin === 'live') return 'preliminary';
  return 'illustrative';
}

function benchmarkRows(ind) {
  const b = ind.benchmark || {};
  const rows = [['Česko', ind.value]];
  if (b.oecd != null) rows.push(['OECD ⌀', b.oecd]);
  if (b.eu != null) rows.push(['EU ⌀', b.eu]);
  if (b.oecd_best != null) rows.push(['OECD nejlepší', b.oecd_best]);
  return rows.map(([label, val]) =>
    `<tr><th scope="row">${esc(label)}</th><td>${cz(val)} ${esc(ind.unit || '')}</td></tr>`
  ).join('');
}

function temporalCoverage(ind) {
  const ys = (ind.trend || []).map(t => t.year).filter(Boolean).sort();
  if (ys.length >= 2) return `${ys[0]}/${ys[ys.length - 1]}`;
  return ind.year ? String(ind.year) : undefined;
}

function datasetJsonLd(ind, card, url, indexable) {
  if (!indexable) return '';
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Dataset',
        '@id': `${url}#dataset`,
        name: ind.name,
        description: card?.definition || `${ind.name} — indikátor výkonnosti zdravotního systému ČR podle metodiky OECD HSPA.`,
        url,
        inLanguage: 'cs-CZ',
        isAccessibleForFree: true,
        keywords: [ind.area, ind.domain, ind.subdomain].filter(Boolean),
        temporalCoverage: temporalCoverage(ind),
        spatialCoverage: { '@type': 'Place', name: 'Česká republika' },
        variableMeasured: {
          '@type': 'PropertyValue',
          name: ind.name,
          value: ind.value,
          unitText: ind.unit || undefined,
          measurementTechnique: ind.source?.name || undefined,
        },
        creator: { '@type': 'Organization', name: 'HSPA Monitor', alternateName: 'Skóre zdravotnictví', url: `${SITE_BASE}/` },
        publisher: { '@type': 'Organization', name: 'HSPA Monitor', alternateName: 'Skóre zdravotnictví', url: `${SITE_BASE}/` },
        sourceOrganization: ind.source?.name ? { '@type': 'Organization', name: ind.source.name } : undefined,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Domů', item: `${SITE_BASE}/` },
          { '@type': 'ListItem', position: 2, name: 'HSPA přehled', item: `${SITE_BASE}/hspa-prehled` },
          { '@type': 'ListItem', position: 3, name: ind.name, item: url },
        ],
      },
    ],
  };
  return `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>`;
}

/** Kompaktní statická sekce Souvislosti (plné zobrazení má interaktivní detail). */
function souvislostiStatic(bucket) {
  if (!bucket) return '';
  const bits = [];
  if (bucket.model?.node) {
    bits.push(`<li>V kauzální mapě systému patří k páce <strong>${esc(bucket.model.node.label)}</strong> — <a href="model-systemu.html">mapa systému</a></li>`);
  }
  if (bucket.legislativa?.length) {
    bits.push(`<li>${bucket.legislativa.length}× související legislativa v procesu — <a href="legislativa.html">Legislativní radar</a></li>`);
  }
  const nCom = bucket.barometr?.commitments?.length ?? 0;
  const nSt = bucket.barometr?.statements?.length ?? 0;
  if (nCom || nSt) {
    const what = [nCom ? `${nCom}× závazek vlády` : null, nSt ? `${nSt}× výrok v Ověřovně` : null].filter(Boolean).join(', ');
    bits.push(`<li>${what} — <a href="barometr.html">Barometr politických prohlášení</a></li>`);
  }
  if (!bits.length) return '';
  return `
    <section class="ind-section suv-section">
      <h2>Souvislosti</h2>
      <ul class="suv-list">${bits.join('')}</ul>
    </section>`;
}

export function buildPage(ind, card, suvBucket) {
  const slug = `${PAGE_PREFIX}${ind.id}.html`;
  const url = `${SITE_BASE}/${canonicalPath(slug)}`;
  const status = resolveStatus(ind);
  const indexable = status === 'verified' || status === 'preliminary';
  const def = card?.definition || '';
  const desc = (def || `${ind.name}: ${cz(ind.value)} ${ind.unit || ''} (${ind.year || ''}). Srovnání s OECD/EU, metodika a primární zdroj.`).slice(0, 300);
  const dimMeta = [ind.area, ind.domain, ind.subdomain].filter(Boolean).map(esc).join(' · ');
  const interactiveUrl = `indicator.html?id=${encodeURIComponent(ind.id)}`;

  const methodRows = [
    ['Definice', def],
    ['Jednotka', ind.unit],
    ['Směr', DIRECTION_LABEL[ind.direction] || ind.direction],
    ['Frekvence', FREQ_LABEL[card?.frequency] || card?.frequency],
    ['Garanti dat', Array.isArray(card?.stewards) ? card.stewards.join(', ') : null],
    ['Metodická poznámka', card?.method_notes],
    ['Omezení', card?.limitations],
  ].filter(([, v]) => v).map(([k, v]) =>
    `<div class="ind-meta-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`
  ).join('\n');

  const src = ind.source || {};
  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(ind.name)} · HSPA Monitor</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, follow'}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(ind.name)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="cs_CZ">
<meta property="og:image" content="${SITE_BASE}/assets/brand/og-default.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ind.name)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE_BASE}/assets/brand/og-default.png">
<link rel="stylesheet" href="src/styles.min.css">
<link rel="alternate" type="application/rss+xml" title="HSPA Monitor — články" href="/feed.xml">
${datasetJsonLd(ind, card, url, indexable)}
</head>
<body>
<a class="skip-link" href="#content">Přeskočit na hlavní obsah</a>

<header class="topbar">
  <div class="brand">
    <a href="index.html" class="brand-link"><p class="brand-title"><abbr class="hspa-abbr" title="Health System Performance Assessment — hodnocení výkonnosti zdravotního systému (WHO 2000, OECD 2023)">HSPA</abbr> <em>monitor</em>
      <small>skorezdravotnictvi.cz · Indikátor</small>
    </p></a>
  </div>
  <nav class="module-nav" id="moduleNav" aria-label="Moduly dashboardu"></nav>
</header>

<aside class="masthead-strip" aria-label="Aktuální datum vydání">
  <span class="masthead-date" id="mastheadDate"></span>
</aside>

<main id="content">
  <article class="indicator-detail indicator-static">
    <nav class="article-breadcrumb" aria-label="Drobečková navigace">
      <a href="index.html">Domů</a> › <a href="hspa-prehled.html">HSPA přehled</a> › <span>${esc(ind.name)}</span>
    </nav>

    <header class="ind-detail-header">
      <div class="ind-detail-kicker">${dimMeta}${ind.year ? ` · ${esc(String(ind.year))}` : ''}</div>
      <h1>${esc(ind.name)}</h1>
      <p class="ind-detail-status">Stav ověření: <strong>${esc(STATUS_LABEL[status] || status)}</strong></p>
      ${def ? `<p class="ind-detail-sub">${esc(def)}</p>` : ''}
    </header>

    <section class="ind-hero" aria-label="Aktuální hodnota">
      <div class="ind-hero-value">${cz(ind.value)} <span class="ind-hero-unit">${esc(ind.unit || '')}</span></div>
      <div class="ind-hero-signal">Signál: ${esc(SIGNAL_LABEL[ind.signal] || ind.signal || '—')}</div>
      <table class="ind-benchmark-table">
        <caption>Srovnání (rok ${esc(String(ind.year || '—'))})</caption>
        <tbody>${benchmarkRows(ind)}</tbody>
      </table>
    </section>

    ${card?.importance ? `<section class="ind-section"><h2>Proč na tom záleží</h2>${narrative(card.importance)}</section>` : ''}
    ${card?.determinants ? `<section class="ind-section"><h2>Co hodnotu ovlivňuje</h2>${narrative(card.determinants)}</section>` : ''}

    <section class="ind-section">
      <h2>Metodika</h2>
      <dl class="ind-meta-list">
${methodRows}
      </dl>
    </section>

    <section class="ind-section ind-source">
      <h2>Zdroj dat</h2>
      <p>${esc(src.name || 'Neuvedeno')}${src.url ? ` — <a href="${esc(src.url)}" rel="noopener" target="_blank">primární zdroj ↗</a>` : ''}</p>
      ${src.fetched_at ? `<p class="ind-source-meta">Staženo: ${esc(String(src.fetched_at).slice(0, 10))}${ind.verified_at ? ` · ověřeno: ${esc(ind.verified_at)}` : ''} · původ: ${esc(src.origin || '—')}</p>` : ''}
    </section>

    ${souvislostiStatic(suvBucket)}

    <p class="ind-interactive-cta">
      <a class="btn btn-primary" href="${interactiveUrl}">Interaktivní detail: graf trendu a krajská mapa →</a>
    </p>
  </article>
</main>

<footer class="bottom" id="siteFooter"></footer>

<script type="module">
  import './src/analytics.js';
  import { renderModuleNav, renderMastheadDate } from './src/page-shared.js';
  renderModuleNav('hspa-prehled');
  renderMastheadDate();
</script>

</body>
</html>
`;
  return { slug, html, indexable };
}

function loadCard(ind) {
  const p = resolve(ROOT, ind.method_card_url || `indicators/${ind.id}.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

function loadSouvislosti() {
  const p = resolve(ROOT, 'data/souvislosti.json');
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf8')).indicators ?? {}; } catch { return {}; }
}

function main() {
  const inds = JSON.parse(readFileSync(resolve(ROOT, 'data/indicators.json'), 'utf8')).indicators ?? [];
  const suv = loadSouvislosti();
  const wantSlugs = new Set();
  let written = 0, indexable = 0;
  for (const ind of inds) {
    const card = loadCard(ind);
    const { slug, html, indexable: idx } = buildPage(ind, card, suv[ind.id]);
    wantSlugs.add(slug);
    if (idx) indexable++;
    if (!DRY) writeFileSync(resolve(ROOT, slug), html);
    written++;
  }
  // Úklid osiřelých stránek (indikátor odstraněn z dat).
  let removed = 0;
  for (const f of readdirSync(ROOT)) {
    if (f.startsWith(PAGE_PREFIX) && f.endsWith('.html') && !wantSlugs.has(f)) {
      if (!DRY) unlinkSync(resolve(ROOT, f));
      removed++;
    }
  }
  console.log(`indikator-*.html: ${written} stránek (${indexable} indexovatelných, ${written - indexable} noindex), ${removed} odstraněno`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
