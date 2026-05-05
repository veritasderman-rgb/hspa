// Eurostat · JSON-stat 2.0 fetcher (M4).
//
// Pro každý indikátor v ingest/mapping/eurostat_codes.json stáhne dataset
// a vytvoří benchmark pro ČR a EU agregát.
//
// Endpoint: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}?{params}
// Parametry: filter_extra z mappingu + geo (CZ + EU agregát).
// Vrací JSON-stat 2.0.
//
// Souhrn: ingest/cache/eurostat.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';
import { parseJsonStat } from '../lib/jsonstat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SUMMARY_CACHE = 'eurostat.json';

export function loadEurostatMapping() {
  const file = path.join(ROOT, 'ingest', 'mapping', 'eurostat_codes.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return raw.indicators ?? {};
}

function buildUrl(mapping) {
  const params = new URLSearchParams();
  // ČR a EU agregát stáhneme jedním requestem (vícenásobné geo parametry)
  params.append(mapping.country_dim ?? 'geo', mapping.cz_code ?? 'CZ');
  if (mapping.eu_code) params.append(mapping.country_dim ?? 'geo', mapping.eu_code);
  for (const [k, v] of Object.entries(mapping.filter_extra ?? {})) {
    params.append(k, v);
  }
  params.append('format', 'JSON');
  return `${CONFIG.eurostat.base}/${mapping.dataset}?${params.toString()}`;
}

function pickLatestForCountry(observations, countryDim, code) {
  const series = observations.filter(o => o[countryDim] === code && o.value != null);
  if (!series.length) return null;
  series.sort((a, b) => Number(b.time) - Number(a.time));
  return series[0];
}

function buildTrend(observations, countryDim, code, years = 5) {
  return observations
    .filter(o => o[countryDim] === code && o.value != null)
    .map(o => ({ year: Number(o.time), value: o.value }))
    .filter(o => Number.isFinite(o.year))
    .sort((a, b) => a.year - b.year)
    .slice(-years);
}

export async function fetchEurostatIndicator(indicatorId, mapping, opts = {}) {
  const { force = false, fetchImpl, sleepImpl } = opts;
  const cacheName = `eurostat_${indicatorId}.json`;

  if (!force) {
    const cached = readCacheIfFresh(cacheName);
    if (cached) return { source: 'cache', ...cached };
  }

  const url = buildUrl(mapping);
  console.log(`  [eurostat] ${indicatorId}: ${url}`);
  const raw = await fetchWithRetry(url, { fetchImpl, sleepImpl });
  const observations = parseJsonStat(raw);
  const countryDim = mapping.country_dim ?? 'geo';

  const cz = pickLatestForCountry(observations, countryDim, mapping.cz_code);
  const eu = mapping.eu_code ? pickLatestForCountry(observations, countryDim, mapping.eu_code) : null;
  const trend = buildTrend(observations, countryDim, mapping.cz_code);

  const result = {
    indicator_id: indicatorId,
    fetched_at: new Date().toISOString(),
    url,
    cz: cz ? { year: Number(cz.time ?? cz.TIME_PERIOD ?? cz.year), value: cz.value } : null,
    eu: eu ? { year: Number(eu.time ?? eu.TIME_PERIOD ?? eu.year), value: eu.value } : null,
    trend,
    n_observations: observations.length,
  };
  writeCache(cacheName, result);
  return { source: 'eurostat', ...result };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function fetchEurostat(opts = {}) {
  const { fetchImpl, sleepImpl, force = false, mapping = loadEurostatMapping() } = opts;
  const sleepFn = sleepImpl ?? sleep;
  const summary = {
    generated_at: new Date().toISOString(),
    benchmarks: {},
    failures: [],
  };

  const entries = Object.entries(mapping);
  for (const [i, [id, m]] of entries.entries()) {
    try {
      const r = await fetchEurostatIndicator(id, m, { fetchImpl, sleepImpl, force });
      summary.benchmarks[id] = { cz: r.cz, eu: r.eu, trend: r.trend, source: r.source };
    } catch (err) {
      console.error(`  [eurostat] ${id}: FAIL ${err.message}`);
      summary.failures.push({ id, error: err.message });
    }
    if (i < entries.length - 1) await sleepFn(CONFIG.throttle_ms);
  }

  writeCache(SUMMARY_CACHE, summary);
  console.log(`  [eurostat] done: ${Object.keys(summary.benchmarks).length}/${entries.length} ok`);
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchEurostat().catch(err => {
    console.error('[eurostat] FAIL:', err.message);
    process.exit(1);
  });
}
