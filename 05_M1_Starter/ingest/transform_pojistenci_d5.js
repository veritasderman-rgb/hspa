// Transform CSV "Datovy-souhrn-OIS-11-47-zdravotni-pojistenci-struktura-2026-01.csv"
// (zdroj: ÚZIS · Centrální registr pojištěnců, NZIP Dohodovací řízení 2027,
// Dimenze 5: Struktura pojištěnců a náklady zdravotních pojišťoven)
// na 3 předagregované JSON kostky pro frontend dashboard pojistenci.html.
//
// Vstup: <repo-root>/Datovy-souhrn-OIS-11-47-zdravotni-pojistenci-struktura-2026-01.csv
//   sloupce: Rok; Kód ZP; Okres LAU; Název okresu; Věková kategorie; Pohlaví; Počet pojišťenců
//   řádků: ~278 984
//   roky: 2010–2025 (16 let)
//   zdravotní pojišťovny: 7 (kódy 111, 201, 205, 207, 209, 211, 213)
//   okresy: 77 (LAU 1, NUTS-3 = kraj jako prefix)
//   věkové kategorie: 19 (0 let → 85+ let)
//   pohlaví: M / Z
//
// Výstupy:
//   data/pojistenci-d5-kraj.json    (kraj × rok × age × sex; agregát ZP)
//   data/pojistenci-d5-zp.json      (kraj × rok × ZP; trh. podíly)
//   data/pojistenci-d5-okres.json   (okres × rok × age × sex; pro race + drill-down)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './lib/csv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const STARTER_ROOT = path.resolve(__dirname, '..');

const CSV_PATH = path.join(REPO_ROOT, 'Datovy-souhrn-OIS-11-47-zdravotni-pojistenci-struktura-2026-01.csv');
const MAPPING_PATH = path.join(__dirname, 'mapping', 'lau_to_nuts3.json');
const OUT_DIR = path.join(STARTER_ROOT, 'data');

const OUT_KRAJ = path.join(OUT_DIR, 'pojistenci-d5-kraj.json');
const OUT_ZP = path.join(OUT_DIR, 'pojistenci-d5-zp.json');
const OUT_OKRES = path.join(OUT_DIR, 'pojistenci-d5-okres.json');

/**
 * Normalizuje surový text věkové kategorie z CSV ("01–04 let") na klíč ("1-4").
 * Mapuje na předdefinovaný klíč v mapping souboru.
 */
function ageKeyFromRaw(raw, mapping) {
  for (const g of mapping.age_groups.groups) {
    if (g.raw === raw) return g.key;
  }
  throw new Error(`Neznámá věková kategorie: "${raw}"`);
}

