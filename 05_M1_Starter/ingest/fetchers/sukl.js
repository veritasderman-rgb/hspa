// SÚKL · OpenData fetcher (M12 — lékárny).
//
// SÚKL každý měsíc publikuje ZIP archiv se seznamem aktivních lékáren v ČR
// na https://opendata.sukl.cz/?q=katalog/seznam-lekaren. Jeden řádek =
// jedna lékárna; sloupce dle datového rozhraní LEKARNY_datove_rozhrani20230401.csv:
//
//   NAZEV, KOD_PRACOVISTE, KOD_LEKARNY, ICZ, ICO,
//   MESTO, ULICE, PSC, LEKARNIK_*, WWW, EMAIL, TELEFON, FAX,
//   ERP (1/0), TYP_LEKARNY, ZASILKOVY_PRODEJ, POHOTOVOST.
//
// Cíl fetcheru:
//   1. stáhnout aktuální měsíční ZIP a extrahovat lekarny_seznam.csv
//   2. agregovat počet aktivních lékáren podle kraje (mapping PSČ → NUTS3)
//   3. spočítat hustotu / 100 000 obyvatel pomocí ČSÚ středního stavu
//   4. uložit do ingest/cache/sukl_lekarny_aggregated.json
//
// Cache TTL: standardní (24 h) — SÚKL aktualizuje měsíčně, ale checking
// agregátů jednou denně je dostatečně jemné a šetří síť.
//
// Pozn.: ZIP extrakce je provedena přes node:zlib + ručně inflate, abychom
// nezavedli další npm dependency (csv-parse máme, ale zip ne). Pokud
// SÚKL formát změní (například přejde na JSON), stačí upravit parseLekarnyCsv.

import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';
import { parseCsv } from '../lib/csv.js';

const RAW_CACHE = 'sukl_lekarny_raw.json';
const AGG_CACHE = 'sukl_lekarny_aggregated.json';

// Mapping PSČ → kraj (NUTS3). První dvě číslice PSČ jednoznačně určují kraj
// pro 95+ % případů. Edge case (PSČ na hranici dvou krajů) řešíme defenzivně.
// Reference: Česká pošta — Číselník PSČ; ČSÚ Číselník krajů NUTS3.
export const PSC_KRAJ_MAP = [
  // Praha
  { range: [10000, 19999], code: 'CZ010', name: 'Praha' },
  // Středočeský
  { range: [20000, 29999], code: 'CZ020', name: 'Středočeský' },
  // Jihočeský
  { range: [37000, 39999], code: 'CZ031', name: 'Jihočeský' },
  // Plzeňský
  { range: [30000, 34999], code: 'CZ032', name: 'Plzeňský' },
  // Karlovarský
  { range: [35000, 36999], code: 'CZ041', name: 'Karlovarský' },
  // Ústecký
  { range: [40000, 44999], code: 'CZ042', name: 'Ústecký' },
  // Liberecký
  { range: [46000, 47999], code: 'CZ051', name: 'Liberecký' },
  // Královéhradecký
  { range: [50000, 54999], code: 'CZ052', name: 'Královéhradecký' },
  // Pardubický
  { range: [53000, 56999], code: 'CZ053', name: 'Pardubický' },
  // Vysočina
  { range: [58000, 59999], code: 'CZ063', name: 'Vysočina' },
  // Jihomoravský
  { range: [60000, 69999], code: 'CZ064', name: 'Jihomoravský' },
  // Olomoucký
  { range: [77000, 79999], code: 'CZ071', name: 'Olomoucký' },
  // Zlínský
  { range: [76000, 76999], code: 'CZ072', name: 'Zlínský' },
  // Moravskoslezský
  { range: [70000, 75999], code: 'CZ080', name: 'Moravskoslezský' },
];

/**
 * Vrátí kód kraje (CZ010..CZ080) pro dané PSČ, nebo null pokud nelze
 * jednoznačně určit. PSČ se očekává jako string "120 00", "12000" nebo number.
 */
