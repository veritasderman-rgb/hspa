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

/* ================= DIMENZE 6 — LŮŽKOVÁ PÉČE ================= */

/* ---- OIS-11-17: nákladová struktura poskytovatelů lůžkové péče ---- */
function transformOIS1117() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-17.xlsx'), 'data');
  const h = findHeaderRow(rows, { mustContain: ['Kód DRZAR', 'ROK'] });
  const body = rows.slice(h + 1);
  // 2 ROK, 4 spotřeba materiálu, 5 léky, 6 centrové léky, 12 osobní náklady
  const cats = [
    { col: 12, key: 'osobni', label: 'Osobní náklady' },
    { col: 5, key: 'leky', label: 'Léky (bez centrových)' },
    { col: 6, key: 'centrove', label: 'Centrové léky' },
    { col: 4, key: 'material', label: 'Spotřeba materiálu' },
  ];
  const byYear = new Map();
  for (const r of body) {
    if (!r || r[2] == null) continue;
    const rok = num(r[2]);
    if (!rok) continue;
    if (!byYear.has(rok)) byYear.set(rok, {});
    const acc = byYear.get(rok);
    for (const c of cats) {
      const v = num(r[c.col]);
      if (v != null) acc[c.col] = (acc[c.col] || 0) + v;
    }
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const series = cats.map((c) => ({
    key: c.key,
    label: c.label,
    unit: 'mld. Kč',
    points: years.map((y) => ({ year: y, value: round((byYear.get(y)[c.col] || 0) / 1e6, 2) })),
  }));
  const osobniLast = series[0].points.slice(-1)[0];
  return {
    ois_code: 'OIS-11-17',
    source_file: 'OIS-11-17.xlsx',
    extracted_at: new Date().toISOString(),
    method_note:
      'Součet nákladů všech poskytovatelů lůžkové péče dle ročních výkazů, hodnoty převedeny z tis. Kč na mld. Kč.',
    headline: {
      value: osobniLast?.value ?? null,
      unit: 'mld. Kč',
      year: osobniLast?.year ?? null,
      label: 'Osobní náklady lůžkové péče',
    },
    series,
  };
}

/* ---- OIS-11-27: produkce následné a dlouhodobé péče (ošetřovací dny) ---- */
function transformOIS1127() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-27.xlsx'), 'ošetřovací dny');
  const h = findHeaderRow(rows, { mustContain: ['PZS IČO', 'oš.dnů'] });
  const body = rows.slice(h + 1);
  const years = YEARS_19_24;
  const byObor = new Map();
  const totals = years.map(() => 0);
  for (const r of body) {
    if (!r || r[0] == null) continue;
    const obor = txt(r[8]) || 'neuvedeno';
    if (!byObor.has(obor)) byObor.set(obor, years.map(() => 0));
    const acc = byObor.get(obor);
    years.forEach((y, i) => {
      const v = num(r[10 + i]);
      if (v != null) {
        acc[i] += v;
        totals[i] += v;
      }
    });
  }
  const top = [...byObor.entries()].sort((a, b) => b[1][5] - a[1][5]).slice(0, 4);
  const series = [
    { key: 'celkem', label: 'Celkem ČR', unit: 'ošetřovací dny', points: years.map((y, i) => ({ year: y, value: totals[i] })) },
    ...top.map(([obor, vals], i) => ({
      key: 'obor' + i,
      label: obor.charAt(0).toUpperCase() + obor.slice(1),
      unit: 'ošetřovací dny',
      points: years.map((y, j) => ({ year: y, value: vals[j] })),
    })),
  ];
  return {
    ois_code: 'OIS-11-27',
    source_file: 'OIS-11-27.xlsx',
    extracted_at: new Date().toISOString(),
    method_note: 'Součet ošetřovacích dnů následné a dlouhodobé lůžkové péče za ČR a top 4 obory pracoviště.',
    headline: {
      value: totals[5],
      unit: 'ošetřovacích dnů',
      year: 2024,
      label: 'Produkce následné a dlouhodobé péče',
    },
    series,
  };
}

/* ---- OIS-11-40: produkce v lázních a ozdravovnách ---- */
function transformOIS1140() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-40.xlsx'), 'data');
  const h = findHeaderRow(rows, { mustContain: ['PZS IČO'] });
  const body = rows.slice(h + 1);
  const years = [2019, 2020, 2021, 2022];
  const pat = years.map(() => 0);
  const leceni = years.map(() => 0);
  for (const r of body) {
    if (!r || r[0] == null) continue;
    const druh = txt(r[8]);
    const nazev = txt(r[9]);
    years.forEach((y, i) => {
      const v = num(r[10 + i]) || 0;
      if (druh === 'Unikátní pacienti') pat[i] += v;
      if (nazev.includes('za léčení')) leceni[i] += v;
    });
  }
  return {
    ois_code: 'OIS-11-40',
    source_file: 'OIS-11-40.xlsx',
    extracted_at: new Date().toISOString(),
    method_note: 'Unikátní pacienti a ošetřovací dny (položka „za léčení") lázeňské a ozdravné péče, ČR.',
    headline: {
      value: pat[3],
      unit: 'unikátních pacientů',
      year: 2022,
      label: 'Pacienti lázeňské a ozdravné péče',
    },
    series: [
      { key: 'pacienti', label: 'Unikátní pacienti', unit: 'osoby', points: years.map((y, i) => ({ year: y, value: pat[i] })) },
      { key: 'leceni', label: 'Ošetřovací dny (léčení)', unit: 'dny', points: years.map((y, i) => ({ year: y, value: leceni[i] })) },
    ],
  };
}