/** Parsuje CSV počet ("4 288" → 4288). */
function parseCount(s) {
  if (s == null || s === '') return 0;
  const cleaned = String(s).replace(/\s+/g, '').replace(/ /g, '');
  const n = parseInt(cleaned, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Nelze parsovat počet pojištěnců: "${s}"`);
  }
  return n;
}

/**
 * Vypočítá medián věku z histogramu věkových kategorií.
 * @param {Map<string, number>} histogram klíč: ageKey, hodnota: počet
 * @param {Array} ageGroups z mapping.age_groups.groups
 */
function medianAge(histogram, ageGroups) {
  const total = [...histogram.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const half = total / 2;
  let cumul = 0;
  for (const g of ageGroups) {
    const count = histogram.get(g.key) || 0;
    if (cumul + count >= half) {
      // Lineární interpolace v rámci skupiny.
      const span = g.upper - g.lower + 1;
      const into = (half - cumul) / count;
      return Math.round((g.lower + into * span) * 10) / 10;
    }
    cumul += count;
  }
  return null;
}

/** Vypočítá metriky pro daný histogram věkových skupin (sečteno přes pohlaví). */
function computeMetrics(histogramBySex, ageGroups) {
  const histogram = new Map();
  for (const g of ageGroups) {
    const m = histogramBySex.get(`${g.key}:M`) || 0;
    const z = histogramBySex.get(`${g.key}:Z`) || 0;
    histogram.set(g.key, m + z);
  }
  const total = [...histogram.values()].reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { total: 0, pct_65plus: null, pct_80plus: null, median_age: null, dependency_old: null, dependency_young: null };
  }

  const sumGroups = (predicate) => ageGroups
    .filter(predicate)
    .reduce((sum, g) => sum + (histogram.get(g.key) || 0), 0);

  const n65plus = sumGroups((g) => g.lower >= 65);
  const n80plus = sumGroups((g) => g.lower >= 80);
  const n0_14 = sumGroups((g) => g.upper <= 14);
  const n15_64 = sumGroups((g) => g.lower >= 15 && g.upper <= 64);

  return {
    total,
    pct_65plus: round1(100 * n65plus / total),
    pct_80plus: round1(100 * n80plus / total),
    median_age: medianAge(histogram, ageGroups),
    dependency_old: n15_64 > 0 ? round1(100 * n65plus / n15_64) : null,
    dependency_young: n15_64 > 0 ? round1(100 * n0_14 / n15_64) : null,
  };
}

function round1(x) {
  return Math.round(x * 10) / 10;
}

export async function transformPojistenci({ writeFiles = true } = {}) {
  const mapping = JSON.parse(await fs.readFile(MAPPING_PATH, 'utf8'));
  const csvText = await fs.readFile(CSV_PATH, 'utf8');

  // CSV má 8 hlavičkových řádků a pak data. Najdeme začátek dat (řádek "Rok;...").
  const lines = csvText.split(/\r?\n/);
  let dataStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^Rok;/.test(lines[i])) { dataStart = i; break; }
  }
  const dataCsv = lines.slice(dataStart).join('\n');
  const records = parseCsv(dataCsv, { delimiter: ';' });

  // Inicializace agregačních map.
  const ageGroups = mapping.age_groups.groups;

  // Kostka 1: kraj × rok → { byAgeSex: Map, byZp: Map }
  const krajCube = new Map();
  // Kostka 2: kraj × rok × zp → count
  const zpCube = new Map();
  // Kostka 3: okres × rok → { byAgeSex: Map, kraj, name }
  const okresCube = new Map();

  let processedRows = 0;
  let skippedRows = 0;
  const unknownOkres = new Set();
  const yearsSeen = new Set();

  for (const row of records) {
    const year = parseInt(row['Rok'], 10);
    const zpCode = String(row['Kód zdravotní pojišťovny'] || '').trim();
    const lauCode = String(row['Okres LAU'] || '').trim();
    const ageRaw = String(row['Věková kategorie'] || '').trim();
    const sex = String(row['Pohlaví'] || '').trim();
    const count = parseCount(row['Počet pojišťenců']);

    if (!Number.isInteger(year) || !zpCode || !lauCode) { skippedRows++; continue; }
    if (!mapping.okresy[lauCode]) {
      unknownOkres.add(lauCode);
      skippedRows++;
      continue;
    }
    if (sex !== 'M' && sex !== 'Z') { skippedRows++; continue; }
    if (!mapping.insurers[zpCode]) { skippedRows++; continue; }

    yearsSeen.add(year);
    const ageKey = ageKeyFromRaw(ageRaw, mapping);
    const krajCode = mapping.okresy[lauCode].kraj;

    // Kraj × rok agregát.
    const krajKey = `${krajCode}|${year}`;
    if (!krajCube.has(krajKey)) krajCube.set(krajKey, { byAgeSex: new Map() });
    const krajEntry = krajCube.get(krajKey);
    const ageSexKey = `${ageKey}:${sex}`;
    krajEntry.byAgeSex.set(ageSexKey, (krajEntry.byAgeSex.get(ageSexKey) || 0) + count);

    // Kraj × rok × ZP.
    const zpKey = `${krajCode}|${year}|${zpCode}`;
    zpCube.set(zpKey, (zpCube.get(zpKey) || 0) + count);

    // Okres × rok agregát.
    const okresKey = `${lauCode}|${year}`;
    if (!okresCube.has(okresKey)) {
      okresCube.set(okresKey, {
        byAgeSex: new Map(),
        kraj: krajCode,
        name: mapping.okresy[lauCode].name,
      });
    }
    const okresEntry = okresCube.get(okresKey);
    okresEntry.byAgeSex.set(ageSexKey, (okresEntry.byAgeSex.get(ageSexKey) || 0) + count);

    processedRows++;
  }

  if (unknownOkres.size > 0) {
    throw new Error(`Neznámé LAU kódy okresů (chybí v mapping): ${[...unknownOkres].join(', ')}`);
  }

  // Sestavení výstupních objektů.
  const years = [...yearsSeen].sort((a, b) => a - b);
  const krajs = Object.entries(mapping.krajs).map(([code, info]) => ({
    code, name: info.name, shortLabel: info.shortLabel,
  }));
  const insurers = Object.entries(mapping.insurers).map(([code, info]) => ({
    code, name: info.name, fullName: info.fullName,
  }));
  const ageGroupsOut = ageGroups.map((g) => ({
    key: g.key, label: g.label, lower: g.lower, upper: g.upper, midpoint: g.midpoint,
  }));

  const sourceMeta = {
    name: 'ÚZIS · Centrální registr pojištěnců (CRP)',
    dataset: 'OIS 11.47 — Struktura pojištěnců',
    publisher: 'Ústav zdravotnických informací a statistiky ČR',
    portal_url: 'https://www.nzip.cz/dohodovaci-rizeni',
    csv_filename: 'Datovy-souhrn-OIS-11-47-zdravotni-pojistenci-struktura-2026-01.csv',
    licence: 'CC-BY 4.0 (předpoklad podle podmínek NZIP)',
    project: 'CZ.03.02.02/00/22_046/0002180',
  };

  // Výstup 1: kraj × rok × age × sex + odvozené metriky.
  const krajOut = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    source: sourceMeta,
    years,
    krajs,
    age_groups: ageGroupsOut,
    sexes: ['M', 'Z'],
    data: {},
    rows_processed: processedRows,
    rows_skipped: skippedRows,
  };
  for (const kraj of krajs) {
    krajOut.data[kraj.code] = {};
    for (const year of years) {
      const entry = krajCube.get(`${kraj.code}|${year}`);
      if (!entry) continue;
      const byAgeSex = Object.fromEntries(entry.byAgeSex);
      const metrics = computeMetrics(entry.byAgeSex, ageGroups);
      krajOut.data[kraj.code][year] = { byAgeSex, ...metrics };
    }
  }

  // Výstup 2: kraj × rok × ZP (počty + tržní podíly).
  const zpOut = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    source: sourceMeta,
    years,
    krajs,
    insurers,
    data: {},
  };
  for (const kraj of krajs) {
    zpOut.data[kraj.code] = {};
    for (const year of years) {
      const counts = {};
      let total = 0;
      for (const ins of insurers) {
        const c = zpCube.get(`${kraj.code}|${year}|${ins.code}`) || 0;
        counts[ins.code] = c;
        total += c;
      }
      const shares = {};
      for (const ins of insurers) {
        shares[ins.code] = total > 0 ? round1(100 * counts[ins.code] / total) : null;
      }
      zpOut.data[kraj.code][year] = { counts, shares, total };
    }
  }

  // Výstup 3: okres × rok × age × sex + odvozené metriky.
  const okresOut = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    source: sourceMeta,
    years,
    age_groups: ageGroupsOut,
    sexes: ['M', 'Z'],
    okresy: Object.entries(mapping.okresy).map(([code, info]) => ({
      code, name: info.name, kraj: info.kraj,
    })),
    data: {},
  };
  for (const [code, info] of Object.entries(mapping.okresy)) {
    okresOut.data[code] = {};
    for (const year of years) {
      const entry = okresCube.get(`${code}|${year}`);
      if (!entry) continue;
      const byAgeSex = Object.fromEntries(entry.byAgeSex);
      const metrics = computeMetrics(entry.byAgeSex, ageGroups);
      okresOut.data[code][year] = { byAgeSex, ...metrics };
    }
  }

  if (writeFiles) {
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(OUT_KRAJ, JSON.stringify(krajOut, null, 2) + '\n', 'utf8');
    await fs.writeFile(OUT_ZP, JSON.stringify(zpOut, null, 2) + '\n', 'utf8');
    await fs.writeFile(OUT_OKRES, JSON.stringify(okresOut, null, 2) + '\n', 'utf8');
  }

  return {
    rows_processed: processedRows,
    rows_skipped: skippedRows,
    years_count: years.length,
    krajs_count: krajs.length,
    okres_count: okresCube.size,
    kraj: krajOut,
    zp: zpOut,
    okres: okresOut,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  transformPojistenci().then((res) => {
    console.log(`✓ Zpracováno ${res.rows_processed} řádků (${res.rows_skipped} přeskočeno).`);
    console.log(`  Roky: ${res.years_count}, kraje: ${res.krajs_count}, okres-rok záznamů: ${res.okres_count}.`);
    console.log(`  → ${OUT_KRAJ}`);
    console.log(`  → ${OUT_ZP}`);
    console.log(`  → ${OUT_OKRES}`);
  }).catch((err) => {
    console.error('✗ Transform selhal:', err.message);
    process.exit(1);
  });
}
