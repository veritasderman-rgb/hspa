// Transform datových souhrnů NZIP — dohodovací řízení.
// Čte XLSX z ingest/cache/dohodovaci-rizeni/ a zapisuje strukturované
// extrakty do ingest/nzip-extracts/{OIS}.json (časové řady, headline).
// Builder (build-dohodovaci-rizeni.js) tyto extrakty skládá do kontraktu.
//
// Vlna 1: dimenze 2 — personální zabezpečení (OIS 11-12 … 11-16).
//
// Spuštění:  node ingest/transform_dohodovaci_rizeni.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSheet, findHeaderRow, num, txt } from './lib/xlsx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, 'ingest', 'cache', 'dohodovaci-rizeni');
const OUT = path.join(ROOT, 'ingest', 'nzip-extracts');

const YEARS_19_24 = [2019, 2020, 2021, 2022, 2023, 2024];

/* ---- OIS-11-13: kapacity / úvazky (FTE) — zároveň váhy pro 11-12 ---- */
function readUvazky() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-13.xlsx'), 'data');
  const h = findHeaderRow(rows, { mustContain: ['Kód DRZAR', 'Povolání', 'Odměňování'] });
  const body = rows.slice(h + 1);
  // sloupce: 0 DRZAR, 3 kategorie, 4 povolání, 11 odměňování, 12..17 = 2019..2024
  const weights = new Map(); // klíč DRZAR|kategorie|povolání|odměňování → úvazky 2024
  const byKategorieYear = new Map(); // kategorie → {year → součet úvazků}
  for (const r of body) {
    if (!r || r[0] == null) continue;
    const drzar = txt(r[0]);
    const kat = txt(r[3]);
    const pov = txt(r[4]);
    const odm = txt(r[11]);
    const u2024 = num(r[17]);
    if (u2024 != null) {
      // klíč bez kategorie — 11-12 a 11-13 používají odlišné názvy kategorií
      const key = `${drzar}|${pov}|${odm}`;
      weights.set(key, (weights.get(key) || 0) + u2024);
    }
    if (!byKategorieYear.has(kat)) byKategorieYear.set(kat, {});
    const acc = byKategorieYear.get(kat);
    YEARS_19_24.forEach((y, i) => {
      const v = num(r[12 + i]);
      if (v != null) acc[y] = (acc[y] || 0) + v;
    });
  }
  return { weights, byKategorieYear };
}

function transformOIS1113(byKategorieYear) {
  const cats = ['Lékaři', 'ZPBD - Sestry a porodní asistentky', 'Farmaceuti', 'Zubní lékaři'];
  const labels = {
    'Lékaři': 'Lékaři',
    'ZPBD - Sestry a porodní asistentky': 'Sestry a porodní asistentky',
    'Farmaceuti': 'Farmaceuti',
    'Zubní lékaři': 'Zubní lékaři',
  };
  const series = cats
    .filter((c) => byKategorieYear.has(c))
    .map((c) => ({
      key: c.split(' ')[0].toLowerCase(),
      label: labels[c],
      unit: 'úvazky (přepočtené)',
      points: YEARS_19_24.map((y) => ({ year: y, value: round(byKategorieYear.get(c)[y], 0) })).filter(
        (p) => p.value != null,
      ),
    }));
  const lekari = byKategorieYear.get('Lékaři') || {};
  return {
    ois_code: 'OIS-11-13',
    source_file: 'OIS-11-13.xlsx',
    extracted_at: new Date().toISOString(),
    headline: {
      value: round(lekari[2024], 0),
      unit: 'lékařských úvazků',
      year: 2024,
      label: 'Lékařské kapacity ČR (přepočtené úvazky)',
    },
    series,
  };
}