/* ---- OIS-11-37: nákladovost DRG skupin ---- */
function transformOIS1137() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-37.xlsx'), 'Nákladovost DRG skupin');
  const h = findHeaderRow(rows, { mustContain: ['Kód DRG'] });
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
  // 0 kód, 1 název, 2 HP ČR, 4 náklady na případ (průměr)
  let totHP = 0;
  const items = [];
  for (const r of body) {
    const hp = num(r[2]) || 0;
    const avg = num(r[4]) || 0;
    totHP += hp;
    items.push({ name: txt(r[1]), value: Math.round((avg * hp) / 1e6) }); // mil. Kč
  }
  items.sort((a, b) => b.value - a.value);
  return {
    ois_code: 'OIS-11-37',
    source_file: 'OIS-11-37.xlsx',
    extracted_at: new Date().toISOString(),
    method_note:
      'Nákladová zátěž = průměrné náklady na hospitalizační případ × počet případů ČR (mil. Kč). Zdroj nákladů: referenční nemocnice.',
    headline: {
      value: totHP,
      unit: 'hospitalizačních případů',
      year: null,
      label: 'Hospitalizační případy v DRG analýze',
    },
    ranked: {
      label: 'Top 12 DRG skupin dle celkové nákladové zátěže',
      unit: 'mil. Kč',
      items: items.slice(0, 12),
    },
  };
}

/* ---- OIS-11-51: centralizace DRG skupin ---- */
function transformOIS1151() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-51.xlsx'), 'Sheet1');
  const h = findHeaderRow(rows, { mustContain: ['DRG skupina'] });
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
  // 2 centralizace ano/ne, 4 HP celkem, 6 HP v CVSP, 8 HP mimo CVSP
  let hpAno = 0;
  let hpIn = 0;
  const items = [];
  for (const r of body) {
    if (txt(r[2]).toLowerCase() !== 'ano') continue;
    hpAno += num(r[4]) || 0;
    hpIn += num(r[6]) || 0;
    items.push({ name: txt(r[1]), value: num(r[8]) || 0 });
  }
  items.sort((a, b) => b.value - a.value);
  return {
    ois_code: 'OIS-11-51',
    source_file: 'OIS-11-51.xlsx',
    extracted_at: new Date().toISOString(),
    method_note:
      'Pouze DRG skupiny určené k centralizaci dle úhradové vyhlášky. Centralizace = podíl hospitalizačních případů v centrech vysoce specializované péče (CVSP).',
    headline: {
      value: round((hpIn / hpAno) * 100, 1),
      unit: '% případů v centrech',
      year: null,
      label: 'Centralizace péče určené k soustředění',
    },
    ranked: {
      label: 'Top 12 určených DRG dle počtu případů mimo centra',
      unit: 'hospitalizačních případů',
      items: items.slice(0, 12),
    },
  };
}

/* generický žebříček: součet hodnoty (valIdx) podle názvu (nameIdx) */
function rankedBy(body, nameIdx, valIdx, topN = 12) {
  const m = new Map();
  for (const r of body) {
    if (!r) continue;
    const name = txt(r[nameIdx]);
    const v = num(r[valIdx]);
    if (!name || v == null) continue;
    m.set(name, (m.get(name) || 0) + v);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

function sumCol(body, idx) {
  let s = 0;
  for (const r of body) {
    if (!r) continue;
    const v = num(r[idx]);
    if (v != null) s += v;
  }
  return s;
}

const STAMP = () => new Date().toISOString();

/* ---- OIS-11-25: počty hospitalizačních případů akutní lůžkové péče ---- */
function transformOIS1125() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-25.xlsx'), 'CZ-DRG 6.0');
  const h = findHeaderRow(rows, { mustContain: ['IČZ', 'Počet HP'] });
  const body = rows.slice(h + 2).filter((r) => r && r[3] != null);
  const totHP = sumCol(body, 5);
  return {
    ois_code: 'OIS-11-25',
    source_file: 'OIS-11-25.xlsx',
    extracted_at: STAMP(),
    method_note: 'Hospitalizační případy akutní lůžkové péče dle CZ-DRG, rok 2024 (NRHZS).',
    headline: { value: totHP, unit: 'hospitalizačních případů', year: 2024, label: 'Akutní hospitalizace ČR' },
    ranked: { label: 'Top 12 DRG skupin dle počtu hospitalizací', unit: 'hospitalizačních případů', items: rankedBy(body, 4, 5) },
  };
}

/* ---- OIS-11-28: lůžkový fond akutní, následné a dlouhodobé péče ---- */
function transformOIS1128() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-28.xlsx'), 'Data');
  const h = findHeaderRow(rows, { minCells: 10, mustContain: ['Rok', 'Kód odbornosti'] });
  const body = rows.slice(h + 3).filter((r) => r && r[0] != null);
  const byYear = new Map();
  for (const r of body) {
    const rok = num(r[0]);
    if (!rok) continue;
    if (!byYear.has(rok)) byYear.set(rok, { ak: 0, na: 0 });
    const acc = byYear.get(rok);
    acc.ak += num(r[12]) || 0; // Akutní celkem
    acc.na += num(r[15]) || 0; // Následná a dlouhodobá celkem
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const last = years[years.length - 1];
  return {
    ois_code: 'OIS-11-28',
    source_file: 'OIS-11-28.xlsx',
    extracted_at: STAMP(),
    method_note: 'Součet nasmlouvaných lůžek akutní a následné/dlouhodobé péče, ČR (NRHZS).',
    headline: {
      value: Math.round((byYear.get(last).ak + byYear.get(last).na)),
      unit: 'lůžek',
      year: last,
      label: 'Lůžkový fond ČR',
    },
    series: [
      { key: 'akutni', label: 'Akutní lůžka', unit: 'lůžka', points: years.map((y) => ({ year: y, value: Math.round(byYear.get(y).ak) })) },
      { key: 'nasledna', label: 'Následná a dlouhodobá lůžka', unit: 'lůžka', points: years.map((y) => ({ year: y, value: Math.round(byYear.get(y).na) })) },
    ],
  };
}

/* ---- OIS-11-38: data o urgentních příjmech ---- */
function transformOIS1138() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-38.xlsx'), 'Data');
  const h = findHeaderRow(rows, { mustContain: ['IČO', 'urgentního příjmu'] });
  const body = rows.slice(h + 2).filter((r) => r && r[3] != null);
  return {
    ois_code: 'OIS-11-38',
    source_file: 'OIS-11-38.xlsx',
    extracted_at: STAMP(),
    method_note: 'Výkony 09564 (péče spojená s převzetím pacienta od ZZS) vykázané na urgentních příjmech, celé IČZ.',
    headline: { value: Math.round(sumCol(body, 8)), unit: 'výkonů převzetí od ZZS', year: 2024, label: 'Převzetí pacientů od ZZS' },
    ranked: { label: 'Top 12 pracovišť dle převzetí pacientů od ZZS', unit: 'výkonů', items: rankedBy(body, 3, 8) },
  };
}