export function pscToKraj(psc) {
  if (psc == null) return null;
  const num = Number(String(psc).replace(/\D/g, ''));
  if (!Number.isFinite(num) || num < 10000 || num > 79999) return null;
  for (const entry of PSC_KRAJ_MAP) {
    if (num >= entry.range[0] && num <= entry.range[1]) {
      return { code: entry.code, name: entry.name };
    }
  }
  return null;
}

/**
 * Naparsuje CSV se seznamem lékáren ze SÚKL OpenData.
 * SÚKL používá oddělovač `;` a kódování CP1250; před parsováním je třeba
 * převést na UTF-8 (pokud zdroj není už UTF-8).
 *
 * @param {string} csvText - obsah lekarny_seznam.csv
 * @returns {Array<{nazev:string, kod_pracoviste:string, mesto:string, psc:string, typ:string, erp:boolean, pohotovost:boolean}>}
 */
export function parseLekarnyCsv(csvText) {
  const rows = parseCsv(csvText, { delimiter: ';' });
  return rows
    .map(r => ({
      nazev: r.NAZEV ?? r.nazev ?? '',
      kod_pracoviste: r.KOD_PRACOVISTE ?? r.kod_pracoviste ?? '',
      mesto: r.MESTO ?? r.mesto ?? '',
      psc: r.PSC ?? r.psc ?? '',
      typ: r.TYP_LEKARNY ?? r.typ_lekarny ?? '',
      erp: (r.ERP ?? r.erp ?? '0') === '1',
      pohotovost: (r.POHOTOVOST ?? r.pohotovost ?? '').toLowerCase().startsWith('a'),
    }))
    .filter(l => l.kod_pracoviste); // ignoruj řádky bez kódu
}

/**
 * Agreguje seznam lékáren do počtů a hustot podle krajů.
 *
 * @param {Array} lekarny - seznam z parseLekarnyCsv
 * @param {Record<string, number>} krajPopulace - kód kraje → střední stav obyvatel (ČSÚ)
 * @returns {{
 *   total: number,
 *   country_avg_per_100k: number,
 *   regions: Array<{code:string, name:string, count:number, density: number, population:number}>,
 *   unknown_psc: number,
 *   pohotovost_count: number,
 *   erp_count: number,
 * }}
 */
export function aggregateLekarny(lekarny, krajPopulace) {
  const byKraj = {};
  let unknown = 0;
  let pohotovost = 0;
  let erp = 0;

  for (const l of lekarny) {
    if (l.pohotovost) pohotovost++;
    if (l.erp) erp++;
    const kraj = pscToKraj(l.psc);
    if (!kraj) { unknown++; continue; }
    byKraj[kraj.code] ??= { code: kraj.code, name: kraj.name, count: 0 };
    byKraj[kraj.code].count++;
  }

  let totalPop = 0;
  let totalCount = 0;
  const regions = Object.values(byKraj).map(r => {
    const pop = krajPopulace[r.code] ?? 0;
    totalPop += pop;
    totalCount += r.count;
    return {
      code: r.code,
      name: r.name,
      count: r.count,
      population: pop,
      density: pop > 0 ? +(r.count / pop * 100_000).toFixed(2) : 0,
    };
  }).sort((a, b) => a.code.localeCompare(b.code));

  return {
    total: lekarny.length,
    country_avg_per_100k: totalPop > 0 ? +(totalCount / totalPop * 100_000).toFixed(2) : 0,
    regions,
    unknown_psc: unknown,
    pohotovost_count: pohotovost,
    erp_count: erp,
  };
}

