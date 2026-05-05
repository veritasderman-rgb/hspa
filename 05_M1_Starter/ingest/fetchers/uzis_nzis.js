// ÚZIS NZIS — generický fetcher pro otevřené datasety na data.mzcr.cz.
//
// Pro každý klíč v ingest/mapping/uzis_codes.json:
//   1. zkusí primary_url (přímá distribuce z mappingu)
//   2. při selhání se přepne na CKAN package_show a vyhledá aktuální distribuci
//   3. stáhne .csv.gz nebo .csv (stream — OOM-safe pro velké datasety jako NRH)
//   4. parsuje CSV, uloží do ingest/cache/uzis_<key>.json (agregát) +
//      raw soubor zůstává v cache na disku.
//
// Sumár: ingest/cache/uzis_nzis.json
//
// Pozor: žádný extractor logiky tady — jen stahuje surová data.
// Filtry (MKN-10, věkové skupiny) řeší transform.js přes
// extractFromNrh / extractFromNrzp / extractFromNor.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { readCacheIfFresh, writeCache, cachePath, ensureCacheDir } from '../lib/cache.js';
import { parseCsv } from '../lib/csv.js';
import { downloadAndGunzipToFile, gunzipBufferToString } from '../lib/gzip.js';
import { resolveDistributionUrl } from '../lib/ckan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SUMMARY_CACHE = 'uzis_nzis.json';

export function loadUzisMapping() {
  const file = path.join(ROOT, 'ingest', 'mapping', 'uzis_codes.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return raw.datasets ?? {};
}

/**
 * Stáhne jeden NZIS dataset, parsuje CSV a uloží do cache.
 * @param {string} key — klíč v mappingu
 * @param {object} mapping — záznam z uzis_codes.json
 * @param {{ force?: boolean, fetchImpl?: typeof fetch, sleepImpl?: Function }} [opts]
 * @returns {Promise<{ source: 'primary'|'ckan'|'cache', rows: number, columns: string[] }>}
 */
export async function fetchNzisDataset(key, mapping, opts = {}) {
  const { force = false, fetchImpl, sleepImpl } = opts;
  const cacheJson = `uzis_${key}.json`;

  if (!force) {
    const cached = readCacheIfFresh(cacheJson);
    if (cached) {
      console.log(`  [nzis] ${key}: cache hit (${cached.rows} rows)`);
      return { source: 'cache', rows: cached.rows ?? 0, columns: cached.columns ?? [] };
    }
  }

  // 1. Resolve URL — primary_url nebo CKAN
  let url = mapping.primary_url;
  let resolvedFormat = mapping.format;
  let resolvedVia = 'primary';

  async function tryCkan() {
    if (!mapping.ckan_dataset) throw new Error('no ckan_dataset and no working primary_url');
    console.log(`  [nzis] ${key}: resolving via CKAN ${mapping.ckan_dataset}`);
    const dist = await resolveDistributionUrl(mapping.ckan_dataset, { fetchImpl, sleepImpl });
    if (!dist) throw new Error(`CKAN: no distribution for ${mapping.ckan_dataset}`);
    url = dist.url;
    resolvedFormat = dist.format;
    resolvedVia = 'ckan';
  }

  if (!url) await tryCkan();

  // 2. Download + parse
  let csvText;
  try {
    if (resolvedFormat === 'csv.gz') {
      ensureCacheDir();
      const rawPath = cachePath(`uzis_${key}.raw.csv`);
      console.log(`  [nzis] ${key}: downloading ${url} (csv.gz, streamed)`);
      await downloadAndGunzipToFile(url, rawPath, {
        headers: { 'User-Agent': CONFIG.uzis.user_agent },
        fetchImpl,
      });
      csvText = fs.readFileSync(rawPath, 'utf8');
    } else {
      console.log(`  [nzis] ${key}: downloading ${url} (csv)`);
      csvText = await fetchWithRetry(url, { fetchImpl, sleepImpl, parse: 'text' });
    }
  } catch (err) {
    if (resolvedVia === 'primary') {
      console.warn(`  [nzis] ${key}: primary failed (${err.message}), trying CKAN`);
      await tryCkan();
      // Retry s novou URL
      if (resolvedFormat === 'csv.gz') {
        ensureCacheDir();
        const rawPath = cachePath(`uzis_${key}.raw.csv`);
        await downloadAndGunzipToFile(url, rawPath, { headers: { 'User-Agent': CONFIG.uzis.user_agent }, fetchImpl });
        csvText = fs.readFileSync(rawPath, 'utf8');
      } else {
        csvText = await fetchWithRetry(url, { fetchImpl, sleepImpl, parse: 'text' });
      }
    } else {
      throw err;
    }
  }

  const records = parseCsv(csvText, { delimiter: detectDelimiter(csvText) });
  const columns = records.length ? Object.keys(records[0]) : [];

  // 3. Validate expected columns (warning, ne fatal)
  if (Array.isArray(mapping.expected_columns)) {
    const missing = mapping.expected_columns.filter(c => !columns.some(col => normalizeCol(col) === normalizeCol(c)));
    if (missing.length) console.warn(`  [nzis] ${key}: chybí očekávané sloupce: ${missing.join(', ')}`);
  }

  // 4. Uložit do cache
  writeCache(cacheJson, {
    key,
    name: mapping.name,
    fetched_at: new Date().toISOString(),
    url,
    resolved_via: resolvedVia,
    rows: records.length,
    columns,
    records,
  });

  console.log(`  [nzis] ${key}: ${records.length} řádků, ${columns.length} sloupců`);
  return { source: resolvedVia, rows: records.length, columns };
}

function detectDelimiter(text) {
  // ÚZIS používá středník, někdy čárku — probíhá v prvních 1000 znacích
  const sample = text.slice(0, 1000);
  const semi = (sample.match(/;/g) ?? []).length;
  const comma = (sample.match(/,/g) ?? []).length;
  return semi > comma ? ';' : ',';
}

function normalizeCol(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_]/g, '');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Hlavní vstupní bod: stáhne všechny NZIS datasety.
 */
export async function fetchUzisNzis(opts = {}) {
  const { fetchImpl, sleepImpl, force = false, datasets = loadUzisMapping() } = opts;
  const sleepFn = sleepImpl ?? sleep;
  const summary = {
    generated_at: new Date().toISOString(),
    datasets: {},
    failures: [],
  };

  const entries = Object.entries(datasets);
  for (const [i, [key, m]] of entries.entries()) {
    try {
      const r = await fetchNzisDataset(key, m, { fetchImpl, sleepImpl, force });
      summary.datasets[key] = { name: m.name, source: r.source, rows: r.rows, columns: r.columns };
    } catch (err) {
      console.error(`  [nzis] ${key}: FAIL ${err.message}`);
      summary.failures.push({ key, error: err.message });
    }
    if (i < entries.length - 1) await sleepFn(CONFIG.throttle_ms);
  }

  writeCache(SUMMARY_CACHE, summary);
  console.log(`  [nzis] done: ${Object.keys(summary.datasets).length}/${entries.length} ok`);
  return summary;
}

// Helper pro testy / transform — načte parsovaný cached dataset
export function loadCachedDataset(key) {
  const cached = readCacheIfFresh(`uzis_${key}.json`, 24 * 365); // dlouhý TTL pro čtení (ne refresh)
  return cached;
}

export { gunzipBufferToString }; // re-export pro testy

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchUzisNzis().catch(err => {
    console.error('[nzis] FAIL:', err.message);
    process.exit(1);
  });
}
