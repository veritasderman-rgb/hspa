// Generuje launch banner pro LinkedIn / Facebook share — 1200×630, editorial styl.
// Spuštění: node scripts/generate-launch-banner.js
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_SVG = resolve(ROOT, 'assets/social/hspa-launch.svg');
const OUT_PNG = resolve(ROOT, 'assets/social/hspa-launch.png');

const PAPER = '#fbf8f1';
const PAPER2 = '#f3eee2';
const INK = '#1f1a14';
const INK_MUT = '#5f574e';
const INK_MUT2 = '#8b8278';
const RED = '#b8361e';
const RULE = 'rgba(31,26,20,0.13)';

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="HSPA Monitor — veřejný portál o českém zdravotnictví">
  <defs>
    <style>
      .root { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, 'Times New Roman', serif; }
      .kicker { font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
      .sans { font-family: 'Inter', system-ui, sans-serif; }
      .serif { font-family: 'Source Serif 4', Georgia, serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="${PAPER}"/>

  <!-- Top rule -->
  <rect x="64" y="56" width="1072" height="2" fill="${INK}"/>

  <!-- Top masthead row -->
  <g>
    <text class="kicker" x="64" y="42" font-size="14" fill="${INK_MUT}">HSPA · OECD METODIKA · VEŘEJNÝ PORTÁL</text>
    <text class="kicker" x="1136" y="42" text-anchor="end" font-size="14" fill="${INK_MUT}">2026 · ČESKÁ REPUBLIKA</text>
  </g>

  <!-- Brand: HSPA monitor -->
  <g transform="translate(64, 130)">
    <text class="serif" font-size="92" font-weight="700" fill="${INK}" letter-spacing="-2">HSPA <tspan font-style="italic" font-weight="400" fill="${RED}">monitor</tspan></text>
    <text class="sans" x="0" y="34" font-size="14" fill="${INK_MUT2}" letter-spacing="0.08em">hspa-cesko.cz · skorezdravotnictvi.cz</text>
  </g>

  <!-- Tagline -->
  <g transform="translate(64, 230)">
    <text class="serif" font-size="38" font-weight="700" fill="${INK}" letter-spacing="-0.5">Veřejný portál o českém</text>
    <text class="serif" x="0" y="48" font-size="38" font-weight="700" fill="${INK}" letter-spacing="-0.5">zdravotnictví. Z dat, ne z dojmů.</text>
  </g>

  <!-- Lead -->
  <g transform="translate(64, 360)">
    <text class="serif" font-size="19" fill="${INK_MUT}">Naděje dožití, čekací doby, výdaje, prevence, reformní debata —</text>
    <text class="serif" x="0" y="28" font-size="19" fill="${INK_MUT}">primární data ÚZIS, ČSÚ, OECD a Eurostat propojená s editoriálem</text>
    <text class="serif" x="0" y="56" font-size="19" fill="${INK_MUT}">a redakčními analýzami.</text>
  </g>

  <!-- Right column: counters grid 2×2 -->
  <g transform="translate(720, 130)">
    <!-- Counter 1 -->
    <g>
      <rect x="0" y="0" width="200" height="100" fill="${PAPER2}" stroke="${RULE}" stroke-width="1"/>
      <text class="sans" x="16" y="32" font-size="48" font-weight="700" fill="${INK}">80</text>
      <text class="sans" x="16" y="56" font-size="11" font-weight="700" letter-spacing="0.08em" fill="${INK_MUT}">INDIKÁTORŮ</text>
      <text class="serif" x="16" y="82" font-size="13" fill="${INK_MUT}">HSPA + monitoring</text>
    </g>
    <!-- Counter 2 -->
    <g transform="translate(216, 0)">
      <rect x="0" y="0" width="200" height="100" fill="${PAPER2}" stroke="${RULE}" stroke-width="1"/>
      <text class="sans" x="16" y="32" font-size="48" font-weight="700" fill="${INK}">75<tspan font-size="32">+</tspan></text>
      <text class="sans" x="16" y="56" font-size="11" font-weight="700" letter-spacing="0.08em" fill="${INK_MUT}">ČLÁNKŮ</text>
      <text class="serif" x="16" y="82" font-size="13" fill="${INK_MUT}">long-form journalism</text>
    </g>
    <!-- Counter 3 -->
    <g transform="translate(0, 116)">
      <rect x="0" y="0" width="200" height="100" fill="${PAPER2}" stroke="${RULE}" stroke-width="1"/>
      <text class="sans" x="16" y="32" font-size="48" font-weight="700" fill="${INK}">14</text>
      <text class="sans" x="16" y="56" font-size="11" font-weight="700" letter-spacing="0.08em" fill="${INK_MUT}">KRAJŮ</text>
      <text class="serif" x="16" y="82" font-size="13" fill="${INK_MUT}">interaktivní dashboard</text>
    </g>
    <!-- Counter 4 -->
    <g transform="translate(216, 116)">
      <rect x="0" y="0" width="200" height="100" fill="${PAPER2}" stroke="${RULE}" stroke-width="1"/>
      <text class="sans" x="16" y="32" font-size="48" font-weight="700" fill="${INK}">34</text>
      <text class="sans" x="16" y="56" font-size="11" font-weight="700" letter-spacing="0.08em" fill="${INK_MUT}">STRATEGIÍ</text>
      <text class="serif" x="16" y="82" font-size="13" fill="${INK_MUT}">ČR, EU, OECD, WHO</text>
    </g>

    <!-- Note pod countery -->
    <g transform="translate(0, 240)">
      <text class="sans" x="0" y="0" font-size="11" font-weight="700" letter-spacing="0.08em" fill="${RED}">METODIKA</text>
      <text class="serif" x="0" y="22" font-size="13" fill="${INK_MUT}">OECD HSPA Framework (2023)</text>
      <text class="serif" x="0" y="40" font-size="13" fill="${INK_MUT}">Health at a Glance 2025</text>
    </g>
  </g>

  <!-- Accent bar pravá -->
  <rect x="1132" y="130" width="4" height="430" fill="${RED}"/>

  <!-- Bottom row -->
  <rect x="64" y="558" width="1072" height="1" fill="${RULE}"/>

  <g transform="translate(64, 590)">
    <!-- Disclaimer ai -->
    <text class="sans" font-size="13" fill="${INK_MUT}">
      <tspan font-weight="700" fill="${INK}">Experiment.</tspan>
      <tspan dx="4">Píše Claude z dat, lidská kontrola namátkou. Chyby jsou možné — pod každým tvrzením je odkaz na primární zdroj.</tspan>
    </text>
  </g>

  <!-- URL bottom right -->
  <g transform="translate(1136, 590)">
    <text class="sans" text-anchor="end" font-size="14" font-weight="700" letter-spacing="0.04em" fill="${INK}">hspa-cesko.cz →</text>
  </g>
</svg>`;

// Write SVG
import { mkdirSync } from 'node:fs';
mkdirSync(dirname(OUT_SVG), { recursive: true });
writeFileSync(OUT_SVG, svg, 'utf8');

// Rasterize to PNG
const resvg = new Resvg(svg, {
  background: PAPER,
  fitTo: { mode: 'width', value: 1200 },
  font: {
    loadSystemFonts: true,
    defaultFontFamily: 'serif',
  },
});
const pngData = resvg.render().asPng();
writeFileSync(OUT_PNG, pngData);

console.log(`✓ Generated launch banner:`);
console.log(`  SVG: ${OUT_SVG}`);
console.log(`  PNG: ${OUT_PNG} (${(pngData.length / 1024).toFixed(1)} kB)`);