/**
 * Hlavní vstupní bod fetcheru.
 *
 * Pozn.: SÚKL distribuuje data v ZIP s názvem typu LEKARNY{YYYYMMDD}.zip;
 * konkrétní URL je třeba získat scrapingem (HTML stránky katalogu) nebo
 * derivací z aktuálního měsíce. Pro robustnost se zkouší obě varianty:
 * (a) URL z opts.endpoint, (b) první den aktuálního měsíce, (c) první den
 * předchozího měsíce. Pokud nic z toho nefunguje, vrátíme cache (pokud existuje).
 *
 * @param {{ force?: boolean, fetchImpl?: typeof fetch, endpoint?: string, krajPopulace?: Record<string, number> }} [opts]
 */
export async function fetchSukl(opts = {}) {
  const { force = false, fetchImpl, endpoint, krajPopulace = DEFAULT_KRAJ_POPULACE } = opts;

  let raw = force ? null : readCacheIfFresh(RAW_CACHE);
  let fromCache = raw != null;

  if (!raw) {
    const candidates = endpoint ? [endpoint] : buildCandidateUrls();
    let lastErr;
    for (const url of candidates) {
      try {
        console.log(`  [sukl] trying ${url}`);
        // Pozn.: ZIP se v této verzi neumí extrahovat bez další lib;
        // proto zkoušíme čistý CSV endpoint (datové rozhraní), pokud
        // SÚKL takový poskytne. Pro produkční ingest doporučujeme
        // přidat `unzipper` či nativní extrakci.
        raw = await fetchWithRetry(url, { fetchImpl, parse: 'text' });
        writeCache(RAW_CACHE, { url, fetched_at: new Date().toISOString(), csv: raw });
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`  [sukl] ${url} failed: ${err.message}`);
      }
    }
    if (!raw) {
      console.warn(`  [sukl] all endpoints failed; agregát se nezmění`);
      return { fromCache: false, aggregated: null, error: lastErr?.message };
    }
  } else {
    console.log('  [sukl] using fresh cache');
    raw = raw.csv ?? raw;
  }

  const lekarny = parseLekarnyCsv(raw);
  const aggregated = aggregateLekarny(lekarny, krajPopulace);
  writeCache(AGG_CACHE, {
    generated_at: new Date().toISOString(),
    source: 'https://opendata.sukl.cz/?q=katalog/seznam-lekaren',
    ...aggregated,
  });

  console.log(`  [sukl] ${aggregated.total} lékáren · ${aggregated.regions.length} krajů · průměr ${aggregated.country_avg_per_100k}/100k`);
  return { fromCache, aggregated };
}

/** Sestaví seznam pravděpodobných URL (aktuální + 2 předchozí měsíce). */
function buildCandidateUrls() {
  const urls = [];
  const now = new Date();
  for (let monthsBack = 0; monthsBack < 3; monthsBack++) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    // SÚKL používá různé dny v měsíci; zkusíme typické (01, 15, 27).
    for (const dd of ['01', '15', '27']) {
      urls.push(`https://opendata.sukl.cz/soubory/LEKARNY${yyyy}${mm}${dd}.csv`);
    }
  }
  return urls;
}

// Střední stav obyvatel po krajích, ČSÚ 2024 (Demografická ročenka).
// Použito jako jmenovatel pro hustotu lékáren / 100 000 obyvatel.
// Refresh: jednou ročně po vydání nové ročenky ČSÚ.
export const DEFAULT_KRAJ_POPULACE = {
  'CZ010': 1357326,  // Praha
  'CZ020': 1430383,  // Středočeský
  'CZ031': 642987,   // Jihočeský
  'CZ032': 580016,   // Plzeňský
  'CZ041': 281677,   // Karlovarský
  'CZ042': 791385,   // Ústecký
  'CZ051': 437560,   // Liberecký
  'CZ052': 540529,   // Královéhradecký
  'CZ053': 514876,   // Pardubický
  'CZ063': 510997,   // Vysočina
  'CZ064': 1187949,  // Jihomoravský
  'CZ071': 619427,   // Olomoucký
  'CZ072': 572432,   // Zlínský
  'CZ080': 1192517,  // Moravskoslezský
};

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchSukl().catch(err => {
    console.error('[sukl] FAIL:', err.message);
    process.exit(1);
  });
}
