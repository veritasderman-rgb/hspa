// NRHZS · poskytovatelé — fetcher pro úhrady léků a zdravotnických prostředků
// per IČO/IČZ (NZIP datasety 2290, 2206, 2402, 2217).
//
// KRITICKÁ MEZERA: úhrady v Kč per IČO existují POUZE pro léky a zdravotnické
// prostředky. Pro lůžkovou a ambulantní výkonovou péči per IČO data NEJSOU.
//
// CKAN katalog: https://data.gov.cz/datasets, filtruj „NRHZS"
// Datasety publikuje ÚZIS pod CC BY 4.0; formát CSV v 7z archivech.
//
// V offline režimu nebo když nejsou nainstalovány optional deps (decompress-7zip),
// fetcher přečte seed z ingest/manual/providers/{year}.json (případně rovnou
// použije data/providers.json jako vstup pro transform).
//
// Spuštění:  npm run fetch:nrhzs-providers

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry, HttpError } from '../lib/http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CACHE_DIR = path.resolve(ROOT, CONFIG.cache.dir, 'nrhzs');
const MANUAL_DIR = path.resolve(ROOT, 'ingest', 'manual', 'providers');

// Hlavní datasety pro úhrady per IČO (kódy NZIP).
export const NRHZS_DATASETS = [
  { id: '2290', label: 'HVLP per IČP/IČO/IČZ (lékárny)', category: 'leky', period: 'kvartal', archive: '7z' },
  { id: '2206', label: 'HVLP per IČP (předepisující)',    category: 'leky', period: 'kvartal', archive: '7z' },
  { id: '2402', label: 'Zdravotnické prostředky per IČO', category: 'zp',   period: 'kvartal', archive: '7z' },
  { id: '2217', label: 'ZP per IČZ × okres',              category: 'zp',   period: 'kvartal', archive: '7z' },
  { id: '1745', label: 'Výkony per IČO + MKN-10 (BEZ Kč)','category': 'vykony', period: 'rok', archive: '7z' },
];

const CKAN_BASE = 'https://data.gov.cz/api/3/action';

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

/** Najde CKAN balíček podle NZIP id (heuristika přes search). */
export async function findCkanPackage(nzipId, opts = {}) {
  const url = `${CKAN_BASE}/package_search?q=${encodeURIComponent(`NRHZS ${nzipId}`)}&rows=5`;
  try {
    const data = await fetchWithRetry(url, opts);
    if (!data?.result?.results?.length) return null;
    return data.result.results[0];
  } catch (err) {
    if (err instanceof HttpError) console.warn(`CKAN search ${nzipId}: ${err.message}`);
    return null;
  }
}

/** Fallback: použij seed/manual data jako základ. */
export function loadManualSnapshot(year = 2024) {
  const file = path.join(MANUAL_DIR, `${year}.json`);
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* fallthrough */ }
  }
  // Druhotný fallback: data/providers.json
  const seed = path.join(ROOT, 'data', 'providers.json');
  if (fs.existsSync(seed)) {
    try { return JSON.parse(fs.readFileSync(seed, 'utf8')); } catch { /* fallthrough */ }
  }
  return null;
}

/**
 * Hlavní pipeline: pro každý dataset se pokusíme zjistit CKAN URL a zalogovat
 * stav. Skutečné dekomprese 7z + parsování CSV vyžaduje optional dep, takže
 * v offline / minimal-deps režimu pouze zaznamenáme metadata.
 */
export async function fetchNrhzsProviders({ year = 2024, fetchImpl } = {}) {
  ensureDir(CACHE_DIR);
  const opts = fetchImpl ? { fetchImpl } : {};
  const results = [];
  for (const ds of NRHZS_DATASETS) {
    const pkg = await findCkanPackage(ds.id, opts);
    results.push({
      id: ds.id,
      label: ds.label,
      category: ds.category,
      ckan_found: !!pkg,
      ckan_name: pkg?.name ?? null,
      resources_count: pkg?.resources?.length ?? 0,
      note: pkg ? null : 'CKAN balíček nenalezen — použij manual fallback',
    });
  }

  const snapshot = loadManualSnapshot(year);
  const summary = {
    generated_at: new Date().toISOString(),
    year,
    datasets: results,
    providers_count: snapshot?.providers?.length ?? 0,
    snapshot_origin: snapshot
      ? (fs.existsSync(path.join(MANUAL_DIR, `${year}.json`)) ? 'manual' : 'data/providers.json')
      : 'none',
    note: 'CKAN search reportuje dostupnost datasetů; reálný download 7z → parse CSV vyžaduje optional deps (decompress-7zip, csv-parse).',
  };
  fs.writeFileSync(path.join(CACHE_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchNrhzsProviders({ year: 2024 }).then((s) => {
    console.log(`✓ NRHZS providers: ${s.datasets.filter(d => d.ckan_found).length}/${s.datasets.length} datasetů nalezeno v CKAN`);
    console.log(`  snapshot: ${s.snapshot_origin}, ${s.providers_count} poskytovatelů`);
  }).catch((err) => {
    console.error('nrhzs_providers failed:', err);
    process.exit(1);
  });
}
