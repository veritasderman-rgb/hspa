// OECD · SDMX-JSON 2.0 fetcher (nový Data Explorer endpoint).
//
// Legacy OECD.Stat endpoint (stats.oecd.org/SDMX-JSON) byl OECD zrušen (HTTP 404).
// Tento fetcher používá nový veřejný SDMX 2.1 REST endpoint:
//   https://sdmx.oecd.org/public/rest/data/{agency},{dataflow},{version}/all
//     ?startPeriod=YYYY&format=jsondata&dimensionAtObservation=AllDimensions
//
// Formát odpovědi = SDMX-JSON 2.0 (data-message):
//   data.structures[0].dimensions.observation  → seznam dimenzí + jejich values
//   data.dataSets[0].observations              → klíč ":"-separovaných indexů → [hodnota,...]
//
// Pro každý indikátor v ingest/mapping/oecd_sdmx2_codes.json:
//   1. stáhne dataflow
//   2. vyfiltruje ČR (REF_AREA=CZE) podle zadaných dims → časová řada
//   3. spočítá OECD průměr za poslední rok ČR (země mimo agregáty) jako benchmark
//   4. uloží cache ingest/cache/oecd_sdmx2_{id}.json
//        { cz:{value,year}, trend:[{year,value}], benchmark:{oecd}, source:{...}, fetched_at }

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry } from '../lib/http.js';
import { writeCache } from '../lib/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SDMX_BASE = 'https://sdmx.oecd.org/public/rest/data';

// REF_AREA kódy, které nejsou jednotlivé země (agregáty) — vyloučit z OECD průměru.
const AGGREGATE_REF_AREAS = new Set([
  'OECD', 'OECD37', 'OECD38', 'OECD_AVG', 'OAVG', 'WXOECD', 'EU', 'EU27_2020', 'EU28', 'G7', 'G20',
]);

export function loadOecdSdmx2Mapping() {
  const file = path.join(ROOT, 'ingest', 'mapping', 'oecd_sdmx2_codes.json');
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8')).indicators ?? {};
}

export function buildOecdSdmx2Url(mapping, { startPeriod = 2015 } = {}) {
  const agency = mapping.agency ?? 'OECD.ELS.HD';
  const version = mapping.version ?? '1.0';
  return `${SDMX_BASE}/${agency},${mapping.dataflow},${version}/all`
    + `?startPeriod=${startPeriod}&format=jsondata&dimensionAtObservation=AllDimensions`;
}

/**
 * Naparsuje SDMX-JSON 2.0 a vytáhne řadu pro jednu zemi + OECD průměr.
 * @param {object} json    SDMX-JSON 2.0 data-message
 * @param {object} opts    { dims, refArea='CZE', trendYears=6 }
 *   dims = { DIM_ID: 'CODE', ... } pevné členy ostatních dimenzí (kromě REF_AREA, TIME_PERIOD)
 * @returns {{ cz:{value,year}, trend:[{year,value}], benchmark:{oecd:number|undefined} }|null}
 */