/* ---- OIS-11-12: odměňování — vážený národní průměr (váhy = úvazky 11-13) ---- */
function transformOIS1112(weights) {
  const rows = readSheet(path.join(CACHE, 'OIS-11-12.xlsx'), 'data');
  const h = findHeaderRow(rows, { mustContain: ['Kód DRZAR', 'Odměňování'] });
  const body = rows.slice(h + 1);
  // sloupce: 0 DRZAR, 3 kategorie, 4 povolání, 5 odměňování, 6..11 = 2019..2024
  const cats = [
    { cat: 'Lékaři', key: 'lekari', label: 'Lékaři' },
    { cat: 'ZPBD - Sestry a porodní asistentky', key: 'sestry', label: 'Sestry a porodní asistentky' },
    { cat: 'Farmaceuti', key: 'farmaceuti', label: 'Farmaceuti' },
  ];
  const series = [];
  let coverage = { matched: 0, total: 0 };
  for (const { cat, key, label } of cats) {
    const points = YEARS_19_24.map((y, yi) => {
      let wSum = 0;
      let wxSum = 0;
      for (const r of body) {
        if (!r || txt(r[3]) !== cat || txt(r[5]) !== 'Plat') continue;
        const wkey = `${txt(r[0])}|${txt(r[4])}|${txt(r[5])}`;
        const w = weights.get(wkey) || 0;
        const val = num(r[6 + yi]);
        if (val == null || w <= 0) continue;
        wSum += w;
        wxSum += val * w;
        if (yi === 5) {
          coverage.total++;
          coverage.matched++;
        }
      }
      return { year: y, value: wSum > 0 ? round(wxSum / wSum, 0) : null };
    }).filter((p) => p.value != null);
    series.push({ key, label, unit: 'Kč / měsíc (plat)', points });
  }
  const lekariLast = series.find((s) => s.key === 'lekari')?.points.slice(-1)[0];
  return {
    ois_code: 'OIS-11-12',
    source_file: 'OIS-11-12.xlsx',
    extracted_at: new Date().toISOString(),
    method_note:
      'Národní průměr vážený přepočtenými úvazky (zdroj vah: OIS 11-13, rok 2024). Pouze platová sféra (příspěvkové organizace).',
    headline: {
      value: lekariLast?.value ?? null,
      unit: 'Kč / měsíc',
      year: lekariLast?.year ?? 2024,
      label: 'Průměrný plat lékaře (vážený)',
    },
    series,
  };
}

/* ---- OIS-11-14 / 11-15: ISPV kontrolní data (mzdová / platová sféra) ---- */
function transformISPV(file, oisCode, kind) {
  // kind: 'mzda' | 'plat'
  const wantGroups = [
    { code: '2211', label: 'Praktičtí lékaři' },
    { code: '2212', label: 'Lékaři specialisté' },
    { code: '2221', label: 'Všeobecné sestry' },
  ];
  const periods = [
    { sheet: 0, label: '1. pol. 2024' },
    { sheet: 1, label: 'rok 2024' },
    { sheet: 2, label: '1. pol. 2025' },
  ];
  const series = wantGroups.map((g) => ({ key: g.code, label: g.label, unit: 'Kč / měsíc (medián)', points: [] }));
  let pravePraktici = null;
  for (const per of periods) {
    let rows;
    try {
      rows = readSheet(path.join(CACHE, file), per.sheet);
    } catch {
      continue;
    }
    const h = findHeaderRow(rows, { mustContain: ['podskupina zaměstnání'] });
    const body = rows.slice(h + 1);
    for (const r of body) {
      if (!r || r[0] == null) continue;
      const cell = txt(r[0]);
      const m = /^(\d{4})\s+(.+)/.exec(cell); // jen 4místné CZ-ISCO skupiny
      if (!m) continue;
      const grp = wantGroups.find((g) => g.code === m[1]);
      if (!grp) continue;
      const median = num(r[2]);
      const s = series.find((x) => x.key === grp.code);
      if (median != null) s.points.push({ period: per.label, value: round(median, 0) });
      if (grp.code === '2212' && per.sheet === 1) pravePraktici = median;
    }
  }
  const filled = series.filter((s) => s.points.length > 0);
  return {
    ois_code: oisCode,
    source_file: file,
    extracted_at: new Date().toISOString(),
    method_note: `ISPV — ${kind === 'plat' ? 'platová' : 'mzdová'} sféra; medián hrubého měsíčního ${
      kind === 'plat' ? 'platu' : 'mzdy'
    } dle CZ-ISCO skupin. Kontrolní (sekundární) datový zdroj.`,
    headline: {
      value: pravePraktici != null ? round(pravePraktici, 0) : filled[0]?.points.slice(-1)[0]?.value ?? null,
      unit: 'Kč / měsíc',
      year: 2024,
      label: `Medián ${kind === 'plat' ? 'platu' : 'mzdy'} — lékaři specialisté`,
    },
    series_periods: filled,
  };
}

