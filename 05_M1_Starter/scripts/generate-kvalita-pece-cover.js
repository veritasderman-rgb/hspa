// Generuje page-cover pro kvalita-pece.html — 1200×630 (LinkedIn / Facebook / OG).
// Editorial styl ve stylu portálu (Source Serif 4 + Inter, paper background).
//
// Spuštění:  node scripts/generate-kvalita-pece-cover.js
// Výstup:    assets/social/kvalita-pece.svg + .png

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_SVG = resolve(ROOT, 'assets/social/kvalita-pece.svg');
const OUT_PNG = resolve(ROOT, 'assets/social/kvalita-pece.png');

const PAPER = '#fbf8f1';
const PAPER2 = '#f3eee2';
const INK = '#1f1a14';
const INK_MUT = '#5f574e';
const INK_MUT2 = '#8b8278';
const RED = '#b8361e';
const GREEN = '#2f6b1f';
const RULE = 'rgba(31,26,20,0.13)';

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="HSPA Monitor — Klinická kvalita péče v ČR">
  <defs>
    <style>
      .kicker { font-family: 'Inter', system-ui, -apple-system, sans-serif; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
      .sans { font-family: 'Inter', system-ui, sans-serif; }
      .serif { font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="${PAPER}"/>

  <!-- Top masthead row -->
  <rect x="64" y="56" width="1072" height="2" fill="${INK}"/>
  <text class="kicker" x="64" y="42" font-size="14" fill="${INK_MUT}">HSPA MONITOR · KVALITA PÉČE · PUK + INDIKO</text>
  <text class="kicker" x="1136" y="42" text-anchor="end" font-size="14" fill="${INK_MUT}">2026 · ČESKÁ REPUBLIKA</text>

  <!-- Brand row -->
  <g transform="translate(64, 110)">
    <text class="serif" font-size="44" font-weight="700" fill="${INK}" letter-spacing="-0.8">HSPA <tspan font-style="italic" font-weight="400" fill="${RED}">monitor</tspan></text>
    <text class="sans" x="0" y="22" font-size="13" fill="${INK_MUT2}" letter-spacing="0.08em">hspa-cesko.cz · skorezdravotnictvi.cz</text>
  </g>

  <!-- Section badge -->
  <g transform="translate(64, 180)">
    <rect x="0" y="0" width="220" height="32" fill="${PAPER2}" stroke="${RULE}" stroke-width="1"/>
    <text class="kicker" x="16" y="22" font-size="13" fill="${INK}">KLINICKÁ KVALITA PÉČE</text>
  </g>

  <!-- Headline -->
  <g transform="translate(64, 250)">
    <text class="serif" font-size="48" font-weight="700" fill="${INK}" letter-spacing="-1">Co o klinické kvalitě</text>
    <text class="serif" x="0" y="58" font-size="48" font-weight="700" fill="${INK}" letter-spacing="-1">péče v Česku víme.</text>
  </g>

  <!-- Lead -->
  <g transform="translate(64, 400)">
    <text class="serif" font-size="18" fill="${INK_MUT}">Sedm sekcí — od pooperační sepse po cestu</text>
    <text class="serif" x="0" y="26" font-size="18" fill="${INK_MUT}">onkologického pacienta. PUK + INDIKO + OECD.</text>
  </g>

  <!-- Bottom row: three counter-blocks (metricky známé hodnoty) -->
  <g transform="translate(64, 488)">
    <!-- AMI -->
    <g>
      <rect x="0" y="0" width="220" height="100" fill="${PAPER2}" stroke="${RULE}" stroke-width="1"/>
      <rect x="0" y="0" width="220" height="3" fill="${GREEN}"/>
      <text class="serif" x="16" y="46" font-size="38" font-weight="700" fill="${INK}">5,2 %</text>
      <text class="sans" x="16" y="68" font-size="10.5" font-weight="700" letter-spacing="0.08em" fill="${INK_MUT}">30D AMI · OECD H@G 2025</text>
      <text class="sans" x="16" y="86" font-size="11" fill="${INK_MUT}">ČR vs 6,5 % OECD</text>
    </g>
    <!-- CMP -->
    <g transform="translate(236, 0)">
      <rect x="0" y="0" width="220" height="100" fill="${PAPER2}" stroke="${RULE}" stroke-width="1"/>
      <rect x="0" y="0" width="220" height="3" fill="${INK}"/>
      <text class="serif" x="16" y="46" font-size="38" font-weight="700" fill="${INK}">13 + 32</text>
      <text class="sans" x="16" y="68" font-size="10.5" font-weight="700" letter-spacing="0.08em" fill="${INK_MUT}">KCC + IC SÍŤ · CMP</text>
      <text class="sans" x="16" y="86" font-size="11" fill="${INK_MUT}">komplexní + iktová centra</text>
    </g>
    <!-- INDIKO -->
    <g transform="translate(472, 0)">
      <rect x="0" y="0" width="220" height="100" fill="${PAPER2}" stroke="${RULE}" stroke-width="1"/>
      <rect x="0" y="0" width="220" height="3" fill="${RED}"/>
      <text class="serif" x="16" y="46" font-size="38" font-weight="700" fill="${INK}">3</text>
      <text class="sans" x="16" y="68" font-size="10.5" font-weight="700" letter-spacing="0.08em" fill="${INK_MUT}">DIAGNÓZY · INDIKO 2025</text>
      <text class="sans" x="16" y="86" font-size="11" fill="${INK_MUT}">plíce · prsu · pankreas</text>
    </g>
    <!-- 7 sections -->
    <g transform="translate(708, 0)">
      <rect x="0" y="0" width="220" height="100" fill="${PAPER2}" stroke="${RULE}" stroke-width="1"/>
      <rect x="0" y="0" width="220" height="3" fill="${INK_MUT}"/>
      <text class="serif" x="16" y="46" font-size="38" font-weight="700" fill="${INK}">7</text>
      <text class="sans" x="16" y="68" font-size="10.5" font-weight="700" letter-spacing="0.08em" fill="${INK_MUT}">SEKCÍ STRÁNKY</text>
      <text class="sans" x="16" y="86" font-size="11" fill="${INK_MUT}">bezpečnost → onkologie → kraje</text>
    </g>
  </g>

  <!-- Side decoration: stripe with section nums -->
  <g transform="translate(960, 180)">
    <rect x="0" y="0" width="176" height="290" fill="${PAPER2}" stroke="${RULE}" stroke-width="1"/>
    <text class="kicker" x="16" y="28" font-size="11" fill="${INK_MUT}">SEKCE</text>
    <text class="serif" x="16" y="68" font-size="22" font-weight="700" fill="${INK}">§ 1  Bezpečnost</text>
    <text class="serif" x="16" y="98" font-size="22" font-weight="700" fill="${INK}">§ 2  AMI</text>
    <text class="serif" x="16" y="128" font-size="22" font-weight="700" fill="${INK}">§ 3  CMP</text>
    <text class="serif" x="16" y="158" font-size="22" font-weight="700" fill="${INK}">§ 4  AMR</text>
    <text class="serif" x="16" y="188" font-size="22" font-weight="700" fill="${INK}">§ 5  Onko chir.</text>
    <text class="serif" x="16" y="218" font-size="22" font-weight="700" fill="${INK}">§ 6  Cesta pac.</text>
    <text class="serif" x="16" y="248" font-size="22" font-weight="700" fill="${INK}">§ 7  Kraje 14×8</text>
    <text class="kicker" x="16" y="278" font-size="10" fill="${INK_MUT2}">PUK · INDIKO · OECD</text>
  </g>
</svg>`;

writeFileSync(OUT_SVG, svg, 'utf8');

const resvg = new Resvg(svg, {
  background: PAPER,
  fitTo: { mode: 'width', value: 1200 },
});
const png = resvg.render().asPng();
writeFileSync(OUT_PNG, png);

console.log('OK: assets/social/kvalita-pece.svg + .png (1200×630)');