/* ---- OIS-11-39: data o referenční síti ---- */
function transformOIS1139() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-39.xlsx'), 'Data o referenční síti');
  const h = findHeaderRow(rows, { mustContain: ['Kód DRG'] });
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
  const hpCR = sumCol(body, 2);
  const hpRN = sumCol(body, 3);
  return {
    ois_code: 'OIS-11-39',
    source_file: 'OIS-11-39.xlsx',
    extracted_at: STAMP(),
    method_note: 'Pokrytí hospitalizačních případů referenčními nemocnicemi (RN) jako podíl z celkového počtu HP ČR.',
    headline: { value: round((hpRN / hpCR) * 100, 1), unit: '% případů v referenční síti', year: 2024, label: 'Pokrytí referenční sítí' },
    ranked: { label: 'Top 12 DRG skupin dle počtu hospitalizací ČR', unit: 'hospitalizačních případů', items: rankedBy(body, 1, 2) },
  };
}

/* ---- OIS-11-45: data o centralizaci péče ---- */
function transformOIS1145() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-45.xlsx'), 'Data o centralizaci péče');
  const h = findHeaderRow(rows, { mustContain: ['Kód DRG'] });
  const body = rows.slice(h + 2).filter((r) => r && r[0] != null);
  return {
    ois_code: 'OIS-11-45',
    source_file: 'OIS-11-45.xlsx',
    extracted_at: STAMP(),
    method_note: 'Hospitalizační případy ve skupinách sledovaných z hlediska centralizace do center vysoce specializované péče.',
    headline: { value: Math.round(sumCol(body, 2)), unit: 'hospitalizačních případů', year: 2024, label: 'Případy sledované pro centralizaci' },
    ranked: { label: 'Top 12 DRG skupin dle počtu hospitalizací', unit: 'hospitalizačních případů', items: rankedBy(body, 1, 2) },
  };
}

/* ---- OIS-11-46: délka hospitalizace (LOS) dle DRG ---- */
function transformOIS1146() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-46.xlsx'), 'LOS dle DRG skupin');
  const h = findHeaderRow(rows, { mustContain: ['DRG skupina', 'ALOS'] });
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
  const buckets = ['1 den', '2 dny', '3 dny', '4 dny', '5 dní', '6 dní', '7–13 dní', '14+ dní'];
  const sums = buckets.map((_, i) => sumCol(body, 5 + i));
  let alosW = 0;
  let hpAll = 0;
  for (const r of body) {
    const alos = num(r[3]);
    const hp = num(r[4]);
    if (alos != null && hp != null) {
      alosW += alos * hp;
      hpAll += hp;
    }
  }
  return {
    ois_code: 'OIS-11-46',
    source_file: 'OIS-11-46.xlsx',
    extracted_at: STAMP(),
    method_note: 'Rozložení hospitalizačních případů podle délky pobytu; průměrná délka (ALOS) vážená počtem případů.',
    headline: { value: round(alosW / hpAll, 1), unit: 'dní (průměrná délka)', year: 2024, label: 'Průměrná délka hospitalizace' },
    ranked: {
      label: 'Rozložení hospitalizací podle délky pobytu',
      unit: 'hospitalizačních případů',
      items: buckets.map((b, i) => ({ name: b, value: Math.round(sums[i]) })),
    },
  };
}

/* ---- OIS-11-48: hodnocení pracovišť intenzivní péče ---- */
function transformOIS1148() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-48.xlsx'), 'hodnocení');
  const h = findHeaderRow(rows, { mustContain: ['IČZ', 'Obor'] });
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null && num(r[20]) != null);
  return {
    ois_code: 'OIS-11-48',
    source_file: 'OIS-11-48.xlsx',
    extracted_at: STAMP(),
    method_note: 'Nasmlouvaná lůžka intenzivní péče dle oboru pracoviště, rok 2024.',
    headline: { value: Math.round(sumCol(body, 20)), unit: 'intenzivních lůžek', year: 2024, label: 'Nasmlouvaná lůžka intenzivní péče' },
    ranked: { label: 'Top 12 oborů dle nasmlouvaných intenzivních lůžek', unit: 'lůžka', items: rankedBy(body, 4, 20) },
  };
}

/* ---- OIS-11-49: sumarizace produkce akutní lůžkové péče ---- */
function transformOIS1149() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-49.xlsx'), 'rok 2024');
  const h = findHeaderRow(rows, { minCells: 8, mustContain: ['Kraj', 'IČO', 'Zřizovatel'] });
  const body = rows.slice(h + 1).filter((r) => r && r[3] != null);
  return {
    ois_code: 'OIS-11-49',
    source_file: 'OIS-11-49.xlsx',
    extracted_at: STAMP(),
    method_note: 'Nasmlouvaná lůžka intenzivní péče (ARO) poskytovatelů akutní lůžkové péče, rok 2024.',
    headline: { value: Math.round(sumCol(body, 10)), unit: 'lůžek ARO', year: 2024, label: 'Lůžka resuscitační a intenzivní péče' },
    ranked: { label: 'Top 12 krajů dle lůžek intenzivní péče', unit: 'lůžka ARO', items: rankedBy(body, 1, 10) },
  };
}

