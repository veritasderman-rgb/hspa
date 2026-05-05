// ÚZIS · NRPZS fetcher — M2
// Endpoint: https://nrpzs.uzis.cz/api/v1/mista-poskytovani
// Výstup: ingest/cache/nrpzs_raw.json, ingest/cache/nrpzs_aggregated.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(ROOT, CONFIG.cache.dir);
const RAW_PATH = path.join(CACHE_DIR, 'nrpzs_raw.json');
const AGG_PATH = path.join(CACHE_DIR, 'nrpzs_aggregated.json');
const AUDIT_PATH = path.join(CACHE_DIR, 'audit.log');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function isCacheFresh(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const mtime = fs.statSync(filePath).mtimeMs;
  const ageH = (Date.now() - mtime) / 3.6e6;
  return ageH < CONFIG.cache.ttl_hours;
}

function auditLog(msg) {
  ensureCacheDir();
  const line = `${new Date().toISOString()} [nrpzs] ${msg}\n`;
  fs.appendFileSync(AUDIT_PATH, line);
}

async function fetchWithRetry(url, headers) {
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

async function fetchLive() {
  const url = `${CONFIG.uzis.nrpzs_base}/mista-poskytovani`;
  const headers = { 'User-Agent': CONFIG.uzis.user_agent, Accept: 'application/json' };
  console.log('  [nrpzs] Fetching live:', url);
  const res = await fetchWithRetry(url, headers);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data ?? data.results ?? []);
}

async function fetchFallback() {
  // Fallback: CSV archiv z nrpzs.uzis.cz/index.php?pg=home--download
  // V M2 fallback vrátí prázdné pole — implementovat CSV parse v M3+
  auditLog('Using fallback: empty array (CSV fallback not yet implemented)');
  console.log('  [nrpzs] Fallback: returning empty dataset (CSV fallback TODO)');
  return [];
}

function aggregate(records) {
  // Agregujeme podle kraje (field: kraj nebo nuts_kod) a specializace
  const byRegion = {};
  const bySpec = {};
  let total = 0;

  for (const r of records) {
    total++;
    const kraj = r.kraj || r.nuts_kod || r.krajKod || 'unknown';
    const spec = r.odbornost || r.specializace || r.druh || 'unknown';

    byRegion[kraj] = (byRegion[kraj] || 0) + 1;
    bySpec[spec] = (bySpec[spec] || 0) + 1;
  }

  return {
    generated_at: new Date().toISOString(),
    total_providers: total,
    by_region: byRegion,
    by_specialization: bySpec,
  };
}

export async function fetchNrpzs() {
  ensureCacheDir();

  if (isCacheFresh(RAW_PATH)) {
    console.log('  [nrpzs] Cache fresh, skipping fetch.');
    auditLog('Cache hit, skipping fetch');
    return JSON.parse(fs.readFileSync(AGG_PATH, 'utf8'));
  }

  let records;
  try {
    records = await fetchLive();
  } catch (err) {
    console.warn('  [nrpzs] Live fetch failed, using fallback:', err.message);
    auditLog(`Live fetch failed: ${err.message}, using fallback`);
    records = await fetchFallback();
  }

  const raw = { fetched_at: new Date().toISOString(), count: records.length, records };
  fs.writeFileSync(RAW_PATH, JSON.stringify(raw, null, 2));

  const aggregated = aggregate(records);
  fs.writeFileSync(AGG_PATH, JSON.stringify(aggregated, null, 2));

  console.log(`  [nrpzs] Done. ${records.length} providers aggregated.`);
  auditLog(`Fetched ${records.length} records, wrote cache.`);
  return aggregated;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchNrpzs().then(r => console.log('Result:', JSON.stringify(r, null, 2))).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
