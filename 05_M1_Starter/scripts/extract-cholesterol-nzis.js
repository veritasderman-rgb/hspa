// Extrakce reálných hodnot cholesterolu z otevřených dat NZIS (OIS 15-01
// „Laboratorní data", ÚZIS ČR) do ingest/nzip-extracts/OIS-15-01-cholesterol.json.
//
// Primární zdroj (veřejná otevřená data, ISSN 2695-0340):
//   Přehled datové sady:
//     https://www.nzip.cz/data/2780-laboratorni-data-datovy-souhrn
//   Datový soubor (ZIP s XLSX per parametr, ~66 MB):
//     https://www.nzip.cz/data/cvlv/datove-souhrny/Datovy-souhrn-OIS-15-01-laboratorni-data-2026-01.zip
//   Metodika (PDF):
//     https://www.nzip.cz/data/cvlv/metodicke-popisy/Datovy-souhrn-OIS-15-01-laboratorni-data-2026-01.pdf
//
// Data jsou stratifikována po ORP × pohlaví × věk × komorbidita, roky 2020–2025.
// Krajský a národní průměr počítáme jako populačně vážený průměr přes ORP:
// váha = „Počet osob s dostupnou hodnotou" (list Prošetřenost), hodnota =
// „Průměrná hodnota" (list Hodnoty), oba filtrované na řádky
// Věk=Celkem, Pohlaví=Celkem, Komorbidita=„Celá populace ČR".
//
// Použití:
//   1) Stáhni a rozbal ZIP (výše) do adresáře, např. /tmp/nzis-lab/
//   2) node scripts/extract-cholesterol-nzis.js /tmp/nzis-lab
// Výstup se zapíše do ingest/nzip-extracts/OIS-15-01-cholesterol.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'xlsx';
const XLSX = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SRC_DIR = process.argv[2] || process.env.NZIS_LAB_DIR;
if (!SRC_DIR) {
  console.error('Zadej adresář s rozbalenými XLSX soubory OIS-15-01 jako první argument.');
  console.error('Stáhni ZIP z https://www.nzip.cz/data/cvlv/datove-souhrny/Datovy-souhrn-OIS-15-01-laboratorni-data-2026-01.zip');
  process.exit(1);
}

const FILES = {
  celkovy: 'Datovy-souhrn-OIS-15-01-laboratorni-data-cholesterol-celkovy-2026-01.xlsx',
  ldl: 'Datovy-souhrn-OIS-15-01-laboratorni-data-cholesterol-ldl-2026-01.xlsx',
};

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
const KRAJ = {
  CZ010: 'Praha', CZ020: 'Středočeský', CZ031: 'Jihočeský', CZ032: 'Plzeňský',
  CZ041: 'Karlovarský', CZ042: 'Ústecký', CZ051: 'Liberecký', CZ052: 'Královéhradecký',
  CZ053: 'Pardubický', CZ063: 'Vysočina', CZ064: 'Jihomoravský', CZ071: 'Olomoucký',
  CZ072: 'Zlínský', CZ080: 'Moravskoslezský',
};
// Řádky reprezentující celou populaci (bez dvojího započtení komorbidit).
const isTotalRow = r => r[5] === 'Celkem' && r[4] === 'Celkem' && r[6] === 'Celá populace ČR';

function loadParam(file) {
  const wb = XLSX.read(fs.readFileSync(path.join(SRC_DIR, file)), { type: 'buffer' });
  // Hodnoty: 0 ORP,1 ORPkod,2 Okres,3 Okreskod,4 Pohlaví,5 Věk,6 Komorbidita, 7-12 průměr, 13-18 % nad prahem
  const H = XLSX.utils.sheet_to_json(wb.Sheets['Hodnoty'], { header: 1, blankrows: false }).slice(3);
  // Prošetřenost: 0 ORP,1 ORPkod,2 Okreskod,3 Okres,4 Pohlaví,5 Věk,6 Komorbidita, 25-30 počet s dostupnou hodnotou
  const P = XLSX.utils.sheet_to_json(wb.Sheets['Prošetřenost'], { header: 1, blankrows: false }).slice(4);
  const val = {}, wgt = {};
  for (const r of H) if (isTotalRow(r)) val[r[1]] = { okresk: String(r[3] || ''), mean: r.slice(7, 13), pct: r.slice(13, 19) };
  for (const r of P) if (isTotalRow(r)) wgt[r[1]] = r.slice(25, 31);
  return { val, wgt };
}