/* ---- OIS-11-50: komplexní výstup poskytovatelů akutní lůžkové péče ---- */
function transformOIS1150() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-50.xlsx'), '2024');
  const h = findHeaderRow(rows, { minCells: 8, mustContain: ['IČO', 'Kraj', 'Zřizovatel'] });
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null && num(r[12]) != null);
  const totNakladyTis = sumCol(body, 12);
  return {
    ois_code: 'OIS-11-50',
    source_file: 'OIS-11-50.xlsx',
    extracted_at: STAMP(),
    method_note: 'Celkové náklady poskytovatelů akutní lůžkové péče dle výkazu E 6-02, převedeno z tis. Kč na mld. Kč.',
    headline: { value: round(totNakladyTis / 1e6, 1), unit: 'mld. Kč', year: 2024, label: 'Celkové náklady akutní lůžkové péče' },
    ranked: {
      label: 'Náklady akutní lůžkové péče dle kraje',
      unit: 'mld. Kč',
      items: rankedBy(body, 4, 12).map((it) => ({ name: it.name, value: round(it.value / 1e6, 2) })),
    },
  };
}

/* indexy sloupců, jejichž hlavička obsahuje všechna klíčová slova */
function colsMatching(headerRow, keywords) {
  const idx = [];
  (headerRow || []).forEach((c, i) => {
    const t = txt(c);
    if (t && keywords.every((k) => t.includes(k))) idx.push(i);
  });
  return idx;
}
function sumCols(body, indices) {
  let s = 0;
  for (const r of body) {
    if (!r) continue;
    for (const i of indices) {
      const v = num(r[i]);
      if (v != null) s += v;
    }
  }
  return s;
}
function findRowWith(rows, substr) {
  return rows.findIndex((r) => r && r.some((c) => txt(c).includes(substr)));
}
const ZP_NAMES = {
  111: 'VZP', 201: 'VoZP', 205: 'ČPZP', 207: 'OZP', 209: 'ZPŠ', 211: 'ZPMV', 213: 'RBP',
};

/* žebříček: součet rowTotal (všechny číselné buňky od fromCol) podle názvu */
function rankedRowTotal(body, nameIdx, fromCol, topN = 12) {
  const m = new Map();
  let grand = 0;
  for (const r of body) {
    if (!r) continue;
    const name = txt(r[nameIdx]);
    if (!name) continue;
    let t = 0;
    for (let i = fromCol; i < r.length; i++) {
      const v = num(r[i]);
      if (v != null) t += v;
    }
    m.set(name, (m.get(name) || 0) + t);
    grand += t;
  }
  const items = [...m.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
  return { items: items.slice(0, topN), grand: Math.round(grand) };
}

/* ================= DIMENZE 1 — CENY A OBJEMY ================= */
function transformOIS1106() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-06.xlsx'), 'Rok 2022-2024 ATC');
  const h = findRowWith(rows, 'Počet pacientoměsíců 2024');
  const hr = rows[h];
  const body = rows.slice(h + 1).filter((r) => r && r[2] != null);
  const series = [2022, 2023, 2024].map((y) => ({
    year: y,
    value: Math.round(sumCols(body, colsMatching(hr, ['pacientoměsíců', String(y)]))),
  }));
  return {
    ois_code: 'OIS-11-06', source_file: 'OIS-11-06.xlsx', extracted_at: STAMP(),
    method_note: 'Pacientoměsíce léčby centrovými léky, součet napříč ATC skupinami a zdravotními pojišťovnami.',
    headline: { value: series[2].value, unit: 'pacientoměsíců', year: 2024, label: 'Léčba centrovými léky' },
    series: [{ key: 'pm', label: 'Pacientoměsíce centrové léčby', unit: 'pacientoměsíce', points: series }],
  };
}
function transformOIS1107() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-07.xlsx'), 'Genove_terapie');
  const h = findRowWith(rows, 'Náklady na úrovni maximální stanovené ceny');
  const hr = rows[h];
  const totalRow = rows.slice(h + 1).find((r) => r && txt(r[0]).includes('Všechna ATC'));
  if (!totalRow) throw new Error('11-07: souhrnný řádek nenalezen');
  const series = [2022, 2023, 2024].map((y) => {
    const idx = colsMatching(hr, ['Náklady', String(y)]);
    let v = 0;
    for (const i of idx) v += num(totalRow[i]) || 0;
    return { year: y, value: round(v / 1e6, 1) };
  });
  return {
    ois_code: 'OIS-11-07', source_file: 'OIS-11-07.xlsx', extracted_at: STAMP(),
    method_note: 'Náklady na genové a personalizované kurativní terapie na úrovni maximální stanovené ceny, mil. Kč.',
    headline: { value: series[2].value, unit: 'mil. Kč', year: 2024, label: 'Náklady na genové terapie' },
    series: [{ key: 'nakl', label: 'Náklady na genové terapie', unit: 'mil. Kč', points: series }],
  };
}
/* rozsah bloku [start,end) v řádku se štítky, jehož štítek obsahuje keyword */
function findBlockRange(blockRow, keyword) {
  const starts = [];
  (blockRow || []).forEach((c, i) => {
    if (i >= 2 && txt(c)) starts.push(i);
  });
  for (let k = 0; k < starts.length; k++) {
    if (txt(blockRow[starts[k]]).toLowerCase().includes(keyword)) {
      return [starts[k], k + 1 < starts.length ? starts[k + 1] : (blockRow.length || 999)];
    }
  }
  return null;
}

