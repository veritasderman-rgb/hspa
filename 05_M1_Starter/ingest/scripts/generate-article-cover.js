// Generator NYT-style SVG cover images pro články.
//
// Output:
//   assets/covers/{slug}.svg  — animovatelný SVG pro in-page zobrazení
//   assets/covers/{slug}.png  — 1200×630 rasterizovaný export pro OG (sítě)
//
// Vstup: článek metadata z data/articles.json (id, title, tag, date, perex)
//        + volitelný `cover_viz` field (data viz typ + data, viz níže)
//
// Vizuální styl:
//   - Editorial / NYT-typografický (Source Serif 4 + Inter)
//   - Cream paper background (#fbf8f1)
//   - Velký bold serif headline (3–5 řádků dle délky)
//   - Top: uppercase kicker (tag) v signálové barvě
//   - Bottom: HSPA Monitor branding + datum
//   - Right rail: vertical accent bar v signálové barvě
//   - Volitelný data viz panel vpravo (40 % šířky)
//
// Data viz typy (článek může mít cover_viz: { type, ... }):
//   - bar-compare:  { rows: [{label, value, accent?}], unit?, max? }
//   - donut:        { slices: [{label, value}], center?: {number, label} }
//   - timeline:     { events: [{year, label}] }
//   - big-number:   { number, unit?, label, trend?: '+6.4%' }
//
// Animace (jen mobile + ne při prefers-reduced-motion):
//   - Accent bar narůstá zdola nahoru (1.2s ease-out)
//   - Headline underline draws in (0.8s)
//   - Small dot pulses (po 3s)
//   - Viz: bary narůstají, donut segmenty se kreslí, timeline body popping
//
// Použití:
//   node ingest/scripts/generate-article-cover.js <article-slug>
//   node ingest/scripts/generate-article-cover.js --all

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { renderIllustration, TAG_ILLUSTRATIONS } from './cover-illustrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const ARTICLES_JSON = resolve(ROOT, 'data/articles.json');
const COVERS_DIR = resolve(ROOT, 'assets/covers');

// --- Style tokens (sladěno s src/styles.css) ---
const PAPER = '#fbf8f1';
const PAPER2 = '#f3eee2';
const INK = '#1f1a14';
const INK_MUT = '#5f574e';
const RULE = 'rgba(31,26,20,0.13)';

const SIGNAL_COLORS = {
  good: '#2f6b1f',
  warn: '#a05a08',
  bad: '#b8361e',
  neutral: '#6b6357',
};

// Tag → dimension mapping pro výběr barvy
const TAG_DIMENSIONS = {
  'Financování': { color: '#a05a08', label: 'Financování' },
  'Politika': { color: '#9c3450', label: 'Politika' },
  'Legislativa': { color: '#5f4a8c', label: 'Legislativa' },
  'Klinika': { color: '#2c5a8a', label: 'Klinika' },
  'Prevence': { color: '#2f6d4f', label: 'Prevence' },
  'Stav populace': { color: '#2c7a87', label: 'Stav populace' },
  'Duševní zdraví': { color: '#5f4a8c', label: 'Duševní zdraví' },
  'Dostupnost': { color: '#2c5a8a', label: 'Dostupnost' },
  'Digitalizace': { color: '#2c5a8a', label: 'Digitalizace' },
};

const MONTHS_CS = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
                   'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

// =====================================================================
//  Public API
// =====================================================================

export function generateCover(article, { writeFiles = true, styleOverride = null, suffix = '' } = {}) {
  const meta = deriveMeta(article);
  const style = styleOverride || meta.viz?.style || 'editorial';
  const renderer = STYLE_RENDERERS[style] || renderSvg;
  const svg = renderer(meta);

  if (!writeFiles) return { svg, meta };

  mkdirSync(COVERS_DIR, { recursive: true });
  const baseName = article.slug.replace(/\.html$/, '') + (suffix ? `-${suffix}` : '');
  const svgPath = resolve(COVERS_DIR, `${baseName}.svg`);
  const pngPath = resolve(COVERS_DIR, `${baseName}.png`);

  writeFileSync(svgPath, svg, 'utf8');

  const staticSvg = renderer(meta, { staticForPng: true });
  const resvg = new Resvg(staticSvg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      defaultFontFamily: 'serif',
      loadSystemFonts: true,
    },
  });
  const pngBuffer = resvg.render().asPng();
  writeFileSync(pngPath, pngBuffer);

  return { svg, meta, svgPath, pngPath };
}

// =====================================================================
//  Derive meta — co potřebujeme pro render
// =====================================================================

function deriveMeta(article) {
  const tag = article.tag || 'Článek';
  const tagInfo = TAG_DIMENSIONS[tag] || { color: SIGNAL_COLORS.neutral, label: tag };
  return {
    id: article.id,
    title: article.title,
    tag: tagInfo.label,
    accent: tagInfo.color,
    date: formatCzDate(article.date),
    number: article.number,
    slug: article.slug,
    viz: article.cover_viz || null,
  };
}

function formatCzDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()}. ${MONTHS_CS[d.getMonth()]} ${d.getFullYear()}`;
}

// =====================================================================
//  SVG render
// =====================================================================

const W = 1200;
const H = 630;
const PADDING_X = 80;
const PADDING_TOP = 70;
const PADDING_BOTTOM = 70;
const VIZ_WIDTH = 440;            // Pokud má článek viz, zabírá 440px vpravo
const VIZ_GAP = 60;               // Mezera mezi titulkem a viz panelem
const RULE_END_NO_VIZ = W - PADDING_X - 60;
const RULE_END_VIZ = W - PADDING_X - VIZ_WIDTH - 20;

function renderSvg(meta, { staticForPng = false } = {}) {
  const hasViz = meta.viz && VIZ_RENDERERS[meta.viz.type];

  // Šířka titulkového sloupce — zúžíme pokud máme viz panel
  const titleColX = PADDING_X;
  const titleColWidth = hasViz
    ? W - PADDING_X * 2 - VIZ_WIDTH - VIZ_GAP
    : W - PADDING_X * 2 - 80;
  const charBudget = Math.floor(titleColWidth / 22); // ~22px/znak při 50px
  const titleLines = wrapTitle(meta.title, hasViz ? Math.min(charBudget, 18) : 22);
  const titleSize = pickTitleSize(titleLines.length, hasViz);
  const lineHeight = Math.round(titleSize * 1.06);

  const titleBlockH = titleLines.length * lineHeight;
  // Když je viz, dejme titulek o trochu výš (aby viz měla prostor)
  const titleY = hasViz
    ? PADDING_TOP + 90
    : Math.round((H - titleBlockH) / 2) + 30;

  const accentBarY1 = PADDING_TOP - 20;
  const accentBarY2 = H - PADDING_BOTTOM + 20;
  const accentBarX = W - PADDING_X + 30;
  const ruleEnd = hasViz ? RULE_END_VIZ : RULE_END_NO_VIZ;

  // Render viz panel
  const vizSvg = hasViz
    ? VIZ_RENDERERS[meta.viz.type]({
        data: meta.viz,
        accent: meta.accent,
        x: W - PADDING_X - VIZ_WIDTH - 10,
        y: PADDING_TOP + 60,
        width: VIZ_WIDTH,
        height: H - PADDING_TOP - PADDING_BOTTOM - 130,
        staticForPng,
      })
    : '';

  const animStyles = staticForPng ? '' : `
    @media (max-width: 768px), (prefers-reduced-motion: no-preference) {
      .accent-bar { transform-origin: ${accentBarX}px ${accentBarY2}px; animation: barGrow 1.2s cubic-bezier(.22,.61,.36,1) both; }
      .title-underline { stroke-dasharray: 280; stroke-dashoffset: 280; animation: drawIn 0.8s ease-out 0.6s forwards; }
      .pulse-dot { animation: pulse 3.4s ease-in-out 1.5s infinite; }
      .viz-bar { transform-origin: left center; animation: barGrowX 1.1s cubic-bezier(.22,.61,.36,1) both; }
      .viz-bar-1 { animation-delay: 0.4s; }
      .viz-bar-2 { animation-delay: 0.6s; }
      .viz-bar-3 { animation-delay: 0.8s; }
      .viz-bar-4 { animation-delay: 1.0s; }
      .viz-donut-segment { stroke-dasharray: var(--len) var(--circ); stroke-dashoffset: var(--len); animation: drawArc 1.2s ease-out 0.5s forwards; }
      .viz-timeline-dot { transform-origin: center; animation: dotPop 0.5s cubic-bezier(.34,1.56,.64,1) both; }
      .viz-timeline-dot-1 { animation-delay: 0.5s; }
      .viz-timeline-dot-2 { animation-delay: 0.75s; }
      .viz-timeline-dot-3 { animation-delay: 1.0s; }
      .viz-timeline-dot-4 { animation-delay: 1.25s; }
      .viz-timeline-line { stroke-dasharray: 400; stroke-dashoffset: 400; animation: drawIn 1.2s ease-out 0.3s forwards; }
    }
    @media (prefers-reduced-motion: reduce) {
      .accent-bar, .title-underline, .pulse-dot, .viz-bar, .viz-donut-segment, .viz-timeline-dot, .viz-timeline-line { animation: none !important; }
      .title-underline, .viz-timeline-line { stroke-dashoffset: 0; }
      .viz-donut-segment { stroke-dashoffset: 0; }
    }
    @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    @keyframes barGrowX { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes drawIn { to { stroke-dashoffset: 0; } }
    @keyframes drawArc { to { stroke-dashoffset: 0; } }
    @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.4); } }
    @keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="${titleColX}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  // Pokud má článek viz, headline section dostane volitelný caption (z viz dat)
  const vizCaption = hasViz && meta.viz.caption
    ? `<text x="${titleColX}" y="${titleY + (titleLines.length) * lineHeight + 28}" class="caption">${escapeXml(meta.viz.caption)}</text>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(meta.title)}">
  <defs>
    <style>
      .root { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, 'Times New Roman', serif; }
      .kicker { font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; fill: ${meta.accent}; }
      .number { font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 600; letter-spacing: 0.06em; fill: ${INK_MUT}; }
      .title { font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; fill: ${INK}; letter-spacing: -0.5px; }
      .caption { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; fill: ${INK_MUT}; font-style: italic; }
      .meta { font-family: 'Inter', system-ui, sans-serif; font-size: 16px; fill: ${INK_MUT}; }
      .brand { font-family: 'Source Serif 4', Georgia, serif; font-size: 22px; font-weight: 700; fill: ${INK}; }
      .brand em { font-style: italic; font-weight: 400; }
      .viz-label { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; font-weight: 500; fill: ${INK}; }
      .viz-value { font-family: 'Source Serif 4', Georgia, serif; font-size: 22px; font-weight: 700; fill: ${INK}; font-variant-numeric: tabular-nums; }
      .viz-sub { font-family: 'Inter', system-ui, sans-serif; font-size: 11px; fill: ${INK_MUT}; letter-spacing: 0.04em; text-transform: uppercase; }
      .viz-title { font-family: 'Inter', system-ui, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; fill: ${INK_MUT}; }
      ${animStyles}
    </style>
    <pattern id="grain" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="30" r="0.6" fill="${INK}" opacity="0.06"/>
      <circle cx="80" cy="70" r="0.5" fill="${INK}" opacity="0.05"/>
      <circle cx="50" cy="100" r="0.7" fill="${INK}" opacity="0.07"/>
      <circle cx="100" cy="20" r="0.4" fill="${INK}" opacity="0.04"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect width="${W}" height="${H}" fill="url(#grain)"/>

  <!-- Top border (editorial rule) -->
  <line x1="${PADDING_X}" y1="${PADDING_TOP - 10}" x2="${ruleEnd}" y2="${PADDING_TOP - 10}" stroke="${INK}" stroke-width="2"/>

  <!-- Kicker row: tag + article number -->
  <g class="root">
    <text x="${PADDING_X}" y="${PADDING_TOP + 20}" class="kicker">
      <tspan>${escapeXml(meta.tag)}</tspan>
      <tspan dx="14" fill="${INK_MUT}" letter-spacing="0.12em" font-weight="500">#${escapeXml(meta.number ?? '')}</tspan>
    </text>
    <circle class="pulse-dot" cx="${PADDING_X - 18}" cy="${PADDING_TOP + 14}" r="5" fill="${meta.accent}"/>
  </g>

  <!-- Headline -->
  <g class="root">
    <text class="title" x="${titleColX}" y="${titleY}" font-size="${titleSize}">
      ${titleTspans}
    </text>
    <line class="title-underline"
          x1="${titleColX}" y1="${titleY + (titleLines.length - 1) * lineHeight + 22}"
          x2="${titleColX + 200}" y2="${titleY + (titleLines.length - 1) * lineHeight + 22}"
          stroke="${meta.accent}" stroke-width="4" stroke-linecap="round"/>
    ${vizCaption}
  </g>

  <!-- Data viz panel (volitelně) -->
  ${vizSvg}

  <!-- Bottom: branding + date -->
  <g class="root">
    <line x1="${PADDING_X}" y1="${H - PADDING_BOTTOM + 10}" x2="${W - PADDING_X - 60}" y2="${H - PADDING_BOTTOM + 10}" stroke="${RULE}" stroke-width="1"/>
    <text x="${PADDING_X}" y="${H - PADDING_BOTTOM + 38}" class="brand">
      <tspan font-weight="700">HSPA</tspan> <tspan font-style="italic" font-weight="400">monitor</tspan>
    </text>
    <text x="${W - PADDING_X - 60}" y="${H - PADDING_BOTTOM + 38}" text-anchor="end" class="meta">${escapeXml(meta.date)}</text>
  </g>

  <!-- Right accent bar (animovaná) -->
  <rect class="accent-bar"
        x="${accentBarX - 6}" y="${accentBarY1}"
        width="12" height="${accentBarY2 - accentBarY1}"
        fill="${meta.accent}" rx="2"/>
</svg>
`;
}

// =====================================================================
//  STYLE renderery — alternativní celé layouty
// =====================================================================

const STYLE_RENDERERS = {
  'editorial': renderSvg,     // původní NYT-typografický
  'bold': renderBoldSvg,      // Time Magazine — velký color block + huge typo
  'data-hero': renderDataHeroSvg, // FT/Bloomberg — viz dominuje, text vedle
  'pull-quote': renderPullQuoteSvg, // Velký stat + dramatická typo
  'illustrated': renderIllustratedSvg, // Editorial ilustrace dominuje, text menší
  'photo-mock': renderPhotoMockSvg,    // Foto-evocative — gradient mesh + bokeh + vignette
};

// Helper: ztmaví barvu o ~20 % pro dark variantu (bold style)
function darken(hex, factor = 0.7) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.max(0, Math.round(r * factor));
  const dg = Math.max(0, Math.round(g * factor));
  const db = Math.max(0, Math.round(b * factor));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

function extractHeroNumber(meta) {
  // Z viz dat získej hlavní číslo pro hero number displays.
  const v = meta.viz;
  if (!v) return null;
  if (v.type === 'big-number') return { number: v.number, unit: v.unit, label: v.label, sub: v.trend };
  if (v.type === 'bar-compare' && v.rows?.length) {
    const r = v.rows.find(x => x.highlight) || v.rows[0];
    return { number: r.value, unit: v.unit, label: r.label, sub: r.sub };
  }
  if (v.type === 'donut' && v.center) return v.center;
  if (v.type === 'timeline' && v.events?.length) {
    const e = v.events.find(x => x.highlight) || v.events[v.events.length - 1];
    return { number: e.year, label: e.label, sub: v.title };
  }
  return null;
}

// =====================================================================
//  STYLE: BOLD MAGAZINE — Time/Economist
// =====================================================================
//
// Top 58 % = dark color band, white serif headline + kicker
// Bottom 42 % = cream, big stat number left + supporting label right
// Brand row pinned bottom

