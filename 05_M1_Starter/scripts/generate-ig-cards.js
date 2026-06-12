#!/usr/bin/env node
// generate-ig-cards.js
// Generuje čtvercové (1080×1080) Instagram karty v „stat-hero" stylu:
// obří číslo jako vizuální hrdina, signální barva, úderný claim, volitelný
// proporční pruh. Cílem je thumb-stopping grafika nativní pro IG — NE vsazený
// landscape web-cover (ten působil malý a nevýrazný).
//
//   node scripts/generate-ig-cards.js                 # všechny v MANIFESTU
//   node scripts/generate-ig-cards.js <slug> [<slug>] # vybrané slugy
//   node scripts/generate-ig-cards.js --svg <slug>    # zapíše jen .svg náhled
//
// Výstup: assets/social/ig/<slug>.png (1080×1080)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'assets/social/ig');

const W = 1080;
const H = 1080;
const MARGIN = 88;

// Brand paleta + signální barvy (sjednoceno s design tokeny webu).
const PAPER = '#fbf8f1';
const INK = '#1f1a14';
const SUBINK = '#5f574e';
const RULE = 'rgba(31,26,20,0.14)';
const SIGNAL = { bad: '#b8361e', warn: '#a05a08', good: '#2f6b1f', neutral: INK };

// Každá karta: buď „stat" režim (stat + claim), nebo „headline" režim.
//   stat        — velké číslo (hrdina). statSuffix jen pro symboly (% ×).
//   claim       — co číslo znamená (serif). Slovní jednotku (let/měsíců/mld)
//                 dej na začátek claimu, ne jako suffix.
//   context     — úderná pointa (volitelně).
//   barPct      — 0–100: nakreslí proporční pruh (jen pro procentní staty).
//   signal      — bad|warn|good|neutral → barva čísla a pruhu.
//   headline    — fallback bez čísla (velký serif nadpis).
// Žádná nová čísla z paměti — vše vychází z dříve schválených headline.
const MANIFEST = {
  'clanek-react-eu-nku-kontrola-2026': {
    kicker: 'Financování · kontrola', signal: 'warn',
    stat: '21', claim: 'měsíců ležel spektrometr za 1,46 mil. Kč nepoužitý v krabici.',
  },
  'clanek-centrum-onkologicke-prevence-mou-2026': {
    kicker: 'Prevence · investice', signal: 'good',
    stat: '1,12', claim: 'miliardy stojí nové Centrum onkologické prevence. Rozhodne ale účast.',
  },
  'clanek-klistova-encefalitida-proockovanost-2026': {
    kicker: 'Prevence · vakcinace', signal: 'bad',
    stat: '17', statSuffix: '%', barPct: 17,
    claim: 'Čechů je chráněno proti klíšťové encefalitidě.',
    context: 'A přitom hlásíme nejvíc případů v celé EU.',
  },
  'clanek-zaskrt-umrti-2026': {
    kicker: 'Prevence · vakcinace', signal: 'bad',
    stat: '57', claim: 'let bez úmrtí na záškrt. Teď v Česku přišlo druhé.',
  },
  'clanek-ai-act-zdravotnictvi-srpen-2026': {
    kicker: 'Digitalizace · regulace', signal: 'neutral',
    stat: '64', statSuffix: '%', barPct: 64,
    claim: 'nemocnic už používá AI. Od 2. 8. platí evropský AI Act.',
  },
  'clanek-nikez-jak-funguje-2026': {
    kicker: 'Kvalita péče',
    headline: 'Kdo měří kvalitu péče v Česku? Od roku 2023 institut NIKEZ.',
  },
  'clanek-zubni-kaz-deti': {
    kicker: 'Prevence · děti', signal: 'bad',
    stat: '4', statSuffix: '×', claim: 'víc zubních kazů mají české děti než německé.',
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

/** Zalamování podle ~počtu znaků na řádek. */
function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) { lines.push(line.trim()); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line.trim());
  return lines;
}

function eyebrow(kicker) {
  return `
  <line x1="${MARGIN}" y1="124" x2="${MARGIN + 64}" y2="124" stroke="${INK}" stroke-width="4"/>
  <text class="kicker" x="${MARGIN}" y="166">${escapeXml(kicker)}</text>`;
}

function footer() {
  return `
  <line x1="${MARGIN}" y1="982" x2="${W - MARGIN}" y2="982" stroke="${RULE}" stroke-width="1.5"/>
  <text class="brand" x="${MARGIN}" y="1028">HSPA Monitor</text>
  <text class="domain" x="${W - MARGIN}" y="1028" text-anchor="end">skorezdravotnictvi.cz</text>`;
}

function statSizeFor(stat) {
  const n = String(stat).length;
  if (n <= 2) return 300;
  if (n === 3) return 244;
  return 200;
}