/* OIS-11-08: PZT — zvlášť účtovaný materiál; úhrada = sloupec „celkem" 3. bloku */
function transformOIS1108() {
  const series = [];
  const m = new Map();
  for (const [sheet, year] of [['Rok 2023', 2023], ['Rok 2024', 2024]]) {
    let rows;
    try { rows = readSheet(path.join(CACHE, 'OIS-11-08.xlsx'), sheet); } catch { continue; }
    const h = findHeaderRow(rows, { mustContain: ['Typ PZT'] });
    const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
    series.push({ year, value: round(sumCol(body, 10) / 1e9, 1) });
    if (year === 2024) for (const r of body) {
      const n = txt(r[1]);
      if (n) m.set(n, (m.get(n) || 0) + (num(r[10]) || 0));
    }
  }
  const items = [...m.entries()].map(([name, v]) => ({ name, value: round(v / 1e6, 1) })).sort((a, b) => b.value - a.value);
  return {
    ois_code: 'OIS-11-08', source_file: 'OIS-11-08.xlsx', extracted_at: STAMP(),
    method_note: 'Úhrada za prostředky zdravotnické techniky (zvlášť účtovaný materiál), mld. Kč.',
    headline: { value: series[series.length - 1]?.value ?? null, unit: 'mld. Kč', year: 2024, label: 'Úhrady za zdravotnický materiál' },
    ranked: { label: 'Top 12 typů zdravotnického materiálu dle úhrad', unit: 'mil. Kč', items: items.slice(0, 12) },
  };
}

/* OIS-11-10/11/35: léčiva a PZT — sečte blok „Úhrada od zdravotních pojišťoven" */
function transformBlockUhrada(file, sheet, oisCode, label) {
  const rows = readSheet(path.join(CACHE, file), sheet);
  const blkIdx = findRowWith(rows, 'Úhrada');
  if (blkIdx < 0) throw new Error(file + ': blok úhrad nenalezen');
  const range = findBlockRange(rows[blkIdx], 'úhrada');
  if (!range) throw new Error(file + ': rozsah úhrad nenalezen');
  const body = rows.slice(blkIdx + 2).filter((r) => r && r[0] != null);
  const idx = [];
  for (let i = range[0]; i < range[1]; i++) idx.push(i);
  const m = new Map();
  let grand = 0;
  for (const r of body) {
    const name = txt(r[1]);
    let t = 0;
    for (const i of idx) {
      const v = num(r[i]);
      if (v != null) t += v;
    }
    if (name) m.set(name, (m.get(name) || 0) + t);
    grand += t;
  }
  const items = [...m.entries()].map(([name, v]) => ({ name, value: round(v / 1e6, 1) })).sort((a, b) => b.value - a.value);
  return {
    ois_code: oisCode, source_file: file, extracted_at: STAMP(),
    method_note: 'Úhrada zdravotních pojišťoven, součet napříč segmenty péče.',
    headline: { value: round(grand / 1e9, 1), unit: 'mld. Kč', year: 2024, label },
    ranked: { label: 'Top 12 skupin dle úhrad zdravotních pojišťoven', unit: 'mil. Kč', items: items.slice(0, 12) },
  };
}
function transformOIS1136() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-36.xlsx'), 'HVLP na recept');
  const h = findHeaderRow(rows, { mustContain: ['Předepisující obor'] });
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
  const m = new Map();
  let grand = 0;
  for (const r of body) {
    const obor = txt(r[2]);
    const v = num(r[5]) || 0;
    if (obor) m.set(obor, (m.get(obor) || 0) + v);
    grand += v;
  }
  const items = [...m.entries()].map(([name, v]) => ({ name, value: round(v / 1e6, 1) })).sort((a, b) => b.value - a.value);
  return {
    ois_code: 'OIS-11-36', source_file: 'OIS-11-36.xlsx', extracted_at: STAMP(),
    method_note: 'Úhrada zdravotních pojišťoven za léčiva na recept (HVLP) dle předepisujícího oboru, mil. Kč.',
    headline: { value: round(grand / 1e9, 1), unit: 'mld. Kč', year: 2024, label: 'Úhrady za léky na recept (HVLP)' },
    ranked: { label: 'Top 12 předepisujících oborů dle úhrad za léky', unit: 'mil. Kč', items: items.slice(0, 12) },
  };
}
function transformOIS1105() {
  const series = [];
  for (const [sheet, year] of [['VÝSTUP 2019', 2019], ['VÝSTUP 2022', 2022], ['VÝSTUP 2023', 2023], ['VÝSTUP 2024', 2024]]) {
    let rows;
    try { rows = readSheet(path.join(CACHE, file_v(sheet)), sheet); } catch { continue; }
    const vals = [];
    for (const r of rows) {
      if (!r) continue;
      for (let i = 4; i < r.length; i++) {
        const v = num(r[i]);
        if (v != null && v > 5000 && v < 300000) vals.push(v);
      }
    }
    if (vals.length) series.push({ year, value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) });
  }
  return {
    ois_code: 'OIS-11-05', source_file: 'OIS-11-05.xlsx', extracted_at: STAMP(),
    method_note: 'Průměr základních sazeb poskytovatelů akutní lůžkové péče napříč pojišťovnami.',
    headline: { value: series[series.length - 1]?.value ?? null, unit: 'Kč (průměrná sazba)', year: 2024, label: 'Základní sazba akutní lůžkové péče' },
    series: [{ key: 'sazba', label: 'Průměrná základní sazba', unit: 'Kč', points: series }],
  };
}
function file_v() { return 'OIS-11-05.xlsx'; }

