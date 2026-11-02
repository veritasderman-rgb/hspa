// Věková a pohlavní struktura kmene zdravotních pojišťoven z CRP (OIS 11-47) — srovnávač P3.3.
//
// Spouštěj:  node ingest/transform_pojistovny_crp.js [--rok 2025] [--csv <cesta>]
//            (zapojení do `npm run` je třída C, řeší samostatný PR)
//
// Vstup:  <repo-root>/Datovy-souhrn-OIS-11-47-zdravotni-pojistenci-struktura-2026-01.csv
//         (ÚZIS, NZIP Dohodovací řízení, Dimenze 5; ~15 MB, ~279 tis. řádků; 8 řádků preambule,
//         pak hlavička „Rok;Kód zdravotní pojišťovny;Okres LAU;Název okresu;Věková kategorie;
//         Pohlaví;Počet pojišťenců“; počty s mezerou jako oddělovačem tisíců; pohlaví M / Z)
// Výstup: data/pojistovny-vek.json — ZP × 19 věkových pásem × pohlaví (součet přes okresy) + ČR celkem
//         pro jeden rok (výchozí: nejnovější v CSV). Pohlaví ve výstupu: M = muž, F = žena (CSV „Z“).
//
// CSV se čte streamově po řádcích (readline), do paměti jde jen agregát rok × ZP × pásmo × pohlaví.
// Když CSV chybí (CI, čerstvý checkout), skript ohlásí přeskočení a skončí s exit 0 bez přepisu výstupu.
//
// Průměrný věk je ODHAD ze středů pásem: střed pásma lower–upper (věk v dokončených letech) =
// (lower + upper + 1) / 2, tj. 0 → 0,5; 1–4 → 3; 5–9 → 7,5 … 80–84 → 82,5. Otevřené horní pásmo 85+
// nemá horní mez — použije se 85 + 5 = 90 let. Odhad je vychýlený dolů u kmenů s mnoha 90+.
//
// Použití výstupu: ingest/transform_pojistovny_standardizace.js (faktor standardizace nákladů),
// metodika docs/metodika-srovnavac-pojistoven.md § 4.1.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STARTER_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(STARTER_ROOT, '..');

export const CSV_NAME = 'Datovy-souhrn-OIS-11-47-zdravotni-pojistenci-struktura-2026-01.csv';
export const CSV_PATH = path.join(REPO_ROOT, CSV_NAME);
export const OUT_PATH = path.join(STARTER_ROOT, 'data', 'pojistovny-vek.json');
const MAPPING_PATH = path.join(__dirname, 'mapping', 'lau_to_nuts3.json');

export const ZP_CODES = ['111', '201', '205', '207', '209', '211', '213'];
export const POHLAVI = ['M', 'F'];
const SEX_MAP = { M: 'M', Z: 'F' };
/** Otevřené horní pásmo: střed = dolní mez + 5 let. */
export const OTEVRENE_PASMO_PRIRAZKA = 5;

const COL = {
  rok: 'Rok',
  zp: 'Kód zdravotní pojišťovny',
  pasmo: 'Věková kategorie',
  pohlavi: 'Pohlaví',
  pocet: 'Počet pojišťenců',
};

/** Načte 19 věkových pásem z mapping souboru (pořadí = pořadí v CSV). */
export function loadAgeGroups(mappingPath = MAPPING_PATH) {
  const m = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  return m.age_groups.groups.map((g) => ({ key: g.key, raw: g.raw, lower: g.lower, upper: g.upper }));
}

/** Střed pásma v letech; otevřené horní pásmo (85+) = lower + 5. */
export function stredPasma(g, isLast) {
  if (isLast) return g.lower + OTEVRENE_PASMO_PRIRAZKA;
  return (g.lower + g.upper + 1) / 2;
}

/** „4 288“ / „4 288“ → 4288 */
export function parsePocet(s) {
  const cleaned = String(s ?? '').replace(/[\s  ]/g, '');
  if (cleaned === '') return 0;
  if (!/^\d+$/.test(cleaned)) throw new Error(`Nelze parsovat počet pojištěnců: "${s}"`);
  return parseInt(cleaned, 10);
}