/* ---- OIS-11-16: počty pracovníků dle věku a pohlaví (pyramida) ---- */
const AGE_BANDS = [
  'Do 29', '30–34', '35–39', '40–44', '45–49', '50–54',
  '55–59', '60–64', '65–69', '70–74', '75–79', '80 a více',
];

function transformOIS1116() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-16.xlsx'), 'Kraje');
  const h = findHeaderRow(rows, { minCells: 10, mustContain: ['Kraj', 'Celkem', 'Muži'] });
  // datový řádek: ČR / Celkem za všechny odbornosti / … / Celkem za všechny kategorie
  const body = rows.slice(h + 1);
  const total = body.find(
    (r) => r && txt(r[0]) === 'ČR' && txt(r[3]).startsWith('Celkem za všechny kategorie'),
  );
  const lekari = body.find((r) => r && txt(r[0]) === 'ČR' && txt(r[3]) === 'Lékaři');
  if (!total) throw new Error('OIS-11-16: nenalezen souhrnný řádek ČR');
  // sloupce: 5 Celkem, 6 Muži, 7 Ženy, 8 Neznámo, 9..21 celkem dle věku (13),
  // 22..34 muži dle věku, 35..47 ženy dle věku
  const muziBands = AGE_BANDS.map((label, i) => ({ band: label, value: num(total[22 + i]) || 0 }));
  const zenyBands = AGE_BANDS.map((label, i) => ({ band: label, value: num(total[35 + i]) || 0 }));
  const celkem = num(total[5]);
  const sum60plus =
    muziBands.slice(7).reduce((a, b) => a + b.value, 0) +
    zenyBands.slice(7).reduce((a, b) => a + b.value, 0);
  return {
    ois_code: 'OIS-11-16',
    source_file: 'OIS-11-16.xlsx',
    extracted_at: new Date().toISOString(),
    method_note: 'Fyzické osoby se smluvním zajištěním z veřejného zdravotního pojištění, ČR, list „Kraje".',
    headline: {
      value: round((sum60plus / celkem) * 100, 1),
      unit: '% pracovníků 60+',
      year: 2024,
      label: 'Podíl zdravotníků ve věku 60 a více let',
    },
    snapshot: {
      total: celkem,
      muzi: num(total[6]),
      zeny: num(total[7]),
      lekari_total: lekari ? num(lekari[5]) : null,
    },
    pyramid: { age_bands: AGE_BANDS, muzi: muziBands, zeny: zenyBands },
  };
}

function round(v, d) {
  if (v == null || !Number.isFinite(v)) return null;
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { weights, byKategorieYear } = readUvazky();

  const extracts = [
    transformOIS1112(weights),
    transformOIS1113(byKategorieYear),
    transformISPV('OIS-11-14.xlsx', 'OIS-11-14', 'mzda'),
    transformISPV('OIS-11-15.xlsx', 'OIS-11-15', 'plat'),
    transformOIS1116(),
  ];

  for (const ex of extracts) {
    const file = path.join(OUT, `${ex.ois_code}.json`);
    fs.writeFileSync(file, JSON.stringify(ex, null, 2) + '\n');
    const n = (ex.series || ex.series_periods || []).length;
    console.log(`  ✓ ${ex.ois_code} → headline ${ex.headline.value} ${ex.headline.unit}, ${n} řad`);
  }
  console.log(`transform dohodovací řízení: ${extracts.length} extraktů → ingest/nzip-extracts/`);
}

main();