/* ================= DIMENZE 3 — NELŮŽKOVÁ PÉČE ================= */
function transformOIS1118() {
  const series = [];
  let rankedItems = [];
  for (const [sheet, year] of [['2023', 2023], ['2024', 2024]]) {
    let rows;
    try { rows = readSheet(path.join(CACHE, 'OIS-11-18.xlsx'), sheet); } catch { continue; }
    const h = findHeaderRow(rows, { mustContain: ['Kód výkonu', 'Suma'] });
    const body = rows.slice(h + 1).filter((r) => r && r[2] != null);
    const kc = colsMatching(rows[h], ['Suma', 'Kč']);
    series.push({ year, value: round(sumCols(body, kc) / 1e9, 1) });
    if (year === 2024) {
      const m = new Map();
      for (const r of body) {
        const obor = txt(r[1]);
        const v = kc.reduce((s, i) => s + (num(r[i]) || 0), 0);
        if (obor) m.set(obor, (m.get(obor) || 0) + v);
      }
      rankedItems = [...m.entries()].map(([name, v]) => ({ name, value: round(v / 1e6, 1) })).sort((a, b) => b.value - a.value).slice(0, 12);
    }
  }
  return {
    ois_code: 'OIS-11-18', source_file: 'OIS-11-18.xlsx', extracted_at: STAMP(),
    method_note: 'Úhrada ambulantní péče (Suma Kč) dle oboru vykazujícího péči.',
    headline: { value: series[series.length - 1]?.value ?? null, unit: 'mld. Kč', year: 2024, label: 'Úhrady ambulantní péče' },
    ranked: { label: 'Top 12 oborů ambulantní péče dle úhrad', unit: 'mil. Kč', items: rankedItems },
  };
}
function transformOIS1119() {
  const series = [];
  for (const [sheet, year] of [['2023', 2023], ['2024', 2024]]) {
    let rows;
    try { rows = readSheet(path.join(CACHE, 'OIS-11-19.xlsx'), sheet); } catch { continue; }
    const h = findHeaderRow(rows, { mustContain: ['IČO', 'receptů'] });
    const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
    series.push({ year, value: Math.round(sumCols(body, colsMatching(rows[h], ['receptů']))) });
  }
  return {
    ois_code: 'OIS-11-19', source_file: 'OIS-11-19.xlsx', extracted_at: STAMP(),
    method_note: 'Počet vykázaných receptů v lékárnách a výdejnách.',
    headline: { value: series[series.length - 1]?.value ?? null, unit: 'receptů', year: 2024, label: 'Vykázané recepty v lékárnách' },
    series: [{ key: 'recepty', label: 'Vykázané recepty', unit: 'recepty', points: series }],
  };
}
function transformZatez(file, oisCode, label) {
  const rows = readSheet(path.join(CACHE, file), 'Data');
  const h = findHeaderRow(rows, { mustContain: ['PZS'] });
  // 'PZS celkem' může být v hlavičkovém řádku nebo v podřádku
  let pzsIdx = colsMatching(rows[h], ['PZS celkem']);
  let dataStart = h + 1;
  if (!pzsIdx.length && rows[h + 1]) {
    pzsIdx = colsMatching(rows[h + 1], ['PZS celkem']);
    dataStart = h + 2;
  }
  const body = rows.slice(dataStart).filter((r) => r && r[0] != null);
  const m = new Map();
  let grand = 0;
  for (const r of body) {
    const kraj = txt(r[1]);
    const v = pzsIdx.reduce((s, i) => s + (num(r[i]) || 0), 0);
    if (kraj) m.set(kraj, (m.get(kraj) || 0) + v);
    grand += v;
  }
  const items = [...m.entries()].map(([name, v]) => ({ name, value: Math.round(v) })).sort((a, b) => b.value - a.value);
  return {
    ois_code: oisCode, source_file: file, extracted_at: STAMP(),
    method_note: 'Počet poskytovatelů zdravotních služeb (PZS) dle kraje pracoviště.',
    headline: { value: grand, unit: 'poskytovatelů', year: 2024, label },
    ranked: { label: 'Počet poskytovatelů dle kraje', unit: 'poskytovatelé', items: items.slice(0, 14) },
  };
}
function transformOIS1141() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-41.xlsx'), 'Data');
  const h = findHeaderRow(rows, { mustContain: ['IČO', 'dokladu 37'] });
  const body = rows.slice(h + 2).filter((r) => r && r[0] != null);
  const m = new Map();
  let grand = 0;
  for (const r of body) {
    const kraj = txt(r[4]);
    const v = num(r[6]) || 0;
    if (kraj) m.set(kraj, (m.get(kraj) || 0) + v);
    grand += v;
  }
  const items = [...m.entries()].map(([name, v]) => ({ name, value: Math.round(v) })).sort((a, b) => b.value - a.value);
  return {
    ois_code: 'OIS-11-41', source_file: 'OIS-11-41.xlsx', extracted_at: STAMP(),
    method_note: 'Počet výjezdů zdravotnické záchranné služby (doklad 37, kódy 70/72/74/77).',
    headline: { value: grand, unit: 'výjezdů ZZS', year: 2024, label: 'Výjezdy záchranné služby' },
    ranked: { label: 'Výjezdy ZZS dle kraje', unit: 'výjezdy', items: items.slice(0, 14) },
  };
}

/* ================= DIMENZE 5 — NÁKLADY ZP ================= */
function transformOIS1124() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-24.xlsx'), 'Úhradová data – souhrn');
  const h = findHeaderRow(rows, { mustContain: ['CPO', 'Úhrada'] });
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
  const byZp = new Map();
  let grand = 0;
  for (const r of body) {
    if (txt(r[1]) !== '2023') continue;
    const zp = ZP_NAMES[num(r[0])] || txt(r[0]);
    const v = num(r[3]) || 0;
    byZp.set(zp, (byZp.get(zp) || 0) + v);
    grand += v;
  }
  const items = [...byZp.entries()].map(([name, v]) => ({ name, value: round(v / 1e9, 1) })).sort((a, b) => b.value - a.value);
  return {
    ois_code: 'OIS-11-24', source_file: 'OIS-11-24.xlsx', extracted_at: STAMP(),
    method_note: 'Úhrady zdravotních pojišťoven dle segmentů péče za rok 2023, agregováno podle pojišťovny.',
    headline: { value: round(grand / 1e9, 1), unit: 'mld. Kč', year: 2023, label: 'Úhrady zdravotních pojišťoven' },
    ranked: { label: 'Úhrady péče dle zdravotní pojišťovny (2023)', unit: 'mld. Kč', items },
  };
}

