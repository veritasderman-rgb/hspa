// Transform datových souhrnů NZIP — dohodovací řízení.
// Čte XLSX z ingest/cache/dohodovaci-rizeni/ a zapisuje strukturované
// extrakty do ingest/nzip-extracts/{OIS}.json (časové řady, headline).
// Builder (build-dohodovaci-rizeni.js) tyto extrakty skládá do kontraktu.
//
// Vlna 1: dimenze 2 — personální zabezpečení (OIS 11-12 … 11-16).
//
// Refresh 2026-10 (edice s daty k 31. 12. 2025): sady, které ÚZIS vydal
// znovu, čtou rok ze souboru — ze záhlaví sloupců („Rok 2025 – …"), z názvů
// listů („Rok 2025", „2025") nebo z titulního řádku („Hodnocené období: rok
// 2025"). Pevné roky zůstávají jen u sad, jejichž edice se nezměnila.
//
// Spuštění:  node ingest/transform_dohodovaci_rizeni.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSheet, sheetNames, findHeaderRow, num, txt } from './lib/xlsx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// DR_CACHE / DR_OUT: převod starší edice do jiné složky (seed historie, viz dohodovaci-rizeni-history.json)
const CACHE = process.env.DR_CACHE || path.join(ROOT, 'ingest', 'cache', 'dohodovaci-rizeni');
const OUT = process.env.DR_OUT || path.join(ROOT, 'ingest', 'nzip-extracts');

const YEARS_19_24 = [2019, 2020, 2021, 2022, 2023, 2024];

/* sloupce, jejichž záhlaví nese rok: [{ year, col }] vzestupně podle roku */
function yearCols(headerRow, mustContain = '') {
  const out = [];
  (headerRow || []).forEach((c, col) => {
    const t = txt(c);
    if (mustContain && !t.includes(mustContain)) return;
    const m = /\b(20\d{2})\b/.exec(t);
    if (m) out.push({ year: Number(m[1]), col });
  });
  return out.sort((a, b) => a.year - b.year || a.col - b.col);
}

