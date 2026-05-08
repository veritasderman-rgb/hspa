// SÚKL · OpenData fetcher — Hlášení o uvedení/přerušení/ukončení/obnovení dodávek
// léčivých přípravků na trh ("MR feed"). Slouží jako primární zdroj pro nový HSPA
// indikátor `vypadky_leciv_aktivni` (počet aktuálně přerušených/ukončených LP).
//
// SÚKL feed: https://opendata.sukl.cz/?q=katalog/hlaseni-o-uvedeni-preruseni-ukonceni-obnoveni-dodavek-leciveho-pripravku-na-trh
// ZIP archiv: https://opendata.sukl.cz/soubory/MR/mr.zip (cca 800 kB, denní update)
// Datové rozhraní: https://opendata.sukl.cz/soubory/MR_datove_rozhrani20230301.csv
//
// Sloupce mr_hlaseni:
//   POSLEDNI_PLATNE_HLASENI, KOD_SUKL, NAZEV, DOPLNEK, REG, ATC,
//   TYP_OZNAMENI (U=uvedení, P=přerušení, K=ukončení, O=obnovení),
//   PLATNOST_OD, DATUM_HLASENI, NAHRAZUJICI_LP, NAHRAZUJICI_LP_POZNAMKA,
//   DUVOD_PRERUSENI_UKONCENI, TERMIN_OBNOVENI
//
// Algoritmus:
//   1. Stáhnout CSV (zatím přes přímý CSV endpoint, ZIP extrakce viz lekárny —
//      přidá se v navazujícím milníku, jakmile bude dostupná nativní unzip lib).
//   2. Pro každý KOD_SUKL si vzít POSLEDNI_PLATNE_HLASENI (= aktuální stav).
//   3. Spočítat:
//        - active_disruptions = řádky kde TYP_OZNAMENI ∈ {P, K} a (TERMIN_OBNOVENI
//          je v budoucnu nebo prázdný)
//        - resolutions_30d = řádky kde TYP_OZNAMENI = O a DATUM_HLASENI ≥ now-30d
//        - new_disruptions_30d = řádky kde TYP_OZNAMENI ∈ {P, K} a DATUM_HLASENI ≥ now-30d
//        - top_atc_groups = top 5 ATC tříd s nejvyšším počtem aktivních výpadků
//   4. Uložit do ingest/cache/sukl_mr_aggregated.json.
//
// Metodická poznámka: SÚKL nedrží vyhrazený "current state" snapshot — feed je
// kumulativní (od 31. 12. 2007). Aktivní výpadek = poslední platné hlášení pro
// daný KOD_SUKL je P nebo K bez následného O. Tato deduplikace je logikou tohoto
// fetcheru, nikoli SÚKL.

import { fetchWithRetry } from '../lib/http.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';
import { parseCsv } from '../lib/csv.js';

const RAW_CACHE = 'sukl_mr_raw.json';
const AGG_CACHE = 'sukl_mr_aggregated.json';

// Mapování ATC anatomických tříd (1. písmeno) na lidský popis.
// Reference: WHO Collaborating Centre for Drug Statistics Methodology
// (https://www.whocc.no/atc/structure_and_principles/).
export const ATC_GROUPS = {
  A: 'Trávicí trakt a metabolismus',
  B: 'Krev a krvetvorba',
  C: 'Kardiovaskulární systém',
  D: 'Dermatologika',
  G: 'Urogenitální trakt a pohlavní hormony',
  H: 'Systémové hormonální přípravky',
  J: 'Antiinfektiva pro systémové použití',
  L: 'Cytostatika a imunomodulancia',
  M: 'Muskuloskeletální systém',
  N: 'Nervový systém',
  P: 'Antiparazitika, insekticidy, repelenty',
  R: 'Respirační systém',
  S: 'Smyslové orgány',
  V: 'Různé',
};