/* ================= DIMENZE 7 — KOMUNITNÍ PÉČE ================= */
function transformOIS1130() {
  const series = [];
  for (const [sheet, year] of [['2023', 2023], ['2024', 2024]]) {
    let rows;
    try { rows = readSheet(path.join(CACHE, 'OIS-11-30.xlsx'), sheet); } catch { continue; }
    const h = findRowWith(rows, 'Kontakty');
    const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
    series.push({ year, value: Math.round(sumCols(body, colsMatching(rows[h], ['Kontakty']))) });
  }
  return {
    ois_code: 'OIS-11-30', source_file: 'OIS-11-30.xlsx', extracted_at: STAMP(),
    method_note: 'Počet kontaktů ošetřovatelské a rehabilitační péče (odbornosti 913 a 925).',
    headline: { value: series[series.length - 1]?.value ?? null, unit: 'kontaktů', year: 2024, label: 'Kontakty ošetřovatelské péče' },
    series: [{ key: 'kontakty', label: 'Kontakty ošetřovatelské péče', unit: 'kontakty', points: series }],
  };
}
function transformOIS1131() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-31.xlsx'), 'Data');
  const h = findHeaderRow(rows, { mustContain: ['IČO', 'Segment'] });
  const body = rows.slice(h + 2).filter((r) => r && r[0] != null);
  const s24 = Math.round(sumCol(body, 10));
  const s23 = Math.round(sumCol(body, 11));
  return {
    ois_code: 'OIS-11-31', source_file: 'OIS-11-31.xlsx', extracted_at: STAMP(),
    method_note: 'Úhrady zdravotních pojišťoven v segmentech komunitní péče, mld. Kč.',
    headline: { value: round(s24 / 1e9, 2), unit: 'mld. Kč', year: 2024, label: 'Úhrady komunitní péče' },
    series: [{ key: 'uhrady', label: 'Úhrady komunitní péče', unit: 'mld. Kč',
      points: [{ year: 2023, value: round(s23 / 1e9, 2) }, { year: 2024, value: round(s24 / 1e9, 2) }] }],
  };
}

/* ================= DIMENZE 8 — JEDNODENNÍ PÉČE ================= */
function transformOIS1132() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-32.xlsx'), 'List1');
  const h = findHeaderRow(rows, { mustContain: ['Kód výkonu', 'Odbornost'] });
  const body = rows.slice(h + 1).filter((r) => r && r[8] != null);
  const m = new Map();
  for (const r of body) {
    const odb = txt(r[7]) || 'neuvedeno';
    m.set(odb, (m.get(odb) || 0) + 1);
  }
  const items = [...m.entries()].map(([name, v]) => ({ name, value: v })).sort((a, b) => b.value - a.value);
  return {
    ois_code: 'OIS-11-32', source_file: 'OIS-11-32.xlsx', extracted_at: STAMP(),
    method_note: 'Spektrum smluvně sjednané jednodenní péče — počet kombinací pracoviště × výkon dle odbornosti.',
    headline: { value: body.length, unit: 'smluvních kombinací', year: 2024, label: 'Spektrum jednodenní péče' },
    ranked: { label: 'Smluvní spektrum jednodenní péče dle odbornosti', unit: 'kombinací pracoviště × výkon', items: items.slice(0, 12) },
  };
}
function transformOIS1133() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-33.xlsx'), 'List1');
  const h = findHeaderRow(rows, { mustContain: ['Kód výkonu', 'Odbornost'] });
  const body = rows.slice(h + 2).filter((r) => r && r[7] != null);
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  const series = years.map((y, i) => ({ year: y, value: Math.round(sumCol(body, 10 + i * 2)) }));
  return {
    ois_code: 'OIS-11-33', source_file: 'OIS-11-33.xlsx', extracted_at: STAMP(),
    method_note: 'Množství výkonů jednodenní péče na pracovištích s odborností jednodenní péče.',
    headline: { value: series[5].value, unit: 'výkonů', year: 2024, label: 'Produkce jednodenní péče' },
    series: [{ key: 'vykony', label: 'Množství výkonů jednodenní péče', unit: 'výkony', points: series }],
  };
}

/* ================= REGISTRY ================= */
function transformOIS0301() {
  const rows = readSheet(path.join(CACHE, 'OIS-03-01.xlsx'), 'CVSP – datový souhrn');
  const h = findHeaderRow(rows, { mustContain: ['IČO', 'Typ centra'] });
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
  const m = new Map();
  for (const r of body) {
    const typ = txt(r[10]) || 'neuvedeno';
    m.set(typ, (m.get(typ) || 0) + 1);
  }
  const items = [...m.entries()].map(([name, v]) => ({ name, value: v })).sort((a, b) => b.value - a.value);
  return {
    ois_code: 'OIS-03-01', source_file: 'OIS-03-01.xlsx', extracted_at: STAMP(),
    method_note: 'Centra vysoce specializované péče dle Věstníku MZ ČR — počet center podle typu.',
    headline: { value: body.length, unit: 'center', year: 2024, label: 'Centra vysoce specializované péče' },
    ranked: { label: 'Počet center vysoce specializované péče dle typu', unit: 'center', items: items.slice(0, 12) },
  };
}
function transformNR02(file, oisCode, label, unit) {
  const rows = readSheet(path.join(CACHE, file), 'Kraje');
  const h = findHeaderRow(rows, { minCells: 10, mustContain: ['Kraj', 'Celkem'] });
  const body = rows.slice(h + 1);
  const total = body.find((r) => r && txt(r[0]) === 'ČR');
  if (!total) throw new Error(file + ': ČR řádek nenalezen');
  const muzi = AGE_BANDS.map((b, i) => ({ band: b, value: Math.round(num(total[22 + i]) || 0) }));
  const zeny = AGE_BANDS.map((b, i) => ({ band: b, value: Math.round(num(total[35 + i]) || 0) }));
  return {
    ois_code: oisCode, source_file: file, extracted_at: STAMP(),
    method_note: 'Zdravotničtí pracovníci se smluvním zajištěním z veřejného pojištění, ČR, dle věku a pohlaví.',
    headline: { value: Math.round(num(total[5]) || 0), unit, year: 2024, label },
    pyramid: { age_bands: AGE_BANDS, muzi, zeny },
  };
}

