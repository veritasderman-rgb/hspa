// Naděje dožití při narození (e0) z ČSÚ open dat → data/regions.json:
//   1) okresní rozpad (blok `okresy`) pro datasety nadeje_doziti_zeny
//      a nadeje_doziti_muzi   — sada OBY04BO, výběr OBY04BOT01 (5leté průměry)
//   2) krajský dataset nadeje_doziti_muzi — sada OBY04BK, výběr OBY04BKT01
//      (dvouleté průměry; ČSÚ krajské tabulky publikuje po dvouletích)
//      + národní průměr ČR — sada OBY04BCR, výběr OBY04BCRT01 (jednoletá řada)
//
// API: https://data.csu.gov.cz/api/dotaz/v1/data/vybery/{VYBER}?rozsah=CELY_VYBER
// (JSON-stat 2.0; default rozsah vrací jen ukázku; server občas utne stream —
// proto retry s validací JSON).
//
// Metodika (§4 poznámky):
// - ČSÚ publikuje úmrtnostní tabulky VŽDY po pohlavích; „obě pohlaví" na
//   okresní/krajské úrovni neexistuje → okresy jen k pohlavně specifickým
//   datasetům (ženy↔ženy, muži↔muži), nadeje_doziti_total zůstává bez okresů.
// - Publikační žebřík period: ČR jednoletá / kraje 2letá / okresy 5letá —
//   všechny úrovně nesou viditelnou poznámku s obdobím.
// - Kód kraje = prefix LAU1 kódu okresu (CZ0201→CZ020); poslední znak LAU1
//   jde za 9 do písmen (CZ020A/B/C).
//
// Spuštění:  node scripts/fetch-okres-nadeje-doziti.mjs
// (idempotentní — bloky okresy a dataset muzi přepíše, zbytek souboru nemění)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGIONS_PATH = path.join(ROOT, 'data', 'regions.json');

const API = 'https://data.csu.gov.cz/api/dotaz/v1/data/vybery';
const AGE0_CODE = '400000600001000'; // položka „0" dimenze VEK1UT (e0 při narození)
const SEX = { muzi: '1', zeny: '2' }; // číselník POHZM

