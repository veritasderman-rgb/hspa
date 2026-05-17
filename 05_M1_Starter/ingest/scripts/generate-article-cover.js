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

export function generateCover(article, { writeFiles = true } = {}) {
  const meta = deriveMeta(article);
  const svg = renderSvg(meta);

  if (!writeFiles) return { svg, meta };

  mkdirSync(COVERS_DIR, { recursive: true });
  const baseName = article.slug.replace(/\.html$/, '');
  const svgPath = resolve(COVERS_DIR, `${baseName}.svg`);
  const pngPath = resolve(COVERS_DIR, `${baseName}.png`);

  writeFileSync(svgPath, svg, 'utf8');

  // PNG export — Resvg potřebuje SVG bez animací (statický snapshot)
  // Vytvoříme variantu se statickým layoutem (final state animací)
  const staticSvg = renderSvg(meta, { staticForPng: true });
  const resvg = new Resvg(staticSvg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      // Resvg neumí vzdálené fonty; spoléhá se na systémové
      // Source Serif 4 / Inter musí být nainstalované, jinak fallback
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
function renderBarCompareViz({ data, accent, x, y, width, height }) {
  const rows = (data.rows || []).slice(0, 4);
  if (rows.length === 0) return '';
  const unit = data.unit || '';
  const max = data.max || Math.max(...rows.map(r => Math.abs(r.value)));
  const titleH = data.title ? 28 : 0;
  const rowGap = 12;
  const rowH = Math.floor((height - titleH - rowGap * (rows.length - 1)) / rows.length);
  const labelW = 180;
  const barAreaX = x + labelW;
  const barAreaW = width - labelW - 80;

  const titleSvg = data.title
    ? `<text x="${x}" y="${y + 14}" class="viz-title">${escapeXml(data.title)}</text>`
    : '';

  const rowsSvg = rows.map((r, i) => {
    const ry = y + titleH + i * (rowH + rowGap);
    const barLen = Math.max(4, Math.round((Math.abs(r.value) / max) * barAreaW));
    const color = r.highlight ? accent : INK_MUT;
    const valueText = formatNumber(r.value) + (unit ? ' ' + unit : '');
    return `
      <text x="${x}" y="${ry + rowH * 0.55}" class="viz-label">${escapeXml(r.label)}</text>
      ${r.sub ? `<text x="${x}" y="${ry + rowH * 0.55 + 18}" class="viz-sub">${escapeXml(r.sub)}</text>` : ''}
      <rect class="viz-bar viz-bar-${i + 1}"
            x="${barAreaX}" y="${ry + (rowH - 18) / 2}"
            width="${barLen}" height="18"
            fill="${color}" rx="2" opacity="${r.highlight ? 1 : 0.55}"/>
      <text x="${barAreaX + barLen + 10}" y="${ry + rowH * 0.55 + 4}" class="viz-value" fill="${r.highlight ? accent : INK}">${escapeXml(valueText)}</text>
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

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node ingest/scripts/generate-article-cover.js <slug|--all>');
    process.exit(1);
  }
  const articles = loadArticles();

  if (arg === '--all') {
    let n = 0;
    for (const a of articles) {
      if (a.published === false) continue;
      const { svgPath, pngPath } = generateCover(a);
      console.log(`✓ ${a.slug} → ${svgPath} + ${pngPath}`);
      n++;
    }
    console.log(`\nGenerated ${n} covers.`);
    return;
  }

  const slug = arg.endsWith('.html') ? arg : `${arg}.html`;
  const article = articles.find(a => a.slug === slug || a.id === arg);
  if (!article) {
    console.error(`Article not found: ${arg}`);
    process.exit(1);
  }
  const { svgPath, pngPath, meta } = generateCover(article);
  console.log(`✓ Generated cover for "${article.title}"`);
  console.log(`  SVG: ${svgPath}`);
  console.log(`  PNG: ${pngPath}`);
  console.log(`  Meta:`, meta);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
