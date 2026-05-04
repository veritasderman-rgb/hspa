// ÚZIS · NRPZS fetcher
// TODO M2: implementovat podle PLAN_API_INTEGRACE.md sekce 5, milník M2.
//
// Endpoint: https://nrpzs.uzis.cz/api/v1/mista-poskytovani
// Cíl: agregovat počet poskytovatelů podle kraje a typu specializace.
// Výstup: ingest/cache/nrpzs_raw.json a ingest/cache/nrpzs_aggregated.json
//
// Implementační tipy:
//  - retry s exponential backoff (CONFIG.retry)
//  - klientský cache (skip pokud cache mladší než CONFIG.cache.ttl_hours)
//  - User-Agent header z CONFIG.uzis.user_agent
//  - logovat URL, status, čas do audit logu

import { CONFIG } from '../config.js';

export async function fetchNrpzs() {
  console.log('  [TODO M2] uzis_nrpzs.js — implement NRPZS fetcher');
  console.log('  Endpoint:', `${CONFIG.uzis.nrpzs_base}/mista-poskytovani`);
  console.log('  Docs:', CONFIG.uzis.docs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchNrpzs().catch(e => { console.error(e); process.exit(1); });
}
