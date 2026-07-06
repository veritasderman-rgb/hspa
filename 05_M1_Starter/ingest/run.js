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
import { fetchOecdSdmx2 } from './fetchers/oecd_sdmx2.js';
import { fetchEurostat } from './fetchers/eurostat.js';
import { fetchSukl } from './fetchers/sukl.js';
import { fetchSuklMr } from './fetchers/sukl_mr.js';
import { fetchPuk } from './fetchers/puk.js';
import { fetchIndiko } from './fetchers/indiko.js';
import { fetchEcdcAtlas } from './fetchers/ecdc_atlas.js';
import { transform } from './transform.js';
import { transformClinicalQuality } from './transform_clinical_quality.js';
import { summarize } from './verify-freshness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Sestaví závěrečný souhrn běhu do stdout: pro každý fetcher ok/fail a
 * agregovaný počet živých indikátorů (celkem + podle zdroje). Díky tomu je
 * v logu workflow na první pohled vidět, který fetcher vypadl a kolik dat
 * je reálně live (ne tichý fallback na seed).
 *
 * Čistá funkce (žádné I/O) — testovatelná bez spuštění pipeline.
 * @param {{ fetchers: Array<{name:string}>, failures: Array<{name:string, error:string}>, summary: ReturnType<typeof summarize> }} params
 * @returns {string}
 */
export function formatFetcherSummary({ fetchers, failures, summary }) {
  const errorByName = new Map(failures.map(f => [f.name, f.error]));
  const lines = [];
  lines.push('=== Souhrn fetcherů ===');
  for (const step of fetchers) {
    if (errorByName.has(step.name)) {
      lines.push(`  FAIL  ${step.name} — ${errorByName.get(step.name)}`);
    } else {
      lines.push(`  OK    ${step.name}`);
    }
  }
  lines.push('');
  const pct = (summary.live_ratio * 100).toFixed(1);
  lines.push(`Živé indikátory: ${summary.live}/${summary.total} (${pct} %)`);
  lines.push('Podle zdroje:');
  for (const [name, s] of Object.entries(summary.by_source)) {
    const ratio = s.total > 0 ? (s.live / s.total * 100).toFixed(0) : '0';
    lines.push(`  ${String(`${s.live}/${s.total}`).padEnd(8)} live (${ratio} %)  ${name}`);
  }
  return lines.join('\n');
}

async function run() {
  console.log('=== Zdravé Česko · Ingest pipeline ===');
  const started = Date.now();
  const failures = [];

  const fetchers = [
    { name: 'ÚZIS NRPZS', fn: fetchNrpzs },
    { name: 'ÚZIS NZIS (otevřená data — screening ap.)', fn: fetchUzisNzis },
    { name: 'ČSÚ DataStat', fn: fetchCsu },
    { name: 'OECD Health (SDMX 2.0 Data Explorer)', fn: fetchOecdSdmx2 },
    { name: 'Eurostat', fn: fetchEurostat },
    { name: 'SÚKL OpenData', fn: fetchSukl },
    { name: 'SÚKL OpenData (MR výpadky léčiv)', fn: fetchSuklMr },
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

  // Závěrečný per-fetcher souhrn + agregát živých indikátorů do stdout,
  // ať je v logu workflow hned vidět, který fetcher vypadl a kolik dat je
  // reálně live. Počítáme z transformem vyprodukovaného kontraktu.
  const summary = summarize(result.indicators ?? []);
  console.log('\n' + formatFetcherSummary({ fetchers, failures, summary }));

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s · ${failures.length} fetcher(s) failed ===`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}
