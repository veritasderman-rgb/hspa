// Eurostat · JSON-stat 2.0 fetcher
// TODO M4: implementovat podle PLAN_API_INTEGRACE.md sekce 5, milník M4.
//
// Použití: záložní zdroj pro EU benchmarky (HLY, EU-SILC), když OECD nemá.
// Endpoint: CONFIG.eurostat.base + '/' + dataset_code + '?' + params

import { CONFIG } from '../config.js';

export async function fetchEurostat() {
  console.log('  [TODO M4] eurostat.js — implement Eurostat JSON-stat fetcher');
  console.log('  Base:', CONFIG.eurostat.base);
  console.log('  Docs:', CONFIG.eurostat.docs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchEurostat().catch(e => { console.error(e); process.exit(1); });
}