/**
 * Naparsuje CSV z SÚKL MR feedu.
 * Oddělovač `;`, kódování CP1250 (na úrovni HTTP fetch musí být převedeno na UTF-8;
 * lib/http.js to dělá pro `parse: 'text'`, pokud Content-Type explicitně neuvádí).
 *
 * @param {string} csvText
 * @returns {Array<{
 *   kod_sukl: string, nazev: string, doplnek: string, atc: string,
 *   typ: string, platnost_od: string, datum_hlaseni: string,
 *   nahrazujici_lp: string, duvod: string, termin_obnoveni: string,
 *   posledni_platne: string,
 * }>}
 */
export function parseMrCsv(csvText) {
  const rows = parseCsv(csvText, { delimiter: ';' });
  return rows
    .map(r => ({
      kod_sukl: (r.KOD_SUKL ?? r.kod_sukl ?? '').trim(),
      nazev: (r.NAZEV ?? r.nazev ?? '').trim(),
      doplnek: (r.DOPLNEK ?? r.doplnek ?? '').trim(),
      atc: (r.ATC ?? r.atc ?? '').trim().toUpperCase(),
      typ: (r.TYP_OZNAMENI ?? r.typ_oznameni ?? '').trim().toUpperCase(),
      platnost_od: (r.PLATNOST_OD ?? r.platnost_od ?? '').trim(),
      datum_hlaseni: (r.DATUM_HLASENI ?? r.datum_hlaseni ?? '').trim(),
      nahrazujici_lp: (r.NAHRAZUJICI_LP ?? r.nahrazujici_lp ?? '').trim(),
      duvod: (r.DUVOD_PRERUSENI_UKONCENI ?? r.duvod_preruseni_ukonceni ?? '').trim(),
      termin_obnoveni: (r.TERMIN_OBNOVENI ?? r.termin_obnoveni ?? '').trim(),
      posledni_platne: (r.POSLEDNI_PLATNE_HLASENI ?? r.posledni_platne_hlaseni ?? '').trim(),
    }))
    .filter(r => r.kod_sukl);
}

/**
 * Z kumulativního MR feedu spočítá aktuální stav výpadků.
 *
 * Pravidla:
 *   - "Aktivní výpadek" = poslední platné hlášení pro KOD_SUKL je P (přerušení)
 *     nebo K (ukončení), a (a) TERMIN_OBNOVENI je prázdný nebo (b) > now.
 *   - Deduplikace: pokud má LP více řádků, bere se ten s nejvyšším DATUM_HLASENI
 *     (ISO datum yyyy-mm-dd se string-řazením srovná správně).
 *
 * @param {Array} rows - výstup parseMrCsv
 * @param {Date} [now] - referenční čas (pro testy)
 * @returns {{
 *   total_unique_lp: number,
 *   active_disruptions: number,
 *   active_share_pct: number,
 *   new_disruptions_30d: number,
 *   resolutions_30d: number,
 *   active_with_substitute_pct: number,
 *   top_atc_groups: Array<{atc:string, label:string, count:number}>,
 *   sample: Array,
 * }}
 */
