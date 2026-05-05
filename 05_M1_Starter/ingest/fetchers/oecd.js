// OECD · SDMX-JSON fetcher — M4
// Získá OECD průměry pro zdravotnické indikátory jako benchmarky.
// API: https://stats.oecd.org/SDMX-JSON/data/HEALTH_STAT/...
// Mapping: náš indicator_id → OECD HEALTH_STAT series kód

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(ROOT, CONFIG.cache.dir);
const OUT_PATH = path.join(CACHE_DIR, 'oecd_benchmarks.json');
const AUDIT_PATH = path.join(CACHE_DIR, 'audit.log');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function isCacheFresh(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const ageH = (Date.now() - fs.statSync(filePath).mtimeMs) / 3.6e6;
  return ageH < CONFIG.cache.ttl_hours;
}

function auditLog(msg) {
  ensureCacheDir();
  fs.appendFileSync(AUDIT_PATH, `${new Date().toISOString()} [oecd] ${msg}\n`);
}

async function fetchWithRetry(url, headers = {}) {
  const { max_attempts, backoff_ms } = CONFIG.retry;
  let lastErr;
  for (let attempt = 0; attempt < max_attempts; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      auditLog(`GET ${url} → ${res.status} (attempt ${attempt + 1})`);
      return res;
    } catch (err) {
      lastErr = err;
      auditLog(`GET ${url} → FAIL attempt ${attempt + 1}: ${err.message}`);
      if (attempt < max_attempts - 1) {
        await new Promise(r => setTimeout(r, backoff_ms[attempt]));
      }
    }
  }
  throw lastErr;
}

// Mapping: náš indicator_id → OECD HEALTH_STAT series kód
const OECD_MAPPING = {
  nadeje_doziti_total:       'EVIETOTLPOPYRSCSU',
  nadeje_doziti_zdravi_65:   'HLTHLEXPCH65YO',
  mortalita_30d_ami:         'MTHRT30DAMIADMS',
  mortalita_30d_cmp:         'MTHRT30DSTRADMS',
  lekari_per_1000:           'PRCTHPPHPRACDOC',
  sestry_per_1000:           'PRCTHPPHPRACNUR',
  vydaje_zdravotnictvi_hdp:  'HLTHXPNTTOTPCGDP',
  kuractvi_denni:            'PRCTPPLSMKDLYDSMK',
  mortalita_preventabilni:   'MTHRTPRVNTBLALL',
  mortalita_kojenci:         'MTHRTINFANT',
  nemocnicni_luzka_1000:     'BDSACTHSPBDSPOP',
};

function buildUrl(series) {
  const yearFrom = new Date().getFullYear() - 6;
  return `${CONFIG.oecd.base}/HEALTH_STAT/${series}.CZE+OECD.A/all` +
    `?startTime=${yearFrom}&dimensionAtObservation=allDimensions&format=jsondata`;
}

function parseOecdSdmx(json) {
  try {
    const dataset = json.dataSets?.[0];
    const structure = json.structure;
    if (!dataset || !structure) return null;

    const dims = structure.dimensions?.observation ?? [];
    const areaIdx = dims.findIndex(d => ['LOCATION', 'COU', 'REF_AREA'].includes(d.id));
    const timeIdx = dims.findIndex(d => ['TIME_PERIOD', 'YEAR'].includes(d.id));
    const areaVals = dims[areaIdx]?.values ?? [];

    const observations = dataset.observations ?? {};
    let oecdVal = null;
    let oecdYear = 0;

    for (const [key, obs] of Object.entries(observations)) {
      const parts = key.split(':');
      const areaCode = areaVals[parseInt(parts[areaIdx], 10)]?.id ?? '';
      const year = parseInt(parts[timeIdx], 10);
      if (['OECD', 'OAVG', 'OAV'].includes(areaCode) && year > oecdYear) {
        const val = Array.isArray(obs) ? obs[0] : obs;
        if (val != null && !isNaN(parseFloat(val))) {
          oecdVal = parseFloat(val);
          oecdYear = year;
        }
      }
    }
    return oecdVal != null ? { value: oecdVal, year: oecdYear } : null;
  } catch {
    return null;
  }
}