async function fetchJsonStat(vyber, { retries = 4 } = {}) {
  const url = `${API}/${vyber}?rozsah=CELY_VYBER`;
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'ZdraveCesko-HSPA/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const js = JSON.parse(text); // server občas utne stream → JSON.parse jako validace
      if (js.class !== 'dataset' || !Array.isArray(js.id)) throw new Error('není JSON-stat dataset');
      return js;
    } catch (err) {
      lastErr = err;
      console.warn(`  [csu] ${vyber} pokus ${i + 1}/${retries} selhal: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw new Error(`ČSÚ výběr ${vyber}: ${lastErr.message}`);
}

/** Obecné čtení JSON-stat: vrátí value pro zadané kódy položek per dimenze. */
function makeReader(js) {
  const dims = js.id;
  const size = js.size;
  const idx = {};
  for (const d of dims) idx[d] = js.dimension[d].category.index;
  return {
    dims, idx,
    label: (dim) => js.dimension[dim].category.label || {},
    value(picks) { // picks: { DIM: 'kod' } ; nevyjmenované dimenze = index 0
      let o = 0;
      for (let k = 0; k < dims.length; k++) {
        const d = dims[k];
        const pick = picks[d];
        const i = pick == null ? 0 : idx[d][pick];
        if (i == null) throw new Error(`dimenze ${d}: položka ${pick} nenalezena`);
        o = o * size[k] + i;
      }
      return js.value[o];
    },
    codes: (dim) => Object.keys(idx[dim]),
    lastPeriod: (dim) => Object.keys(idx[dim]).sort().slice(-1)[0],
  };
}

const round1 = v => Math.round(v * 10) / 10;

async function main() {
  const regions = JSON.parse(fs.readFileSync(REGIONS_PATH, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);

  // ── 1) Okresy (OBY04BOT01, 5leté průměry, obě pohlaví) ────────────────
  const ok = makeReader(await fetchJsonStat('OBY04BOT01'));
  const okPeriod = ok.lastPeriod('CAS5R');
  const okresyBySex = {};
  for (const [sexKey, sexCode] of Object.entries(SEX)) {
    const items = ok.codes('Uz3').map(code => ({
      code,
      name: ok.label('Uz3')[code],
      kraj: code.slice(0, 5),
      value: round1(ok.value({ Uz3: code, VEK1UT: AGE0_CODE, CAS5R: okPeriod, POHZM: sexCode })),
    })).sort((a, b) => a.code.localeCompare(b.code));
    if (items.length !== 77) throw new Error(`okresy/${sexKey}: čekáno 77, je ${items.length}`);
    if (items.some(o => !Number.isFinite(o.value) || o.value < 65 || o.value > 95)) {
      throw new Error(`okresy/${sexKey}: hodnota e0 mimo věrohodný rozsah 65–95`);
    }
    okresyBySex[sexKey] = items;
  }

  // ── 2) Kraje muži (OBY04BKT01, 2leté průměry) + ČR (OBY04BCRT01) ──────
  const kr = makeReader(await fetchJsonStat('OBY04BKT01'));
  const krPeriod = kr.lastPeriod('CAS2R');
  const krajeMuzi = kr.codes('Uz2').map(code => ({
    code,
    name: kr.label('Uz2')[code],
    value: round1(kr.value({ Uz2: code, VEK1UT: AGE0_CODE, CAS2R: krPeriod, POHZM: SEX.muzi })),
  })).sort((a, b) => a.code.localeCompare(b.code));
  if (krajeMuzi.length !== 14) throw new Error(`kraje muži: čekáno 14, je ${krajeMuzi.length}`);

  const cr = makeReader(await fetchJsonStat('OBY04BCRT01'));
  const crYear = cr.lastPeriod('CasRC');
  const crMuzi = round1(cr.value({ VEK1UT: AGE0_CODE, CasRC: crYear, POHZM: SEX.muzi }));

  // ── 3) Zápis: okresy k ženám ───────────────────────────────────────────
  const dz = regions.datasets.find(d => d.indicator_id === 'nadeje_doziti_zeny');
  if (!dz) throw new Error('Dataset nadeje_doziti_zeny nenalezen');
  dz.okresy = {
    source: 'ČSÚ — Úmrtnostní tabulky za okresy (OBY04BO, výběr OBY04BOT01)',
    source_url: 'https://data.csu.gov.cz/vybery/OBY04BOT01',
    period: okPeriod,
    note: `Naděje dožití žen při narození, pětiletý průměr ${okPeriod} (ČSÚ okresní tabulky publikuje kvůli malým populacím jen jako 5leté průměry a po pohlavích). Krajská čísla výše jsou jednoletá — hodnoty proto nejsou identické, ale řádově souhlasí.`,
    fetched_at: today,
    items: okresyBySex.zeny,
  };

  // ── 4) Zápis: krajský dataset muži (vytvoří/aktualizuje) ───────────────
  let dm = regions.datasets.find(d => d.indicator_id === 'nadeje_doziti_muzi');
  if (!dm) {
    dm = { id: 'nadeje_doziti_muzi', indicator_id: 'nadeje_doziti_muzi' };
    // zařadit hned za dataset žen, ať jsou v selectoru u sebe
    const at = regions.datasets.indexOf(dz);
    regions.datasets.splice(at + 1, 0, dm);
  }
  Object.assign(dm, {
    name: 'Naděje dožití (muži)',
    unit: 'let',
    year: Number(krPeriod.slice(-4)),
    country_avg: crMuzi,
    direction: 'higher_is_better',
    regions: krajeMuzi.map(k => ({ code: k.code, name: k.name, value: k.value })),
    source: {
      name: `ČSÚ — Úmrtnostní tabulky za kraje (OBY04BK; dvouletý průměr ${krPeriod}); průměr ČR jednoletá tabulka ${crYear} (OBY04BCR)`,
      url: 'https://data.csu.gov.cz/vybery/OBY04BKT01',
    },
    okresy: {
      source: 'ČSÚ — Úmrtnostní tabulky za okresy (OBY04BO, výběr OBY04BOT01)',
      source_url: 'https://data.csu.gov.cz/vybery/OBY04BOT01',
      period: okPeriod,
      note: `Naděje dožití mužů při narození, pětiletý průměr ${okPeriod}. Krajská čísla jsou dvouletý průměr ${krPeriod}, průměr ČR jednoletá tabulka ${crYear} — ČSÚ publikuje jemnější území s delším průměrovacím oknem (malé populace), hodnoty proto nejsou identické, ale řádově souhlasí.`,
      fetched_at: today,
      items: okresyBySex.muzi,
    },
  });

  // ── 5) §4 kontrola: kraj v rozsahu svých okresů (±1,5) ────────────────
  for (const ds of [dz, dm]) {
    for (const r of ds.regions) {
      const vals = ds.okresy.items.filter(o => o.kraj === r.code).map(o => o.value);
      if (!vals.length) throw new Error(`${ds.indicator_id}/${r.code}: žádné okresy`);
      const mn = Math.min(...vals) - 1.5, mx = Math.max(...vals) + 1.5;
      if (r.value < mn || r.value > mx) {
        throw new Error(`${ds.indicator_id}/${r.code}: kraj ${r.value} mimo rozsah okresů ${mn}–${mx}`);
      }
    }
  }

  fs.writeFileSync(REGIONS_PATH, JSON.stringify(regions, null, 2) + '\n');
  console.log(`[okresy-e0] OK: ženy okresy (${okPeriod}), muži kraje (${krPeriod}, ČR ${crYear}=${crMuzi}) + okresy — zapsáno`);
}

main().catch(err => { console.error('[okresy-e0] FAIL:', err.message); process.exit(1); });