export function aggregateMr(rows, now = new Date()) {
  // Krok 1: dedup — pro každý KOD_SUKL drž jen nejnovější hlášení.
  const latest = new Map();
  for (const r of rows) {
    const prev = latest.get(r.kod_sukl);
    if (!prev || r.datum_hlaseni > prev.datum_hlaseni) {
      latest.set(r.kod_sukl, r);
    }
  }

  // Krok 2: filtrace aktivních výpadků.
  const isoNow = toIsoDate(now);
  const iso30dAgo = toIsoDate(new Date(now.getTime() - 30 * 24 * 3600 * 1000));

  let active = 0;
  let activeWithSubstitute = 0;
  const atcCounter = new Map();
  const sample = [];

  for (const r of latest.values()) {
    if (r.typ === 'P' || r.typ === 'K') {
      const stillActive = !r.termin_obnoveni || r.termin_obnoveni > isoNow;
      if (stillActive) {
        active++;
        if (r.nahrazujici_lp) activeWithSubstitute++;
        const atcLetter = r.atc.charAt(0);
        if (atcLetter) atcCounter.set(atcLetter, (atcCounter.get(atcLetter) ?? 0) + 1);
        if (sample.length < 20) {
          sample.push({
            kod_sukl: r.kod_sukl,
            nazev: r.nazev,
            doplnek: r.doplnek,
            atc: r.atc,
            typ: r.typ,
            platnost_od: r.platnost_od,
            termin_obnoveni: r.termin_obnoveni,
            duvod: r.duvod,
            ma_nahradu: !!r.nahrazujici_lp,
          });
        }
      }
    }
  }

  // Krok 3: 30denní okno — nová hlášení.
  let new30 = 0;
  let res30 = 0;
  for (const r of rows) {
    if (!r.datum_hlaseni || r.datum_hlaseni < iso30dAgo) continue;
    if (r.typ === 'P' || r.typ === 'K') new30++;
    else if (r.typ === 'O') res30++;
  }

  const totalUnique = latest.size;
  const topAtc = [...atcCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([atc, count]) => ({ atc, label: ATC_GROUPS[atc] ?? 'Neuvedeno', count }));

  return {
    total_unique_lp: totalUnique,
    active_disruptions: active,
    active_share_pct: totalUnique > 0 ? +(active / totalUnique * 100).toFixed(2) : 0,
    new_disruptions_30d: new30,
    resolutions_30d: res30,
    active_with_substitute_pct: active > 0 ? +(activeWithSubstitute / active * 100).toFixed(1) : 0,
    top_atc_groups: topAtc,
    sample,
  };
}

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Hlavní vstupní bod fetcheru.
 *
 * @param {{ force?: boolean, fetchImpl?: typeof fetch, endpoint?: string }} [opts]
 */
export async function fetchSuklMr(opts = {}) {
  const { force = false, fetchImpl, endpoint } = opts;

  let raw = force ? null : readCacheIfFresh(RAW_CACHE);
  let fromCache = raw != null;

  if (!raw) {
    // SÚKL distribuuje feed jako ZIP, ale pro robustnost nejprve zkusíme přímou
    // CSV variantu (kterou poskytuje pro některá svá data). Pokud selže, fall
    // back na ZIP — extrakce zatím není implementována, viz issue v sukl.js
    // pro obecnou ZIP infrastrukturu.
    const candidates = endpoint ? [endpoint] : [
      'https://opendata.sukl.cz/soubory/MR/mr.csv',
    ];
    let lastErr;
    for (const url of candidates) {
      try {
        console.log(`  [sukl-mr] trying ${url}`);
        raw = await fetchWithRetry(url, { fetchImpl, parse: 'text' });
        writeCache(RAW_CACHE, { url, fetched_at: new Date().toISOString(), csv: raw });
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`  [sukl-mr] ${url} failed: ${err.message}`);
      }
    }
    if (!raw) {
      console.warn(`  [sukl-mr] all endpoints failed; agregát se nezmění`);
      return { fromCache: false, aggregated: null, error: lastErr?.message };
    }
  } else {
    console.log('  [sukl-mr] using fresh cache');
    raw = raw.csv ?? raw;
  }

  const rows = parseMrCsv(raw);
  const aggregated = aggregateMr(rows);
  writeCache(AGG_CACHE, {
    generated_at: new Date().toISOString(),
    source: 'https://opendata.sukl.cz/?q=katalog/hlaseni-o-uvedeni-preruseni-ukonceni-obnoveni-dodavek-leciveho-pripravku-na-trh',
    ...aggregated,
  });

  console.log(`  [sukl-mr] ${aggregated.active_disruptions} aktivních výpadků z ${aggregated.total_unique_lp} LP (${aggregated.active_share_pct} %)`);
  return { fromCache, aggregated };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchSuklMr().catch(err => {
    console.error('[sukl-mr] FAIL:', err.message);
    process.exit(1);
  });
}