// Fallback: hodnoty z OECD Health at a Glance 2025
function fallbackBenchmarks() {
  auditLog('Using fallback OECD benchmark values');
  console.log('  [oecd] Using fallback benchmark values (API unavailable)');
  return {
    nadeje_doziti_total:      { oecd: 81.1, eu: 80.9 },
    nadeje_doziti_zdravi_65:  { oecd: 10.1, eu: 9.8 },
    mortalita_30d_ami:        { oecd: 6.7,  eu: 6.4 },
    mortalita_30d_cmp:        { oecd: 7.7,  eu: 7.3 },
    spokojenost_pece:         { oecd: 70,   eu: 72 },
    lekari_per_1000:          { oecd: 3.7,  eu: 3.9 },
    sestry_per_1000:          { oecd: 9.2,  eu: 8.9 },
    vydaje_zdravotnictvi_hdp: { oecd: 9.2,  eu: 9.4 },
    pm25_expozice:            { oecd: null, eu: 11.1 },
    kuractvi_denni:           { oecd: 15.9, eu: 17.3 },
    mortalita_preventabilni:  { oecd: 152,  eu: 148 },
    mortalita_kojenci:        { oecd: 4.1,  eu: 3.8 },
    vakcinace_chripka_65:     { oecd: 45.2, eu: 42.1 },
    nemocnicni_luzka_1000:    { oecd: 4.3,  eu: 5.1 },
    screening_colorektalni:   { oecd: null, eu: null },
  };
}

export async function fetchOecd() {
  ensureCacheDir();

  if (isCacheFresh(OUT_PATH)) {
    console.log('  [oecd] Cache fresh, skipping fetch.');
    auditLog('Cache hit, skipping fetch');
    return JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  }

  let benchmarks;
  let source = 'oecd_sdmx_live';

  try {
    console.log('  [oecd] Fetching OECD benchmarks via SDMX-JSON…');
    const results = {};
    let fetchedCount = 0;

    for (const [indicatorId, series] of Object.entries(OECD_MAPPING)) {
      const url = buildUrl(series);
      try {
        const res = await fetchWithRetry(url, {
          'User-Agent': 'ZdraveCesko-HSPA/1.0',
          Accept: 'application/vnd.sdmx.data+json;version=1.0',
        });
        await new Promise(r => setTimeout(r, CONFIG.throttle_ms));
        const json = await res.json();
        const parsed = parseOecdSdmx(json);
        if (parsed) {
          results[indicatorId] = { oecd: parsed.value, oecd_year: parsed.year };
          fetchedCount++;
        }
      } catch (err) {
        auditLog(`benchmark ${indicatorId}: ${err.message}`);
      }
    }

    if (fetchedCount === 0) throw new Error('No OECD data fetched live');

    // Doplň chybějící fallbackovými hodnotami
    const fb = fallbackBenchmarks();
    for (const id of Object.keys(fb)) {
      if (!results[id]) results[id] = fb[id];
    }
    benchmarks = results;
    console.log(`  [oecd] Fetched ${fetchedCount}/${Object.keys(OECD_MAPPING).length} live.`);
    auditLog(`Live fetch: ${fetchedCount} benchmarks OK`);
  } catch (err) {
    console.warn('  [oecd] Falling back to static benchmarks:', err.message);
    auditLog(`Fallback: ${err.message}`);
    benchmarks = fallbackBenchmarks();
    source = 'fallback';
  }

  const result = { generated_at: new Date().toISOString(), source, benchmarks };
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchOecd().then(r => console.log('Result:', JSON.stringify(r, null, 2))).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
