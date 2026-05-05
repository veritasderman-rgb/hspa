// Eurostat · JSON-stat 2.0 fetcher — M4
// Záložní zdroj pro EU benchmarky: HLY (healthy life years), EU-SILC, PM2.5
// API: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(ROOT, CONFIG.cache.dir);
const OUT_PATH = path.join(CACHE_DIR, 'eurostat.json');
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
  fs.appendFileSync(AUDIT_PATH, `${new Date().toISOString()} [eurostat] ${msg}\n`);
}

async function fetchWithRetry(url) {
  const { max_attempts, backoff_ms } = CONFIG.retry;
  let lastErr;
  for (let attempt = 0; attempt < max_attempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ZdraveCesko-HSPA/1.0', Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      auditLog(`GET ${url} → ${res.status} (attempt ${attempt + 1})`);
      return res;
    } catch (err) {
      lastErr = err;
      auditLog(`GET ${url} → FAIL attempt ${attempt + 1}: ${err.message}`);
      if (attempt < max_attempts - 1) await new Promise(r => setTimeout(r, backoff_ms[attempt]));
    }
  }
  throw lastErr;
}

// Parsuje Eurostat JSON-stat 2.0 a vrátí průměr EU27 pro poslední rok
function parseJsonStat(json, filterGeo = 'EU27_2020') {
  try {
    const dimId = json.id ?? [];
    const timeIdx = dimId.indexOf('time');
    const geoIdx = dimId.indexOf('geo');
    const sizes = json.size ?? [];
    const values = Object.values(json.value ?? {});
    const geoVals = Object.keys(json.dimension?.geo?.category?.index ?? {});
    const timeVals = Object.keys(json.dimension?.time?.category?.index ?? {});

    const geoPos = geoVals.indexOf(filterGeo);
    if (geoPos < 0 || timeVals.length === 0) return null;

    // Poslední rok
    const lastTimePos = timeVals.length - 1;
    const lastYear = parseInt(timeVals[lastTimePos], 10);

    // Flat index: time * nGeo + geoPos (závisí na pořadí dimenzí)
    let flatIdx;
    if (timeIdx < geoIdx) {
      flatIdx = lastTimePos * sizes[geoIdx] + geoPos;
    } else {
      flatIdx = geoPos * sizes[timeIdx] + lastTimePos;
    }

    const val = values[flatIdx];
    return val != null && !isNaN(parseFloat(val)) ? { value: parseFloat(val), year: lastYear } : null;
  } catch {
    return null;
  }
}

// Datasety, které chceme z Eurostatu
const EUROSTAT_QUERIES = [
  // HLY 65+ (healthy life years at 65)
  {
    key: 'nadeje_doziti_zdravi_65_eu',
    dataset: 'hlth_hlye',
    params: 'sex=T&age=Y65',
    description: 'Healthy life years at 65 (EU avg)',
  },
  // PM2.5 expozice — dataset sdg_11_50
  {
    key: 'pm25_expozice_eu',
    dataset: 'sdg_11_50',
    params: '',
    description: 'PM2.5 mean population exposure',
  },
  // Screening colorektální — preventivní péče
  {
    key: 'screening_colorektalni_eu',
    dataset: 'hlth_ps_prev',
    params: 'preventive=PREV_COL',
    description: 'Colorectal cancer screening rate',
  },
  // Vakcinace chřipka 65+ — hlth_ps_imm
  {
    key: 'vakcinace_chripka_65_eu',
    dataset: 'hlth_ps_imm',
    params: 'vaccine=FLU&age=Y_GE65',
    description: 'Influenza vaccination coverage 65+',
  },
];

function buildEurostatUrl(dataset, params) {
  const yearFrom = new Date().getFullYear() - 6;
  const base = `${CONFIG.eurostat.base}/${dataset}`;
  const qs = [params, `sinceTimePeriod=${yearFrom}`, 'format=JSON', 'lang=en']
    .filter(Boolean).join('&');
  return `${base}?${qs}`;
}

export async function fetchEurostat() {
  ensureCacheDir();

  if (isCacheFresh(OUT_PATH)) {
    console.log('  [eurostat] Cache fresh, skipping fetch.');
    auditLog('Cache hit, skipping fetch');
    return JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  }

  console.log('  [eurostat] Fetching EU benchmarks from Eurostat…');
  const results = {};
  let ok = 0;

  for (const q of EUROSTAT_QUERIES) {
    try {
      const url = buildEurostatUrl(q.dataset, q.params);
      const res = await fetchWithRetry(url);
      await new Promise(r => setTimeout(r, CONFIG.throttle_ms));
      const json = await res.json();
      const parsed = parseJsonStat(json);
      if (parsed) {
        results[q.key] = parsed;
        ok++;
        console.log(`  [eurostat] ${q.key}: ${parsed.value} (${parsed.year})`);
      }
    } catch (err) {
      auditLog(`${q.key} failed: ${err.message}`);
      console.warn(`  [eurostat] ${q.key}: ${err.message}`);
    }
  }

  const result = {
    generated_at: new Date().toISOString(),
    source: ok > 0 ? 'eurostat_live' : 'fallback',
    data: results,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  console.log(`  [eurostat] Done. ${ok}/${EUROSTAT_QUERIES.length} datasets fetched.`);
  auditLog(`Done: ${ok} datasets OK`);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchEurostat().then(r => console.log('Result:', JSON.stringify(r, null, 2))).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
