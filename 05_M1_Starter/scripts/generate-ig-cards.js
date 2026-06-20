#!/usr/bin/env node
// generate-ig-cards.js
// Generuje sociální karty v „stat-hero" stylu pro Instagram a Facebook:
// obří číslo jako vizuální hrdina na tmavém vysoce kontrastním pozadí, signální
// barva, úderný claim. Cílem je thumb-stopping grafika nativní pro IG/FB —
// scroll-stopper, ne vsazený landscape web-cover.
//
// Dva formáty:
//   • square  1080×1080  → feed/post     → assets/social/ig/<slug>.png
//   • story   1080×1920  → Stories/Reels → assets/social/ig-story/<slug>.png
//     (9:16 s respektovanými IG safe-zónami — horní/dolní okraj zůstává volný
//      pro overlay UI: profil nahoře, odpovědní lišta / akce Reels dole)
//
//   node scripts/generate-ig-cards.js                      # všechny, oba formáty
//   node scripts/generate-ig-cards.js <slug> [<slug>]      # vybrané slugy
//   node scripts/generate-ig-cards.js --format story       # jen vertikální
//   node scripts/generate-ig-cards.js --format square      # jen čtvercové
//   node scripts/generate-ig-cards.js --svg <slug>         # zapíše jen .svg náhled

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Tmavá brand paleta laděná na maximální kontrast v IG/FB feedu i ve Stories.
// Signální barvy jsou pro tmavé pozadí zesvětlené/sytější, aby „pálily".
const BG = '#16110b';        // teplá takřka-čerň (inkoust)
const PAPER = '#fbf8f1';     // hlavní text
const MUTED = '#a99e8c';     // kicker, doména, sekundární
const RULE = 'rgba(251,248,241,0.14)';
const TRACK = 'rgba(251,248,241,0.12)';
const SIGNAL = { bad: '#ff5a3c', warn: '#ffb53a', good: '#5fd083', neutral: PAPER };

// Geometrie obou formátů. Pozice jsou absolutní (Y baseline), aby šel layout
// snadno doladit. Story má vědomě prázdné safe-zóny nahoře (~280 px) a dole
// (~316 px) kvůli overlay UI Instagramu.
const LAYOUTS = {
  square: {
    W: 1080, H: 1080, M: 96,
    accentRuleY: 132, accentRuleW: 76,
    kickerY: 178, kickerFont: 26,
    heroBaseline: 500, heroSizes: { 2: 340, 3: 280, 4: 236, more: 196 },
    claimGap: 104, claimFont: 56, claimLineH: 66, claimWrap: 22, claimMaxLines: 4,
    barH: 28, barGap: 56,
    ctxGap: 48, ctxFont: 30, ctxLineH: 40,
    cta: null,
    footerLineY: 980, footerTextY: 1028, brandFont: 31, domainFont: 26,
    headFont: 66, headLineH: 78, headStartY: 430, headWrap: 22, headMaxLines: 4,
  },
  story: {
    W: 1080, H: 1920, M: 96,
    accentRuleY: 312, accentRuleW: 88,
    kickerY: 360, kickerFont: 30,
    heroBaseline: 880, heroSizes: { 2: 452, 3: 368, 4: 308, more: 248 },
    claimGap: 122, claimFont: 62, claimLineH: 76, claimWrap: 20, claimMaxLines: 5,
    barH: 32, barGap: 64,
    ctxGap: 56, ctxFont: 34, ctxLineH: 46,
    cta: { y: 1500, font: 30, text: 'Celý rozbor → odkaz v biu' },
    footerLineY: 1556, footerTextY: 1604, brandFont: 34, domainFont: 28,
    headFont: 88, headLineH: 102, headStartY: 700, headWrap: 18, headMaxLines: 5,
  },
};

