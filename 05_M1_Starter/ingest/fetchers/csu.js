// ČSÚ · DataStat fetcher (M3).
//
// Pro každý dataset z csu_datasets.js:
//   1. zkusí primary (DataStat JSON API)
//   2. při selhání zkusí fallback (CSV z KROK databáze)
//   3. normalizuje na ploché observace { year, region, sex, age, value }
//   4. uloží surovinu do ingest/cache/csu_<id>.json
//
// Souhrn všech datasetů: ingest/cache/csu_demografie.json
//
// Mezi requesty je throttle podle CONFIG.throttle_ms (rate limiting).

import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';
import { parseCsv } from '../lib/csv.js';
import { CSU_DATASETS } from './csu_datasets.js';

const SUMMARY_CACHE = 'csu_demografie.json';

/**
 * Z odpovědi DataStat API vytáhne ploché observace.
 * Defenzivně podporuje více tvarů: JSON-stat 2.0, OData-style, plain array.
 * @param {any} raw
 * @returns {Array<{year:number|null, region:string|null, sex:string|null, age:string|null, value:number|null}>}
 */
export function normalizeDataStat(raw) {
  if (raw == null) return [];
  if (raw?.dataset?.value && raw?.dataset?.dimension) return parseJsonStat(raw.dataset);
  if (raw?.value && raw?.dimension && raw?.id) return parseJsonStat(raw);

  const items = Array.isArray(raw) ? raw
    : raw.data ?? raw.observations ?? raw.items ?? raw.values ?? [];
  if (!Array.isArray(items)) return [];
  return items.map(extractObservation).filter(o => o.value != null);
}

function extractObservation(item) {
  const year = item?.rok ?? item?.year ?? item?.cas ?? item?.period ?? item?.refyear ?? null;
  const region = item?.uzemi_kod ?? item?.uzemi ?? item?.region ?? item?.geo ?? item?.area ?? null;
  const sex = item?.pohlavi_kod ?? item?.pohlavi ?? item?.sex ?? null;
  const age = item?.vek_kod ?? item?.vek ?? item?.age ?? null;
  const valueRaw = item?.hodnota ?? item?.value ?? item?.observation ?? item?.obsValue ?? null;
  return {
    year: year != null ? Number(year) : null,
    region: region != null ? String(region) : null,
    sex: sex != null ? String(sex) : null,
    age: age != null ? String(age) : null,
    value: valueRaw == null || valueRaw === '' ? null : Number(valueRaw),
  };
}

/**
 * Parser JSON-stat 2.0 (zjednodušený). Vyrobí jednu observaci na index.
 * Předpokládá, že dimensions mají category.label (jméno → kód).
 */
function parseJsonStat(ds) {
  const dimIds = ds.id;
  const sizes = ds.size;
  const values = ds.value;
  const dims = dimIds.map(id => {
    const cat = ds.dimension[id]?.category ?? {};
    const codes = cat.index
      ? (Array.isArray(cat.index) ? cat.index : Object.keys(cat.index).sort((a, b) => cat.index[a] - cat.index[b]))
      : [];
    return { id, codes };
  });

  const out = [];
  const total = (Array.isArray(values) ? values.length : Object.keys(values).length);
  for (let i = 0; i < total; i++) {
    const v = Array.isArray(values) ? values[i] : values[String(i)];
    if (v == null) continue;
    const idx = unflatten(i, sizes);
    const tags = {};
    dims.forEach((d, k) => { tags[d.id] = d.codes[idx[k]]; });
    out.push({
      year: tags.cas != null ? Number(tags.cas) : (tags.rok != null ? Number(tags.rok) : null),
      region: tags.uzemi ?? tags.region ?? tags.geo ?? null,
      sex: tags.pohlavi ?? tags.sex ?? null,
      age: tags.vek ?? tags.age ?? null,
      value: Number(v),
    });
  }
  return out;
}

function unflatten(index, sizes) {
  const out = new Array(sizes.length);
  let rem = index;
  for (let k = sizes.length - 1; k >= 0; k--) {
    out[k] = rem % sizes[k];
    rem = Math.floor(rem / sizes[k]);
  }
  return out;
}

/**
 * Z CSV podle mapping a filter vytvoří observace.
 */
