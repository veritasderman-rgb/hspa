// ÚZIS · NRPZS fetcher (Národní registr poskytovatelů zdravotních služeb).
//
// Zdroj: ÚZIS open-data CSV „NR-01-06 NRPZS — místa poskytování zdravotních služeb"
//   https://datanzis.uzis.gov.cz/data/NR-01-NRPZS/NR-01-06/Otevrena-data-NR-01-06-nrpzs-mista-poskytovani-zdravotnich-sluzeb.csv
//   (původní API https://nrpzs.uzis.cz/api/v1/mista-poskytovani je nespolehlivé — 503/timeout,
//    v GitHub Actions „fetch failed"; open-data CSV je stabilní a měsíčně aktualizované).
// Cíl: agregovat počet míst poskytování zdravotní péče podle kraje
//      a typu specializace (oboru péče).
//
// Výstupy:
//   ingest/cache/nrpzs_raw.json         — celá odpověď z API
//   ingest/cache/nrpzs_aggregated.json  — agregát kraj × specializace
//
// Chování:
//   - retry s exponential backoff (CONFIG.retry)
//   - klientský cache: pokud je raw mladší než CONFIG.cache.ttl_hours, fetch se přeskočí
//   - User-Agent z CONFIG.uzis.user_agent
//   - každé HTTP volání zaznamenáno v ingest/cache/audit.log
//
// Kontrakt vrácené odpovědi z NRPZS není v dokumentaci striktně typovaný,
// proto agregace pracuje defenzivně přes helper funkce extractKraj/extractObor.

import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { parseCsv } from '../lib/csv.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';

const RAW_CACHE = 'nrpzs_raw.json';
const AGG_CACHE = 'nrpzs_aggregated.json';

/**
 * Defenzivní extrakce kraje z položky NRPZS.
 * Zkouší nejčastější varianty pojmenování v API a CSV exportech.
 * @returns {{code: string|null, name: string|null}}
 */
export function extractKraj(item) {
  const code = item?.kraj_kod ?? item?.kodKraje ?? item?.kraj?.kod ?? item?.uzemi_kod ?? item?.ZZ_kraj_kod ?? null;
  const name = item?.kraj_nazev ?? item?.nazevKraje ?? item?.kraj?.nazev ?? item?.kraj ?? item?.ZZ_kraj_nazev ?? null;
  return { code: code != null ? String(code) : null, name: name != null ? String(name) : null };
}

/**
 * Defenzivní extrakce oboru/specializace.
 * Místo poskytování může mít více oddělení; vrátíme pole oborů.
 * @returns {string[]}
 */
export function extractObory(item) {
  const candidates = [
    item?.obory,
    item?.specializace,
    item?.oddeleni?.map?.(o => o?.obor ?? o?.specializace),
    item?.druh_pece,
    // open-data CSV: ZZ_obor_pece bývá čárkou oddělený seznam více oborů
    // (~15 % řádků, např. „Klinický psycholog, psychiatrie") → rozdělit,
    // aby se počítaly jednotlivé obory, ne syntetický slepenec „A, B".
    item?.ZZ_obor_pece?.split(','),
  ].filter(Boolean).flat();

  const list = candidates
    .map(v => (typeof v === 'string' ? v.trim() : v?.nazev ?? v?.kod ?? null))
    .filter(Boolean);

  return list.length ? Array.from(new Set(list.map(String))) : ['nezarazeno'];
}

/**
 * Agregace seznamu míst poskytování na pivot kraj × obor.
 * @param {Array<Record<string, any>>} items
 * @returns {{
 *   total: number,
 *   by_kraj: Record<string, number>,
 *   by_obor: Record<string, number>,
 *   by_kraj_obor: Record<string, Record<string, number>>,
 *   unknown_kraj: number,
 * }}
 */
export function aggregateProviders(items) {
  const by_kraj = {};
  const by_obor = {};
  const by_kraj_obor = {};
  let unknown_kraj = 0;

  for (const item of items) {
    const { name: krajName, code: krajCode } = extractKraj(item);
    const krajKey = krajName || krajCode || null;
    if (!krajKey) unknown_kraj++;
    const krajLabel = krajKey ?? 'neznámý';

    by_kraj[krajLabel] = (by_kraj[krajLabel] || 0) + 1;

    const obory = extractObory(item);
    for (const obor of obory) {
      by_obor[obor] = (by_obor[obor] || 0) + 1;
      by_kraj_obor[krajLabel] ??= {};
      by_kraj_obor[krajLabel][obor] = (by_kraj_obor[krajLabel][obor] || 0) + 1;
    }
  }

  return {
    total: items.length,
    by_kraj,
    by_obor,
    by_kraj_obor,
    unknown_kraj,
  };
}

/**
 * Hlavní vstupní bod fetcheru.
 * @param {{ force?: boolean, fetchImpl?: typeof fetch }} [opts]
 *   - force: ignoruj cache a tahej znovu
 *   - fetchImpl: injektovaný fetch (pro testy)
 * @returns {Promise<{ raw: any, aggregated: ReturnType<typeof aggregateProviders>, fromCache: boolean }>}
 */
export async function fetchNrpzs(opts = {}) {
  const { force = false, fetchImpl } = opts;

  let raw = force ? null : readCacheIfFresh(RAW_CACHE);
  let fromCache = raw != null;

  if (!raw) {
    const url = CONFIG.uzis.nrpzs_opendata_csv;
    console.log(`  [nrpzs] fetching ${url}`);
    const csv = await fetchWithRetry(url, { parse: 'text', fetchImpl });
    raw = parseCsv(csv);
    writeCache(RAW_CACHE, raw);
  } else {
    console.log('  [nrpzs] using fresh cache');
  }

  const items = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
  const aggregated = aggregateProviders(items);
  writeCache(AGG_CACHE, {
    generated_at: new Date().toISOString(),
    source: CONFIG.uzis.nrpzs_opendata_csv,
    ...aggregated,
  });

  console.log(`  [nrpzs] ${aggregated.total} míst, ${Object.keys(aggregated.by_kraj).length} krajů, ${Object.keys(aggregated.by_obor).length} oborů`);
  return { raw, aggregated, fromCache };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchNrpzs().catch(err => {
    console.error('[nrpzs] FAIL:', err.message);
    process.exit(1);
  });
}