function renderBoldSvg(meta, { staticForPng = false } = {}) {
  const bandH = Math.round(H * 0.58);
  const darkAccent = darken(meta.accent, 0.75);
  const onDark = '#fff5ea';

  // Velikost titulku se zmenšuje s počtem řádků, aby se vešel do bandu pod kicker
  const titleLines = wrapTitle(meta.title, 26);
  const titleSize = titleLines.length <= 2 ? 76 : titleLines.length === 3 ? 60 : titleLines.length === 4 ? 50 : 40;
  const lineHeight = Math.round(titleSize * 1.04);
  // Top-anchored: titulek začíná hned pod kickerem
  const titleY = PADDING_TOP + 88;

  const heroNum = extractHeroNumber(meta);
  const numberStr = heroNum ? formatNumber(heroNum.number) : '';
  const numberSize = numberStr.length > 5 ? 110 : numberStr.length > 3 ? 140 : 180;

  const animStyles = staticForPng ? '' : `
    @media (max-width: 768px), (prefers-reduced-motion: no-preference) {
      .bold-band { animation: bandSlide 0.7s cubic-bezier(.22,.61,.36,1) both; }
      .bold-headline { animation: fadeUp 0.8s ease-out 0.2s both; }
      .bold-number { animation: numPop 0.7s cubic-bezier(.34,1.56,.64,1) 0.5s both; }
      .bold-kicker-dot { animation: pulse 3.4s ease-in-out 1.5s infinite; }
    }
    @media (prefers-reduced-motion: reduce) {
      .bold-band, .bold-headline, .bold-number, .bold-kicker-dot { animation: none !important; }
    }
    @keyframes bandSlide { from { transform: translateY(-${bandH}px); } to { transform: translateY(0); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes numPop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.5); } }
  `;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="${PADDING_X}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(meta.title)}">
  <defs>
    <style>
      .b-kicker { font-family: 'Inter', system-ui, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; fill: ${onDark}; }
      .b-number-meta { font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 0.08em; fill: ${onDark}; opacity: 0.7; }
      .b-title { font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; fill: ${onDark}; letter-spacing: -0.8px; }
      .b-bignum { font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; fill: ${INK}; letter-spacing: -4px; font-variant-numeric: tabular-nums; }
      .b-bigunit { font-family: 'Source Serif 4', Georgia, serif; font-weight: 400; fill: ${INK_MUT}; font-size: 32px; }
      .b-biglabel { font-family: 'Inter', system-ui, sans-serif; font-size: 16px; font-weight: 600; fill: ${INK}; line-height: 1.3; }
      .b-bigsub { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; fill: ${INK_MUT}; }
      .b-brand { font-family: 'Source Serif 4', Georgia, serif; font-size: 22px; font-weight: 700; fill: ${INK}; }
      .b-date { font-family: 'Inter', system-ui, sans-serif; font-size: 16px; fill: ${INK_MUT}; }
      ${animStyles}
    </style>
    <pattern id="band-grain" x="0" y="0" width="180" height="180" patternUnits="userSpaceOnUse">
      <circle cx="40" cy="50" r="1" fill="${onDark}" opacity="0.07"/>
      <circle cx="120" cy="110" r="0.8" fill="${onDark}" opacity="0.06"/>
      <circle cx="80" cy="160" r="1.2" fill="${onDark}" opacity="0.08"/>
    </pattern>
  </defs>

  <!-- Cream base -->
  <rect width="${W}" height="${H}" fill="${PAPER}"/>

  <!-- Dark color band (top) -->
  <g class="bold-band">
    <rect width="${W}" height="${bandH}" fill="${darkAccent}"/>
    <rect width="${W}" height="${bandH}" fill="url(#band-grain)"/>
    <!-- Thin accent stripe at bottom of band, používá brighter accent -->
    <rect y="${bandH - 6}" width="${W}" height="6" fill="${meta.accent}"/>
  </g>

  <!-- Kicker -->
  <g class="bold-headline">
    <circle class="bold-kicker-dot" cx="${PADDING_X - 18}" cy="${PADDING_TOP + 14}" r="6" fill="${meta.accent}"/>
    <text x="${PADDING_X}" y="${PADDING_TOP + 22}" class="b-kicker">
      <tspan>${escapeXml(meta.tag)}</tspan>
      <tspan dx="14" opacity="0.6" letter-spacing="0.12em" font-weight="500">#${escapeXml(meta.number ?? '')}</tspan>
    </text>
  </g>

  <!-- Headline -->
  <g class="bold-headline">
    <text class="b-title" x="${PADDING_X}" y="${titleY}" font-size="${titleSize}">
      ${titleTspans}
    </text>
  </g>

  <!-- Bottom cream area: big number + supporting -->
  ${heroNum ? `
  <g class="bold-number">
    <text x="${PADDING_X}" y="${bandH + 130}" class="b-bignum" font-size="${numberSize}">
      ${escapeXml(numberStr)}
      <tspan class="b-bigunit" dx="14">${escapeXml(heroNum.unit || '')}</tspan>
    </text>
    <text x="${PADDING_X}" y="${bandH + 165}" class="b-biglabel">${escapeXml(heroNum.label || '')}</text>
    ${heroNum.sub ? `<text x="${PADDING_X}" y="${bandH + 185}" class="b-bigsub">${escapeXml(heroNum.sub)}</text>` : ''}
  </g>` : ''}

  <!-- Bottom: brand + date -->
  <g>
    <text x="${PADDING_X}" y="${H - 35}" class="b-brand">
      <tspan font-weight="700">HSPA</tspan> <tspan font-style="italic" font-weight="400">monitor</tspan>
    </text>
    <text x="${W - PADDING_X}" y="${H - 35}" text-anchor="end" class="b-date">${escapeXml(meta.date)}</text>
  </g>
</svg>
`;
}

// =====================================================================
//  STYLE: DATA HERO — FT/Bloomberg
// =====================================================================
//
// Levá strana (60%) = velký data viz, vyplňuje celý prostor
// Pravá strana (40%) = kicker, headline (menší), brand
// Tmavý cream background, viz použije sytou paletu

function renderDataHeroSvg(meta, { staticForPng = false } = {}) {
  const splitX = Math.round(W * 0.58); // viz zabírá 58 % zleva
  const vizPadding = 60;
  const vizX = vizPadding;
  const vizY = vizPadding + 30;
  const vizW = splitX - vizPadding * 2;
  const vizH = H - vizPadding * 2 - 60;

  const titleX = splitX + 40;
  const titleW = W - splitX - 80;

  const titleLines = wrapTitle(meta.title, 18);
  const titleSize = titleLines.length <= 3 ? 38 : titleLines.length === 4 ? 32 : 28;
  const lineHeight = Math.round(titleSize * 1.1);
  const titleBlockH = titleLines.length * lineHeight;
  const titleY = Math.round((H - titleBlockH) / 2) - 20;

  // Render velkou viz — zvětší se renderery s width/height parametrem
  const heroViz = meta.viz && VIZ_RENDERERS[meta.viz.type]
    ? VIZ_RENDERERS[meta.viz.type]({
        data: meta.viz,
        accent: meta.accent,
        x: vizX,
        y: vizY,
        width: vizW,
        height: vizH,
        staticForPng,
        large: true,
      })
    : '';

  const animStyles = staticForPng ? '' : `
    @media (max-width: 768px), (prefers-reduced-motion: no-preference) {
      .dh-headline { animation: fadeIn 0.7s ease-out 0.3s both; }
      .dh-divider { transform-origin: top; animation: lineDown 0.8s ease-out both; }
      .viz-bar { transform-origin: left center; animation: barGrowX 1.1s cubic-bezier(.22,.61,.36,1) both; }
      .viz-bar-1 { animation-delay: 0.5s; }
      .viz-bar-2 { animation-delay: 0.7s; }
      .viz-donut-segment { stroke-dasharray: var(--len) var(--circ); stroke-dashoffset: var(--len); animation: drawArc 1.2s ease-out 0.5s forwards; }
      .viz-timeline-dot { transform-origin: center; animation: dotPop 0.5s cubic-bezier(.34,1.56,.64,1) both; }
      .viz-timeline-dot-1 { animation-delay: 0.5s; }
      .viz-timeline-dot-2 { animation-delay: 0.75s; }
      .viz-timeline-dot-3 { animation-delay: 1.0s; }
      .viz-timeline-dot-4 { animation-delay: 1.25s; }
      .viz-timeline-line { stroke-dasharray: 600; stroke-dashoffset: 600; animation: drawIn 1.2s ease-out 0.3s forwards; }
    }
    @media (prefers-reduced-motion: reduce) {
      .dh-headline, .dh-divider, .viz-bar, .viz-donut-segment, .viz-timeline-dot, .viz-timeline-line { animation: none !important; }
      .viz-donut-segment, .viz-timeline-line { stroke-dashoffset: 0; }
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes lineDown { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    @keyframes barGrowX { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes drawArc { to { stroke-dashoffset: 0; } }
    @keyframes drawIn { to { stroke-dashoffset: 0; } }
    @keyframes dotPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="${titleX}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(meta.title)}">
  <defs>
    <style>
      .dh-kicker { font-family: 'Inter', system-ui, sans-serif; font-size: 16px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; fill: ${meta.accent}; }
      .dh-title { font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; fill: ${INK}; letter-spacing: -0.3px; line-height: 1.1; }
      .dh-brand { font-family: 'Source Serif 4', Georgia, serif; font-size: 20px; font-weight: 700; fill: ${INK}; }
      .dh-date { font-family: 'Inter', system-ui, sans-serif; font-size: 14px; fill: ${INK_MUT}; }
      .viz-title { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; fill: ${INK_MUT}; }
      .viz-label { font-family: 'Inter', system-ui, sans-serif; font-size: 15px; font-weight: 600; fill: ${INK}; }
      .viz-value { font-family: 'Source Serif 4', Georgia, serif; font-size: 28px; font-weight: 700; fill: ${INK}; font-variant-numeric: tabular-nums; }
      .viz-sub { font-family: 'Inter', system-ui, sans-serif; font-size: 12px; fill: ${INK_MUT}; letter-spacing: 0.03em; }
      ${animStyles}
    </style>
  </defs>

  <!-- Cream background s subtle texturou na pravé straně -->
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect x="${splitX}" y="0" width="${W - splitX}" height="${H}" fill="${PAPER2}"/>

  <!-- Vertical divider mezi viz a textem -->
  <line class="dh-divider" x1="${splitX}" y1="${PADDING_TOP - 20}" x2="${splitX}" y2="${H - 40}" stroke="${INK}" stroke-width="2"/>

  <!-- Top tag pill nad viz -->
  <text x="${vizX}" y="${PADDING_TOP + 12}" class="dh-kicker">
    <tspan>${escapeXml(meta.tag)}</tspan>
    <tspan dx="14" fill="${INK_MUT}" letter-spacing="0.1em" font-weight="500">#${escapeXml(meta.number ?? '')}</tspan>
  </text>

  <!-- Veliká viz -->
  ${heroViz}

  <!-- Headline pravá strana -->
  <g class="dh-headline">
    <text class="dh-title" x="${titleX}" y="${titleY}" font-size="${titleSize}">
      ${titleTspans}
    </text>
    <line x1="${titleX}" y1="${titleY + (titleLines.length - 1) * lineHeight + 28}"
          x2="${titleX + 120}" y2="${titleY + (titleLines.length - 1) * lineHeight + 28}"
          stroke="${meta.accent}" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- Bottom right: brand + date -->
  <g>
    <text x="${titleX}" y="${H - 50}" class="dh-brand">
      <tspan font-weight="700">HSPA</tspan> <tspan font-style="italic" font-weight="400">monitor</tspan>
    </text>
    <text x="${titleX}" y="${H - 28}" class="dh-date">${escapeXml(meta.date)}</text>
  </g>
</svg>
`;
}

// =====================================================================
//  STYLE: PULL QUOTE — Big Stat Drama
// =====================================================================
//
// Velký stat number levá třetina (200pt+, signal color)
// Headline pravá dvě třetiny, podporující data
// Cream background s subtle tint nahoře (signál barva 8 % opacity)

function renderPullQuoteSvg(meta, { staticForPng = false } = {}) {
  const heroNum = extractHeroNumber(meta);
  const numberStr = heroNum ? formatNumber(heroNum.number) : '?';
  // Menší max velikost — aby se nepřekrýval s titulkem
  const numberSize = numberStr.length > 6 ? 100 : numberStr.length > 4 ? 130 : 170;

  // Levá kolona pro číslo: cca 45 % šířky
  const leftColW = 460;
  const titleX = leftColW + 80;
  const titleW = W - titleX - PADDING_X;

  // Titulek užší (víc řádků, ale menší font) — vejde se do pravé poloviny
  const titleLines = wrapTitle(meta.title, 22);
  const titleSize = titleLines.length <= 2 ? 48 : titleLines.length === 3 ? 40 : titleLines.length === 4 ? 34 : 28;
  const lineHeight = Math.round(titleSize * 1.06);
  // Vertical center pravé kolony
  const titleBlockH = titleLines.length * lineHeight;
  const titleY = Math.round((H - titleBlockH) / 2) - 20;

  // Číslo vertically centered
  const numberY = Math.round(H / 2) + Math.round(numberSize / 3);

  const animStyles = staticForPng ? '' : `
    @media (max-width: 768px), (prefers-reduced-motion: no-preference) {
      .pq-number { animation: numRise 0.9s cubic-bezier(.22,.61,.36,1) 0.2s both; }
      .pq-quote { animation: fadeIn 0.6s ease-out both; }
      .pq-title { animation: fadeUp 0.7s ease-out 0.5s both; }
      .pq-tint { animation: tintGrow 1.0s ease-out both; transform-origin: top; }
      .pq-accent { animation: drawIn 0.8s ease-out 0.8s forwards; stroke-dasharray: 200; stroke-dashoffset: 200; }
    }
    @media (prefers-reduced-motion: reduce) {
      .pq-number, .pq-quote, .pq-title, .pq-tint, .pq-accent { animation: none !important; }
      .pq-accent { stroke-dashoffset: 0; }
    }
    @keyframes numRise { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes tintGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    @keyframes drawIn { to { stroke-dashoffset: 0; } }
  `;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="${titleX}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(meta.title)}">
  <defs>
    <style>
      .pq-kicker { font-family: 'Inter', system-ui, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; fill: ${meta.accent}; }
      .pq-numstr { font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; fill: ${meta.accent}; letter-spacing: -5px; font-variant-numeric: tabular-nums; }
      .pq-unit { font-family: 'Source Serif 4', Georgia, serif; font-weight: 400; fill: ${INK_MUT}; font-size: 36px; }
      .pq-label { font-family: 'Inter', system-ui, sans-serif; font-weight: 600; fill: ${INK}; font-size: 18px; }
      .pq-sub { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; fill: ${INK_MUT}; }
      .pq-title { font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; fill: ${INK}; letter-spacing: -0.5px; line-height: 1.06; }
      .pq-brand { font-family: 'Source Serif 4', Georgia, serif; font-size: 22px; font-weight: 700; fill: ${INK}; }
      .pq-date { font-family: 'Inter', system-ui, sans-serif; font-size: 16px; fill: ${INK_MUT}; }
      .pq-quote-mark { font-family: 'Source Serif 4', Georgia, serif; font-weight: 400; fill: ${meta.accent}; opacity: 0.18; font-size: 280px; line-height: 1; }
      ${animStyles}
    </style>
  </defs>

  <!-- Cream base + signal-tinted top stripe -->
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect class="pq-tint" width="${W}" height="160" fill="${meta.accent}" opacity="0.12"/>

  <!-- Big quote mark behind number (decorative) -->
  <text class="pq-quote pq-quote-mark" x="${PADDING_X - 20}" y="220">"</text>

  <!-- Kicker -->
  <text x="${PADDING_X}" y="${PADDING_TOP + 22}" class="pq-kicker">
    <tspan>${escapeXml(meta.tag)}</tspan>
    <tspan dx="14" fill="${INK_MUT}" letter-spacing="0.12em" font-weight="500">#${escapeXml(meta.number ?? '')}</tspan>
  </text>

  <!-- Velké číslo levá strana -->
  <g class="pq-number">
    <text x="${PADDING_X}" y="${numberY}" class="pq-numstr" font-size="${numberSize}">
      ${escapeXml(numberStr)}
      ${heroNum?.unit ? `<tspan class="pq-unit" dx="14">${escapeXml(heroNum.unit)}</tspan>` : ''}
    </text>
    <line class="pq-accent" x1="${PADDING_X}" y1="${numberY + 20}" x2="${PADDING_X + 180}" y2="${numberY + 20}" stroke="${meta.accent}" stroke-width="5" stroke-linecap="round"/>
    ${heroNum?.label ? `<text x="${PADDING_X}" y="${numberY + 56}" class="pq-label">${escapeXml(heroNum.label)}</text>` : ''}
    ${heroNum?.sub ? `<text x="${PADDING_X}" y="${numberY + 82}" class="pq-sub">${escapeXml(heroNum.sub)}</text>` : ''}
  </g>

  <!-- Headline pravá strana -->
  <g class="pq-title">
    <text class="pq-title" x="${titleX}" y="${titleY}" font-size="${titleSize}">
      ${titleTspans}
    </text>
  </g>

  <!-- Bottom: brand + date -->
  <g>
    <line x1="${PADDING_X}" y1="${H - 60}" x2="${W - PADDING_X}" y2="${H - 60}" stroke="${RULE}" stroke-width="1"/>
    <text x="${PADDING_X}" y="${H - 28}" class="pq-brand">
      <tspan font-weight="700">HSPA</tspan> <tspan font-style="italic" font-weight="400">monitor</tspan>
    </text>
    <text x="${W - PADDING_X}" y="${H - 28}" text-anchor="end" class="pq-date">${escapeXml(meta.date)}</text>
  </g>
</svg>
`;
}

// =====================================================================
//  STYLE: ILLUSTRATED — editorial ilustrace dominuje
// =====================================================================
//
// Levá strana 55 % = velká programmaticky generovaná ilustrace
// (z cover-illustrations.js, vybráno dle cover_viz.illustration nebo tagu)
// Pravá strana = kicker + headline (40px) + accent underline + brand
// Žádné data viz panely — ilustrace nahrazuje grafy

function renderIllustratedSvg(meta, { staticForPng = false } = {}) {
  // Vyber ilustraci z explicit pole nebo z tag-based fallback
  const illustrationType = meta.viz?.illustration
    || TAG_ILLUSTRATIONS[meta.tag]
    || 'circle-graph';

  const illuX = 30;
  const illuY = 90;
  const illuW = Math.round(W * 0.5);
  const illuH = H - illuY - 90;

  const textX = illuX + illuW + 50;
  const textW = W - textX - PADDING_X;

  const titleLines = wrapTitle(meta.title, 20);
  const titleSize = titleLines.length <= 2 ? 50 : titleLines.length === 3 ? 42 : titleLines.length === 4 ? 36 : 30;
  const lineHeight = Math.round(titleSize * 1.06);
  const titleBlockH = titleLines.length * lineHeight;
  const titleY = Math.round((H - titleBlockH) / 2) - 20;

  // Předej accent + box dimensions
  const illuSvg = renderIllustration(illustrationType, {
    accent: meta.accent,
    ink: INK,
    paper: PAPER,
    x: illuX,
    y: illuY,
    width: illuW,
    height: illuH,
    data: meta.viz?.illustrationData || {},
  });

  const animStyles = staticForPng ? '' : `
    @media (max-width: 768px), (prefers-reduced-motion: no-preference) {
      .illu-line { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: illuDrawIn 1.5s ease-out 0.3s forwards; }
      .illu-line-1 { animation-delay: 0.5s; }
      .illu-line-2 { animation-delay: 0.3s; }
      .illu-gap { opacity: 0; animation: illuFade 0.8s ease-out 1.2s forwards; }
      .illu-dot { transform-origin: center; animation: illuPop 0.4s cubic-bezier(.34,1.56,.64,1) both; }
      .illu-dot-1 { animation-delay: 1.6s; }
      .illu-dot-2 { animation-delay: 1.4s; }
      .illu-gap-label { opacity: 0; animation: illuFade 0.6s ease-out 2.0s forwards; }
      .illu-label-grp { opacity: 0; animation: illuFade 0.5s ease-out 1.8s forwards; }
      .illu-coin { transform-origin: center; opacity: 0; animation: illuPop 0.4s cubic-bezier(.34,1.56,.64,1) both; }
      ${Array.from({length: 14}, (_, i) => `.illu-coin-${i} { animation-delay: ${0.3 + i * 0.07}s; }`).join('\n      ')}
      .illu-check { stroke-dasharray: 300; stroke-dashoffset: 300; animation: illuDrawIn 0.8s ease-out 0.5s forwards; }
      .illu-pulse-line { stroke-dasharray: 1500; stroke-dashoffset: 1500; animation: illuDrawIn 1.8s ease-out 0.3s forwards; }
      .illu-pulse-peak { transform-origin: center; animation: illuPop 0.4s ease-out 1.6s both, pulse 2s ease-in-out 2s infinite; }
      .illu-net-line { stroke-dasharray: 200; stroke-dashoffset: 200; animation: illuDrawIn 0.6s ease-out forwards; }
      ${Array.from({length: 6}, (_, i) => `.illu-net-line-${i} { animation-delay: ${0.4 + i * 0.1}s; }`).join('\n      ')}
      .illu-net-node { transform-origin: center; opacity: 0; animation: illuPop 0.4s ease-out both; }
      ${Array.from({length: 6}, (_, i) => `.illu-net-node-${i} { animation-delay: ${0.9 + i * 0.08}s; }`).join('\n      ')}
      .illu-net-hub { animation: illuPop 0.5s cubic-bezier(.34,1.56,.64,1) 0.3s both; }
      .illu-block { transform-origin: center; opacity: 0; animation: illuPop 0.45s cubic-bezier(.34,1.56,.64,1) both; }
      ${[[0,0],[1,0],[1,1],[2,0],[2,1],[2,2]].map(([r,i], idx) => `.illu-block-${r}-${i} { animation-delay: ${0.4 + idx * 0.08}s; }`).join('\n      ')}
      .illu-trend-line { stroke-dasharray: 800; stroke-dashoffset: 800; animation: illuDrawIn 1.4s ease-out 0.3s forwards; }
      .illu-trend-arrow { stroke-dasharray: 60; stroke-dashoffset: 60; animation: illuDrawIn 0.4s ease-out 1.5s forwards; }
      .illu-trend-dot { transform-origin: center; opacity: 0; animation: illuPop 0.35s cubic-bezier(.34,1.56,.64,1) both; }
      .illu-trend-dot-1 { animation-delay: 0.6s; }
      .illu-trend-dot-2 { animation-delay: 0.9s; }
      .illu-trend-dot-3 { animation-delay: 1.2s; }
      .illu-ring { transform-origin: center; opacity: 0; animation: illuFadeRing 0.6s ease-out both; }
      .illu-ring-0 { animation-delay: 0.5s; }
      .illu-ring-1 { animation-delay: 0.4s; }
      .illu-ring-2 { animation-delay: 0.3s; }
      .illu-ring-3 { animation-delay: 0.2s; }
      .illu-ring-4 { animation-delay: 0.1s; }
      .il-headline { animation: illuSlideIn 0.7s ease-out 0.5s both; }
    }
    @media (prefers-reduced-motion: reduce) {
      .illu-line, .illu-gap, .illu-dot, .illu-gap-label, .illu-label-grp, .illu-coin, .illu-check, .illu-pulse-line, .illu-pulse-peak, .illu-net-line, .illu-net-node, .illu-net-hub, .illu-block, .illu-trend-line, .illu-trend-arrow, .illu-trend-dot, .illu-ring, .il-headline { animation: none !important; opacity: 1; }
      .illu-line, .illu-check, .illu-pulse-line, .illu-net-line, .illu-trend-line, .illu-trend-arrow { stroke-dashoffset: 0; }
    }
    @keyframes illuDrawIn { to { stroke-dashoffset: 0; } }
    @keyframes illuFade { to { opacity: 1; } }
    @keyframes illuFadeRing { to { opacity: 1; transform: scale(1); } from { opacity: 0; transform: scale(0.85); } }
    @keyframes illuPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes illuSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); opacity: 0.6; } }
  `;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="${textX}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(meta.title)}">
  <defs>
    <style>
      .il-kicker { font-family: 'Inter', system-ui, sans-serif; font-size: 16px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; fill: ${meta.accent}; }
      .il-title { font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; fill: ${INK}; letter-spacing: -0.4px; }
      .il-brand { font-family: 'Source Serif 4', Georgia, serif; font-size: 20px; font-weight: 700; fill: ${INK}; }
      .il-date { font-family: 'Inter', system-ui, sans-serif; font-size: 14px; fill: ${INK_MUT}; }
      .il-caption { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; fill: ${INK_MUT}; font-style: italic; }
      ${animStyles}
    </style>
    <pattern id="il-grain" x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse">
      <circle cx="30" cy="40" r="0.7" fill="${INK}" opacity="0.05"/>
      <circle cx="100" cy="90" r="0.6" fill="${INK}" opacity="0.04"/>
      <circle cx="60" cy="130" r="0.8" fill="${INK}" opacity="0.06"/>
    </pattern>
  </defs>

  <!-- Cream background -->
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect width="${W}" height="${H}" fill="url(#il-grain)"/>

  <!-- Top thin rule -->
  <line x1="${PADDING_X}" y1="${PADDING_TOP - 10}" x2="${W - PADDING_X}" y2="${PADDING_TOP - 10}" stroke="${INK}" stroke-width="1.5"/>

  <!-- Kicker (top-left) -->
  <g>
    <circle cx="${PADDING_X - 18}" cy="${PADDING_TOP + 14}" r="5" fill="${meta.accent}"/>
    <text x="${PADDING_X}" y="${PADDING_TOP + 22}" class="il-kicker">
      <tspan>${escapeXml(meta.tag)}</tspan>
      <tspan dx="14" fill="${INK_MUT}" letter-spacing="0.1em" font-weight="500">#${escapeXml(meta.number ?? '')}</tspan>
    </text>
  </g>

  <!-- ILUSTRACE (levá polovina) -->
  ${illuSvg}

  <!-- Headline (pravá polovina) -->
  <g class="il-headline">
    <text class="il-title" x="${textX}" y="${titleY}" font-size="${titleSize}">
      ${titleTspans}
    </text>
    <line x1="${textX}" y1="${titleY + (titleLines.length - 1) * lineHeight + 28}"
          x2="${textX + 100}" y2="${titleY + (titleLines.length - 1) * lineHeight + 28}"
          stroke="${meta.accent}" stroke-width="4" stroke-linecap="round"/>
    ${meta.viz?.caption ? `<text x="${textX}" y="${titleY + (titleLines.length - 1) * lineHeight + 58}" class="il-caption">${escapeXml(meta.viz.caption)}</text>` : ''}
  </g>

  <!-- Bottom: brand + date -->
  <g>
    <line x1="${PADDING_X}" y1="${H - 60}" x2="${W - PADDING_X}" y2="${H - 60}" stroke="${RULE}" stroke-width="1"/>
    <text x="${PADDING_X}" y="${H - 28}" class="il-brand">
      <tspan font-weight="700">HSPA</tspan> <tspan font-style="italic" font-weight="400">monitor</tspan>
    </text>
    <text x="${W - PADDING_X}" y="${H - 28}" text-anchor="end" class="il-date">${escapeXml(meta.date)}</text>
  </g>
</svg>
`;
}

// =====================================================================
//  STYLE: PHOTO-MOCK — gradient mesh + bokeh + vignette
// =====================================================================
//
// Simuluje atmosféru fotky čistě SVG technikami:
//   - Velký radiální gradient (dark center → tonal accent edges)
//   - 5-7 blurred soft circles (bokeh effect)
//   - Color grade pomocí feColorMatrix
//   - Vignette (radial fade k tmavým rohům)
//   - Strong typo overlay (white serif, drop shadow, text plate)
//
// NEEXISTUJE žádná reálná fotka — vše je SVG. Pro skutečný fotorealismus
// je potřeba Unsplash API nebo AI image gen pipeline.

function renderPhotoMockSvg(meta, { staticForPng = false } = {}) {
  // 4 deterministic bokeh circles z hash titulu (každý článek má unikátní)
  const hash = stringHash(meta.title || 'x');
  const bokeh = [];
  for (let i = 0; i < 6; i++) {
    const seed = (hash + i * 37) % 1000;
    bokeh.push({
      cx: (seed % 100) * (W / 100),
      cy: ((seed * 3) % 100) * (H / 100),
      r: 60 + ((seed * 7) % 140),
      opacity: 0.18 + ((seed % 30) / 100),
      hue: i % 2 === 0 ? meta.accent : darken(meta.accent, 1.3),
    });
  }

  const darkBg = darken(meta.accent, 0.35);
  const midBg = darken(meta.accent, 0.6);

  const titleLines = wrapTitle(meta.title, 22);
  const titleSize = titleLines.length <= 2 ? 60 : titleLines.length === 3 ? 50 : titleLines.length === 4 ? 42 : 36;
  const lineHeight = Math.round(titleSize * 1.06);
  const titleBlockH = titleLines.length * lineHeight;
  const titleY = Math.round((H - titleBlockH) / 2) + 30;

  const animStyles = staticForPng ? '' : `
    @media (max-width: 768px), (prefers-reduced-motion: no-preference) {
      .pm-bokeh { animation: pmFloat 8s ease-in-out infinite; }
      .pm-bokeh-1 { animation-delay: 0s; }
      .pm-bokeh-2 { animation-delay: -2s; animation-duration: 11s; }
      .pm-bokeh-3 { animation-delay: -4s; animation-duration: 9s; }
      .pm-bokeh-4 { animation-delay: -1s; animation-duration: 13s; }
      .pm-bokeh-5 { animation-delay: -3s; animation-duration: 10s; }
      .pm-bokeh-6 { animation-delay: -5s; animation-duration: 14s; }
      .pm-headline { animation: pmFadeUp 0.9s ease-out 0.3s both; }
      .pm-kicker-dot { animation: pulse 3s ease-in-out 1s infinite; }
    }
    @media (prefers-reduced-motion: reduce) {
      .pm-bokeh, .pm-headline, .pm-kicker-dot { animation: none !important; }
    }
    @keyframes pmFloat {
      0%,100% { transform: translate(0,0); }
      33% { transform: translate(12px,-18px); }
      66% { transform: translate(-10px,14px); }
    }
    @keyframes pmFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.5); } }
  `;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="${PADDING_X}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  const bokehSvg = bokeh.map((b, i) => `
    <circle class="pm-bokeh pm-bokeh-${i + 1}" cx="${b.cx}" cy="${b.cy}" r="${b.r}"
            fill="${b.hue}" opacity="${b.opacity}" filter="url(#pm-blur)"/>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(meta.title)}">
  <defs>
    <style>
      .pm-kicker { font-family: 'Inter', system-ui, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; fill: rgba(255,245,234,0.95); }
      .pm-title { font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; fill: #fff5ea; letter-spacing: -0.5px; }
      .pm-brand { font-family: 'Source Serif 4', Georgia, serif; font-size: 22px; font-weight: 700; fill: rgba(255,245,234,0.95); }
      .pm-brand em { font-style: italic; font-weight: 400; }
      .pm-date { font-family: 'Inter', system-ui, sans-serif; font-size: 16px; fill: rgba(255,245,234,0.7); }
      ${animStyles}
    </style>

    <!-- Hlavní gradient pozadí (dark → mid → dark, atmosférický) -->
    <radialGradient id="pm-bg" cx="35%" cy="40%" r="80%">
      <stop offset="0%" stop-color="${midBg}" stop-opacity="1"/>
      <stop offset="60%" stop-color="${darkBg}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="1"/>
    </radialGradient>

    <!-- Vignette overlay -->
    <radialGradient id="pm-vignette" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="${INK}" stop-opacity="0"/>
      <stop offset="65%" stop-color="${INK}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0.55"/>
    </radialGradient>

    <!-- Text plate gradient (zatemnění pod textem pro čitelnost) -->
    <linearGradient id="pm-plate" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${INK}" stop-opacity="0.05"/>
      <stop offset="50%" stop-color="${INK}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0.65"/>
    </linearGradient>

    <!-- Gaussian blur filter pro bokeh -->
    <filter id="pm-blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="40"/>
    </filter>

    <!-- Subtle film grain texture -->
    <filter id="pm-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${hash % 100}"/>
      <feColorMatrix values="0 0 0 0 1
                             0 0 0 0 1
                             0 0 0 0 1
                             0 0 0 0.08 0"/>
    </filter>
  </defs>

  <!-- Background gradient -->
  <rect width="${W}" height="${H}" fill="url(#pm-bg)"/>

  <!-- Bokeh light orbs -->
  <g>${bokehSvg}</g>

  <!-- Vignette -->
  <rect width="${W}" height="${H}" fill="url(#pm-vignette)"/>

  <!-- Film grain overlay -->
  <rect width="${W}" height="${H}" filter="url(#pm-grain)" opacity="0.4"/>

  <!-- Text plate (zatemnění od středu dolů pro čitelnost) -->
  <rect y="${H * 0.4}" width="${W}" height="${H * 0.6}" fill="url(#pm-plate)"/>

  <!-- Kicker (top-left) -->
  <g>
    <circle class="pm-kicker-dot" cx="${PADDING_X - 18}" cy="${PADDING_TOP + 14}" r="6" fill="${meta.accent}"/>
    <text x="${PADDING_X}" y="${PADDING_TOP + 22}" class="pm-kicker">
      <tspan>${escapeXml(meta.tag)}</tspan>
      <tspan dx="14" opacity="0.7" letter-spacing="0.14em" font-weight="500">#${escapeXml(meta.number ?? '')}</tspan>
    </text>
  </g>

  <!-- Headline (středem, white serif) -->
  <g class="pm-headline">
    <text class="pm-title" x="${PADDING_X}" y="${titleY}" font-size="${titleSize}"
          style="text-shadow: 0 2px 12px rgba(0,0,0,0.4);">
      ${titleTspans}
    </text>
    <!-- Accent underline -->
    <line x1="${PADDING_X}" y1="${titleY + (titleLines.length - 1) * lineHeight + 28}"
          x2="${PADDING_X + 200}" y2="${titleY + (titleLines.length - 1) * lineHeight + 28}"
          stroke="${meta.accent}" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
  </g>

  <!-- Bottom: brand + date -->
  <g>
    <text x="${PADDING_X}" y="${H - 35}" class="pm-brand">
      <tspan font-weight="700">HSPA</tspan> <tspan font-style="italic" font-weight="400">monitor</tspan>
    </text>
    <text x="${W - PADDING_X}" y="${H - 35}" text-anchor="end" class="pm-date">${escapeXml(meta.date)}</text>
  </g>
</svg>
`;
}

// Deterministický string hash pro reprodukovatelné bokeh layouts
function stringHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0; // 32-bit int
  }
  return Math.abs(h);
}

// =====================================================================
//  Data viz renderery — vrací SVG fragmenty
// =====================================================================

const VIZ_RENDERERS = {
  'bar-compare': renderBarCompareViz,
  'donut': renderDonutViz,
  'timeline': renderTimelineViz,
  'big-number': renderBigNumberViz,
};

/**
 * Horizontální srovnávací bary. Použití pro 2–4 srovnávané hodnoty.
 * Data: { type: 'bar-compare', title?, rows: [{label, value, sub?, highlight?}], unit?, max? }
 */
function renderBarCompareViz({ data, accent, x, y, width, height, large = false }) {
  const rows = (data.rows || []).slice(0, 4);
  if (rows.length === 0) return '';
  const unit = data.unit || '';
  const max = data.max || Math.max(...rows.map(r => Math.abs(r.value)));
  const titleH = data.title ? 28 : 0;
  const rowGap = 16;
  // Max výška řádku — zabraňuje, aby se 2 řádky rozplácly přes celou výšku
  const maxRowH = large ? 90 : 70;
  const rowH = Math.min(maxRowH, Math.floor((height - titleH - rowGap * (rows.length - 1)) / rows.length));
  // Vertical center bloku řádků pokud zbývá místo
  const blockH = rows.length * rowH + (rows.length - 1) * rowGap;
  const yOffset = Math.max(0, Math.floor((height - titleH - blockH) / 3));
  const labelW = large ? 220 : 180;
  const barAreaX = x + labelW;
  const barAreaW = width - labelW - (large ? 110 : 80);

  const titleSvg = data.title
    ? `<text x="${x}" y="${y + 14}" class="viz-title">${escapeXml(data.title)}</text>`
    : '';

  const barH = large ? 28 : 18;
  const rowsSvg = rows.map((r, i) => {
    const ry = y + titleH + yOffset + i * (rowH + rowGap);
    const barLen = Math.max(4, Math.round((Math.abs(r.value) / max) * barAreaW));
    const color = r.highlight ? accent : INK_MUT;
    const valueText = formatNumber(r.value) + (unit ? ' ' + unit : '');
    return `
      <text x="${x}" y="${ry + rowH * 0.45}" class="viz-label">${escapeXml(r.label)}</text>
      ${r.sub ? `<text x="${x}" y="${ry + rowH * 0.45 + 18}" class="viz-sub">${escapeXml(r.sub)}</text>` : ''}
      <rect class="viz-bar viz-bar-${i + 1}"
            x="${barAreaX}" y="${ry + (rowH - barH) / 2}"
            width="${barLen}" height="${barH}"
            fill="${color}" rx="2" opacity="${r.highlight ? 1 : 0.55}"/>
      <text x="${barAreaX + barLen + 12}" y="${ry + rowH * 0.5 + 8}" class="viz-value" fill="${r.highlight ? accent : INK}">${escapeXml(valueText)}</text>
    `;
  }).join('');

  return `<g>${titleSvg}${rowsSvg}</g>`;
}

/**
 * Donut chart. Data: { type: 'donut', title?, slices: [{label, value, color?}], center?: {number, label, unit?} }
 */
function renderDonutViz({ data, accent, x, y, width, height }) {
  const slices = data.slices || [];
  if (slices.length === 0) return '';
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total <= 0) return '';

  const titleH = data.title ? 28 : 0;
  const cx = x + Math.min(width, height - titleH) / 2;
  const cy = y + titleH + (height - titleH) / 2;
  const outerR = Math.min(width, height - titleH) / 2 - 10;
  const innerR = outerR * 0.62;
  const stroke = outerR - innerR;
  const r = (outerR + innerR) / 2;
  const circ = 2 * Math.PI * r;

  let acc = 0;
  const segments = slices.map((sl, i) => {
    const frac = sl.value / total;
    const len = circ * frac;
    const offset = circ * acc;
    acc += frac;
    const color = sl.color || (i === 0 ? accent : i === 1 ? INK : INK_MUT);
    return `<circle class="viz-donut-segment"
              cx="${cx}" cy="${cy}" r="${r}"
              fill="none" stroke="${color}" stroke-width="${stroke}"
              stroke-dasharray="${len} ${circ}"
              stroke-dashoffset="${-offset}"
              transform="rotate(-90 ${cx} ${cy})"
              style="--len:${len};--circ:${circ}"/>`;
  }).join('');

  const titleSvg = data.title
    ? `<text x="${x}" y="${y + 14}" class="viz-title">${escapeXml(data.title)}</text>`
    : '';

  const centerSvg = data.center ? `
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" class="viz-value" font-size="38">${escapeXml(String(data.center.number))}</text>
    ${data.center.unit ? `<text x="${cx}" y="${cy + 28}" text-anchor="middle" class="viz-sub">${escapeXml(data.center.unit)}</text>` : ''}
    ${data.center.label ? `<text x="${cx}" y="${cy - 22}" text-anchor="middle" class="viz-sub">${escapeXml(data.center.label)}</text>` : ''}
  ` : '';

  // Legenda vpravo od donutu
  const legendX = cx + outerR + 22;
  const legendItemH = 22;
  const legendY = cy - (slices.length * legendItemH) / 2;
  const legend = slices.map((sl, i) => {
    const ly = legendY + i * legendItemH;
    const color = sl.color || (i === 0 ? accent : i === 1 ? INK : INK_MUT);
    const pct = Math.round((sl.value / total) * 100);
    return `
      <rect x="${legendX}" y="${ly - 8}" width="10" height="10" rx="2" fill="${color}"/>
      <text x="${legendX + 16}" y="${ly}" class="viz-label">${escapeXml(sl.label)}</text>
      <text x="${legendX + 16}" y="${ly + 13}" class="viz-sub">${pct} %</text>
    `;
  }).join('');

  return `<g>${titleSvg}${segments}${centerSvg}${legend}</g>`;
}

/**
 * Časová osa. Data: { type: 'timeline', title?, events: [{year, label, sub?, highlight?}] }
 */
function renderTimelineViz({ data, accent, x, y, width, height }) {
  const events = (data.events || []).slice(0, 4);
  if (events.length === 0) return '';
  const titleH = data.title ? 28 : 0;
  const lineY = y + titleH + 30;
  const lineX1 = x + 20;
  const lineX2 = x + width - 40;
  const stepX = (lineX2 - lineX1) / (events.length - 1 || 1);

  const titleSvg = data.title
    ? `<text x="${x}" y="${y + 14}" class="viz-title">${escapeXml(data.title)}</text>`
    : '';

  const lineSvg = `<line class="viz-timeline-line" x1="${lineX1}" y1="${lineY}" x2="${lineX2}" y2="${lineY}" stroke="${INK_MUT}" stroke-width="2" opacity="0.5"/>`;

  const dotsSvg = events.map((ev, i) => {
    const ex = lineX1 + i * stepX;
    const color = ev.highlight ? accent : INK;
    const labelLines = wrapTitle(ev.label || '', 18).slice(0, 3);
    const labelTspans = labelLines.map((ln, li) =>
      `<tspan x="${ex}" dy="${li === 0 ? 0 : 14}">${escapeXml(ln)}</tspan>`
    ).join('');
    return `
      <circle class="viz-timeline-dot viz-timeline-dot-${i + 1}"
              cx="${ex}" cy="${lineY}" r="${ev.highlight ? 9 : 6}"
              fill="${color}" stroke="${PAPER}" stroke-width="3"/>
      <text x="${ex}" y="${lineY - 18}" text-anchor="middle" class="viz-value" font-size="16">${escapeXml(String(ev.year))}</text>
      <text x="${ex}" y="${lineY + 30}" text-anchor="middle" class="viz-sub" style="text-transform:none;letter-spacing:0;font-size:11px;">
        ${labelTspans}
      </text>
    `;
  }).join('');

  return `<g>${titleSvg}${lineSvg}${dotsSvg}</g>`;
}

/**
 * Velké jedno číslo + label. Data: { type: 'big-number', title?, number, unit?, label, trend? }
 */
function renderBigNumberViz({ data, accent, x, y, width, height }) {
  const cx = x + width / 2;
  const cy = y + height / 2 - 10;
  const titleSvg = data.title
    ? `<text x="${cx}" y="${y + 14}" text-anchor="middle" class="viz-title">${escapeXml(data.title)}</text>`
    : '';
  const number = String(data.number);
  const unit = data.unit || '';
  return `<g>
    ${titleSvg}
    <text x="${cx}" y="${cy}" text-anchor="middle" font-family="'Source Serif 4', Georgia, serif" font-size="120" font-weight="700" fill="${accent}" letter-spacing="-3">${escapeXml(number)}</text>
    ${unit ? `<text x="${cx}" y="${cy + 30}" text-anchor="middle" class="viz-value" font-size="20" fill="${INK_MUT}">${escapeXml(unit)}</text>` : ''}
    ${data.label ? `<text x="${cx}" y="${cy + 70}" text-anchor="middle" class="viz-label" font-size="14">${escapeXml(data.label)}</text>` : ''}
    ${data.trend ? `<text x="${cx}" y="${cy + 100}" text-anchor="middle" class="viz-sub" fill="${accent}">${escapeXml(data.trend)}</text>` : ''}
  </g>`;
}

function formatNumber(v) {
  if (v == null || v === '') return '—';
  const num = Number(v);
  if (!Number.isFinite(num)) return String(v);
  if (Number.isInteger(num)) return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return num.toFixed(1).replace('.', ',');
}

// =====================================================================
//  Text utilities
// =====================================================================

function pickTitleSize(lineCount, hasViz = false) {
  // Pokud má článek viz panel, titulek má užší sloupec → menší velikosti
  if (hasViz) {
    if (lineCount <= 2) return 56;
    if (lineCount === 3) return 48;
    if (lineCount === 4) return 42;
    return 36;
  }
  // 1–2 řádky → 72px, 3 → 60px, 4 → 52px, 5+ → 44px
  if (lineCount <= 2) return 72;
  if (lineCount === 3) return 60;
  if (lineCount === 4) return 52;
  return 44;
}

/**
 * Word-wrap text na řádky o ~maxChars znacích, balancovaně (žádný řádek
 * by neměl být výrazně kratší než ostatní).
 */
export function wrapTitle(text, maxChars) {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) { current = word; continue; }
    if ((current.length + 1 + word.length) <= maxChars) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeXml(s) {
  return String(s ?? '').replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[c]));
}

// =====================================================================
//  CLI
// =====================================================================

function loadArticles() {
  const data = JSON.parse(readFileSync(ARTICLES_JSON, 'utf8'));
  return data.articles ?? [];
}

function parseArgs() {
  const args = process.argv.slice(2);
  let target = null;
  let style = null;
  for (const a of args) {
    if (a.startsWith('--style=')) style = a.slice('--style='.length);
    else if (!target) target = a;
  }
  return { target, style };
}

function main() {
  const { target, style } = parseArgs();
  if (!target) {
    console.error('Usage: node ingest/scripts/generate-article-cover.js <slug|--all> [--style=editorial|bold|data-hero|pull-quote]');
    process.exit(1);
  }
  const articles = loadArticles();

  if (target === '--all') {
    let n = 0;
    for (const a of articles) {
      if (a.published === false) continue;
      const { svgPath, pngPath } = generateCover(a, { styleOverride: style });
      console.log(`✓ ${a.slug} → ${svgPath} + ${pngPath}`);
      n++;
    }
    console.log(`\nGenerated ${n} covers.`);
    return;
  }

  const slug = target.endsWith('.html') ? target : `${target}.html`;
  const article = articles.find(a => a.slug === slug || a.id === target);
  if (!article) {
    console.error(`Article not found: ${target}`);
    process.exit(1);
  }
  const suffix = style && style !== 'editorial' ? style : '';
  const { svgPath, pngPath, meta } = generateCover(article, { styleOverride: style, suffix });
  console.log(`✓ Generated cover for "${article.title}" [style: ${style || meta.viz?.style || 'editorial'}]`);
  console.log(`  SVG: ${svgPath}`);
  console.log(`  PNG: ${pngPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