function cacheHas(file) {
  return fs.existsSync(path.join(CACHE, file));
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const extracts = [];

  // dimenze 2 — vyžaduje OIS-11-12 + OIS-11-13
  if (cacheHas('OIS-11-12.xlsx') && cacheHas('OIS-11-13.xlsx')) {
    const { weights, byKategorieYear } = readUvazky();
    extracts.push(transformOIS1112(weights), transformOIS1113(byKategorieYear));
  }
  const optional = [
    ['OIS-11-14.xlsx', () => transformISPV('OIS-11-14.xlsx', 'OIS-11-14', 'mzda')],
    ['OIS-11-15.xlsx', () => transformISPV('OIS-11-15.xlsx', 'OIS-11-15', 'plat')],
    ['OIS-11-16.xlsx', () => transformOIS1116()],
    ['OIS-11-17.xlsx', () => transformOIS1117()],
    ['OIS-11-27.xlsx', () => transformOIS1127()],
    ['OIS-11-40.xlsx', () => transformOIS1140()],
    ['OIS-11-37.xlsx', () => transformOIS1137()],
    ['OIS-11-51.xlsx', () => transformOIS1151()],
    ['OIS-11-25.xlsx', () => transformOIS1125()],
    ['OIS-11-28.xlsx', () => transformOIS1128()],
    ['OIS-11-38.xlsx', () => transformOIS1138()],
    ['OIS-11-39.xlsx', () => transformOIS1139()],
    ['OIS-11-45.xlsx', () => transformOIS1145()],
    ['OIS-11-46.xlsx', () => transformOIS1146()],
    ['OIS-11-48.xlsx', () => transformOIS1148()],
    ['OIS-11-49.xlsx', () => transformOIS1149()],
    ['OIS-11-50.xlsx', () => transformOIS1150()],
    ['OIS-11-05.xlsx', () => transformOIS1105()],
    ['OIS-11-06.xlsx', () => transformOIS1106()],
    ['OIS-11-07.xlsx', () => transformOIS1107()],
    ['OIS-11-08.xlsx', () => transformOIS1108()],
    ['OIS-11-10.xlsx', () => transformBlockUhrada('OIS-11-10.xlsx', 'Rok 2024', 'OIS-11-10', 'Úhrady za zdravotnické prostředky na poukaz')],
    ['OIS-11-11.xlsx', () => transformBlockUhrada('OIS-11-11.xlsx', 'Celkem', 'OIS-11-11', 'Úhrady za hromadně vyráběné léky')],
    ['OIS-11-35.xlsx', () => transformBlockUhrada('OIS-11-35.xlsx', 'Celkem', 'OIS-11-35', 'Úhrady za individuálně připravované léky')],
    ['OIS-11-36.xlsx', () => transformOIS1136()],
    ['OIS-11-18.xlsx', () => transformOIS1118()],
    ['OIS-11-19.xlsx', () => transformOIS1119()],
    ['OIS-11-20.xlsx', () => transformZatez('OIS-11-20.xlsx', 'OIS-11-20', 'Praktičtí lékaři pro dospělé')],
    ['OIS-11-21.xlsx', () => transformZatez('OIS-11-21.xlsx', 'OIS-11-21', 'Praktičtí lékaři pro děti a dorost')],
    ['OIS-11-42.xlsx', () => transformZatez('OIS-11-42.xlsx', 'OIS-11-42', 'Zubní lékaři')],
    ['OIS-11-41.xlsx', () => transformOIS1141()],
    ['OIS-11-24.xlsx', () => transformOIS1124()],
    ['OIS-11-30.xlsx', () => transformOIS1130()],
    ['OIS-11-31.xlsx', () => transformOIS1131()],
    ['OIS-11-32.xlsx', () => transformOIS1132()],
    ['OIS-11-33.xlsx', () => transformOIS1133()],
    ['OIS-03-01.xlsx', () => transformOIS0301()],
    ['NR-02-01.xlsx', () => transformNR02('NR-02-01.xlsx', 'NR-02-01', 'Úvazky zdravotnických pracovníků', 'úvazků')],
    ['NR-02-02.xlsx', () => transformNR02('NR-02-02.xlsx', 'NR-02-02', 'Počty zdravotnických pracovníků', 'fyzických osob')],
  ];
  for (const [file, fn] of optional) {
    if (!cacheHas(file)) continue;
    try {
      extracts.push(fn());
    } catch (err) {
      console.error(`  ✗ ${file} — ${err.message}`);
    }
  }

  for (const ex of extracts) {
    fs.writeFileSync(path.join(OUT, `${ex.ois_code}.json`), JSON.stringify(ex, null, 2) + '\n');
    const n = (ex.series || ex.series_periods || []).length;
    console.log(`  ✓ ${ex.ois_code} → headline ${ex.headline.value} ${ex.headline.unit}, ${n} řad`);
  }
  console.log(`transform dohodovací řízení: ${extracts.length} extraktů → ingest/nzip-extracts/`);
}

main();