export function normalizeCsv(text, { mapping, filter } = {}) {
  const rows = parseCsv(text);
  const m = mapping ?? {};
  const observations = rows.map(r => ({
    year: r[m.year ?? 'rok'] != null ? Number(r[m.year ?? 'rok']) : null,
    region: r[m.region ?? 'uzemi_kod'] ?? null,
    sex: r[m.sex ?? 'pohlavi_kod'] ?? null,
    age: r[m.age ?? 'vek_kod'] ?? null,
    value: r[m.value ?? 'hodnota'] != null && r[m.value ?? 'hodnota'] !== ''
      ? Number(r[m.value ?? 'hodnota'])
      : null,
  })).filter(o => o.value != null);

  if (!filter) return observations;
  return observations.filter(o =>
    Object.entries(filter).every(([k, v]) => o[k] == null || o[k] === v)
  );
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Stáhne jeden dataset: zkusí primary, pak fallback.
 * @returns {Promise<{ source:'datastat'|'csv'|'cache', observations: any[] }>}
 */
export async function fetchDataset(ds, { force = false, fetchImpl, sleepImpl } = {}) {
  const cacheName = `csu_${ds.id}.json`;

  if (!force) {
    const cached = readCacheIfFresh(cacheName);
    if (cached) {
      console.log(`  [csu] ${ds.id}: cache hit`);
      return { source: 'cache', observations: cached.observations ?? [] };
    }
  }

  // Primary: DataStat JSON
  try {
    const url = buildUrl(ds.primary);
    console.log(`  [csu] ${ds.id}: primary ${url}`);
    const raw = await fetchWithRetry(url, { fetchImpl, sleepImpl });
    const observations = normalizeDataStat(raw);
    if (observations.length === 0) throw new Error('primary returned 0 observations');
    writeCache(cacheName, { id: ds.id, source: 'datastat', url, fetched_at: new Date().toISOString(), observations });
    return { source: 'datastat', observations };
  } catch (err) {
    console.warn(`  [csu] ${ds.id}: primary failed (${err.message}), trying fallback`);
  }

  // Fallback: CSV
  if (!ds.fallback) throw new Error(`${ds.id}: primary failed and no fallback configured`);
  const fbUrl = ds.fallback.url;
  console.log(`  [csu] ${ds.id}: fallback ${fbUrl}`);
  const text = await fetchWithRetry(fbUrl, { fetchImpl, sleepImpl, parse: 'text' });
  const observations = normalizeCsv(text, ds.fallback);
  if (observations.length === 0) throw new Error(`${ds.id}: fallback returned 0 observations`);
  writeCache(cacheName, { id: ds.id, source: 'csv', url: fbUrl, fetched_at: new Date().toISOString(), observations });
  return { source: 'csv', observations };
}

function buildUrl({ url, query }) {
  if (!query || Object.keys(query).length === 0) return url;
  const qs = new URLSearchParams(query).toString();
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
}

/**
 * Hlavní vstupní bod: stáhne všechny ČSÚ datasety, sestaví souhrn.
 * @param {{ force?: boolean, fetchImpl?: typeof fetch, datasets?: typeof CSU_DATASETS }} [opts]
 */
export async function fetchCsu(opts = {}) {
  const { force = false, fetchImpl, sleepImpl, datasets = CSU_DATASETS } = opts;
  const sleepFn = sleepImpl ?? sleep;
  const summary = {
    generated_at: new Date().toISOString(),
    datasets: {},
    failures: [],
  };

  for (const [i, ds] of datasets.entries()) {
    try {
      const result = await fetchDataset(ds, { force, fetchImpl, sleepImpl });
      summary.datasets[ds.id] = {
        name: ds.name,
        source: result.source,
        count: result.observations.length,
        latest: pickLatest(result.observations),
      };
    } catch (err) {
      console.error(`  [csu] ${ds.id}: FAIL ${err.message}`);
      summary.failures.push({ id: ds.id, error: err.message });
    }
    if (i < datasets.length - 1) await sleepFn(CONFIG.throttle_ms);
  }

  writeCache(SUMMARY_CACHE, summary);
  console.log(`  [csu] done: ${Object.keys(summary.datasets).length}/${datasets.length} ok`);
  return summary;
}

function pickLatest(observations) {
  if (!observations.length) return null;
  return observations.reduce((best, o) => (best == null || (o.year ?? -Infinity) > (best.year ?? -Infinity)) ? o : best, null);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchCsu().catch(err => {
    console.error('[csu] FAIL:', err.message);
    process.exit(1);
  });
}
