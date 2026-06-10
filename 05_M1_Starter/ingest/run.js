// Orchestrátor ingest pipeline (M6).
//
// Sekvenčně spustí všechny fetchery (kvůli rate limitům veřejných API),
// pak transform, pak vytvoří snapshot. Selhání jednotlivého fetcheru
// je non-fatal — transform pak použije seed/cache fallback.
// Pokud selže transform, exit kód je non-zero a CI workflow failne.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchNrpzs } from './fetchers/uzis_nrpzs.js';
import { fetchUzisNzis } from './fetchers/uzis_nzis.js';
import { fetchCsu } from './fetchers/csu.js';
import { fetchOecd } from './fetchers/oecd.js';
import { fetchOecdSdmx2 } from './fetchers/oecd_sdmx2.js';
import { fetchEurostat } from './fetchers/eurostat.js';
import { fetchSukl } from './fetchers/sukl.js';
import { fetchSuklMr } from './fetchers/sukl_mr.js';
import { fetchNzipOpendata } from './fetchers/nzip_opendata.js';
import { fetchPuk } from './fetchers/puk.js';
import { fetchIndiko } from './fetchers/indiko.js';
import { fetchEcdcAtlas } from './fetchers/ecdc_atlas.js';
import { transform } from './transform.js';
import { transformClinicalQuality } from './transform_clinical_quality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function run() {
  console.log('=== Zdravé Česko · Ingest pipeline ===');
  const started = Date.now();
  const failures = [];

  const fetchers = [
    { name: 'ÚZIS NRPZS', fn: fetchNrpzs },
    { name: 'ÚZIS NZIS (otevřená data — screening ap.)', fn: fetchUzisNzis },
    { name: 'ČSÚ DataStat', fn: fetchCsu },
    { name: 'OECD Health', fn: fetchOecd },
    { name: 'OECD Health (SDMX 2.0 Data Explorer)', fn: fetchOecdSdmx2 },
    { name: 'Eurostat', fn: fetchEurostat },
    { name: 'SÚKL OpenData', fn: fetchSukl },
    { name: 'SÚKL OpenData (MR výpadky léčiv)', fn: fetchSuklMr },
    { name: 'NZIP / ÚZIS otevřená data (data.mzcr.cz)', fn: fetchNzipOpendata },
    { name: 'PUK (klinická kvalita)', fn: fetchPuk },
    { name: 'INDIKO (cesta onko pacienta)', fn: fetchIndiko },
    { name: 'ECDC Surveillance Atlas (AMR)', fn: fetchEcdcAtlas },
  ];

  for (const step of fetchers) {
    console.log(`\n→ ${step.name}`);
    try {
      await step.fn();
    } catch (err) {
      console.error(`  FAIL: ${step.name}: ${err.message}`);
      failures.push({ name: step.name, error: err.message });
      // Pokračujeme — transform má fallback na seed
    }
  }

  console.log('\n→ Transform & merge');
  let result;
  try {
    result = await transform();
  } catch (err) {
    console.error(`  FATAL: transform: ${err.message}`);
    process.exit(1);
  }

  // Clinical quality merge — neblokuje, scrapery jsou křehké; failure jen logujeme
  try {
    transformClinicalQuality();
  } catch (err) {
    console.warn(`  WARN: clinical-quality transform: ${err.message}`);
  }

  // Snapshot dat — slouží jako audit trail
  const snapshotName = `snapshot-${new Date().toISOString().slice(0, 10)}.json`;
  const snapshotPath = path.join(ROOT, 'data', snapshotName);
  fs.writeFileSync(snapshotPath, JSON.stringify(result, null, 2) + '\n');
  console.log(`  wrote ${snapshotName}`);

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s · ${failures.length} fetcher(s) failed ===`);
  if (failures.length) {
    console.log('Failed fetchers:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