function weightedSeries(param, field) {
  const { val, wgt } = param;
  const nat = YEARS.map(() => ({ sw: 0, swv: 0 }));
  const kr = {}; Object.keys(KRAJ).forEach(k => kr[k] = YEARS.map(() => ({ sw: 0, swv: 0 })));
  for (const orp of Object.keys(val)) {
    const kcode = val[orp].okresk.slice(0, 5);
    if (!KRAJ[kcode]) continue;
    const w = wgt[orp] || [];
    YEARS.forEach((y, i) => {
      const v = val[orp][field][i], wi = w[i];
      if (typeof v === 'number' && typeof wi === 'number' && wi > 0) {
        nat[i].sw += wi; nat[i].swv += wi * v;
        kr[kcode][i].sw += wi; kr[kcode][i].swv += wi * v;
      }
    });
  }
  const natSeries = YEARS.map((y, i) => ({ year: y, value: nat[i].sw ? +(nat[i].swv / nat[i].sw).toFixed(2) : null, n: Math.round(nat[i].sw) }));
  const krByYear = {};
  YEARS.forEach((y, i) => {
    krByYear[y] = Object.keys(KRAJ).map(k => ({ code: k, name: KRAJ[k], value: kr[k][i].sw ? +(kr[k][i].swv / kr[k][i].sw).toFixed(2) : null }));
  });
  return { natSeries, krByYear };
}

const celkovy = loadParam(FILES.celkovy);
const ldl = loadParam(FILES.ldl);

const totMean = weightedSeries(celkovy, 'mean');
const totPct = weightedSeries(celkovy, 'pct');
const ldlMean = weightedSeries(ldl, 'mean');

const REF_YEAR = 2025;
const out = {
  ois_code: 'OIS-15-01',
  source_file: 'Datovy-souhrn-OIS-15-01-laboratorni-data-*-2026-01.xlsx',
  source_url: 'https://www.nzip.cz/data/2780-laboratorni-data-datovy-souhrn',
  source_name: 'ÚZIS ČR — NZIS Open, „Prošetřenost a hodnoty laboratorních parametrů v NZIS" (OIS 15-01), ISSN 2695-0340',
  publisher_update: '2026-06-16',
  method_note: 'Populačně vážený průměr přes ORP (váha = počet osob s dostupnou hodnotou parametru), řádky Věk=Celkem, Pohlaví=Celkem, Komorbidita=„Celá populace ČR". Okres→kraj podle prefixu NUTS3 (prvních 5 znaků kódu okresu).',
  ref_year: REF_YEAR,
  total_cholesterol: {
    unit: 'mmol/l',
    national_trend: totMean.natSeries,
    pct_over_6_2_national: totPct.natSeries,
    kraje_ref_year: totMean.krByYear[REF_YEAR],
  },
  ldl_cholesterol: {
    unit: 'mmol/l',
    national_trend: ldlMean.natSeries,
    kraje_ref_year: ldlMean.krByYear[REF_YEAR],
  },
};

const outPath = path.join(ROOT, 'ingest', 'nzip-extracts', 'OIS-15-01-cholesterol.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log('Zapsáno:', path.relative(ROOT, outPath));
console.log('Celkový cholesterol národní trend:', out.total_cholesterol.national_trend.map(p => `${p.year}:${p.value}`).join(' '));
console.log('LDL národní trend:', out.ldl_cholesterol.national_trend.map(p => `${p.year}:${p.value}`).join(' '));
