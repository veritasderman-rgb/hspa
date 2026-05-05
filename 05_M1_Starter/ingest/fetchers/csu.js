// ČSÚ · DataStat fetcher — M3
// Cílové ukazatele: naděje dožití při narození, naděje dožití ve zdraví (HLY 65+)
// API: https://data.csu.gov.cz (DataStat JSON API)
// Fallback: CSV z databáze KROK

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(ROOT, CONFIG.cache.dir);
const OUT_PATH = path.join(CACHE_DIR, 'csu_demografie.json');
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
  fs.appendFileSync(AUDIT_PATH, `${new Date().toISOString()} [csu] ${msg}\n`);
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

// DataStat API — endpoint pro naděje dožití (DEM_NADEZE)
// Dokumentace: https://csu.gov.cz/zakladni-informace-pro-pouziti-api-datastatu
// Příklad URL: https://data.csu.gov.cz/api/katalog/v1/datasety/DEM_NADEZE/data
// s parametry: obdobi=2019,2020,2021,2022,2023,2024&pohlavi=T&uzemi=CZ0&vek=0
async function fetchNadejeDoziti() {
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  const url = `${CONFIG.csu.base}/api/katalog/v1/datasety/DEM_NADEZE/data` +
    `?obdobi=${years.join(',')}&pohlavi=T&uzemi=CZ0&vek=0`;
  console.log('  [csu] Fetching naděje dožití:', url);
  const res = await fetchWithRetry(url, { 'User-Agent': 'ZdraveCesko-HSPA/1.0', Accept: 'application/json' });
  const json = await res.json();
  // DataStat vrací { data: [ {obdobi, hodnota, ...}, ... ] } nebo různé struktury
  const rows = json.data ?? json.hodnoty ?? json ?? [];
  return rows.map(r => ({
    year: parseInt(r.obdobi ?? r.rok ?? r.OBDOBI, 10),
    value: parseFloat(r.hodnota ?? r.HODNOTA ?? r.value),
    sex: r.pohlavi ?? r.POHLAVI ?? 'T',
    region: r.uzemi ?? r.UZEMI ?? 'CZ0',
  })).filter(r => !isNaN(r.year) && !isNaN(r.value));
}

// Zdravá léta ve věku 65 let (HLY) — typicky z Eurostatu/SILC přes ČSÚ
async function fetchHealthyLifeYears() {
  // EU-SILC dataset, dataset kód HLY65; ČSÚ re-publikuje jako národní data
  // Zkusíme dataset DEM_HLY nebo HLY65:
  const years = [2019, 2020, 2021, 2022, 2023];
  const url = `${CONFIG.csu.base}/api/katalog/v1/datasety/DEM_HLY/data` +
    `?obdobi=${years.join(',')}&pohlavi=T&uzemi=CZ0&vek=65`;
  console.log('  [csu] Fetching healthy life years:', url);
  const res = await fetchWithRetry(url, { 'User-Agent': 'ZdraveCesko-HSPA/1.0', Accept: 'application/json' });
  const json = await res.json();
  const rows = json.data ?? json.hodnoty ?? json ?? [];
  return rows.map(r => ({
    year: parseInt(r.obdobi ?? r.rok ?? r.OBDOBI, 10),
    value: parseFloat(r.hodnota ?? r.HODNOTA ?? r.value),
  })).filter(r => !isNaN(r.year) && !isNaN(r.value));
}

// Fallback: vrací hardcoded hodnoty inspirované OECD Health at a Glance 2025
// Použije se pokud API není dostupné
function fallbackData() {
  auditLog('Using fallback hardcoded demographic data');
  console.log('  [csu] Using fallback data (API unavailable)');
  return {
    nadeje_doziti_total: [
      { year: 2019, value: 79.1 }, { year: 2020, value: 78.1 }, { year: 2021, value: 77.7 },
      { year: 2022, value: 78.8 }, { year: 2023, value: 79.5 }, { year: 2024, value: 79.9 },
    ],
    nadeje_doziti_zdravi_65: [
      { year: 2019, value: 8.2 }, { year: 2020, value: 8.0 }, { year: 2021, value: 8.1 },
      { year: 2022, value: 8.3 }, { year: 2023, value: 8.4 },
    ],
  };
}

export async function fetchCsu() {
  ensureCacheDir();

  if (isCacheFresh(OUT_PATH)) {
    console.log('  [csu] Cache fresh, skipping fetch.');
    auditLog('Cache hit, skipping fetch');
    return JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  }

  let result;
  try {
    const [nadeje, hly] = await Promise.all([fetchNadejeDoziti(), fetchHealthyLifeYears()]);
    result = {
      generated_at: new Date().toISOString(),
      source: 'csu_datastat_live',
      nadeje_doziti_total: nadeje,
      nadeje_doziti_zdravi_65: hly,
    };
    console.log(`  [csu] Fetched ${nadeje.length} naděje rows, ${hly.length} HLY rows.`);
    auditLog(`Live fetch OK: ${nadeje.length} naděje rows, ${hly.length} HLY rows`);
  } catch (err) {
    console.warn('  [csu] Live fetch failed, using fallback:', err.message);
    auditLog(`Live fetch failed: ${err.message}, using fallback`);
    result = { generated_at: new Date().toISOString(), source: 'fallback', ...fallbackData() };
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchCsu().then(r => console.log('Result:', JSON.stringify(r, null, 2))).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
