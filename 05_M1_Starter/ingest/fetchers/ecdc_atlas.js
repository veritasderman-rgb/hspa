// ECDC Surveillance Atlas · AMR fetcher.
//
// Stahuje per-country hodnoty antimikrobiální rezistence z veřejného REST API
// ECDC Surveillance Atlas (atlas.ecdc.europa.eu/public/AtlasService/rest).
// API je reverse-engineered z atlas.ecdc.europa.eu/Js/app/ecdc.js — používá
// ho samotná webová aplikace Atlasu, je veřejné a bez autentizace.
//
// Pipeline pro jeden indikátor (viz ingest/mapping/ecdc_atlas_codes.json):
//   1. measureId + geoCode (CZ) + timeUnit=Y
//      → GetMeasureResultsForTimeUnitAndGeoRegion vrací časovou řadu (YValue %).
//
// Souhrn: ingest/cache/ecdc_atlas_{indicatorId}.json
//   { cz: { value, year }, trend: [{year,value}], source: {...}, fetched_at }

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchWithRetry } from '../lib/http.js';
import { writeCache } from '../lib/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const ATLAS_BASE = 'https://atlas.ecdc.europa.eu/public/AtlasService/rest/';
const ATLAS_URL = 'https://atlas.ecdc.europa.eu/public/index.aspx?Dataset=27&HealthTopic=4';

export function loadEcdcAtlasMapping() {
  const file = path.join(ROOT, 'ingest', 'mapping', 'ecdc_atlas_codes.json');
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8')).indicators ?? {};
}

/**
 * Z odpovědi GetMeasureResultsForTimeUnitAndGeoRegion (JSON wrapper s polem
 * obsahujícím záznamy {TimeCode, YValue, N}) vytáhne časovou řadu pro ČR.
 * @returns {{ value:number, year:number, trend:{year:number,value:number}[], n:number }|null}
 */
export function parseAtlasMeasureResults(json, { trendYears = 5 } = {}) {
  if (!json || typeof json !== 'object') return null;
  // Záznamy jsou v prvním neprázdném poli typu Array (API je obaluje metadaty).
  const records = Object.values(json).find(v => Array.isArray(v) && v.length);
  if (!records) return null;
  const points = records
    .map(r => ({
      year: Number(r.TimeCode),
      value: typeof r.YValue === 'number' ? Math.round(r.YValue * 10) / 10 : null,
      n: r.N ?? null,
    }))
    .filter(p => Number.isFinite(p.year) && p.value != null)
    .sort((a, b) => a.year - b.year);
  if (!points.length) return null;
  const latest = points[points.length - 1];
  return {
    value: latest.value,
    year: latest.year,
    n: latest.n,
    trend: points.slice(-trendYears).map(p => ({ year: p.year, value: p.value })),
  };
}

export async function fetchEcdcAtlasIndicator(indicatorId, mapping, opts = {}) {
  const { force = false, fetchImpl } = opts;
  const cacheName = `ecdc_atlas_${indicatorId}.json`;
  const geo = mapping.geo_code ?? 'CZ';
  const url = `${ATLAS_BASE}GetMeasureResultsForTimeUnitAndGeoRegion`
    + `?measureId=${encodeURIComponent(mapping.measure_id)}&timeUnit=Y&geoCode=${encodeURIComponent(geo)}`;

  const res = await fetchWithRetry(url, { fetchImpl });
  const json = typeof res === 'string' ? JSON.parse(res) : res;
  const parsed = parseAtlasMeasureResults(json, { trendYears: mapping.trend_years ?? 5 });
  if (!parsed) throw new Error(`ECDC Atlas: žádná data pro ${indicatorId} (measureId ${mapping.measure_id}, geo ${geo})`);

  const out = {
    cz: { value: parsed.value, year: parsed.year, n: parsed.n },
    trend: parsed.trend,
    source: {
      name: mapping.source_name ?? 'ECDC Surveillance Atlas',
      url: mapping.source_url ?? ATLAS_URL,
      measure_id: mapping.measure_id,
      measure_code: mapping.measure_code ?? null,
    },
    fetched_at: new Date().toISOString(),
  };
  writeCache(cacheName, out);
  return out;
}

export async function fetchEcdcAtlas(opts = {}) {
  const mapping = loadEcdcAtlasMapping();
  const ids = Object.keys(mapping);
  const summary = { ok: [], failed: [] };
  for (const id of ids) {
    try {
      const r = await fetchEcdcAtlasIndicator(id, mapping[id], opts);
      summary.ok.push({ id, value: r.cz.value, year: r.cz.year });
      console.log(`  ✓ ECDC Atlas ${id}: ${r.cz.value} % (${r.cz.year}, N=${r.cz.n})`);
    } catch (err) {
      summary.failed.push({ id, error: err.message });
      console.error(`  FAIL ECDC Atlas ${id}: ${err.message}`);
    }
  }
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchEcdcAtlas({ force: true }).then(s => {
    console.log(`ECDC Atlas: ${s.ok.length} ok, ${s.failed.length} failed`);
    if (s.failed.length) process.exit(1);
  });
}