const OUT_DIRS = {
  square: resolve(ROOT, 'assets/social/ig'),
  story: resolve(ROOT, 'assets/social/ig-story'),
};

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
  'clanek-epidemiologie-1-proc-verit-cislum': {
    kicker: 'Epidemiologie · díl 1/4', signal: 'neutral',
    stat: '1854', claim: 'Odmontovaná klika u londýnské pumpy. Tak se z dat zrodila epidemiologie.',
    context: 'Proč věřit číslům — od mapy cholery k reprodukčnímu číslu.',
  },
  'clanek-epidemiologie-2-ockovani-dukaz': {
    kicker: 'Prevence · vakcinace',
    headline: '154 milionů úmrtí odvrátilo očkování za 50 let.',
  },
  'clanek-veterinarni-antibiotika-one-health': {
    kicker: 'Antibiotika · One Health',
    headline: 'Česko: o třetinu méně veterinárních antibiotik než EU.',
  },
  'clanek-epidemiologie-4-nedovera-dezinformace': {
    kicker: 'Epidemiologie · díl 4/4', signal: 'good',
    stat: '+6,8', statSuffix: '%',
    claim: 'zvýšila proočkování jediná SMS připomínka. Důkaz z 690 tis. lidí.',
    context: 'Ukázat data nestačí — rozhoduje důvěra.',
  },
  'clanek-centra-dusevniho-zdravi': {
    kicker: 'Duševní zdraví · reforma', signal: 'warn',
    stat: '40', claim: 'center duševního zdraví funguje. Reforma slíbila 100.',
    context: 'Zhruba třetina cíle reformy.',
  },
  'clanek-epidemiologie-3-modely-rozhodovani': {
    kicker: 'Epidemiologie · díl 3/4', signal: 'good',
    stat: '40–90', statSuffix: '%',
    claim: 'o tolik snížila opatření přenos. Modely SEIR pak řídí rozhodnutí.',
    context: 'I nejlepší model klame, když se z něj udělá jistota.',
  },
  'clanek-pooperacni-sepse-2026': {
    kicker: 'Kvalita · bezpečnost péče', signal: 'warn',
    stat: '0,84', statSuffix: '%',
    claim: 'případů končí pooperační sepsí — přes 5 000 ročně.',
    context: 'Česko poprvé otevřelo národní data o této komplikaci.',
  },
  'clanek-dostupnost-radioterapie-2026': {
    kicker: 'Dostupnost · onkologie',
    headline: 'Jeden gama nůž, jedno protonové centrum na celé Česko.',
    context: 'Stát chce srovnat přístup k nejdražší radioterapii.',
  },
  'clanek-financovani-sha': {
    kicker: 'Financování · SHA', signal: 'neutral',
    stat: '696,7', claim: 'miliardy Kč stálo zdravotnictví v 2024 (8,6 % HDP).',
    context: 'Kdo platí, na co a komu — tři řezy rámce SHA.',
  },
  'clanek-rakovina-tlusteho-streva': {
    kicker: 'Prevence · onkologie', signal: 'warn',
    headline: 'Screening rakoviny střeva využívá jen necelá třetina oprávněných.',
    context: 'Včasný záchyt léčí. Přežití u nás zaostává.',
  },
  'clanek-darci-organu': {
    kicker: 'Dárcovství orgánů', signal: 'good',
    stat: '34,3', claim: 'zemřelých dárců na milion — třetí nejvíc v Evropě.',
    context: 'Průměr EU je 20,9. Drží to opt-out a koordinátoři.',
  },
  'clanek-plicni-screening-ucast': {
    kicker: 'Prevence · onkologie', signal: 'warn',
    stat: '2,7', statSuffix: '%', barPct: 3,
    claim: 'rizikových kuřáků prošlo screeningem plic za 3 roky.',
    context: 'Program běží od roku 2022. Dosah zůstává nízký.',
  },
  'clanek-rezistence-antibiotik': {
    kicker: 'Antibiotika · rezistence', signal: 'warn',
    stat: '19', statSuffix: '%', barPct: 19,
    claim: 'invazivní E. coli odolává ciprofloxacinu.',
    context: 'Mírně pod průměrem EU (22,5 %), ale zase roste.',
  },
  'clanek-obezita-jidelny-reforma': {
    kicker: 'Prevence · obezita', signal: 'bad',
    stat: '6', statSuffix: '/10', claim: 'dospělých Čechů má nadváhu nebo obezitu.',
    context: 'Každé čtvrté dítě 6–9 let taky. Páka je školní jídelna.',
  },
  'clanek-ncez-financovani-2027': {
    kicker: 'Digitalizace · financování',
    headline: 'Dotace na e-zdravotnictví dojdou. Provoz od 2027 platí stát.',
    context: 'Část agendy přejde do FN Ostrava.',
  },
  'clanek-koureni-adolescenti': {
    kicker: 'Prevence · mládež', signal: 'neutral',
    headline: '14 % patnáctiletých kouří. Kolem evropského průměru.',
    context: 'Posun je k nikotinu a e-cigaretám.',
  },
  'clanek-cerny-kasel-2024-epidemie': {
    kicker: 'Prevence · epidemie', signal: 'bad',
    stat: '21', claim: 'tisíc případů černého kašle v 2024 — nejvíc od 60. let.',
    context: '199,4 na 100 000 obyvatel, zhruba 4× průměr EU.',
  },
  'clanek-napoje-1-tekuty-cukr': {
    kicker: 'Prevence · cukr · díl 1/6', signal: 'bad',
    stat: '+25', statSuffix: '%',
    claim: 'vyšší riziko cukrovky 2. typu za každou denní sklenici.',
    context: 'Riziko nezmizí, ani když po nich člověk nepřibere.',
  },
  'clanek-napoje-2-mytus-stavy': {
    kicker: 'Prevence · cukr · díl 2/6', signal: 'warn',
    stat: '250', claim: 'ml „100%“ džusu má podobně cukru jako kola.',
    context: 'WHO ho počítá mezi volné cukry úplně stejně.',
  },
  'clanek-napoje-3-energetaky-deti': {
    kicker: 'Prevence · děti · díl 3/6', signal: 'bad',
    headline: 'Jedna plechovka energeťáku překročí denní limit kofeinu pro dítě.',
    context: 'Slazený nápoj plus velká dávka kofeinu.',
  },
  'clanek-napoje-4-alkohol-mytus': {
    kicker: 'Prevence · alkohol · díl 4/6', signal: 'bad',
    headline: 'Žádná dávka alkoholu není bez rizika (WHO 2023). J-křivka padla.',
    context: 'Alkohol je karcinogen 1. třídy.',
  },
  'clanek-napoje-5-co-pit': {
    kicker: 'Prevence · díl 5/6', signal: 'good',
    headline: 'Co pít? Výchozím nápojem je voda. Levná a bez rizika.',
    context: 'Výměna limonády za vodu snižuje riziko cukrovky.',
  },
  'clanek-napoje-6-dan-regulace': {
    kicker: 'Politika · daň · díl 6/6', signal: 'neutral',
    stat: '10', statSuffix: '%',
    claim: 'daň ze slazených nápojů ≈ zhruba stejný pokles prodejů.',
    context: 'Co na slazené nápoje funguje na úrovni politiky.',
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

function heroSizeFor(stat, sizes) {
  const n = String(stat).length;
  if (n <= 2) return sizes[2];
  if (n === 3) return sizes[3];
  if (n === 4) return sizes[4];
  return sizes.more;
}

function eyebrow(L, kicker, accent) {
  return `
  <rect x="${L.M}" y="${L.accentRuleY}" width="${L.accentRuleW}" height="10" rx="5" fill="${accent}"/>
  <text class="kicker" x="${L.M}" y="${L.kickerY}">${escapeXml(kicker)}</text>`;
}

function footer(L) {
  return `
  <line x1="${L.M}" y1="${L.footerLineY}" x2="${L.W - L.M}" y2="${L.footerLineY}" stroke="${RULE}" stroke-width="1.5"/>
  <text class="brand" x="${L.M}" y="${L.footerTextY}">HSPA Monitor</text>
  <text class="domain" x="${L.W - L.M}" y="${L.footerTextY}" text-anchor="end">skorezdravotnictvi.cz</text>`;
}

function ctaBlock(L, accent) {
  if (!L.cta) return '';
  return `
  <text class="cta" x="${L.M}" y="${L.cta.y}"><tspan fill="${PAPER}">${escapeXml(L.cta.text.replace(' → odkaz v biu', ''))}</tspan><tspan fill="${accent}"> → odkaz v biu</tspan></text>`;
}

function styleBlock(L, accent, statFont) {
  return `
    .kicker { font-family: 'Inter', system-ui, sans-serif; font-size: ${L.kickerFont}px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; fill: ${accent}; }
    .hero { font-family: 'Inter', system-ui, sans-serif; font-size: ${statFont}px; font-weight: 800; letter-spacing: -4px; fill: ${accent}; }
    .hero-suffix { font-size: ${Math.round(statFont * 0.42)}px; font-weight: 800; }
    .claim { font-family: 'Source Serif 4', Georgia, serif; font-size: ${L.claimFont}px; font-weight: 700; letter-spacing: -0.4px; fill: ${PAPER}; }
    .context { font-family: 'Inter', system-ui, sans-serif; font-size: ${L.ctxFont}px; font-weight: 600; fill: ${accent}; }
    .head { font-family: 'Source Serif 4', Georgia, serif; font-size: ${L.headFont}px; font-weight: 700; letter-spacing: -0.6px; fill: ${PAPER}; }
    .cta { font-family: 'Inter', system-ui, sans-serif; font-size: ${L.cta ? L.cta.font : 30}px; font-weight: 700; }
    .brand { font-family: 'Source Serif 4', Georgia, serif; font-size: ${L.brandFont}px; font-weight: 700; fill: ${PAPER}; }
    .domain { font-family: 'Inter', system-ui, sans-serif; font-size: ${L.domainFont}px; font-weight: 600; fill: ${MUTED}; }`;
}

function buildStatCard(meta, L) {
  const { kicker, signal, stat, statSuffix, claim, context, barPct } = meta;
  const accent = SIGNAL[signal] || PAPER;
  const statFont = heroSizeFor(stat, L.heroSizes);
  const suffix = statSuffix
    ? `<tspan class="hero-suffix" dx="8" fill="${accent}">${escapeXml(statSuffix)}</tspan>` : '';

  const claimLines = wrap(claim, L.claimWrap);
  if (claimLines.length > L.claimMaxLines) {
    throw new Error(`Claim se nevejde (>${L.claimMaxLines} řádky) pro „${stat}${statSuffix || ''}": ${claim} — zkrať copy v MANIFESTU.`);
  }
  const claimStartY = L.heroBaseline + L.claimGap;
  const claimSvg = claimLines
    .map((l, i) => `<text class="claim" x="${L.M}" y="${claimStartY + i * L.claimLineH}">${escapeXml(l)}</text>`)
    .join('\n  ');
  let cursorY = claimStartY + (claimLines.length - 1) * L.claimLineH;

  // Pruh i pointa se mohou zobrazit současně (pruh → pak pointa pod ním).
  const blocks = [];
  if (typeof barPct === 'number') {
    const barY = cursorY + L.barGap;
    const barW = L.W - L.M * 2;
    const fillW = Math.max(10, Math.round(barW * Math.min(100, barPct) / 100));
    blocks.push(`
  <rect x="${L.M}" y="${barY}" width="${barW}" height="${L.barH}" rx="${L.barH / 2}" fill="${TRACK}"/>
  <rect x="${L.M}" y="${barY}" width="${fillW}" height="${L.barH}" rx="${L.barH / 2}" fill="${accent}"/>`);
    cursorY = barY + L.barH;
  }
  if (context) {
    const ctxLines = wrap(context, 40).slice(0, 2);
    const ctxStartY = cursorY + L.ctxGap;
    blocks.push(ctxLines
      .map((l, i) => `<text class="context" x="${L.M}" y="${ctxStartY + i * L.ctxLineH}">${escapeXml(l)}</text>`)
      .join('\n  '));
  }
  const extra = blocks.join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.W} ${L.H}" width="${L.W}" height="${L.H}" role="img" aria-label="${escapeXml(stat + (statSuffix || '') + ' — ' + claim)}">
  <defs><style>${styleBlock(L, accent, statFont)}
  </style></defs>
  <rect width="${L.W}" height="${L.H}" fill="${BG}"/>
  ${eyebrow(L, kicker, accent)}
  <text class="hero" x="${L.M - 4}" y="${L.heroBaseline}">${escapeXml(stat)}${suffix}</text>
  ${claimSvg}
  ${extra}
  ${ctaBlock(L, accent)}
  ${footer(L)}
</svg>`;
}

function buildHeadlineCard(meta, L) {
  const { kicker, signal, headline, context } = meta;
  const accent = SIGNAL[signal] || PAPER;
  const lines = wrap(headline, L.headWrap).slice(0, L.headMaxLines);
  const headSvg = lines
    .map((l, i) => `<text class="head" x="${L.M}" y="${L.headStartY + i * L.headLineH}">${escapeXml(l)}</text>`)
    .join('\n  ');
  const ctxY = L.headStartY + (lines.length - 1) * L.headLineH + 72;
  const ctxSvg = context
    ? `<text class="context" x="${L.M}" y="${ctxY}">${escapeXml(context)}</text>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.W} ${L.H}" width="${L.W}" height="${L.H}" role="img" aria-label="${escapeXml(headline)}">
  <defs><style>${styleBlock(L, accent, 200)}
  </style></defs>
  <rect width="${L.W}" height="${L.H}" fill="${BG}"/>
  ${eyebrow(L, kicker, accent)}
  ${headSvg}
  ${ctxSvg}
  ${ctaBlock(L, accent)}
  ${footer(L)}
