#!/usr/bin/env node
// generate-ig-cards.js
// Generuje čtvercové (1080×1080) varianty cover grafik pro Instagram.
// Síťově specifický formát: FB/X používají krajinný cover 1200×630,
// IG má nativní poměr 1:1 — tento skript složí cover do brandového
// čtvercového rámce s headline pruhem.
//
//   node scripts/generate-ig-cards.js                 # všechny v MANIFESTU
//   node scripts/generate-ig-cards.js <slug> [<slug>] # vybrané slugy
//
// Vstup:  assets/covers/<slug>.png   (krajinný cover, musí existovat)
// Výstup: assets/social/ig/<slug>.png (1080×1080)

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const COVERS_DIR = resolve(ROOT, 'assets/covers');
const OUT_DIR = resolve(ROOT, 'assets/social/ig');

const PAPER = '#fbf8f1';
const INK = '#1f1a14';
const SUBINK = '#5f574e';
const RULE = 'rgba(31,26,20,0.13)';

const W = 1080;
const H = 1080;

// Krátké, úderné headline + kicker pro každou kartu (číslo do popředí).
// Headline je odvozen z perexu/titulku článku (žádná nová čísla z paměti).
const MANIFEST = {
  'clanek-react-eu-nku-kontrola-2026': {
    kicker: 'Financování · kontrola',
    headline: 'Spektrometr za 1,46 mil. Kč. A 21 měsíců v krabici.',
  },
  'clanek-centrum-onkologicke-prevence-mou-2026': {
    kicker: 'Prevence · investice',
    headline: 'Centrum prevence za 1,12 miliardy. Rozhodne ale účast.',
  },
  'clanek-klistova-encefalitida-proockovanost-2026': {
    kicker: 'Prevence · vakcinace',
    headline: 'Jen 17 % Čechů je chráněno proti klíšťové encefalitidě.',
  },
  'clanek-zaskrt-umrti-2026': {
    kicker: 'Prevence · vakcinace',
    headline: 'Druhé úmrtí na záškrt v Česku za 57 let.',
  },
  'clanek-ai-act-zdravotnictvi-srpen-2026': {
    kicker: 'Digitalizace · regulace',
    headline: '64 % nemocnic už používá AI. Od 2. 8. platí AI Act.',
  },
  'clanek-nikez-jak-funguje-2026': {
    kicker: 'Kvalita péče',
    headline: 'Kdo měří kvalitu péče? Od roku 2023 institut NIKEZ.',
  },
  'clanek-zubni-kaz-deti': {
    kicker: 'Prevence · děti',
    headline: 'České děti mají skoro 4× víc zubních kazů než německé.',
  },
  'clanek-epidemiologie-2-ockovani-dukaz': {
    kicker: 'Prevence · vakcinace',
    headline: '154 milionů úmrtí odvrátilo očkování za 50 let.',
  },
  'clanek-veterinarni-antibiotika-one-health': {
    kicker: 'Antibiotika · One Health',
    headline: 'Česko: o třetinu méně veterinárních antibiotik než EU.',
  },
};

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Jednoduché zalamování podle počtu znaků (serif ~46px → ~26 znaků/řádek).
function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

function buildSvg(slug, { kicker, headline }) {
  const coverPng = resolve(COVERS_DIR, `${slug}.png`);
  if (!existsSync(coverPng)) throw new Error(`Cover chybí: ${coverPng}`);
  const b64 = readFileSync(coverPng).toString('base64');

  const MARGIN = 64;
  const coverW = W - MARGIN * 2;             // 952
  const coverH = Math.round(coverW * 630 / 1200); // 500
  const coverY = 150;
  const coverBottom = coverY + coverH;       // 650

  const headLines = wrap(headline, 26).slice(0, 3);
  const headStartY = coverBottom + 96;
  const headLineH = 64;
  const headSvg = headLines
    .map((l, i) => `<text class="title" x="${MARGIN}" y="${headStartY + i * headLineH}">${escapeXml(l)}</text>`)
    .join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(headline)}">
  <defs>
    <style>
      .kicker { font-family: 'Inter', system-ui, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; fill: ${SUBINK}; }
      .title { font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif; font-size: 52px; font-weight: 700; fill: ${INK}; letter-spacing: -0.5px; }
      .brand { font-family: 'Source Serif 4', Georgia, serif; font-size: 30px; font-weight: 700; fill: ${INK}; }
      .domain { font-family: 'Inter', system-ui, sans-serif; font-size: 26px; font-weight: 600; letter-spacing: 0.02em; fill: ${SUBINK}; }
    </style>
    <clipPath id="coverClip"><rect x="${MARGIN}" y="${coverY}" width="${coverW}" height="${coverH}" rx="10"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="${PAPER}"/>

  <!-- kicker + horní linka -->
  <line x1="${MARGIN}" y1="80" x2="${MARGIN + 70}" y2="80" stroke="${INK}" stroke-width="3"/>
  <text class="kicker" x="${MARGIN}" y="112">${escapeXml(kicker)}</text>

  <!-- cover (krajinný) vsazený do čtverce -->
  <rect x="${MARGIN}" y="${coverY}" width="${coverW}" height="${coverH}" fill="#ffffff" stroke="${RULE}" stroke-width="1" rx="10"/>
  <image x="${MARGIN}" y="${coverY}" width="${coverW}" height="${coverH}" clip-path="url(#coverClip)"
         href="data:image/png;base64,${b64}" preserveAspectRatio="xMidYMid slice"/>

  <!-- headline -->
  ${headSvg}

  <!-- patička -->
  <line x1="${MARGIN}" y1="990" x2="${W - MARGIN}" y2="990" stroke="${RULE}" stroke-width="1"/>
  <text class="brand" x="${MARGIN}" y="1034">HSPA Monitor</text>
  <text class="domain" x="${W - MARGIN}" y="1034" text-anchor="end">skorezdravotnictvi.cz</text>
</svg>`;
}

function renderCard(slug, meta) {
  const svg = buildSvg(slug, meta);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } });
  const png = resvg.render().asPng();
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const out = resolve(OUT_DIR, `${slug}.png`);
  writeFileSync(out, png);
  return out;
}

const args = process.argv.slice(2);
const slugs = args.length ? args : Object.keys(MANIFEST);
for (const slug of slugs) {
  const meta = MANIFEST[slug];
  if (!meta) {
    console.error(`⚠️  Nemám headline v MANIFESTU pro: ${slug} — přeskakuji.`);
    continue;
  }
  const out = renderCard(slug, meta);
  console.log(`✓ ${out}`);
}
