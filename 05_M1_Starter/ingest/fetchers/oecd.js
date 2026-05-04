// OECD · SDMX-JSON fetcher
// TODO M4: implementovat podle PLAN_API_INTEGRACE.md sekce 5, milník M4.
//
// Cíl: pro každý český indikátor získat odpovídající OECD průměr.
// Mapping: ingest/mapping/oecd_codes.json (vytvořit v M4) — náš_id → OECD code.
// Výstup: ingest/cache/oecd_benchmarks.json
//
// SDMX-JSON: GET CONFIG.oecd.base + '/' + CONFIG.oecd.dataset_health + '/' + filter
// Filter formát: COUNTRY.INDICATOR.../all?startTime=YYYY&endTime=YYYY

import { CONFIG } from '../config.js';

export async function fetchOecd() {
  console.log('  [TODO M4] oecd.js — implement OECD SDMX-JSON fetcher');
  console.log('  Base:', CONFIG.oecd.base);
  console.log('  Dataset:', CONFIG.oecd.dataset_health);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchOecd().catch(e => { console.error(e); process.exit(1); });
}