</svg>`;
}

export function buildSvg(slug, meta, format = 'square') {
  const L = LAYOUTS[format] || LAYOUTS.square;
  return meta.stat ? buildStatCard(meta, L) : buildHeadlineCard(meta, L);
}

function renderCard(slug, meta, format) {
  const svg = buildSvg(slug, meta, format);
  const L = LAYOUTS[format];
  const outDir = OUT_DIRS[format];
  // resvg je dostupný jen tam, kde jsou devDependencies (CI / lokál).
  return import('@resvg/resvg-js').then(({ Resvg }) => {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: L.W } }).render().asPng();
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const out = resolve(outDir, `${slug}.png`);
    writeFileSync(out, png);
    return out;
  });
}

async function main() {
  let args = process.argv.slice(2);
  const svgOnly = args.includes('--svg');
  args = args.filter(a => a !== '--svg');

  let formats = ['square', 'story'];
  const fmtIdx = args.indexOf('--format');
  if (fmtIdx !== -1) {
    const val = args[fmtIdx + 1];
    if (!LAYOUTS[val]) { console.error(`⚠️  Neznámý formát „${val}". Použij square|story.`); process.exit(1); }
    formats = [val];
    args.splice(fmtIdx, 2);
  }

  const slugs = args.length ? args : Object.keys(MANIFEST);
  for (const slug of slugs) {
    const meta = MANIFEST[slug];
    if (!meta) { console.error(`⚠️  Nemám entry v MANIFESTU pro: ${slug} — přeskakuji.`); continue; }
    for (const format of formats) {
      if (svgOnly) {
        const outDir = OUT_DIRS[format];
        if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
        const out = resolve(outDir, `${slug}.svg`);
        writeFileSync(out, buildSvg(slug, meta, format));
        console.log(`✓ ${out}`);
      } else {
        const out = await renderCard(slug, meta, format);
        console.log(`✓ ${out}`);
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
