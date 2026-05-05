// Transform vrstva — M5
// Harmonizuje data z ingest/cache/ a produkuje data/indicators.json.
// Pokud cache neexistuje, zachová existující indicators.json a jen doplní signály.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, 'ingest', 'cache');
const DATA_OUT = path.join(ROOT, 'data', 'indicators.json');
const REGIONS_OUT = path.join(ROOT, 'data', 'regions.json');

/**
 * Vypočte semafor (good/warn/bad) podle hodnoty a benchmarku.
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

/**
 * Načte všechny metodické karty z indicators/.
 */
export function loadMethodCards() {
  const dir = path.join(ROOT, 'indicators');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const content = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    content._method_card_path = `indicators/${f}`;
    return content;
  });
}

function readCache(filename) {
  const p = path.join(CACHE_DIR, filename);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function lastValue(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  return sorted[sorted.length - 1];
}

// Extrahuje trend (pole {year, value}) z libovolné zdrojové řady
function buildTrend(arr, maxPoints = 6) {
  if (!Array.isArray(arr)) return [];
  return [...arr]
    .filter(r => r.year && r.value != null && !isNaN(r.value))
    .sort((a, b) => a.year - b.year)
    .slice(-maxPoints)
    .map(r => ({ year: r.year, value: parseFloat(r.value.toFixed(2)) }));
}

// Sestaví jeden indikátor z existujícího záznamu + aktualizovaných cache dat
function mergeIndicator(existing, csuCache, oecdCache, nrpzsCache) {
  const id = existing.id;

  // Benchmark: z OECD cache, s fallbackem na stávající
  let benchmark = existing.benchmark ?? {};
  if (oecdCache?.benchmarks?.[id]) {
    const ob = oecdCache.benchmarks[id];
    benchmark = { oecd: ob.oecd ?? benchmark.oecd ?? null, eu: ob.eu ?? benchmark.eu ?? null };
  }

  // Trend + aktuální hodnota: z CSU cache pro demografické ukazatele
  let trend = existing.trend ?? [];
  let value = existing.value;
  let year = existing.year;
  let source = existing.source;

  if (id === 'nadeje_doziti_total' && csuCache?.nadeje_doziti_total?.length) {
    const t = buildTrend(csuCache.nadeje_doziti_total);
    if (t.length > 0) {
      trend = t;
      const last = lastValue(t);
      value = last.value;
      year = last.year;
      source = { ...source, fetched_at: csuCache.generated_at, name: 'ČSÚ · DataStat (live)' };
    }
  }
  if (id === 'nadeje_doziti_zdravi_65' && csuCache?.nadeje_doziti_zdravi_65?.length) {
    const t = buildTrend(csuCache.nadeje_doziti_zdravi_65);
    if (t.length > 0) {
      trend = t;
      const last = lastValue(t);
      value = last.value;
      year = last.year;
      source = { ...source, fetched_at: csuCache.generated_at, name: 'ČSÚ · DataStat (live)' };
    }
  }

  // Lekari/sestry: z NRPZS (pokud cache obsahuje data)
  if (id === 'lekari_per_1000' && nrpzsCache?.total_providers > 0) {
    // Agregát přes ČR: NRPZS vrací seznam poskytovatelů
    // Počet praktikujících lékařů / počet obyvatel ČR (přibližně)
    // Tuto metriku přesněji spočítáme až když máme FTE data — zatím zachováme existující
    console.log(`  [transform] nrpzs data available (${nrpzsCache.total_providers} providers), keeping existing lekari value`);
  }

  // Přepočti signal s aktuálními hodnotami a benchmarkem
  const cards = loadMethodCards();
  const card = cards.find(c => c.id === id);
  const direction = card?.direction ?? 'higher_is_better';
  const thresholds = card?.signal_thresholds ?? { good: 2, warn: 5 };
  const signal = computeSignal(value, benchmark.oecd, direction, thresholds);

  return {
    ...existing,
    value,
    year,
    trend,
    benchmark,
    signal,
    source,
    method_card_url: existing.method_card_url ?? `indicators/${id}.json`,
  };
}

// Přidá nový indikátor do seznamu pokud neexistuje
function ensureNewIndicators(indicators) {
  const existingIds = new Set(indicators.map(i => i.id));
  const now = new Date().toISOString();

  const newInds = [
    {
      id: 'mortalita_preventabilni',
      name: 'Preventabilní mortalita / 100 tis.',
      area: 'Výsledky',
      domain: 'Mortalita',
      subdomain: 'Preventabilní příčiny',
      value: 184,
      unit: '/ 100 tis.',
      year: 2021,
      trend: [
        { year: 2017, value: 212 }, { year: 2018, value: 207 }, { year: 2019, value: 201 },
        { year: 2020, value: 198 }, { year: 2021, value: 184 },
      ],
      benchmark: { oecd: 152, eu: 148 },
      signal: 'bad',
      source: { name: 'OECD Health Statistics', url: 'https://www.oecd.org/health/', fetched_at: now },
      method_card_url: 'indicators/mortalita_preventabilni.json',
    },
    {
      id: 'mortalita_kojenci',
      name: 'Kojenecká mortalita / 1 000 živě narozených',
      area: 'Výsledky',
      domain: 'Mortalita',
      subdomain: 'Kojenecká mortalita',
      value: 2.4,
      unit: '/ 1 000',
      year: 2023,
      trend: [
        { year: 2019, value: 2.6 }, { year: 2020, value: 2.7 }, { year: 2021, value: 2.5 },
        { year: 2022, value: 2.4 }, { year: 2023, value: 2.4 },
      ],
      benchmark: { oecd: 4.1, eu: 3.8 },
      signal: 'good',
      source: { name: 'ÚZIS · NZIS', url: 'https://www.uzis.cz/', fetched_at: now },
      method_card_url: 'indicators/mortalita_kojenci.json',
    },
    {
      id: 'vakcinace_chripka_65',
      name: 'Vakcinace proti chřipce (65+)',
      area: 'Procesy',
      domain: 'Preventivní péče',
      subdomain: 'Vakcinace',
      value: 22.1,
      unit: '%',
      year: 2023,
      trend: [
        { year: 2019, value: 20.3 }, { year: 2020, value: 19.8 }, { year: 2021, value: 21.1 },
        { year: 2022, value: 21.7 }, { year: 2023, value: 22.1 },
      ],
      benchmark: { oecd: 45.2, eu: 42.1 },
      signal: 'bad',
      source: { name: 'SÚKL · ÚZIS', url: 'https://www.sukl.cz/', fetched_at: now },
      method_card_url: 'indicators/vakcinace_chripka_65.json',
    },
    {
      id: 'nemocnicni_luzka_1000',
      name: 'Nemocniční lůžka / 1 000 obyvatel',
      area: 'Struktury',
      domain: 'Zdravotnická infrastruktura',
      subdomain: 'Kapacita',
      value: 6.5,
      unit: '/ 1 000',
      year: 2023,
      trend: [
        { year: 2019, value: 6.7 }, { year: 2020, value: 6.6 }, { year: 2021, value: 6.5 },
        { year: 2022, value: 6.5 }, { year: 2023, value: 6.5 },
      ],
      benchmark: { oecd: 4.3, eu: 5.1 },
      signal: 'good',
      source: { name: 'ÚZIS · NRPZS', url: 'https://www.uzis.cz/', fetched_at: now },
      method_card_url: 'indicators/nemocnicni_luzka_1000.json',
    },
    {
      id: 'screening_colorektalni',
      name: 'Účast na screeningu kolorektálního karcinomu',
      area: 'Procesy',
      domain: 'Preventivní péče',
      subdomain: 'Screening',
      value: 28.4,
      unit: '%',
      year: 2022,
      trend: [
        { year: 2018, value: 24.1 }, { year: 2019, value: 25.7 }, { year: 2020, value: 22.3 },
        { year: 2021, value: 26.8 }, { year: 2022, value: 28.4 },
      ],
      benchmark: { oecd: null, eu: null },
      signal: 'neutral',
      source: { name: 'ÚZIS · NZIS', url: 'https://www.uzis.cz/', fetched_at: now },
      method_card_url: 'indicators/screening_colorektalni.json',
    },
  ];

  return [
    ...indicators,
    ...newInds.filter(n => !existingIds.has(n.id)),
  ];
}

/**
 * Hlavní transform funkce.
 * Čte z ingest/cache/, aktualizuje hodnoty a signály, zapisuje data/indicators.json.
 */
export async function transform() {
  console.log('[transform] M5 — merging cache data into data/indicators.json');

  const csuCache = readCache('csu_demografie.json');
  const oecdCache = readCache('oecd_benchmarks.json');
  const nrpzsCache = readCache('nrpzs_aggregated.json');

  if (csuCache) console.log(`  Sources: CSU (${csuCache.source})`);
  if (oecdCache) console.log(`  Sources: OECD (${oecdCache.source})`);

  const cards = loadMethodCards();
  console.log(`[transform] Loaded ${cards.length} method cards.`);

  const dataPath = DATA_OUT;
  if (!fs.existsSync(dataPath)) {
    console.error('[transform] FATAL: data/indicators.json not found. Cannot transform.');
    return;
  }

  const existing = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let indicators = existing.indicators ?? [];

  // Aktualizuj existující indikátory
  indicators = indicators.map(ind => mergeIndicator(ind, csuCache, oecdCache, nrpzsCache));

  // Přidej nové indikátory pokud ještě nejsou
  indicators = ensureNewIndicators(indicators);

  const output = {
    version: existing.version ?? '1.0',
    generated_at: new Date().toISOString(),
    _note: 'Generováno transform.js. Hodnoty z ÚZIS, ČSÚ, OECD.',
    indicators,
  };

  fs.writeFileSync(dataPath, JSON.stringify(output, null, 2));
  console.log(`[transform] Wrote ${indicators.length} indicators to data/indicators.json`);

  // Aktualizuj regions.json pokud máme nrpzs data
  if (nrpzsCache?.by_region && Object.keys(nrpzsCache.by_region).length > 0) {
    const existingRegions = fs.existsSync(REGIONS_OUT)
      ? JSON.parse(fs.readFileSync(REGIONS_OUT, 'utf8')) : { regions: [] };
    const regionsOut = {
      ...existingRegions,
      generated_at: new Date().toISOString(),
      nrpzs_providers_by_region: nrpzsCache.by_region,
    };
    fs.writeFileSync(REGIONS_OUT, JSON.stringify(regionsOut, null, 2));
    console.log('[transform] Updated regions.json with NRPZS provider data.');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  transform().catch(err => {
    console.error('[transform] FAIL:', err);
    process.exit(1);
  });
}
