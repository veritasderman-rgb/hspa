// Generator NYT-style SVG cover images pro články.
//
// Output:
//   assets/covers/{slug}.svg  — animovatelný SVG pro in-page zobrazení
//   assets/covers/{slug}.png  — 1200×630 rasterizovaný export pro OG (sítě)
//
// Vstup: článek metadata z data/articles.json (id, title, tag, date, perex)
//        + volitelně signal/dimension z přidružené struktury
//
// Vizuální styl:
//   - Editorial / NYT-typografický (Source Serif 4 + Inter)
//   - Cream paper background (#fbf8f1)
//   - Velký bold serif headline (3–5 řádků dle délky)
//   - Top: uppercase kicker (tag) v signálové barvě
//   - Bottom: HSPA Monitor branding + datum
//   - Right rail: vertical accent bar v signálové barvě
//   - Subtle texturovaný overlay (paper grain)
//
// Animace (jen mobile + ne při prefers-reduced-motion):
//   - Accent bar narůstá zdola nahoru (1.2s ease-out)
//   - Headline underline draws in (0.8s)
//   - Small dot pulses (po 3s)
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

function renderSvg(meta, { staticForPng = false } = {}) {
  const titleLines = wrapTitle(meta.title, 22); // ~22 znaků na řádek pro 64px
  const titleSize = pickTitleSize(titleLines.length);
  const lineHeight = Math.round(titleSize * 1.06);

  // Y pozice headline — centrované vertikálně, ale necháváme prostor pro kicker
  const titleBlockH = titleLines.length * lineHeight;
  const titleY = Math.round((H - titleBlockH) / 2) + 30;

  const accentBarY1 = PADDING_TOP - 20;
  const accentBarY2 = H - PADDING_BOTTOM + 20;
  const accentBarX = W - PADDING_X + 30;

  const animStyles = staticForPng ? '' : `
    @media (max-width: 768px), (prefers-reduced-motion: no-preference) {
      .accent-bar { transform-origin: ${accentBarX}px ${accentBarY2}px; animation: barGrow 1.2s cubic-bezier(.22,.61,.36,1) both; }
      .title-underline { stroke-dasharray: 280; stroke-dashoffset: 280; animation: drawIn 0.8s ease-out 0.6s forwards; }
      .pulse-dot { animation: pulse 3.4s ease-in-out 1.5s infinite; }
    }
    @media (prefers-reduced-motion: reduce) {
      .accent-bar, .title-underline, .pulse-dot { animation: none !important; }
      .title-underline { stroke-dashoffset: 0; }
    }
    @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    @keyframes drawIn { to { stroke-dashoffset: 0; } }
    @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.4); } }
  `;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="${PADDING_X}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(meta.title)}">
  <defs>
    <style>
      .root { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, 'Times New Roman', serif; }
      .kicker { font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; fill: ${meta.accent}; }
      .number { font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 600; letter-spacing: 0.06em; fill: ${INK_MUT}; }
      .title { font-family: 'Source Serif 4', Georgia, serif; font-weight: 700; fill: ${INK}; letter-spacing: -0.5px; }
      .meta { font-family: 'Inter', system-ui, sans-serif; font-size: 16px; fill: ${INK_MUT}; }
      .brand { font-family: 'Source Serif 4', Georgia, serif; font-size: 22px; font-weight: 700; fill: ${INK}; }
      .brand em { font-style: italic; font-weight: 400; }
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
  <line x1="${PADDING_X}" y1="${PADDING_TOP - 10}" x2="${W - PADDING_X - 60}" y2="${PADDING_TOP - 10}" stroke="${INK}" stroke-width="2"/>

  <!-- Kicker row: tag + article number -->
  <g class="root">
    <text x="${PADDING_X}" y="${PADDING_TOP + 20}" class="kicker">
      <tspan>${escapeXml(meta.tag)}</tspan>
      <tspan dx="14" fill="${INK_MUT}" letter-spacing="0.12em" font-weight="500">#${escapeXml(meta.number ?? '')}</tspan>
    </text>
    <!-- Pulse dot vedle čísla, signální barva -->
    <circle class="pulse-dot" cx="${PADDING_X - 18}" cy="${PADDING_TOP + 14}" r="5" fill="${meta.accent}"/>
  </g>

  <!-- Headline -->
  <g class="root">
    <text class="title" x="${PADDING_X}" y="${titleY}" font-size="${titleSize}">
      ${titleTspans}
    </text>
    <!-- Underline pod posledním řádkem (draw-in animace) -->
    <line class="title-underline"
          x1="${PADDING_X}" y1="${titleY + (titleLines.length - 1) * lineHeight + 22}"
          x2="${PADDING_X + 280}" y2="${titleY + (titleLines.length - 1) * lineHeight + 22}"
          stroke="${meta.accent}" stroke-width="4" stroke-linecap="round"/>
  </g>

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
//  Text utilities
// =====================================================================

function pickTitleSize(lineCount) {
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
