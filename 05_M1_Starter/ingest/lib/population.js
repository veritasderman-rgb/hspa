// Populace krajů ČR — referenční tabulka pro výpočet indikátorů „na 1000/100k obyvatel".
//
// Zdroj: statický JSON ingest/data/cz_population_2024.json (ČSÚ).
// Pokud bude v ingest/cache/ čerstvý csu_populace.json, preferuje se ten
// (live data ze ČSÚ DataStat). Statický soubor je fallback.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCacheIfFresh } from './cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

let _staticCache = null;
function loadStatic() {
  if (_staticCache) return _staticCache;
  const file = path.join(ROOT, 'ingest', 'data', 'cz_population_2024.json');
  _staticCache = JSON.parse(fs.readFileSync(file, 'utf8'));
  return _staticCache;
}

/**
 * Vrátí populaci kraje (kód NUTS-3, např. 'CZ010') nebo celé ČR ('CZ').
 * @param {string} code
 * @returns {number|null}
 */
export function getPopulation(code) {
  // Pokus o live data ze ČSÚ
  const live = readCacheIfFresh('csu_populace.json', 24 * 30); // 30 dní (populace se mění pomalu)
  if (live?.regions?.[code]?.population) return live.regions[code].population;
  if (live?.country?.code === code && live?.country?.population) return live.country.population;

  // Fallback statický
  const stat = loadStatic();
  if (code === 'CZ' || code === stat.country?.code) return stat.country.population;
  return stat.regions?.[code]?.population ?? null;
}

export function listRegions() {
  const stat = loadStatic();
  return Object.entries(stat.regions ?? {}).map(([code, r]) => ({ code, name: r.name, population: r.population }));
}

export function countryPopulation() {
  const stat = loadStatic();
  return stat.country?.population ?? null;
}
