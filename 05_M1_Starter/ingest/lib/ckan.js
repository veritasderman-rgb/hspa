// CKAN resolver — najde aktuální URL distribuce pro daný dataset.
//
// Použití: pokud primary URL v mappingu zastará, fetcher přepne na CKAN
// `package_show` a vyhledá novou distribuci. data.mzcr.cz publikuje CKAN
// API kompatibilní s běžným CKAN backendem.
//
// Endpoint: https://data.mzcr.cz/api/3/action/package_show?id={dataset_id}

import { fetchWithRetry } from './http.js';

const CKAN_BASE = 'https://opendata.mzcr.cz/api/3/action';

/**
 * Najde URL nejnovější CSV nebo CSV.GZ distribuce v CKAN datasetu.
 * Preferuje CSV.GZ (menší přenos) před plain CSV.
 *
 * @param {string} datasetId — CKAN id, např. "hospitalizacni-pripady-dlouhodoba-casova-rada"
 * @param {{ fetchImpl?: typeof fetch, sleepImpl?: (ms:number)=>Promise<void> }} [opts]
 * @returns {Promise<{ url: string, format: 'csv.gz'|'csv'|'json' } | null>}
 */
export async function resolveDistributionUrl(datasetId, opts = {}) {
  const url = `${CKAN_BASE}/package_show?id=${encodeURIComponent(datasetId)}`;
  const data = await fetchWithRetry(url, opts);
  if (!data?.success || !data?.result?.resources) return null;

  const resources = data.result.resources;
  // CKAN má pole `format` (typicky "CSV", "CSV.GZ", "JSON") a `url`
  const csvGz = resources.find(r => /csv\.gz/i.test(r.format ?? '') || /\.csv\.gz$/i.test(r.url ?? ''));
  if (csvGz) return { url: csvGz.url, format: 'csv.gz' };

  const csv = resources.find(r => /^csv$/i.test(r.format ?? '') || /\.csv$/i.test(r.url ?? ''));
  if (csv) return { url: csv.url, format: 'csv' };

  const json = resources.find(r => /^json$/i.test(r.format ?? '') || /\.json$/i.test(r.url ?? ''));
  if (json) return { url: json.url, format: 'json' };

  return null;
}

/**
 * Vyhledá CKAN datasety podle dotazu — užitečné při počátečním ladění mappingu.
 * @param {string} q — fulltext query (např. "NRZP")
 */
export async function searchDatasets(q, opts = {}) {
  const url = `${CKAN_BASE}/package_search?q=${encodeURIComponent(q)}&rows=20`;
  const data = await fetchWithRetry(url, opts);
  return data?.result?.results ?? [];
}