/**
 * Streamově projde CSV a vrátí agregát Map("rok|zp|pasmo|pohlavi" → počet) + množinu let.
 * @param {string} csvPath
 * @param {Array<{key:string, raw:string}>} ageGroups
 */
export async function agregujCsv(csvPath, ageGroups) {
  const rawToKey = new Map(ageGroups.map((g) => [g.raw, g.key]));
  const agg = new Map();
  const roky = new Set();
  let header = null;
  let rows = 0;
  let skipped = 0;

  const rl = readline.createInterface({ input: fs.createReadStream(csvPath, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const lineRaw of rl) {
    const line = lineRaw.replace(/^﻿/, '');
    if (!header) {
      if (/^Rok;/.test(line)) {
        const cols = line.split(';').map((c) => c.trim());
        header = {};
        for (const [k, name] of Object.entries(COL)) {
          const i = cols.indexOf(name);
          if (i < 0) throw new Error(`CSV: v hlavičce chybí sloupec "${name}"`);
          header[k] = i;
        }
      }
      continue; // preambule
    }
    if (line.trim() === '' || /^;*$/.test(line)) continue;
    const c = line.split(';');
    const rok = parseInt(c[header.rok], 10);
    const zp = String(c[header.zp] ?? '').trim();
    const sex = SEX_MAP[String(c[header.pohlavi] ?? '').trim()];
    const ageRaw = String(c[header.pasmo] ?? '').trim();
    if (!Number.isInteger(rok) || !ZP_CODES.includes(zp) || !sex) { skipped++; continue; }
    const pasmo = rawToKey.get(ageRaw);
    if (!pasmo) throw new Error(`CSV: neznámá věková kategorie "${ageRaw}"`);
    const key = `${rok}|${zp}|${pasmo}|${sex}`;
    agg.set(key, (agg.get(key) ?? 0) + parsePocet(c[header.pocet]));
    roky.add(rok);
    rows++;
  }
  if (!header) throw new Error('CSV: nenalezena hlavička „Rok;…“');
  return { agg, roky: [...roky].sort((a, b) => a - b), rows, skipped };
}

const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

/** Souhrnné metriky struktury: celkem, podíl 65+, odhad průměrného věku. */
export function metrikyStruktury(struktura, ageGroups) {
  let celkem = 0, n65 = 0, vekSum = 0;
  ageGroups.forEach((g, i) => {
    const stred = stredPasma(g, i === ageGroups.length - 1);
    for (const s of POHLAVI) {
      const n = struktura[`${g.key}:${s}`] ?? 0;
      celkem += n;
      if (g.lower >= 65) n65 += n;
      vekSum += n * stred;
    }
  });
  return {
    celkem,
    podil_65plus_pct: celkem > 0 ? round(100 * n65 / celkem, 2) : null,
    prumerny_vek_odhad: celkem > 0 ? round(vekSum / celkem, 1) : null,
  };
}

/**
 * Sestaví výstupní objekt data/pojistovny-vek.json z agregátu.
 * @param {{agg: Map<string, number>, roky: number[]}} a
 * @param {Array} ageGroups
 * @param {{rok?: number, soubor?: string, generatedAt?: string}} [opts]
 */
export function sestavVystup({ agg, roky }, ageGroups, { rok, soubor = CSV_NAME, generatedAt } = {}) {
  const r = rok ?? roky[roky.length - 1];
  if (!roky.includes(r)) throw new Error(`CSV neobsahuje rok ${r} (k dispozici ${roky.join(', ')})`);
  const pasma = ageGroups.map((g) => g.key);
  const cell = (zp, p, s) => agg.get(`${r}|${zp}|${p}|${s}`) ?? 0;

  const crStruktura = {};
  const pojistovny = [];
  for (const kod of ZP_CODES) {
    const struktura = {};
    for (const p of pasma) for (const s of POHLAVI) {
      const n = cell(kod, p, s);
      struktura[`${p}:${s}`] = n;
      crStruktura[`${p}:${s}`] = (crStruktura[`${p}:${s}`] ?? 0) + n;
    }
    const m = metrikyStruktury(struktura, ageGroups);
    if (m.celkem === 0) throw new Error(`CSV: ZP ${kod} nemá v roce ${r} žádné pojištěnce`);
    pojistovny.push({ kod, celkem: m.celkem, struktura, podil_65plus_pct: m.podil_65plus_pct, prumerny_vek_odhad: m.prumerny_vek_odhad });
  }
  const cr = metrikyStruktury(crStruktura, ageGroups);

  return {
    version: '1.0',
    generated_at: generatedAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    _doc: 'Věková a pohlavní struktura kmene 7 zdravotních pojišťoven a ČR celkem z CRP (OIS 11-47), součet přes okresy. ' +
      'Klíč struktury "<pásmo>:<pohlaví>" (M = muž, F = žena). prumerny_vek_odhad je odhad ze středů pásem ' +
      '((dolní + horní + 1) / 2; otevřené pásmo 85+ = 90 let). Generuje ingest/transform_pojistovny_crp.js, ' +
      'čte ingest/transform_pojistovny_standardizace.js. Metodika: docs/metodika-srovnavac-pojistoven.md § 4.1.',
    rok: r,
    zdroj: { nazev: 'ÚZIS, OIS 11-47, verze 2026-01', soubor, url: 'https://www.nzip.cz/dohodovaci-rizeni' },
    pasma,
    pohlavi: [...POHLAVI],
    stredy_pasem: Object.fromEntries(ageGroups.map((g, i) => [g.key, stredPasma(g, i === ageGroups.length - 1)])),
    cr: { celkem: cr.celkem, podil_65plus_pct: cr.podil_65plus_pct, prumerny_vek_odhad: cr.prumerny_vek_odhad, struktura: crStruktura },
    pojistovny,
  };
}

/** Serializace bez generated_at — pro idempotentní zápis (nepřepisovat, když se data nezměnila). */
const bezCasu = (o) => JSON.stringify({ ...o, generated_at: null });

export async function transformPojistovnyCrp({ csvPath = CSV_PATH, outPath = OUT_PATH, rok, write = true, log = console.log } = {}) {
  if (!fs.existsSync(csvPath)) {
    log(`⚠ transform_pojistovny_crp: CSV ${path.basename(csvPath)} nenalezeno (${csvPath}) — přeskakuji, ${path.basename(outPath)} beze změny.`);
    return { skipped: true };
  }
  const ageGroups = loadAgeGroups();
  const a = await agregujCsv(csvPath, ageGroups);
  let out = sestavVystup(a, ageGroups, { rok, soubor: path.basename(csvPath) });

  let changed = true;
  if (fs.existsSync(outPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (bezCasu(prev) === bezCasu(out)) { changed = false; out = { ...out, generated_at: prev.generated_at }; }
    } catch { /* poškozený soubor → přepsat */ }
  }
  if (write && changed) fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
  return { skipped: false, changed, rows: a.rows, skippedRows: a.skipped, roky: a.roky, out };
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--rok') o.rok = parseInt(argv[++i], 10);
    else if (argv[i] === '--csv') o.csvPath = path.resolve(argv[++i]);
  }
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  transformPojistovnyCrp(parseArgs(process.argv.slice(2))).then((r) => {
    if (r.skipped) return;
    const o = r.out;
    console.log(`✓ transform_pojistovny_crp: ${r.rows} řádků (${r.skippedRows} přeskočeno), rok ${o.rok}, ČR ${o.cr.celkem} pojištěnců${r.changed ? '' : ' — beze změny'}.`);
    for (const z of o.pojistovny) console.log(`  ${z.kod}: ${z.celkem} · 65+ ${z.podil_65plus_pct} % · ø věk ~${z.prumerny_vek_odhad}`);
    console.log(`  → ${OUT_PATH}`);
  }).catch((e) => { console.error('✗ transform_pojistovny_crp:', e.message); process.exit(1); });
}