/* listy pojmenované rokem („2025", „Rok 2025", „rok 2025") → [{ sheet, year }] vzestupně */
function yearSheets(file) {
  return sheetNames(path.join(CACHE, file))
    .map((sheet) => {
      const m = /^\s*(?:rok\s*)?(20\d{2})\s*$/i.exec(sheet);
      return m ? { sheet, year: Number(m[1]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.year - b.year);
}

/* referenční rok z titulních řádků listu („Rok 2025", „Hodnocené období: rok 2025",
   „Období: rok 2025") — bere jen řádek s jediným rokem, rozsah „2019–2025" ignoruje */
function periodYear(rows) {
  for (const r of rows.slice(0, 20)) {
    if (!r) continue;
    for (const c of r) {
      const t = txt(c);
      const m = /^(?:hodnocené\s+)?(?:období:\s*)?rok\s+(20\d{2})$/i.exec(t);
      if (m) return Number(m[1]);
    }
  }
  return null;
}

/* součet hodnot ve sloupcích idx; je-li poslední sloupec souhrnem ostatních
   (blok „CELKEM" za pojišťovnami), vezme jen ten — jinak by se dvojitě sčítalo */
function sumExclTotal(row, idx) {
  const vals = idx.map((i) => num(row[i]) || 0);
  if (vals.length > 2) {
    const last = vals[vals.length - 1];
    const rest = vals.slice(0, -1).reduce((a, b) => a + b, 0);
    if (last > 0 && Math.abs(last - rest) <= Math.max(1, rest * 0.005)) return last;
  }
  return vals.reduce((a, b) => a + b, 0);
}

/* index sloupce podle (části) názvu v záhlaví */
function colOf(headerRow, label) {
  return (headerRow || []).findIndex((c) => txt(c).includes(label));
}

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
  // sloupce dle záhlaví (edice 2026-01 posunula tabulku o sloupec a přidala rok 2025)
  const hr = rows[h];
  const cDrzar = colOf(hr, 'Kód DRZAR');
  const cKat = colOf(hr, 'Kategorie název');
  const cPov = colOf(hr, 'Povolání');
  const cOdm = colOf(hr, 'Odměňování');
  const ycols = yearCols(hr, 'Rok');
  const cats = [
    { cat: 'Lékaři', key: 'lekari', label: 'Lékaři' },
    { cat: 'ZPBD - Sestry a porodní asistentky', key: 'sestry', label: 'Sestry a porodní asistentky' },
    { cat: 'Farmaceuti', key: 'farmaceuti', label: 'Farmaceuti' },
  ];
  const series = [];
  for (const { cat, key, label } of cats) {
    const points = ycols.map(({ year: y, col }) => {
      let wSum = 0;
      let wxSum = 0;
      for (const r of body) {
        if (!r || txt(r[cKat]) !== cat || txt(r[cOdm]) !== 'Plat') continue;
        const wkey = `${txt(r[cDrzar])}|${txt(r[cPov])}|${txt(r[cOdm])}`;
        const w = weights.get(wkey) || 0;
        const val = num(r[col]);
        if (val == null || w <= 0) continue;
        wSum += w;
        wxSum += val * w;
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
      'Národní průměr vážený přepočtenými úvazky (zdroj vah: OIS 11-13, rok 2024 — sada úvazků zatím rok 2025 neobsahuje, váhy se proto drží na roce 2024 pro celou řadu). Pouze platová sféra (příspěvkové organizace). Zdroj odměn: roční výkazy E (MZ) 2-01, 3-01, 4-01.',
    headline: {
      value: lekariLast?.value ?? null,
      unit: 'Kč / měsíc',
      year: lekariLast?.year ?? null,
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
  // období z názvů listů: „Mzda_1.pol.2024" → 1. pol. 2024, „Plat_2025" → rok 2025
  const periods = sheetNames(path.join(CACHE, file))
    .map((name, sheet) => {
      const half = /1\.\s*pol\.?\s*(20\d{2})/i.exec(name);
      if (half) return { sheet, label: `1. pol. ${half[1]}`, year: Number(half[1]), full: false };
      const yr = /_(20\d{2})\s*$/.exec(name);
      return yr ? { sheet, label: `rok ${yr[1]}`, year: Number(yr[1]), full: true } : null;
    })
    .filter(Boolean);
  const lastFull = periods.filter((p) => p.full).slice(-1)[0];
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
      if (grp.code === '2212' && per === lastFull) pravePraktici = median;
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
      year: lastFull?.year ?? null,
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
  // věkové rozložení (obě pohlaví) — celkem a jen lékaři, pro personální predikci
  const totalByBand = AGE_BANDS.map((_, i) => (num(total[22 + i]) || 0) + (num(total[35 + i]) || 0));
  const lekariByBand = lekari
    ? AGE_BANDS.map((_, i) => (num(lekari[22 + i]) || 0) + (num(lekari[35 + i]) || 0))
    : null;
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
    workforce_age: { age_bands: AGE_BANDS, total: totalByBand, lekari: lekariByBand },
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
  const ycols = yearCols(rows[h], 'oš.dnů');
  const years = ycols.map((c) => c.year);
  const last = years.length - 1;
  const byObor = new Map();
  const totals = years.map(() => 0);
  for (const r of body) {
    if (!r || r[0] == null) continue;
    const obor = txt(r[8]) || 'neuvedeno';
    if (!byObor.has(obor)) byObor.set(obor, years.map(() => 0));
    const acc = byObor.get(obor);
    ycols.forEach(({ col }, i) => {
      const v = num(r[col]);
      if (v != null) {
        acc[i] += v;
        totals[i] += v;
      }
    });
  }
  const top = [...byObor.entries()].sort((a, b) => b[1][last] - a[1][last]).slice(0, 4);
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
      value: totals[last],
      unit: 'ošetřovacích dnů',
      year: years[last],
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
  const ycols = yearCols(rows[h], 'množství');
  const years = ycols.map((c) => c.year);
  let last = years.length - 1;
  const pat = years.map(() => 0);
  const leceni = years.map(() => 0);
  for (const r of body) {
    if (!r || r[0] == null) continue;
    const druh = txt(r[8]);
    const nazev = txt(r[9]);
    ycols.forEach(({ col }, i) => {
      const v = num(r[col]) || 0;
      if (druh === 'Unikátní pacienti') pat[i] += v;
      if (nazev.includes('za léčení')) leceni[i] += v;
    });
  }
  // edice 2026-02 má sloupec 2025 shodný s 2024 do posledního čísla (zjevně nevyplněný) —
  // poslední rok, který přesně kopíruje předchozí v obou řadách, se nepublikuje
  let heldYear = null;
  if (last > 0 && pat[last] === pat[last - 1] && leceni[last] === leceni[last - 1]) {
    heldYear = years.pop();
    pat.pop();
    leceni.pop();
    last -= 1;
  }
  return {
    ois_code: 'OIS-11-40',
    source_file: 'OIS-11-40.xlsx',
    extracted_at: new Date().toISOString(),
    method_note: `Unikátní pacienti a ošetřovací dny (položka „za léčení") lázeňské a ozdravné péče, ČR.${
      heldYear ? ` Sloupec ${heldYear} je v souboru ÚZIS totožný s předchozím rokem (pravděpodobně nevyplněný), proto se nezobrazuje.` : ''
    }`,
    headline: {
      value: pat[last],
      unit: 'unikátních pacientů',
      year: years[last],
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
      year: periodYear(rows),
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
  // edice 2026-02: jeden list na rok („rok 2024", „rok 2025"); starší edice měla jediný „Sheet1"
  const file = 'OIS-11-51.xlsx';
  const sheets = yearSheets(file);
  const plan = sheets.length ? sheets : [{ sheet: 'Sheet1', year: null }];
  const points = [];
  let items = [];
  let lastStats = null;
  for (const { sheet, year } of plan) {
    const rows = readSheet(path.join(CACHE, file), sheet);
    const h = findHeaderRow(rows, { mustContain: ['DRG skupina'] });
    const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
    // 2 centralizace ano/ne, 4 HP celkem, 6 HP v CVSP, 8 HP mimo CVSP
    let hpAno = 0;
    let hpIn = 0;
    const its = [];
    for (const r of body) {
      if (txt(r[2]).toLowerCase() !== 'ano') continue;
      hpAno += num(r[4]) || 0;
      hpIn += num(r[6]) || 0;
      its.push({ name: txt(r[1]), value: num(r[8]) || 0 });
    }
    its.sort((a, b) => b.value - a.value);
    const y = year ?? periodYear(rows);
    points.push({ year: y, value: round((hpIn / hpAno) * 100, 1) });
    items = its;
    lastStats = { year: y, hp_urcene: Math.round(hpAno), hp_v_cvsp: Math.round(hpIn), hp_mimo_cvsp: Math.round(hpAno - hpIn) };
  }
  const last = points[points.length - 1];
  return {
    ois_code: 'OIS-11-51',
    source_file: file,
    extracted_at: new Date().toISOString(),
    method_note:
      'Pouze DRG skupiny určené k centralizaci dle úhradové vyhlášky. Centralizace = podíl hospitalizačních případů v centrech vysoce specializované péče (CVSP). Edice 2026-02 počítá oba roky (2024 i 2025) ve stejné verzi CZ-DRG 2026, roky jsou proto srovnatelné; starší edice (CZ-DRG 6.0) dávala pro rok 2024 podobných 91,8 %.',
    headline: {
      value: last?.value ?? null,
      unit: '% případů v centrech',
      year: last?.year ?? null,
      label: 'Centralizace péče určené k soustředění',
    },
    snapshot: lastStats,
    series: [{ key: 'podil_cvsp', label: 'Podíl případů v centrech (CVSP)', unit: '%', points }],
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
  // první list = verze CZ-DRG platná pro hodnocený rok (2026-02: „CZ-DRG 2026"; další list je výhled)
  const sheet = sheetNames(path.join(CACHE, 'OIS-11-25.xlsx')).find((s) => s.startsWith('CZ-DRG'));
  const rows = readSheet(path.join(CACHE, 'OIS-11-25.xlsx'), sheet);
  const h = findHeaderRow(rows, { mustContain: ['IČZ', 'Počet HP'] });
  const body = rows.slice(h + 2).filter((r) => r && r[3] != null);
  const totHP = sumCol(body, 5);
  const year = yearCols(rows[h], 'Počet HP')[0]?.year ?? periodYear(rows);
  return {
    ois_code: 'OIS-11-25',
    source_file: 'OIS-11-25.xlsx',
    extracted_at: STAMP(),
    method_note: `Hospitalizační případy akutní lůžkové péče dle ${sheet}, rok ${year} (NRHZS).`,
    headline: { value: totHP, unit: 'hospitalizačních případů', year, label: 'Akutní hospitalizace ČR' },
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
    headline: { value: Math.round(sumCol(body, 8)), unit: 'výkonů převzetí od ZZS', year: periodYear(rows), label: 'Převzetí pacientů od ZZS' },
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
    method_note: 'Pokrytí hospitalizačních případů referenčními nemocnicemi (RN) jako podíl z celkového počtu HP ČR. Od edice 2026-02 ÚZIS uvádí dva scénáře složení sítě; použit scénář 1.',
    headline: { value: round((hpRN / hpCR) * 100, 1), unit: '% případů v referenční síti', year: periodYear(rows), label: 'Pokrytí referenční sítí' },
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
    headline: { value: Math.round(sumCol(body, 2)), unit: 'hospitalizačních případů', year: periodYear(rows), label: 'Případy sledované pro centralizaci' },
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
  // nad záhlavím řádek s roky („Rok 2023", „Rok 2024") a řádek s názvy bloků
  const years = yearCols(rows[h - 2]);
  // blok roku začíná sloupcem s rokem a končí před dalším rokem; uvnitř má podbloky
  // pojmenované v řádku h-1 (lůžka = 1 sloupec, ošetřovací dny a případy = několik podtypů)
  const blockCols = (year, label) => {
    const i = years.findIndex((c) => c.year === year && txt(rows[h - 1]?.[c.col]).includes('nasmlouvaných lůžek'));
    if (i < 0) return [];
    const start = years[i].col;
    const end = years[i + 1]?.col ?? rows[h].length;
    const named = [];
    for (let col = start; col < end; col++) if (txt(rows[h - 1]?.[col])) named.push(col);
    const k = named.findIndex((col) => txt(rows[h - 1][col]).includes(label));
    if (k < 0) return [];
    const to = named[k + 1] ?? end;
    // podblok s jediným souhrnným sloupcem (lůžka) vs. podblok s podtypy bez souhrnu
    return label === 'nasmlouvaných lůžek' ? [named[k]] : Array.from({ length: to - named[k] }, (_, j) => named[k] + j);
  };
  const blockCol = (year, label) => blockCols(year, label)[0] ?? -1;
  const ys = [...new Set(years.map((c) => c.year))]
    .filter((y) => blockCol(y, 'nasmlouvaných lůžek') >= 0)
    .sort((a, b) => a - b);
  if (!ys.length) throw new Error('OIS-11-48: bloky let nenalezeny');
  const last = ys[ys.length - 1];
  const bedCol = blockCol(last, 'nasmlouvaných lůžek');
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null && num(r[bedCol]) != null);
  const pts = (label, div = 1, d = 0) =>
    ys.map((y) => ({ year: y, value: round(blockCols(y, label).reduce((a, col) => a + sumCol(body, col), 0) / div, d) }));
  return {
    ois_code: 'OIS-11-48',
    source_file: 'OIS-11-48.xlsx',
    extracted_at: STAMP(),
    method_note: `Nasmlouvaná lůžka intenzivní péče, intenzivní ošetřovací dny a hospitalizační případy pracovišť intenzivní péče, roky ${ys.join(', ')}.`,
    headline: { value: Math.round(sumCol(body, bedCol)), unit: 'intenzivních lůžek', year: last, label: 'Nasmlouvaná lůžka intenzivní péče' },
    series: [
      { key: 'luzka', label: 'Nasmlouvaná lůžka intenzivní péče', unit: 'lůžka', points: pts('nasmlouvaných lůžek') },
      { key: 'od', label: 'Intenzivní ošetřovací dny', unit: 'tis. dnů', points: pts('intenzivních ošetřovacích', 1e3, 1) },
      { key: 'hp', label: 'Hospitalizační případy na pracovištích intenzivní péče', unit: 'tis. případů', points: pts('hospitalizačních případů', 1e3, 1) },
    ],
    ranked: { label: `Top 12 oborů dle nasmlouvaných intenzivních lůžek (${last})`, unit: 'lůžka', items: rankedBy(body, 4, bedCol) },
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
  // edice 2026-02: jediný list „2021–2025" se sloupcem Rok (0); starší edice měla list za rok
  const file = 'OIS-11-50.xlsx';
  const sheet = sheetNames(path.join(CACHE, file))[0];
  const rows = readSheet(path.join(CACHE, file), sheet);
  const h = findHeaderRow(rows, { minCells: 8, mustContain: ['IČO', 'Kraj', 'Zřizovatel'] });
  const hasRok = txt(rows[h][0]) === 'Rok';
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null && num(r[12]) != null);
  const byYear = new Map();
  for (const r of body) {
    const y = hasRok ? num(r[0]) : Number(sheet);
    if (!y) continue;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(r);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const lastYear = years[years.length - 1];
  const lastBody = byYear.get(lastYear) || [];
  const points = years.map((y) => ({ year: y, value: round(sumCol(byYear.get(y), 12) / 1e6, 1) }));
  return {
    ois_code: 'OIS-11-50',
    source_file: file,
    extracted_at: STAMP(),
    method_note: 'Celkové náklady poskytovatelů akutní lůžkové péče dle výkazu E 6-02, převedeno z tis. Kč na mld. Kč. Nominální hodnoty (bez očištění o inflaci).',
    headline: { value: points[points.length - 1]?.value ?? null, unit: 'mld. Kč', year: lastYear, label: 'Celkové náklady akutní lůžkové péče' },
    series: [{ key: 'naklady', label: 'Celkové náklady akutní lůžkové péče', unit: 'mld. Kč', points }],
    ranked: {
      label: 'Náklady akutní lůžkové péče dle kraje',
      unit: 'mld. Kč',
      items: rankedBy(lastBody, 4, 12).map((it) => ({ name: it.name, value: round(it.value / 1e6, 2) })),
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
  // listy „Rok 2023–2025 ATC" / „… Segment" (rozsah let se posouvá s edicí);
  // od edice 2026-01 má každý list za pojišťovnami i blok CELKEM — sčítá se buď on, nebo pojišťovny
  const file = 'OIS-11-06.xlsx';
  const names = sheetNames(path.join(CACHE, file));
  const atcSheet = names.find((s) => /ATC\s*$/.test(s));
  const segSheet = names.find((s) => /Segment\s*$/.test(s));
  const sumByYear = (sheet, keyword, keyCol) => {
    const rows = readSheet(path.join(CACHE, file), sheet);
    const h = findRowWith(rows, keyword);
    const hr = rows[h];
    const body = rows.slice(h + 1).filter((r) => r && r[keyCol] != null && !/celkem/i.test(txt(r[0])));
    const years = [...new Set(yearCols(hr, keyword).map((c) => c.year))];
    return years.map((y) => {
      const idx = colsMatching(hr, [keyword, String(y)]);
      return { year: y, value: body.reduce((s, r) => s + sumExclTotal(r, idx), 0) };
    });
  };
  const pm = sumByYear(atcSheet, 'pacientoměsíců', 2).map((p) => ({ year: p.year, value: Math.round(p.value) }));
  const uhrady = segSheet
    ? sumByYear(segSheet, 'Úhrady v tis. Kč', 0).map((p) => ({ year: p.year, value: round(p.value / 1e6, 2) }))
    : [];
  const last = pm[pm.length - 1];
  return {
    ois_code: 'OIS-11-06', source_file: file, extracted_at: STAMP(),
    method_note:
      'Pacientoměsíce léčby centrovými léky (list ATC) a úhrady zdravotních pojišťoven v mld. Kč (list Segment), součet napříč terapeutickými oblastmi a pojišťovnami. Každá edice přepočítává celé tříleté okno — hodnoty starších let se mezi edicemi mění (edice 2026-01 rozšířila počet terapeutických oblastí a změnila výpočet pacientoměsíců).',
    headline: { value: last?.value ?? null, unit: 'pacientoměsíců', year: last?.year ?? null, label: 'Léčba centrovými léky' },
    series: [
      { key: 'pm', label: 'Pacientoměsíce centrové léčby', unit: 'pacientoměsíce', points: pm },
      ...(uhrady.length ? [{ key: 'uhrady', label: 'Úhrady za centrové léky', unit: 'mld. Kč', points: uhrady }] : []),
    ],
  };
}
function transformOIS1107() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-07.xlsx'), 'Genove_terapie');
  const h = findRowWith(rows, 'Náklady na úrovni maximální stanovené ceny');
  const hr = rows[h];
  const totalRow = rows.slice(h + 1).find((r) => r && txt(r[0]).includes('Všechna ATC'));
  if (!totalRow) throw new Error('11-07: souhrnný řádek nenalezen');
  const years = [...new Set(yearCols(hr, 'Náklady').map((c) => c.year))];
  // edice 2026-02 přidala za pojišťovny souhrnný blok — sumExclTotal ho nesčítá dvakrát
  const series = years.map((y) => {
    const idx = colsMatching(hr, ['Náklady', String(y)]);
    return { year: y, value: round(sumExclTotal(totalRow, idx) / 1e6, 1) };
  });
  const last = series[series.length - 1];
  return {
    ois_code: 'OIS-11-07', source_file: 'OIS-11-07.xlsx', extracted_at: STAMP(),
    method_note:
      'Náklady na genové a personalizované kurativní terapie na úrovni maximální stanovené ceny, mil. Kč. Každá edice přepočítává celé tříleté okno, hodnoty starších let se mezi edicemi mění.',
    headline: { value: last?.value ?? null, unit: 'mil. Kč', year: last?.year ?? null, label: 'Náklady na genové terapie' },
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
  const sheets = yearSheets('OIS-11-08.xlsx');
  const lastYear = sheets[sheets.length - 1]?.year ?? null;
  for (const { sheet, year } of sheets) {
    const rows = readSheet(path.join(CACHE, 'OIS-11-08.xlsx'), sheet);
    const h = findHeaderRow(rows, { mustContain: ['Typ PZT'] });
    const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
    series.push({ year, value: round(sumCol(body, 10) / 1e9, 1) });
    if (year === lastYear) for (const r of body) {
      const n = txt(r[1]);
      if (n) m.set(n, (m.get(n) || 0) + (num(r[10]) || 0));
    }
  }
  const items = [...m.entries()].map(([name, v]) => ({ name, value: round(v / 1e6, 1) })).sort((a, b) => b.value - a.value);
  return {
    ois_code: 'OIS-11-08', source_file: 'OIS-11-08.xlsx', extracted_at: STAMP(),
    method_note: 'Úhrada za prostředky zdravotnické techniky (zvlášť účtovaný materiál), mld. Kč.',
    headline: { value: series[series.length - 1]?.value ?? null, unit: 'mld. Kč', year: lastYear, label: 'Úhrady za zdravotnický materiál' },
    series: [{ key: 'uhrady', label: 'Úhrady za zvlášť účtovaný materiál', unit: 'mld. Kč', points: series }],
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
/* sada s listem za každý rok („Rok 2023", „Rok 2024"): headline a žebříček z posledního roku, řada ze všech.
   Rok, jehož blok úhrad je do posledního čísla shodný s předchozím rokem, je nevyplněná kopie (edice 2026-01
   u 11-10: list „Rok 2024" nese úhrady roku 2023) — vynechá se a zapíše do dropped_years. */
function transformBlockUhradaYears(file, oisCode, label) {
  const sheets = yearSheets(file);
  if (!sheets.length) throw new Error(file + ': listy s rokem nenalezeny');
  const perYear = [];
  const dropped = [];
  for (const { sheet, year } of sheets) {
    const ex = transformBlockUhrada(file, sheet, oisCode, label);
    const prev = perYear[perYear.length - 1];
    const key = JSON.stringify(ex.ranked.items);
    if (prev && prev.key === key) {
      dropped.push({ year, reason: `blok úhrad na listu „${sheet}" je shodný s rokem ${prev.year}` });
      continue;
    }
    perYear.push({ year, ex, key });
  }
  const last = perYear[perYear.length - 1];
  return {
    ...last.ex,
    headline: { ...last.ex.headline, year: last.year },
    ranked: { ...last.ex.ranked, label: `${last.ex.ranked.label} (${last.year})` },
    series: perYear.length > 1
      ? [{ key: 'uhrady', label, unit: 'mld. Kč', points: perYear.map(({ year, ex }) => ({ year, value: ex.headline.value })) }]
      : [],
    ...(dropped.length ? { dropped_years: dropped } : {}),
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
    headline: { value: round(grand / 1e9, 1), unit: 'mld. Kč', year: periodYear(rows), label: 'Úhrady za léky na recept (HVLP)' },
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
  for (const { sheet, year } of yearSheets('OIS-11-19.xlsx')) {
    const rows = readSheet(path.join(CACHE, 'OIS-11-19.xlsx'), sheet);
    const h = findHeaderRow(rows, { mustContain: ['IČO', 'receptů'] });
    const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
    series.push({ year, value: Math.round(sumCols(body, colsMatching(rows[h], ['receptů']))) });
  }
  return {
    ois_code: 'OIS-11-19', source_file: 'OIS-11-19.xlsx', extracted_at: STAMP(),
    method_note: 'Počet vykázaných receptů v lékárnách a výdejnách.',
    headline: { value: series[series.length - 1]?.value ?? null, unit: 'receptů', year: series[series.length - 1]?.year ?? null, label: 'Vykázané recepty v lékárnách' },
    series: [{ key: 'recepty', label: 'Vykázané recepty', unit: 'recepty', points: series }],
  };
}
function transformZatez(file, oisCode, label) {
  // list „Data" (11-42 od edice 2026-02 „List1") — bere se první list
  const rows = readSheet(path.join(CACHE, file), 0);
  const h = findHeaderRow(rows, { mustContain: ['PZS'] });
  // 'PZS celkem' může být v hlavičkovém řádku nebo v podřádku
  let pzsIdx = colsMatching(rows[h], ['PZS celkem']);
  let dataStart = h + 1;
  if (!pzsIdx.length && rows[h + 1]) {
    pzsIdx = colsMatching(rows[h + 1], ['PZS celkem']);
    dataStart = h + 2;
  }
  // souhrnný řádek na konci listu („Celkový součet", „CELKEM") se nesčítá — jinak by se ČR započítala dvakrát
  const body = rows.slice(dataStart).filter((r) => r && r[0] != null && !/^celk/i.test(txt(r[0])));
  const hdr = rows[dataStart - 1];
  const kapIdx = colsMatching(hdr, ['Kapitace', 'celkem']).slice(0, 1);
  const uvIdx = colsMatching(hdr, ['Úvazek celkem']).slice(0, 1);
  const m = new Map();
  let grand = 0;
  for (const r of body) {
    const kraj = txt(r[1]);
    const v = pzsIdx.reduce((s, i) => s + (num(r[i]) || 0), 0);
    if (kraj) m.set(kraj, (m.get(kraj) || 0) + v);
    grand += v;
  }
  const items = [...m.entries()].map(([name, v]) => ({ name, value: Math.round(v) })).sort((a, b) => b.value - a.value);
  // registrovaní pojištěnci (kapitace) na 1 přepočtený úvazek lékaře — zátěž ambulance
  const kap = sumCols(body, kapIdx);
  const uv = sumCols(body, uvIdx);
  const snapshot = kapIdx.length && uvIdx.length && uv > 0
    ? { kapitace_celkem: Math.round(kap), uvazky_celkem: round(uv, 1), kapitace_na_uvazek: Math.round(kap / uv) }
    : null;
  return {
    ois_code: oisCode, source_file: file, extracted_at: STAMP(),
    snapshot,
    method_note: 'Počet poskytovatelů zdravotních služeb (PZS) dle kraje pracoviště.',
    headline: { value: grand, unit: 'poskytovatelů', year: periodYear(rows), label },
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
    headline: { value: grand, unit: 'výjezdů ZZS', year: periodYear(rows), label: 'Výjezdy záchranné služby' },
    ranked: { label: 'Výjezdy ZZS dle kraje', unit: 'výjezdy', items: items.slice(0, 14) },
  };
}

/* ================= DIMENZE 5 — NÁKLADY ZP ================= */
function transformOIS1124() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-24.xlsx'), 'Úhradová data – souhrn');
  const h = findHeaderRow(rows, { mustContain: ['CPO', 'Úhrada'] });
  const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
  // období „2023", „2024_pol" (pololetní dodávka pojišťoven); podsegment 1.7.1 je podle
  // listu Metodika „z toho" uvnitř 1.7 a nesčítá se — jinak je celek nadhodnocen
  const periodYear = (t) => Number((/^(20\d{2})/.exec(t) || [])[1]) || null;
  const byYear = new Map();
  for (const r of body) {
    const y = periodYear(txt(r[1]));
    if (!y || txt(r[2]) === '1.7.1') continue;
    if (!byYear.has(y)) byYear.set(y, { label: txt(r[1]), rows: [] });
    byYear.get(y).rows.push(r);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const last = years[years.length - 1];
  const sum = (rs) => rs.reduce((a, r) => a + (num(r[3]) || 0), 0);
  const byZp = new Map();
  for (const r of byYear.get(last).rows) {
    const zp = ZP_NAMES[num(r[0])] || txt(r[0]);
    byZp.set(zp, (byZp.get(zp) || 0) + (num(r[3]) || 0));
  }
  const items = [...byZp.entries()].map(([name, v]) => ({ name, value: round(v / 1e9, 1) })).sort((a, b) => b.value - a.value);
  const prelim = /pol/i.test(byYear.get(last).label);
  return {
    ois_code: 'OIS-11-24', source_file: 'OIS-11-24.xlsx', extracted_at: STAMP(),
    method_note: `Úhrady zdravotních pojišťoven dle segmentů péče, součet bez podsegmentu 1.7.1 (metodika sady ho vede jako „z toho" uvnitř 1.7).${
      prelim ? ` Rok ${last} vychází z pololetní dodávky pojišťoven (označení „${byYear.get(last).label}"), s vyšším podílem dohadných položek.` : ''
    }`,
    headline: { value: round(sum(byYear.get(last).rows) / 1e9, 1), unit: 'mld. Kč', year: last, label: 'Úhrady zdravotních pojišťoven' },
    series: [{ key: 'uhrady', label: 'Úhrady zdravotních pojišťoven', unit: 'mld. Kč', points: years.map((y) => ({ year: y, value: round(sum(byYear.get(y).rows) / 1e9, 1) })) }],
    ranked: { label: `Úhrady péče dle zdravotní pojišťovny (${last})`, unit: 'mld. Kč', items },
  };
}

/* ================= DIMENZE 7 — KOMUNITNÍ PÉČE ================= */
function transformOIS1130() {
  const series = [];
  for (const { sheet, year } of yearSheets('OIS-11-30.xlsx')) {
    const rows = readSheet(path.join(CACHE, 'OIS-11-30.xlsx'), sheet);
    const h = findRowWith(rows, 'Kontakty');
    const body = rows.slice(h + 1).filter((r) => r && r[0] != null);
    series.push({ year, value: Math.round(sumCols(body, colsMatching(rows[h], ['Kontakty']))) });
  }
  return {
    ois_code: 'OIS-11-30', source_file: 'OIS-11-30.xlsx', extracted_at: STAMP(),
    method_note: 'Počet kontaktů ošetřovatelské a rehabilitační péče (odbornosti 913 a 925).',
    headline: { value: series[series.length - 1]?.value ?? null, unit: 'kontaktů', year: series[series.length - 1]?.year ?? null, label: 'Kontakty ošetřovatelské péče' },
    series: [{ key: 'kontakty', label: 'Kontakty ošetřovatelské péče', unit: 'kontakty', points: series }],
  };
}
function transformOIS1131() {
  const rows = readSheet(path.join(CACHE, 'OIS-11-31.xlsx'), 'Data');
  const h = findHeaderRow(rows, { mustContain: ['IČO', 'Segment'] });
  // řádek pod záhlavím nese roky; blok úhrad končí sloupcem „Unikátní ošetření pacienti"
  const from = colOf(rows[h], 'Úhrady');
  const to = colOf(rows[h], 'Unikátní');
  const years = yearCols(rows[h + 1]).filter((c) => c.col >= from && (to < 0 || c.col < to));
  if (!years.length) throw new Error('OIS-11-31: sloupce let nenalezeny');
  const body = rows.slice(h + 2).filter((r) => r && r[0] != null);
  const points = years.map(({ year, col }) => ({ year, value: round(sumCol(body, col) / 1e9, 2) }));
  const last = points[points.length - 1];
  return {
    ois_code: 'OIS-11-31', source_file: 'OIS-11-31.xlsx', extracted_at: STAMP(),
    method_note: 'Úhrady zdravotních pojišťoven v segmentech komunitní péče, mld. Kč.',
    headline: { value: last.value, unit: 'mld. Kč', year: last.year, label: 'Úhrady komunitní péče' },
    series: [{ key: 'uhrady', label: 'Úhrady komunitní péče', unit: 'mld. Kč', points }],
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
  // záhlaví nese rok nad dvojicí sloupců (množství výkonů, unikátní pacienti) — bere se první z dvojice
  const ycols = yearCols(rows[h]).filter((c, i, arr) => i === 0 || arr[i - 1].year !== c.year);
  const series = ycols.map(({ year, col }) => ({ year, value: Math.round(sumCol(body, col)) }));
  const patients = ycols.map(({ year, col }) => ({ year, value: Math.round(sumCol(body, col + 1)) }));
  return {
    ois_code: 'OIS-11-33', source_file: 'OIS-11-33.xlsx', extracted_at: STAMP(),
    method_note:
      'Množství výkonů jednodenní péče na pracovištích s odborností jednodenní péče. Řada „pacienti" je součet unikátních pacientů přes výkony a pracoviště, ne počet osob. Rok 2025 je zlom: objem výkonů se zdvojnásobil hlavně v anesteziologických výkonech (78xxx) a v ošetřovacím dni jednodenní péče (00340), tedy ve vykazování na pracovištích s odborností J — nejde o srovnatelný meziroční růst zákroků.',
    headline: { value: series[series.length - 1]?.value ?? null, unit: 'výkonů', year: series[series.length - 1]?.year ?? null, label: 'Produkce jednodenní péče' },
    series: [
      { key: 'vykony', label: 'Množství výkonů jednodenní péče', unit: 'výkony', points: series },
      { key: 'pacienti', label: 'Unikátní pacienti (součet přes výkony a pracoviště)', unit: 'osoby', points: patients },
    ],
  };
}

/* ================= REGISTRY ================= */
function transformOIS0301() {
  // název listu se mezi edicemi liší pomlčkou („CVSP – …" / „CVSP - …") — bere se první list
  const rows = readSheet(path.join(CACHE, 'OIS-03-01.xlsx'), 0);
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
    method_note: 'Centra vysoce specializované péče dle Věstníku MZ ČR — počet záznamů (IČZ × typ centra) podle typu, stav podle poslední edice souhrnu (2026-03, NZIP aktualizováno 7. 10. 2026).',
    headline: { value: body.length, unit: 'center', year: 2026, label: 'Centra vysoce specializované péče' },
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
  if (!process.env.DR_ONLY && cacheHas('OIS-11-12.xlsx') && cacheHas('OIS-11-13.xlsx')) {
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
    ['OIS-11-10.xlsx', () => transformBlockUhradaYears('OIS-11-10.xlsx', 'OIS-11-10', 'Úhrady za zdravotnické prostředky na poukaz')],
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
  // DR_ONLY=OIS-11-10,OIS-11-48: převede jen vybrané sady (rychlá kontrola, seed historie)
  const only = process.env.DR_ONLY ? new Set(process.env.DR_ONLY.split(',').map((c) => c.trim() + '.xlsx')) : null;
  for (const [file, fn] of optional) {
    if (only && !only.has(file)) continue;
    if (!cacheHas(file)) continue;
    try {
      extracts.push(fn());
    } catch (err) {
      console.error(`  ✗ ${file} — ${err.message}`);
    }
  }

  // headline extraktu, který se právě přepíše — jinak by rok aktuální edice z historie zmizel
  const previous = extracts
    .map((ex) => path.join(OUT, `${ex.ois_code}.json`))
    .filter((f) => fs.existsSync(f))
    .map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  for (const ex of extracts) {
    fs.writeFileSync(path.join(OUT, `${ex.ois_code}.json`), JSON.stringify(ex, null, 2) + '\n');
    const n = (ex.series || ex.series_periods || []).length;
    console.log(`  ✓ ${ex.ois_code} → headline ${ex.headline.value} ${ex.headline.unit}, ${n} řad`);
  }
  console.log(`transform dohodovací řízení: ${extracts.length} extraktů → ingest/nzip-extracts/`);
  if (!process.env.DR_OUT) updateHistory([...previous, ...extracts]);
}

/* headline aktuální edice do dohodovaci-rizeni-history.json (jen sady, které tam už jsou) —
   další edice s novým rokem tak řadu prodlouží a stará hodnota se neztratí */
function updateHistory(extracts) {
  const file = path.join(ROOT, 'ingest', 'dohodovaci-rizeni-history.json');
  if (!fs.existsSync(file)) return;
  const hist = JSON.parse(fs.readFileSync(file, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'ingest', 'mapping', 'nzip_dohodovaci_rizeni_catalog.json'), 'utf8'));
  let changed = false;
  for (const ex of extracts) {
    const set = hist.sets?.[ex.ois_code];
    const { value, year } = ex.headline || {};
    if (!set || year == null || value == null) continue;
    const edition = (catalog.datasets.find((d) => d.ois_code === ex.ois_code)?.editions || []).slice(-1)[0]?.edition || null;
    const i = set.points.findIndex((p) => p.year === year);
    const point = { year, value, edition };
    if (i >= 0 && set.points[i].value === value) continue;
    if (i >= 0) set.points[i] = point;
    else set.points.push(point);
    set.points.sort((a, b) => a.year - b.year);
    changed = true;
  }
  if (changed) fs.writeFileSync(file, JSON.stringify(hist, null, 2) + '\n');
}

main();
