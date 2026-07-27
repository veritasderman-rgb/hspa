// Stáhne naději dožití při narození (e0) po OKRESECH z ČSÚ open dat
// a vloží ji jako `okresy` do datasetu nadeje_doziti_zeny v data/regions.json.
//
// Zdroj: ČSÚ datová sada OBY04BO „Úmrtnostní tabulky za okresy",
// předdefinovaný výběr OBY04BOT01 „Naděje dožití v okresech",
// API: https://data.csu.gov.cz/api/dotaz/v1/data/vybery/OBY04BOT01
//   ?rozsah=CELY_VYBER  (JSON-stat 2.0; default rozsah vrací jen Prahu)
//
// Metodika (§4 poznámky):
// - ČSÚ publikuje okresní úmrtnostní tabulky POUZE jako pětileté průměry
//   (vyloučení nahodilých výkyvů malých populací) a POUZE po pohlavích —
//   okresní hodnota „obě pohlaví dohromady" neexistuje. Proto se okresní
//   rozpad připojuje jen k datasetu nadeje_doziti_zeny (ženy ↔ ženy),
//   NE k nadeje_doziti_total (obě pohlaví — nesrovnatelná veličina).
// - Krajská čísla v regions.json jsou jednoletá (Demografická ročenka);
//   okresní jsou 5letý průměr → v UI je nutné období viditelně označit.
// - Kód kraje = prvních 5 znaků kódu okresu (CZ0201 → CZ020, CZ0100 → CZ010).
//
// Spuštění:  node scripts/fetch-okres-nadeje-doziti.mjs
// (idempotentní — okresy přepíše novým stažením, zbytek souboru nemění)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGIONS_PATH = path.join(ROOT, 'data', 'regions.json');

const API_URL = 'https://data.csu.gov.cz/api/dotaz/v1/data/vybery/OBY04BOT01?rozsah=CELY_VYBER';
const AGE0_CODE = '400000600001000'; // položka „0" dimenze VEK1UT (věk 0 = e0 při narození)
const SEX_F = '2'; // POHZM: 1 = muži, 2 = ženy

async function main() {
  console.log('[okresy-e0] stahuji', API_URL);
  const res = await fetch(API_URL, { headers: { 'User-Agent': 'ZdraveCesko-HSPA/1.0' } });
  if (!res.ok) throw new Error(`ČSÚ API HTTP ${res.status}`);
  const js = await res.json();
  if (js.class !== 'dataset' || !Array.isArray(js.id)) throw new Error('Neočekávaný tvar odpovědi (čekán JSON-stat 2.0 dataset)');

  const dims = js.id;
  const size = js.size;
  const idx = {};
  for (const d of dims) idx[d] = js.dimension[d].category.index;
  const value = (coord) => {
    let o = 0;
    for (let k = 0; k < dims.length; k++) o = o * size[k] + coord[k];
    return js.value[o];
  };

  // poslední dostupné pětileté období (kódy jsou "YYYY-YYYY", řadí se lexikograficky)
  const periods = Object.keys(idx.CAS5R).sort();
  const period = periods[periods.length - 1];

  const uzLabels = js.dimension.Uz3.category.label;
  const vek0 = idx.VEK1UT[AGE0_CODE];
  const cas = idx.CAS5R[period];
  if (vek0 == null) throw new Error(`Chybí položka věku 0 (${AGE0_CODE}) — struktura sady se změnila`);

  const okresy = Object.entries(idx.Uz3).map(([code, ui]) => {
    const v = value([0, ui, vek0, cas, idx.POHZM[SEX_F]]);
    return {
      code,
      name: uzLabels[code],
      kraj: code.slice(0, 5),
      value: Math.round(v * 10) / 10,
    };
  }).sort((a, b) => a.code.localeCompare(b.code));

  if (okresy.length !== 77) throw new Error(`Čekáno 77 okresů, staženo ${okresy.length}`);
  if (okresy.some(o => !Number.isFinite(o.value) || o.value < 70 || o.value > 95)) {
    throw new Error('Hodnota e0 mimo věrohodný rozsah 70–95 let — zkontroluj extrakci');
  }

  const regions = JSON.parse(fs.readFileSync(REGIONS_PATH, 'utf8'));
  const ds = regions.datasets.find(d => d.indicator_id === 'nadeje_doziti_zeny');
  if (!ds) throw new Error('Dataset nadeje_doziti_zeny v regions.json nenalezen');

  ds.okresy = {
    source: 'ČSÚ — Úmrtnostní tabulky za okresy (OBY04BO, výběr OBY04BOT01)',
    source_url: 'https://data.csu.gov.cz/vybery/OBY04BOT01',
    period,
    note: `Naděje dožití žen při narození, pětiletý průměr ${period} (ČSÚ okresní tabulky publikuje kvůli malým populacím jen jako 5leté průměry a po pohlavích). Krajská čísla výše jsou jednoletá — hodnoty proto nejsou identické, ale řádově souhlasí.`,
    fetched_at: new Date().toISOString().slice(0, 10),
    items: okresy,
  };

  fs.writeFileSync(REGIONS_PATH, JSON.stringify(regions, null, 2) + '\n');
  console.log(`[okresy-e0] zapsáno ${okresy.length} okresů (období ${period}) do nadeje_doziti_zeny.okresy`);
}

main().catch(err => { console.error('[okresy-e0] FAIL:', err.message); process.exit(1); });