export function parseOecdSdmx2(json, { dims = {}, refArea = 'CZE', trendYears = 6 } = {}) {
  const data = json?.data;
  const struct = data?.structures?.[0] ?? data?.structure;
  const obsDims = struct?.dimensions?.observation;
  const observations = data?.dataSets?.[0]?.observations;
  if (!obsDims || !observations) return null;

  const ids = obsDims.map(d => d.id);
  const codes = {};
  for (const d of obsDims) codes[d.id] = d.values.map(v => v.id);
  const tIdx = ids.indexOf('TIME_PERIOD');
  const raIdx = ids.indexOf('REF_AREA');
  if (tIdx < 0 || raIdx < 0) return null;

  const matchesDims = (cur) => Object.entries(dims).every(([k, v]) => cur[k] === v);

  const czSeries = {};
  // mean za rok: rok → { refArea → value } (jen jednotlivé země)
  const byYearCountry = {};
  for (const [key, arr] of Object.entries(observations)) {
    const parts = key.split(':');
    const cur = {};
    for (let i = 0; i < ids.length; i++) cur[ids[i]] = codes[ids[i]][Number(parts[i])];
    if (!matchesDims(cur)) continue;
    const value = Array.isArray(arr) ? arr[0] : arr;
    if (value == null || !Number.isFinite(Number(value))) continue;
    const year = Number(cur.TIME_PERIOD);
    const ra = cur.REF_AREA;
    if (ra === refArea) czSeries[year] = Number(value);
    if (!AGGREGATE_REF_AREAS.has(ra)) {
      (byYearCountry[year] ??= {})[ra] = Number(value);
    }
  }

  const czYears = Object.keys(czSeries).map(Number).sort((a, b) => a - b);
  if (!czYears.length) return null;
  const latestYear = czYears[czYears.length - 1];

  const trend = czYears.slice(-trendYears).map(y => ({ year: y, value: czSeries[y] }));

  // OECD průměr za poslední rok ČR (přes všechny jednotlivé země, které ten rok reportují)
  let oecd;
  const yearVals = byYearCountry[latestYear];
  if (yearVals) {
    const vals = Object.values(yearVals);
    if (vals.length >= 5) oecd = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  return {
    cz: { value: czSeries[latestYear], year: latestYear },
    trend,
    benchmark: oecd != null ? { oecd } : {},
  };
}

export async function fetchOecdSdmx2Indicator(indicatorId, mapping, opts = {}) {
  const { fetchImpl } = opts;
  const url = buildOecdSdmx2Url(mapping, { startPeriod: mapping.start_period ?? 2015 });
  // OECD SDMX endpoint vrací 500 na Accept: application/json (content negotiation
  // koliduje s format=jsondata) — vynutíme Accept: */* a parsujeme JSON ručně.
  const res = await fetchWithRetry(url, { fetchImpl, headers: { Accept: '*/*' } });
  const json = typeof res === 'string' ? JSON.parse(res) : res;
  const parsed = parseOecdSdmx2(json, {
    dims: mapping.dims ?? {},
    refArea: mapping.ref_area ?? 'CZE',
    trendYears: mapping.trend_years ?? 6,
  });
  if (!parsed) throw new Error(`OECD SDMX2: žádná data pro ${indicatorId} (${mapping.dataflow})`);

  const out = {
    cz: parsed.cz,
    trend: parsed.trend,
    benchmark: parsed.benchmark,
    source: {
      name: mapping.source_name ?? 'OECD Health Statistics',
      url: mapping.source_url ?? 'https://data-explorer.oecd.org/',
      dataflow: mapping.dataflow,
    },
    fetched_at: new Date().toISOString(),
  };
  writeCache(`oecd_sdmx2_${indicatorId}.json`, out);
  return out;
}

export async function fetchOecdSdmx2(opts = {}) {
  const mapping = loadOecdSdmx2Mapping();
  const summary = { ok: [], failed: [] };
  for (const [id, m] of Object.entries(mapping)) {
    try {
      const r = await fetchOecdSdmx2Indicator(id, m, opts);
      summary.ok.push({ id, value: r.cz.value, year: r.cz.year, oecd: r.benchmark.oecd });
      console.log(`  ✓ OECD SDMX2 ${id}: ${r.cz.value} (${r.cz.year}, OECD ⌀ ${r.benchmark.oecd ?? 'n/a'})`);
    } catch (err) {
      summary.failed.push({ id, error: err.message });
      console.error(`  FAIL OECD SDMX2 ${id}: ${err.message}`);
    }
  }
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchOecdSdmx2({}).then(s => {
    console.log(`OECD SDMX2: ${s.ok.length} ok, ${s.failed.length} failed`);
    if (s.failed.length) process.exit(1);
  });
}
