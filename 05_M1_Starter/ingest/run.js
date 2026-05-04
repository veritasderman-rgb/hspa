// Orchestrátor ingest pipeline.
// Volá fetchery sekvenčně, pak transform, pak validate.
// V M1 stuby vypisují TODO. V M2–M5 budou nahrazeny reálnými implementacemi.

import { fetchNrpzs } from './fetchers/uzis_nrpzs.js';
import { fetchCsu } from './fetchers/csu.js';
import { fetchOecd } from './fetchers/oecd.js';
import { fetchEurostat } from './fetchers/eurostat.js';
import { transform } from './transform.js';

async function run() {
  console.log('=== Zdravé Česko · Ingest pipeline ===');
  const started = Date.now();

  const steps = [
    { name: 'ÚZIS NRPZS', fn: fetchNrpzs },
    { name: 'ČSÚ DataStat', fn: fetchCsu },
    { name: 'OECD Health', fn: fetchOecd },
    { name: 'Eurostat', fn: fetchEurostat },
    { name: 'Transform & merge', fn: transform },
  ];

  for (const step of steps) {
    console.log(`\n→ ${step.name}`);
    try {
      await step.fn();
    } catch (err) {
      console.error(`  FAIL: ${step.name}: ${err.message}`);
      // Ne-fatal: pokračujeme — fallback v transform vrstvě.
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s ===`);
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
