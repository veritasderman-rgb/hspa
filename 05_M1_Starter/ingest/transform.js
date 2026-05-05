// Transform vrstva (M5): harmonizace surových dat z fetcherů
// + výpočet finálních hodnot/trendů/benchmarků/signálů.
//
// Vstup:
//   indicators/*.json                 — metodické karty (zdroj pravdy o indikátorech)
//   ingest/cache/csu_<id>.json        — observace z M3
//   ingest/cache/oecd_<id>.json       — CZ + OECD agregát z M4
//   ingest/cache/eurostat_<id>.json   — CZ + EU agregát z M4
//   ingest/cache/oecd_benchmarks.json — souhrn benchmarků z M4
//   ingest/cache/eurostat.json        — souhrn benchmarků z M4
//
// Pokud cache pro indikátor neexistuje, transform použije hodnoty
// z aktuálního data/indicators.json jako fallback (seed values z M1).
// Tím funguje i v dev prostředí bez síťového přístupu.
//
// Výstup:
//   data/indicators.json — finální dataset pro frontend

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from './config.js';
import { getPopulation } from './lib/population.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.resolve(ROOT, CONFIG.cache.dir);

// ====== Signal logika (M1) ======

/**
 * @param {number} value
 * @param {number} benchmark
 * @param {'higher_is_better'|'lower_is_better'|'context_dependent'} direction
 * @param {{good:number, warn:number}} thresholds — procenta
 * @returns {'good'|'warn'|'bad'|'neutral'}
 */
export function computeSignal(value, benchmark, direction, thresholds) {
  if (value == null || benchmark == null) return 'neutral';
  if (direction === 'context_dependent') return 'neutral';
  const diff = ((value - benchmark) / benchmark) * 100;
  const adjusted = direction === 'higher_is_better' ? diff : -diff;
  if (adjusted > thresholds.good) return 'good';
  if (adjusted < -thresholds.warn) return 'bad';
  return 'warn';
}

// ====== Načítání ======

export function loadMethodCards() {
  const dir = path.join(ROOT, 'indicators');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const card = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    card._method_card_path = `indicators/${f}`;
    return card;
  });
}

export function loadSeedIndicators() {
  const file = path.join(ROOT, 'data', 'indicators.json');
  if (!fs.existsSync(file)) return new Map();
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Map((data.indicators ?? []).map(i => [i.id, i]));
}

