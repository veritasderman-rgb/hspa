// ČSÚ · DataStat fetcher
// TODO M3: implementovat podle PLAN_API_INTEGRACE.md sekce 5, milník M3.
//
// Cílové ukazatele (M1 demo set):
//  - naděje dožití při narození (M+Ž)
//  - naděje dožití ve zdraví (HLY 65+) — fallback z Eurostatu
//  - úmrtnost po krajích (Uz012)
//
// Endpoint: viz CONFIG.csu.base + dokumentace CONFIG.csu.docs
// Pokud DataStat API nedostupný, použij CSV fallback z CONFIG.csu.krok_db.

import { CONFIG } from '../config.js';

export async function fetchCsu() {
  console.log('  [TODO M3] csu.js — implement ČSÚ DataStat fetcher');
  console.log('  Base:', CONFIG.csu.base);
  console.log('  Docs:', CONFIG.csu.docs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchCsu().catch(e => { console.error(e); process.exit(1); });
}