function buildStatCard({ kicker, signal, stat, statSuffix, claim, context, barPct }) {
  const accent = SIGNAL[signal] || INK;
  const statFont = statSizeFor(stat);
  const numBaseline = 470;
  const suffix = statSuffix
    ? `<tspan class="hero-suffix" dx="6" fill="${accent}">${escapeXml(statSuffix)}</tspan>` : '';

  const claimLines = wrap(claim, 24).slice(0, 3);
  const claimStartY = numBaseline + 96;
  const claimLineH = 64;
  const claimSvg = claimLines
    .map((l, i) => `<text class="claim" x="${MARGIN}" y="${claimStartY + i * claimLineH}">${escapeXml(l)}</text>`)
    .join('\n  ');
  let cursorY = claimStartY + (claimLines.length - 1) * claimLineH;

  let extra = '';
  if (typeof barPct === 'number') {
    const barY = cursorY + 62;
    const barW = W - MARGIN * 2;
    const fillW = Math.max(8, Math.round(barW * Math.min(100, barPct) / 100));
    extra = `
  <rect x="${MARGIN}" y="${barY}" width="${barW}" height="26" rx="13" fill="rgba(31,26,20,0.10)"/>
  <rect x="${MARGIN}" y="${barY}" width="${fillW}" height="26" rx="13" fill="${accent}"/>`;
    cursorY = barY + 26;
  } else if (context) {
    const ctxLines = wrap(context, 40).slice(0, 2);
    const ctxStartY = cursorY + 58;
    extra = ctxLines
      .map((l, i) => `<text class="context" x="${MARGIN}" y="${ctxStartY + i * 40}">${escapeXml(l)}</text>`)
      .join('\n  ');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(stat + (statSuffix || '') + ' — ' + claim)}">
  <defs><style>
    .kicker { font-family: 'Inter', system-ui, sans-serif; font-size: 25px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; fill: ${SUBINK}; }
    .hero { font-family: 'Inter', system-ui, sans-serif; font-size: ${statFont}px; font-weight: 800; letter-spacing: -3px; fill: ${accent}; }
    .hero-suffix { font-size: ${Math.round(statFont * 0.42)}px; font-weight: 800; }
    .claim { font-family: 'Source Serif 4', Georgia, serif; font-size: 54px; font-weight: 700; letter-spacing: -0.4px; fill: ${INK}; }
    .context { font-family: 'Inter', system-ui, sans-serif; font-size: 30px; font-weight: 600; fill: ${accent}; }
    .brand { font-family: 'Source Serif 4', Georgia, serif; font-size: 30px; font-weight: 700; fill: ${INK}; }
    .domain { font-family: 'Inter', system-ui, sans-serif; font-size: 26px; font-weight: 600; fill: ${SUBINK}; }
  </style></defs>
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  ${eyebrow(kicker)}
  <text class="hero" x="${MARGIN - 4}" y="${numBaseline}">${escapeXml(stat)}${suffix}</text>
  ${claimSvg}
  ${extra}
  ${footer()}
</svg>`;
}

function buildHeadlineCard({ kicker, headline, context }) {
  const lines = wrap(headline, 22).slice(0, 4);
  const startY = 430;
  const lineH = 78;
  const headSvg = lines
    .map((l, i) => `<text class="head" x="${MARGIN}" y="${startY + i * lineH}">${escapeXml(l)}</text>`)
    .join('\n  ');
  const ctxY = startY + (lines.length - 1) * lineH + 70;
  const ctxSvg = context
    ? `<text class="context" x="${MARGIN}" y="${ctxY}">${escapeXml(context)}</text>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(headline)}">
  <defs><style>
    .kicker { font-family: 'Inter', system-ui, sans-serif; font-size: 25px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; fill: ${SUBINK}; }
    .head { font-family: 'Source Serif 4', Georgia, serif; font-size: 66px; font-weight: 700; letter-spacing: -0.6px; fill: ${INK}; }
    .context { font-family: 'Inter', system-ui, sans-serif; font-size: 30px; font-weight: 600; fill: ${SUBINK}; }
    .brand { font-family: 'Source Serif 4', Georgia, serif; font-size: 30px; font-weight: 700; fill: ${INK}; }
    .domain { font-family: 'Inter', system-ui, sans-serif; font-size: 26px; font-weight: 600; fill: ${SUBINK}; }
  </style></defs>
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  ${eyebrow(kicker)}
  ${headSvg}
  ${ctxSvg}
  ${footer()}
</svg>`;
}

export function buildSvg(slug, meta) {
  return meta.stat ? buildStatCard(meta) : buildHeadlineCard(meta);
}

function renderCard(slug, meta) {
  const svg = buildSvg(slug, meta);
  // resvg je dostupný jen tam, kde jsou devDependencies (CI / lokál).
  return import('@resvg/resvg-js').then(({ Resvg }) => {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    const out = resolve(OUT_DIR, `${slug}.png`);
    writeFileSync(out, png);
    return out;
  });
}

async function main() {
  let args = process.argv.slice(2);
  const svgOnly = args.includes('--svg');
  args = args.filter(a => a !== '--svg');
  const slugs = args.length ? args : Object.keys(MANIFEST);
  for (const slug of slugs) {
    const meta = MANIFEST[slug];
    if (!meta) { console.error(`⚠️  Nemám entry v MANIFESTU pro: ${slug} — přeskakuji.`); continue; }
    if (svgOnly) {
      const out = resolve(OUT_DIR, `${slug}.svg`);
      if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
      writeFileSync(out, buildSvg(slug, meta));
      console.log(`✓ ${out}`);
    } else {
      const out = await renderCard(slug, meta);
      console.log(`✓ ${out}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