function readCacheFile(name) {
  const file = path.join(CACHE_DIR, name);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

// ====== Extraktory pro jednotlivé zdroje ======

/**
 * Pro indikátor s primary type csu_datastat / csu_sha najde value a trend
 * v ingest/cache/csu_<id>.json (z M3).
 * Filtruje observace na celkovou ČR (region == null|'CZ0'|'CZE'|undefined, sex == 'T'|null).
 */
export function extractFromCsu(id) {
  const cache = readCacheFile(`csu_${id}.json`);
  if (!cache?.observations?.length) return null;
  const candidates = cache.observations.filter(o =>
    o.value != null
    && o.year != null
    && (o.sex == null || o.sex === 'T' || o.sex === 'TOTAL')
    && (o.region == null || ['CZ', 'CZ0', 'CZE'].includes(o.region))
  );
  if (!candidates.length) return null;
  return buildValueTrend(candidates);
}

/**
 * Pro indikátor z OECD vezme již vypočítanou CZ sérii z oecd_<id>.json (M4).
 */
export function extractFromOecd(id) {
  const cache = readCacheFile(`oecd_${id}.json`);
  if (!cache) return null;
  if (cache.cz?.value == null) return null;
  return {
    value: cache.cz.value,
    year: cache.cz.year,
    trend: cache.trend ?? [],
  };
}

/**
 * Pro indikátor z Eurostatu vezme CZ sérii z eurostat_<id>.json (M4).
 */
export function extractFromEurostat(id) {
  const cache = readCacheFile(`eurostat_${id}.json`);
  if (cache?.cz?.value == null) return null;
  return {
    value: cache.cz.value,
    year: cache.cz.year,
    trend: cache.trend ?? [],
  };
}

// ====== ÚZIS NZIS extraktory ======

let _nrhExtractsCache = null;
function loadNrhExtracts() {
  if (_nrhExtractsCache) return _nrhExtractsCache;
  const file = path.join(ROOT, 'ingest', 'mapping', 'uzis_indicator_extracts.json');
  if (!fs.existsSync(file)) return {};
  _nrhExtractsCache = JSON.parse(fs.readFileSync(file, 'utf8')).extracts ?? {};
  return _nrhExtractsCache;
}

/** Vrátí true, pokud kód MKN-10 (např. "I21") odpovídá filteru z mapping. */
export function matchesMkn10(code, query) {
  if (code == null) return false;
  const c = String(code).toUpperCase().trim();
  if (Array.isArray(query.mkn10_prefix) && query.mkn10_prefix.length) {
    return query.mkn10_prefix.some(p => c.startsWith(String(p).toUpperCase()));
  }
  if (query.mkn10_prefix_range) {
    const { from, to } = query.mkn10_prefix_range;
    return c >= String(from).toUpperCase() && c <= String(to).toUpperCase() + 'ZZ';
  }
  return true; // bez filtru
}

/**
 * Defenzivní mapování sloupců NRH řádku — různé exporty mohou mít
 * mírně odlišné názvy (rok / Rok / ROK, pohlavi / Pohlavi, …).
 */
function nrhRow(row) {
  const lower = {};
  for (const [k, v] of Object.entries(row)) lower[k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')] = v;
  return {
    rok: parseInt(lower.rok ?? lower.year, 10),
    pohlavi: lower.pohlavi ?? lower.sex,
    vekova_kategorie: lower.vekova_kategorie ?? lower.vek ?? lower.age,
    kraj: lower.kraj_bydliste ?? lower.kraj ?? lower.uzemi ?? lower.region,
    diagnoza: lower.diagnoza_3 ?? lower.diagnoza ?? lower.diag ?? lower.mkn10,
    druh_prijeti: lower.druh_prijeti ?? lower.admission,
    operace: lower.operace ?? lower.operation,
    umrti: parseInt(lower.umrti ?? lower.deaths ?? '0', 10),
    pocet: parseInt(lower.pocet ?? lower.count ?? lower.n ?? '0', 10),
  };
}

/**
 * Z NRH cache spočítá metric podle query.
 * @param {string} indicatorId — id v uzis_indicator_extracts.json
 * @returns {{ value:number, year:number, trend:Array<{year,value}> } | null}
 */
export function extractFromNrh(indicatorId) {
  const extracts = loadNrhExtracts();
  const query = extracts[indicatorId];
  if (!query) return null;

  const cache = readCacheFile(`uzis_${query.dataset}.json`);
  if (!cache?.records?.length) return null;

  // Agregace per rok (národní): { year → { deaths, hospitalizations } }
  const byYear = {};
  for (const raw of cache.records) {
    const r = nrhRow(raw);
    if (!Number.isFinite(r.rok)) continue;
    if (!matchesMkn10(r.diagnoza, query)) continue;
    if (Array.isArray(query.age_filter) && query.age_filter.length && !query.age_filter.includes(String(r.vekova_kategorie))) continue;
    if (Array.isArray(query.sex_filter) && query.sex_filter.length && !query.sex_filter.includes(String(r.pohlavi))) continue;

    const bucket = byYear[r.rok] ??= { deaths: 0, hospitalizations: 0 };
    bucket.deaths += r.umrti || 0;
    bucket.hospitalizations += r.pocet || 0;
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  if (!years.length) return null;

  const computeMetric = (b) => {
    if (query.metric === 'in_hospital_mortality_pct') {
      return b.hospitalizations > 0 ? round((b.deaths / b.hospitalizations) * 100, 2) : null;
    }
    if (query.metric === 'in_hospital_deaths_per_100k') {
      const pop = getPopulation('CZ') || 10_900_000;
      return round((b.deaths / pop) * 100_000, 1);
    }
    if (query.metric === 'hospitalizations_per_100k') {
      const pop = getPopulation('CZ') || 10_900_000;
      return round((b.hospitalizations / pop) * 100_000, 1);
    }
    return null;
  };

  const trend = years.slice(-5).map(y => ({ year: y, value: computeMetric(byYear[y]) })).filter(t => t.value != null);
  if (!trend.length) return null;
  const latest = trend[trend.length - 1];
  return { value: latest.value, year: latest.year, trend };
}

/**
 * Krajský rozpad pro NRH-based indikátor.
 * @param {string} indicatorId
 * @returns {{ year:number, country_avg:number, regions:Array<{code,value}> } | null}
 */
export function extractNrhRegions(indicatorId) {
  const extracts = loadNrhExtracts();
  const query = extracts[indicatorId];
  if (!query?.by_region) return null;

  const cache = readCacheFile(`uzis_${query.dataset}.json`);
  if (!cache?.records?.length) return null;

  // Najdi nejnovější rok
  let maxYear = -Infinity;
  for (const raw of cache.records) {
    const r = nrhRow(raw);
    if (Number.isFinite(r.rok) && r.rok > maxYear) maxYear = r.rok;
  }
  if (!Number.isFinite(maxYear)) return null;

  const byKraj = {};
  let totalDeaths = 0, totalHosp = 0;
  for (const raw of cache.records) {
    const r = nrhRow(raw);
    if (r.rok !== maxYear) continue;
    if (!matchesMkn10(r.diagnoza, query)) continue;
    if (!r.kraj) continue;

    const code = String(r.kraj).trim();
    const b = byKraj[code] ??= { deaths: 0, hospitalizations: 0 };
    b.deaths += r.umrti || 0;
    b.hospitalizations += r.pocet || 0;
    totalDeaths += r.umrti || 0;
    totalHosp += r.pocet || 0;
  }

  const computeForRegion = (b, regionCode) => {
    if (query.metric === 'in_hospital_mortality_pct') {
      return b.hospitalizations > 0 ? round((b.deaths / b.hospitalizations) * 100, 2) : null;
    }
    if (query.metric === 'in_hospital_deaths_per_100k') {
      const pop = getPopulation(regionCode);
      return pop ? round((b.deaths / pop) * 100_000, 1) : null;
    }
    if (query.metric === 'hospitalizations_per_100k') {
      const pop = getPopulation(regionCode);
      return pop ? round((b.hospitalizations / pop) * 100_000, 1) : null;
    }
    return null;
  };

  const regions = [];
  for (const [code, b] of Object.entries(byKraj)) {
    const v = computeForRegion(b, code);
    if (v != null) regions.push({ code, value: v });
  }

  let country_avg = null;
  if (query.metric === 'in_hospital_mortality_pct') {
    country_avg = totalHosp > 0 ? round((totalDeaths / totalHosp) * 100, 2) : null;
  } else if (query.metric === 'in_hospital_deaths_per_100k') {
    const pop = getPopulation('CZ');
    country_avg = pop ? round((totalDeaths / pop) * 100_000, 1) : null;
  } else if (query.metric === 'hospitalizations_per_100k') {
    const pop = getPopulation('CZ');
    country_avg = pop ? round((totalHosp / pop) * 100_000, 1) : null;
  }

  return { year: maxYear, country_avg, regions };
}

/**
 * Z NOR cache spočítá incidenci onkologického onemocnění (per 100k).
 * Filtr: MKN-10 prefix (z metodické karty), volitelně sex.
 *
 * @param {string} indicatorId — id v indicators/<id>.json
 * @returns {{ value:number, year:number, trend:Array<{year,value}> } | null}
 */
export function extractFromNor(indicatorId) {
  const cardFile = path.join(ROOT, 'indicators', `${indicatorId}.json`);
  if (!fs.existsSync(cardFile)) return null;
  const card = JSON.parse(fs.readFileSync(cardFile, 'utf8'));
  const primary = card?.data_source?.primary;
  if (primary?.type !== 'uzis_nor') return null;

  const cache = readCacheFile('uzis_nor_incidence.json');
  if (!cache?.records?.length) return null;

  const mkn10Prefixes = primary.mkn10_prefix ?? [];
  const sexFilter = primary.filter?.sex;

  const matchesMkn = (code) => {
    const c = String(code ?? '').toUpperCase();
    return mkn10Prefixes.length === 0 || mkn10Prefixes.some(p => c.startsWith(String(p).toUpperCase()));
  };

  // Defenzivní mapování sloupců
  const cols = cache.columns ?? Object.keys(cache.records[0] ?? {});
  const yearCol = cols.find(c => /^(rok|year|cas)$/i.test(c));
  const diagCol = cols.find(c => /^(diagnoza|diagnóza|diag|mkn|mkn10)$/i.test(c));
  const sexCol = cols.find(c => /^(pohlavi|pohlaví|sex|gender)$/i.test(c));
  const incCol = cols.find(c => /^(incidence|hodnota|value|count|n|pocet|počet)$/i.test(c));
  if (!yearCol || !diagCol || !incCol) return null;
  // Pokud je požadovaný sex filter ale sloupec chybí, raději vrátit null
  // než agregovat napříč všemi pohlavími a aplikovat ženskou populaci
  // jako jmenovatele — vzniknou systematicky vychýlené hodnoty.
  if (sexFilter && !sexCol) return null;

  const byYear = {};
  for (const row of cache.records) {
    if (!matchesMkn(row[diagCol])) continue;
    if (sexFilter && sexCol && String(row[sexCol]).toUpperCase() !== String(sexFilter).toUpperCase()) continue;
    const y = parseInt(row[yearCol], 10);
    const v = Number(row[incCol]);
    if (!Number.isFinite(y) || !Number.isFinite(v)) continue;
    byYear[y] = (byYear[y] ?? 0) + v;
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  if (!years.length) return null;

  // Pokud hodnota není už per 100k (heuristika: > 1000 znamená absolutní), přepočítej
  const pop = sexFilter === 'F' ? Math.round((getPopulation('CZ') ?? 10_900_000) * 0.51) : (getPopulation('CZ') ?? 10_900_000);

  const trend = years.slice(-5).map(y => {
    const raw = byYear[y];
    // Pokud je incidence už nějaká rozumná hodnota (< 500), předpokládáme že je už per 100k.
    // Jinak (absolutní počet) přepočítej.
    const value = raw < 500 ? raw : (raw / pop) * 100_000;
    return { year: y, value: round(value, 1) };
  });
  const latest = trend[trend.length - 1];
  return { value: latest.value, year: latest.year, trend };
}

/**
 * Z NRZP cache (records z `uzis_nzis_pracovnici.json`) spočítá počet
 * pracovníků dané role na 1 000 obyvatel ČR.
 *
 * Defenzivní: NRZP CSV může mít různé tvary. Funkce zkouší normalizovat
 * sloupce a hledat hodnoty pasující na role 'lekari' / 'sestry'.
 *
 * @param {string} role — 'lekari' | 'sestry'
 * @returns {{ value:number, year:number, trend:Array<{year,value}> } | null}
 */
export function extractFromNrzp(role) {
  const cache = readCacheFile('uzis_nrzp_pracovnici.json');
  if (!cache?.records?.length) return null;

  const ROLE_TOKENS = {
    lekari: ['lékař', 'lekar', 'meddoct', 'physician', 'doctor'],
    sestry: ['sestra', 'sestry', 'nurs'],
  };
  const tokens = ROLE_TOKENS[role] ?? [];

  const matchesRole = (row) => {
    const blob = Object.values(row).join(' ').toLowerCase();
    return tokens.some(t => blob.includes(t));
  };

  // Najdi sloupec s rokem a počtem
  const cols = cache.columns ?? Object.keys(cache.records[0] ?? {});
  const yearCol = cols.find(c => /rok|year/i.test(c));
  const countCol = cols.find(c => /pocet|počet|count|n/i.test(c));
  const krajCol = cols.find(c => /kraj|nuts|uzemi/i.test(c));

  if (!yearCol || !countCol) return null;

  // Agregace: pro každý rok suma pracovníků dané role v ČR (přes všechny kraje)
  const byYear = {};
  for (const row of cache.records) {
    if (!matchesRole(row)) continue;
    const y = parseInt(row[yearCol], 10);
    const n = Number(row[countCol]);
    if (!Number.isFinite(y) || !Number.isFinite(n)) continue;
    byYear[y] = (byYear[y] ?? 0) + n;
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  if (!years.length) return null;

  const population = getPopulation('CZ') || 10_900_000;
  const trend = years.slice(-5).map(y => ({
    year: y,
    value: round((byYear[y] / population) * 1000, 2),
  }));
  const latest = trend[trend.length - 1];
  return { value: latest.value, year: latest.year, trend };
}

/**
 * Krajský rozpad pro NRZP role (lékaři/sestry per 1000 obyvatel).
 * Vrátí { country_avg, regions: [{code, name, value}] }.
 */
export function extractNrzpRegions(role) {
  const cache = readCacheFile('uzis_nrzp_pracovnici.json');
  if (!cache?.records?.length) return null;

  const ROLE_TOKENS = {
    lekari: ['lékař', 'lekar', 'meddoct', 'physician'],
    sestry: ['sestra', 'sestry', 'nurs'],
  };
  const tokens = ROLE_TOKENS[role] ?? [];
  const matchesRole = (row) => tokens.some(t => Object.values(row).join(' ').toLowerCase().includes(t));

  const cols = cache.columns ?? Object.keys(cache.records[0] ?? {});
  const yearCol = cols.find(c => /rok|year/i.test(c));
  const krajCol = cols.find(c => /kraj|nuts|uzemi/i.test(c));
  const countCol = cols.find(c => /pocet|počet|count/i.test(c));
  if (!yearCol || !krajCol || !countCol) return null;

  // Najdi nejnovější rok
  const years = [...new Set(cache.records.map(r => parseInt(r[yearCol], 10)).filter(Number.isFinite))];
  if (!years.length) return null;
  const latestYear = Math.max(...years);

  const byKraj = {};
  for (const row of cache.records) {
    if (!matchesRole(row)) continue;
    if (parseInt(row[yearCol], 10) !== latestYear) continue;
    const code = String(row[krajCol]).trim();
    const n = Number(row[countCol]);
    if (!Number.isFinite(n)) continue;
    byKraj[code] = (byKraj[code] ?? 0) + n;
  }

  const regions = [];
  let totalPop = 0;
  let totalCount = 0;
  for (const [code, count] of Object.entries(byKraj)) {
    const pop = getPopulation(code);
    if (!pop) continue;
    regions.push({ code, value: round((count / pop) * 1000, 2) });
    totalPop += pop;
    totalCount += count;
  }
  const country_avg = totalPop ? round((totalCount / totalPop) * 1000, 2) : null;
  return { country_avg, regions, year: latestYear };
}

function buildValueTrend(observations, years = 5) {
  const sorted = [...observations].sort((a, b) => a.year - b.year);
  const trend = sorted.slice(-years).map(o => ({ year: o.year, value: round(o.value, 2) }));
  const latest = sorted[sorted.length - 1];
  return { value: round(latest.value, 2), year: latest.year, trend };
}

function round(n, places) {
  if (n == null || !Number.isFinite(n)) return n;
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

// ====== Benchmark extrakce ======

/**
 * Najde benchmark pro indikátor:
 *   1. oecd_benchmarks.json[id].oecd.value (M4)
 *   2. eurostat.json[id].eu.value (M4) jako EU benchmark
 *   3. fallback ze seed
 */
export function extractBenchmark(id, oecdSummary, eurostatSummary, seed) {
  const out = {};
  const oecd = oecdSummary?.benchmarks?.[id]?.oecd?.value;
  if (oecd != null && Number.isFinite(oecd)) out.oecd = round(oecd, 2);

  const eu = eurostatSummary?.benchmarks?.[id]?.eu?.value;
  if (eu != null && Number.isFinite(eu)) out.eu = round(eu, 2);

  // Doplň ze seed, co chybí
  if (out.oecd == null && seed?.benchmark?.oecd != null) out.oecd = seed.benchmark.oecd;
  if (out.eu == null && seed?.benchmark?.eu != null) out.eu = seed.benchmark.eu;
  return out;
}

// ====== Sestavení indikátoru ======

const SOURCE_TYPE_TO_LABEL = {
  csu_datastat: { name: 'ČSÚ · DataStat', url: 'https://csu.gov.cz/' },
  csu_sha: { name: 'ČSÚ · SHA', url: 'https://csu.gov.cz/' },
  eurostat_jsonstat: { name: 'Eurostat', url: 'https://ec.europa.eu/eurostat' },
  oecd: { name: 'OECD Health Statistics', url: 'https://stats.oecd.org/' },
  uzis_nrzp: { name: 'ÚZIS · NRZP', url: 'https://www.uzis.cz/' },
  uzis_nzis: { name: 'ÚZIS · NZIS', url: 'https://www.uzis.cz/' },
  uzis_nrh: { name: 'ÚZIS · NRH', url: 'https://www.uzis.cz/' },
  uzis_nor: { name: 'ÚZIS · NOR', url: 'https://www.uzis.cz/' },
  nrc_nrhosp: { name: 'NRC · NRHOSP', url: 'https://www.nrc.cz/' },
  ehis_szu: { name: 'EHIS · SZÚ', url: 'https://szu.gov.cz/' },
  szu_amres: { name: 'SZÚ · NRL pro antibiotika', url: 'https://szu.gov.cz/' },
  eea: { name: 'EEA', url: 'https://www.eea.europa.eu/' },
};

/**
 * Sestaví entry pro data/indicators.json z metodické karty.
 * @returns {object} entry odpovídající datovému kontraktu
 */
export function buildIndicator(card, { seed, oecdSummary, eurostatSummary } = {}) {
  const primaryType = card?.data_source?.primary?.type;

  let extracted = null;
  let actualSourceType = primaryType;
  if (primaryType === 'csu_datastat' || primaryType === 'csu_sha') {
    extracted = extractFromCsu(card.id);
  } else if (primaryType === 'eurostat_jsonstat') {
    extracted = extractFromEurostat(card.id);
  } else if (primaryType === 'oecd') {
    extracted = extractFromOecd(card.id);
  } else if (primaryType === 'uzis_nrzp') {
    // Lékaři vs. sestry odlišíme podle id indikátoru
    const role = card.id.startsWith('lekari') ? 'lekari'
      : card.id.startsWith('sestry') ? 'sestry' : null;
    if (role) extracted = extractFromNrzp(role);
  } else if (primaryType === 'uzis_nrh' || primaryType === 'nrc_nrhosp') {
    // NRH dlouhodobá řada — pokud je indikátor v uzis_indicator_extracts.json
    const fromNrh = extractFromNrh(card.id);
    if (fromNrh) {
      extracted = fromNrh;
      actualSourceType = 'uzis_nrh';
    }
  } else if (primaryType === 'uzis_nor') {
    extracted = extractFromNor(card.id);
  }

  // Fallback na OECD pokud máme jen benchmark (např. nrc_nrhosp s OECD proxy)
  if (!extracted && card?.data_source?.fallback?.type === 'oecd') {
    extracted = extractFromOecd(card.id);
    if (extracted) actualSourceType = 'oecd';
  }

  // Posledni fallback: seed (M1 hodnoty)
  const value = extracted?.value ?? seed?.value ?? null;
  const year = extracted?.year ?? seed?.year ?? null;
  const trend = extracted?.trend?.length ? extracted.trend : (seed?.trend ?? []);

  const benchmark = extractBenchmark(card.id, oecdSummary, eurostatSummary, seed);

  const refValue = benchmark.oecd ?? benchmark.eu ?? null;
  const signal = computeSignal(value, refValue, card.direction, card.signal_thresholds);

  const sourceLabel = SOURCE_TYPE_TO_LABEL[actualSourceType] ?? { name: actualSourceType ?? 'unknown', url: '' };
  const sourceUsed = extracted ? 'live' : 'seed';
  const cacheFileForSource = {
    csu_datastat: `csu_${card.id}.json`,
    csu_sha: `csu_${card.id}.json`,
    eurostat_jsonstat: `eurostat_${card.id}.json`,
    oecd: `oecd_${card.id}.json`,
    uzis_nrzp: 'uzis_nrzp_pracovnici.json',
    uzis_nrh: 'uzis_nrh_dlouhodoba_rada.json',
    uzis_nor: 'uzis_nor_incidence.json',
  }[actualSourceType];
  const fetchedAt = extracted
    ? (cacheFileForSource && readCacheFile(cacheFileForSource)?.fetched_at) ?? new Date().toISOString()
    : (seed?.source?.fetched_at ?? new Date().toISOString());

  return {
    id: card.id,
    name: card.name,
    area: card.area,
    domain: card.domain,
    subdomain: card.subdomain,
    value,
    unit: card.unit,
    year,
    trend,
    benchmark,
    signal,
    source: {
      name: sourceLabel.name,
      url: sourceLabel.url,
      fetched_at: fetchedAt,
      origin: sourceUsed,
    },
    method_card_url: card._method_card_path ?? `indicators/${card.id}.json`,
  };
}

// ====== Hlavní transform ======

export async function transform({
  outFile = path.join(ROOT, 'data', 'indicators.json'),
  regionsFile = path.join(ROOT, 'data', 'regions.json'),
} = {}) {
  const cards = loadMethodCards();
  const seed = loadSeedIndicators();
  const oecdSummary = readCacheFile('oecd_benchmarks.json');
  const eurostatSummary = readCacheFile('eurostat.json');

  const indicators = cards.map(card =>
    buildIndicator(card, { seed: seed.get(card.id), oecdSummary, eurostatSummary })
  );

  // Validace — každý indikátor musí mít minimum povinných polí
  const errors = [];
  for (const ind of indicators) {
    for (const f of ['id', 'name', 'area', 'value', 'unit', 'signal']) {
      if (ind[f] == null) errors.push(`${ind.id}: chybí pole '${f}'`);
    }
  }
  if (errors.length) {
    console.error('[transform] validation errors:');
    errors.forEach(e => console.error('  -', e));
    throw new Error(`transform: ${errors.length} validation error(s)`);
  }

  const out = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    indicators,
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n');

  const live = indicators.filter(i => i.source?.origin === 'live').length;
  console.log(`[transform] wrote ${indicators.length} indicators (${live} from live cache, ${indicators.length - live} from seed)`);

  // Aktualizuj regions.json o NRH datasety (pokud máme cache)
  await updateRegionsFromNrh(regionsFile, indicators);

  return out;
}

/**
 * Doplní data/regions.json o per-indikátor krajský rozpad pro NRH-based
 * indikátory (mortalita_inhosp_ami, mortalita_inhosp_cmp, mortalita_kardiovaskularni,
 * hospitalizace_na_100k). Zachovává existující datasety v souboru — jen přidává
 * nebo aktualizuje ty, pro které máme aktuální NRH cache.
 */
async function updateRegionsFromNrh(regionsFile, indicators) {
  if (!readCacheFile('uzis_nrh_dlouhodoba_rada.json')) return; // bez cache nic neměníme
  const extracts = loadNrhExtracts();
  const updates = [];

  for (const [id, query] of Object.entries(extracts)) {
    if (!query.by_region) continue;
    const r = extractNrhRegions(id);
    if (!r || !r.regions.length) continue;
    const card = indicators.find(i => i.id === id);
    if (!card) continue;

    // Doplnit jména krajů z populace (CZ010 → Praha, ...)
    const regionsWithNames = r.regions.map(reg => ({
      code: reg.code,
      name: getRegionName(reg.code),
      value: reg.value,
    })).filter(reg => reg.name);

    updates.push({
      id,
      name: card.name,
      unit: card.unit,
      year: r.year,
      country_avg: r.country_avg,
      direction: card.direction ?? 'context_dependent',
      regions: regionsWithNames,
    });
  }

  if (!updates.length) return;

  // Načti existující regions.json a merge
  let existing = { version: '2.0', generated_at: new Date().toISOString(), datasets: [] };
  if (fs.existsSync(regionsFile)) {
    try { existing = JSON.parse(fs.readFileSync(regionsFile, 'utf8')); }
    catch { /* corrupt file → přepíšeme */ }
  }
  if (!Array.isArray(existing.datasets)) existing.datasets = [];

  for (const upd of updates) {
    const existingIdx = existing.datasets.findIndex(d => d.id === upd.id);
    if (existingIdx >= 0) existing.datasets[existingIdx] = upd;
    else existing.datasets.push(upd);
  }
  existing.generated_at = new Date().toISOString();
  fs.writeFileSync(regionsFile, JSON.stringify(existing, null, 2) + '\n');
  console.log(`[transform] regions.json: aktualizováno ${updates.length} NRH dataset(ů)`);
}

function getRegionName(code) {
  // Tabulka kódů krajů — duplicita s lib/population.js, ale zde jen pro názvy
  const names = {
    CZ010: 'Praha', CZ020: 'Středočeský', CZ031: 'Jihočeský', CZ032: 'Plzeňský',
    CZ041: 'Karlovarský', CZ042: 'Ústecký', CZ051: 'Liberecký', CZ052: 'Královéhradecký',
    CZ053: 'Pardubický', CZ063: 'Vysočina', CZ064: 'Jihomoravský', CZ071: 'Olomoucký',
    CZ072: 'Zlínský', CZ080: 'Moravskoslezský',
  };
  return names[code] ?? null;
}

// Entry point pro `npm run transform`
if (import.meta.url === `file://${process.argv[1]}`) {
  transform().catch(err => {
    console.error('[transform] FAIL:', err);
    process.exit(1);
  });
}
