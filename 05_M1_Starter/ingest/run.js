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
import { fetchCsu } from './fetchers/csu.js';
import { fetchOecd } from './fetchers/oecd.js';
import { fetchEurostat } from './fetchers/eurostat.js';
import { transform } from './transform.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function run() {
  console.log('=== Zdravé Česko · Ingest pipeline ===');
  const started = Date.now();
  const failures = [];

  const fetchers = [
    { name: 'ÚZIS NRPZS', fn: fetchNrpzs },
    { name: 'ČSÚ DataStat', fn: fetchCsu },
    { name: 'OECD Health', fn: fetchOecd },
    { name: 'Eurostat', fn: fetchEurostat },
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
