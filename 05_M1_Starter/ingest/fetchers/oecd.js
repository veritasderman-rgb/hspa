// OECD · SDMX-JSON fetcher (M4).
//
// Pro každý indikátor v ingest/mapping/oecd_codes.json:
//   1. stáhne celý dataset pro daný VAR napříč zeměmi (filter ".VAR")
//   2. parsuje SDMX-JSON na ploché observace
//   3. extrahuje českou sérii (cz_code) a OECD agregát (oecd_code).
//      Pokud OECD agregát chybí, dopočítá aritmetický průměr přes ostatní země.
//   4. uloží surovinu do ingest/cache/oecd_<id>.json
//
// Souhrn všech: ingest/cache/oecd_benchmarks.json — slouží transform.js (M5)
// jako zdroj benchmark.oecd hodnot.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';
import { parseSdmxJson, average } from '../lib/sdmx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SUMMARY_CACHE = 'oecd_benchmarks.json';

export function loadOecdMapping() {
  const file = path.join(ROOT, 'ingest', 'mapping', 'oecd_codes.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return raw.indicators ?? {};
}

function buildUrl(mapping) {
  // OECD legacy SDMX-JSON: https://stats.oecd.org/SDMX-JSON/data/{DATASET}/{FILTER}/all
  // FILTER je "."-separated key (prázdné = všechny členy dimenze)
  const filter = mapping.filter ?? '';
  return `${CONFIG.oecd.base}/${mapping.dataset}/${filter}/all`;
}

function pickLatestForCountry(observations, countryDim, code) {
  const series = observations.filter(o => o[countryDim] === code && o.value != null);
  if (!series.length) return null;
  series.sort((a, b) => Number(b.time) - Number(a.time));
  return series[0];
}

function buildTrend(observations, countryDim, code, years = 5) {
  const series = observations
    .filter(o => o[countryDim] === code && o.value != null)
    .map(o => ({ year: Number(o.time), value: o.value }))
    .filter(o => Number.isFinite(o.year))
    .sort((a, b) => a.year - b.year);
  return series.slice(-years);
}

/**
 * Vypočti OECD průměr pro nejnovější rok dostupný napříč zeměmi.
 * @param {Array} observations
 * @param {string} countryDim
 * @param {string} czCode — vyloučit ČR z průměru (bench by neměl obsahovat self)
 */
function computeOecdMean(observations, countryDim, czCode) {
  const byYear = {};
  for (const o of observations) {
    if (o.value == null) continue;
    if (o[countryDim] === czCode) continue;
    const y = Number(o.time);
    if (!Number.isFinite(y)) continue;
    (byYear[y] ??= []).push(o.value);
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  if (!years.length) return null;
  const latest = years[0];
  return { year: latest, value: average(byYear[latest]) };
}

export async function fetchOecdIndicator(indicatorId, mapping, opts = {}) {
  const { force = false, fetchImpl, sleepImpl } = opts;
  const cacheName = `oecd_${indicatorId}.json`;

  if (!force) {
    const cached = readCacheIfFresh(cacheName);
    if (cached) return { source: 'cache', ...cached };
  }

  const url = buildUrl(mapping);
  console.log(`  [oecd] ${indicatorId}: ${url}`);
  const raw = await fetchWithRetry(url, { fetchImpl, sleepImpl });
  const observations = parseSdmxJson(raw);

  const cz = pickLatestForCountry(observations, mapping.country_dim, mapping.cz_code);
  const trend = buildTrend(observations, mapping.country_dim, mapping.cz_code);

  let oecd = null;
  if (mapping.oecd_code) {
    const explicit = pickLatestForCountry(observations, mapping.country_dim, mapping.oecd_code);
    if (explicit) oecd = { year: Number(explicit.time), value: explicit.value, computed: false };
  }
  if (!oecd) {
    const computed = computeOecdMean(observations, mapping.country_dim, mapping.cz_code);
    if (computed) oecd = { ...computed, computed: true };
  }

  const result = {
    indicator_id: indicatorId,
    fetched_at: new Date().toISOString(),
    url,
    cz: cz ? { year: Number(cz.time), value: cz.value } : null,
    oecd,
    trend,
    n_observations: observations.length,
  };
  writeCache(cacheName, result);
  return { source: 'oecd', ...result };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function fetchOecd(opts = {}) {
  const { fetchImpl, sleepImpl, force = false, mapping = loadOecdMapping() } = opts;
  const sleepFn = sleepImpl ?? sleep;
  const summary = {
    generated_at: new Date().toISOString(),
    benchmarks: {},
    failures: [],
  };

  const entries = Object.entries(mapping);
  for (const [i, [id, m]] of entries.entries()) {
    try {
      const r = await fetchOecdIndicator(id, m, { fetchImpl, sleepImpl, force });
      summary.benchmarks[id] = {
        cz: r.cz,
        oecd: r.oecd,
        trend: r.trend,
        source: r.source,
      };
    } catch (err) {
      console.error(`  [oecd] ${id}: FAIL ${err.message}`);
      summary.failures.push({ id, error: err.message });
    }
    if (i < entries.length - 1) await sleepFn(CONFIG.throttle_ms);
  }

  writeCache(SUMMARY_CACHE, summary);
  console.log(`  [oecd] done: ${Object.keys(summary.benchmarks).length}/${entries.length} ok`);
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchOecd().catch(err => {
    console.error('[oecd] FAIL:', err.message);
    process.exit(1);
  });
}
