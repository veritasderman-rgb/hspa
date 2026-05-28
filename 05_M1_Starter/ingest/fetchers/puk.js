// PUK fetcher — scraping Portálu ukazatelů kvality (Kancelář zdravotního pojištění).
//
// Endpoint: https://puk.kancelarzp.cz/ (HTML stránky, žádné API)
// Souhlas: KZP, viz PLAN-KVALITA-PECE.md
//
// Strategie:
//   1) Načti index PUK
//   2) Pro každý KNOWN_INDICATOR si stáhni detail-kartu
//   3) Z HTML pomocí cheerio extrahuj národní hodnotu + krajský rozpad
//   4) Zapiš do ingest/cache/puk_raw.json + data/clinical-scraping-log.json
//
// Důležité: scraping je křehký — pokud PUK změní strukturu, selektor selže.
// Proto:
//   - každý indikátor má SADU fallback selektorů (try-in-order)
//   - úspěšný / neúspěšný pokus se loguje do scraping-log.json
//   - selhání jednotlivého indikátoru je non-fatal (vrací null, transform fallne na seed)
//   - žádné silent failures — pokud žádný selektor neuspěl, log obsahuje
//     posledních 500 znaků HTML pro audit
//
// Fixture mód:
//   PUK_FIXTURE_DIR=./fixtures/puk node ingest/fetchers/puk.js
//   Pro testy bez síťového přístupu — místo HTTP fetchů načte z .html souborů.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { fetchWithRetry, HttpError } from '../lib/http.js';
import { writeCache, cachePath } from '../lib/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const PUK_BASE = 'https://puk.kancelarzp.cz';
const CACHE_FILE = 'puk_raw.json';
const LOG_FILE = path.join(ROOT, 'data', 'clinical-scraping-log.json');

/**
 * Známé indikátory PUK s URL k detail-kartě.
 * URL ověřeny proti živému PUK (2026-05-28) — WordPress paths.
 * Některé hodnoty jsou v inline CanvasJS dataPoints, jiné v iframe na puk.kzp.cz.
 *
 * Pokud URL vrátí 404, fetch_failed status se zaloguje a maintainer
 * dohledá nový path v navigaci PUK.
 */
const KNOWN_INDICATORS = [
  {
    id: 'pooperacni_sepse_psi13',
    title_hint: 'Pooperační sepse',
    series_name: 'Všechny sledované operace',
    detail_url_candidates: [
      // Detail page → iframe → graph PHP s inline dataPoints
      `https://puk.kzp.cz/vysledky/sepsegraf1.php`,
      `${PUK_BASE}/pooperacni-sepse/`,
    ],
  },
  {
    id: 'mortalita_30d_ami',
    title_hint: '30denní mortalita pacientů s AIM hospitalizovaných v ČR',
    series_name: 'Celá ČR',
    detail_url_candidates: [
      `${PUK_BASE}/30denni-mortalita-pacientu-s-aim-hospitalizovanych-v-cr/`,
    ],
  },
  {
    id: 'mortalita_30d_cmp',
    title_hint: '30denní mortalita pacientů s ischemickou CMP',
    extraction: 'stripline',
    detail_url_candidates: [
      `${PUK_BASE}/30denni-mortalita-pacientu-s-ischemickou-cevni-mozkovou-prihodou-hospitalizovanych-v-cr/`,
    ],
  },
  {
    id: 'trombektomie_cmp',
    title_hint: 'Mechanická trombektomie',
    series_name: 'Celá ČR',
    detail_url_candidates: [
      `${PUK_BASE}/podil-hospitalizacnich-pripadu-s-uzitim-mechanicke-trombektomie/`,
    ],
  },
  {
    id: 'centralizace_cmp',
    title_hint: 'Míra centralizace pacientů s CMP',
    series_name: 'Celá ČR',
    detail_url_candidates: [
      `${PUK_BASE}/mira-centralizace-pacientu-s-cmp/`,
    ],
  },
  // Onkologická chirurgie — 5 diagnóz, hodnota přes stripLines national reference
  {
    id: 'mortalita_90d_pankreas',
    title_hint: '90denní mortalita resekce pankreatu',
    extraction: 'stripline',
    detail_url_candidates: [
      `${PUK_BASE}/90denni-mortalita-pacientu-po-resekcnim-vykonu-na-pankreatu/`,
    ],
  },
  {
    id: 'mortalita_90d_jicen',
    title_hint: '90denní mortalita resekce jícnu',
    extraction: 'stripline',
    detail_url_candidates: [
      `${PUK_BASE}/90denni-mortalita-po-resekci-karcinomu-jicnu/`,
    ],
  },
  {
    id: 'mortalita_90d_plice',
    title_hint: '90denní mortalita resekce plic',
    extraction: 'stripline',
    detail_url_candidates: [
      `${PUK_BASE}/90denni-mortalita-po-resekci-karcinomu-plic/`,
    ],
  },
  // Rekta a kolorekt mají DVĚ varianty na stránce:
  // chartContainer2024 (bez prefixu) = akutní (vyšší mortalita 13-23 %)
  // chartContainer12024 (prefix '1') = elektivní (nižší mortalita 4-8 %)
  {
    id: 'mortalita_90d_rekta_elektiv',
    title_hint: '90denní mortalita resekce rekta (elektivní)',
    extraction: 'stripline',
    stripline_variant: '1',
    detail_url_candidates: [
      `${PUK_BASE}/90denni-mortalita-po-resekci-karcinomu-rekta/`,
    ],
  },
  {
    id: 'mortalita_90d_rekta_akutni',
    title_hint: '90denní mortalita resekce rekta (akutní)',
    extraction: 'stripline',
    // stripline_variant: null → bere chartContainer{rok} (bez prefixu)
    detail_url_candidates: [
      `${PUK_BASE}/90denni-mortalita-po-resekci-karcinomu-rekta/`,
    ],
  },
  {
    id: 'mortalita_90d_kolorekt_elektiv',
    title_hint: '90denní mortalita resekce kolorekta (elektivní)',
    extraction: 'stripline',
    stripline_variant: '1',
    detail_url_candidates: [
      `${PUK_BASE}/90denni-mortalita-po-resekci-karcinomu-tlusteho-streva/`,
    ],
  },
  {
    id: 'mortalita_90d_kolorekt_akutni',
    title_hint: '90denní mortalita resekce kolorekta (akutní)',
    extraction: 'stripline',
    detail_url_candidates: [
      `${PUK_BASE}/90denni-mortalita-po-resekci-karcinomu-tlusteho-streva/`,
    ],
  },
];

const REGIONS = [
  'Praha', 'Středočeský', 'Jihočeský', 'Plzeňský', 'Karlovarský',
  'Ústecký', 'Liberecký', 'Královéhradecký', 'Pardubický',
  'Vysočina', 'Jihomoravský', 'Olomoucký', 'Zlínský', 'Moravskoslezský',
];

/**
 * Extrahuje CanvasJS axisY stripLines hodnoty (národní průměry vykreslené
 * jako červené referenční čáry v sloupcových grafech PUK onko-chirurgie + CMP).
 *
 * Detekuje chart kontejnery typu `chartContainer2024`, `chartContainer52024`,
 * `chartContainer12024` — různé prefixy pro varianty (elektivní/akutní/celkem).
 *
 * @param {string} html
 * @returns {{stripLines: Array<{container: string, year: number|null, value: number}>, strategy: string}}
 */
export function extractStripLineValues(html) {
  const re = /new CanvasJS\.Chart\("(chartContainer\w+)"[\s\S]{0,3000}?stripLines:\s*\[\s*\{\s*value:\s*(-?\d+\.?\d*)/g;
  const lines = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const container = m[1];
    const value = parseFloat(m[2]);
    // Container jména obsahují rok — např. chartContainer2024, chartContainer52024 (5=akutní), chartContainer12024 (1=elektivní)
    const yearMatch = container.match(/(\d{4})$/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
    // Prefix před rokem identifikuje variantu (1=elektivní, 5=akutní u některých indikátorů)
    const prefixMatch = container.match(/chartContainer(\d)(\d{4})$/);
    const variant = prefixMatch ? prefixMatch[1] : null;
    lines.push({ container, year, variant, value });
  }
  return { stripLines: lines, strategy: lines.length > 0 ? 'canvasjs-stripline' : 'none' };
}

/**
 * Vybere nejnovější rok z stripLines pro konkrétní variantu (default = bez variantní rozpadu).
 * @param {Array} stripLines
 * @param {string|null} variant — '1' = elektivní, '5' = akutní; null = bez varianty
 */
export function pickLatestStripLine(stripLines, variant = null) {
  // Hlavní pokus: filtrované podle požadované varianty + známý rok
  const filtered = stripLines.filter(s => s.year !== null && s.variant === variant);
  if (filtered.length > 0) {
    filtered.sort((a, b) => b.year - a.year);
    return filtered[0];
  }
  // Pokud uživatel nepožadoval konkrétní variantu (variant=null) a žádná není null,
  // ale existuje JEDINÁ jiná varianta s ročními daty — použij ji (typicky pankreas:
  // chartContainer52024, kde "5" je intrinsic chart-type prefix, ne semantic variant).
  if (variant === null) {
    const yearLines = stripLines.filter(s => s.year !== null);
    const variants = [...new Set(yearLines.map(s => s.variant))];
    if (variants.length === 1 && variants[0] !== null) {
      const onlyVariant = yearLines.filter(s => s.variant === variants[0]);
      onlyVariant.sort((a, b) => b.year - a.year);
      return onlyVariant[0];
    }
  }
  // Fallback: žádný rok vůbec → vezmi první (např. CMP page má jen chartContainer1)
  if (variant === null && stripLines.length > 0 && stripLines.every(s => s.year === null)) {
    return stripLines[0];
  }
  return null;
}

/**
 * Extrahuje CanvasJS data series z inline JavaScriptu.
 * PUK používá CanvasJS Chart, dataPoints jsou inline v <script>.
 *
 * @param {string} html — celé HTML jako string (cheerio nestačí, je potřeba raw text)
 * @param {string} [seriesName] — preferované jméno série (např. "Celá ČR")
 * @returns {{value: number|null, year: number|null, trend: Array, series_name: string|null, strategy: string}}
 */
export function extractCanvasJsSeries(html, seriesName = null) {
  // Match všechny série v JS: name: "..." ... dataPoints: [...]
  const re = /name:\s*"([^"]+)"[^}]*?dataPoints:\s*\[([\s\S]*?)\]/g;
  const series = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[1];
    const data = m[2];
    const points = [];
    const ptRe = /x:\s*(\d+),\s*y:\s*(-?\d+\.?\d*)/g;
    let pm;
    while ((pm = ptRe.exec(data)) !== null) {
      points.push({ year: parseInt(pm[1], 10), value: parseFloat(pm[2]) });
    }
    if (points.length > 0) series.push({ name, points });
  }
  if (series.length === 0) return { value: null, year: null, trend: [], series_name: null, strategy: 'canvasjs-none' };

  // Vyber preferovanou sérii, jinak první
  let picked = series.find(s => seriesName && s.name.includes(seriesName)) ?? series[0];

  // Detekce, zda hodnoty jsou v desítkové formě (0.85) vs zlomku (0.0085) vs procentech (8.5)
  // PUK varianty: některé grafy mají 0.07 jako 7%, jiné 7.04 přímo. Heuristika:
  // pokud všechny hodnoty < 1.0, předpoklad fraction → ×100. Jinak ponechej.
  const maxVal = Math.max(...picked.points.map(p => p.value));
  const valuesArePercent = maxVal >= 1.0;
  const normalize = v => valuesArePercent ? v : v * 100;

  const trend = picked.points.map(p => ({ year: p.year, value: +normalize(p.value).toFixed(3) }));
  const latest = trend[trend.length - 1];
  return {
    value: latest.value,
    year: latest.year,
    trend,
    series_name: picked.name,
    strategy: valuesArePercent ? 'canvasjs-percent' : 'canvasjs-fraction',
  };
}

/**
 * Extrahuje národní hodnotu indikátoru z HTML PUK detail-karty.
 * Postupně zkouší sadu selektorů a regexů.
 *
 * @param {cheerio.CheerioAPI} $
 * @returns {{value: number|null, unit: string|null, year: number|null, strategy: string}}
 */
export function extractNationalValue($) {
  const strategies = [
    // 1) Strukturovaný element s data-* atributy
    () => {
      const el = $('[data-value-national], [data-narodni-hodnota]').first();
      if (!el.length) return null;
      const v = parseFloat(el.attr('data-value-national') ?? el.attr('data-narodni-hodnota') ?? '');
      if (!Number.isFinite(v)) return null;
      return { value: v, unit: el.attr('data-unit') ?? null, year: parseInt(el.attr('data-year'), 10) || null, strategy: 'data-attr' };
    },
    // 2) Element s class obsahující "narodni" / "national" / "souhrn"
    () => {
      const candidates = $('.narodni-hodnota, .national-value, .souhrn-hodnota, .ukazatel-hodnota').first();
      if (!candidates.length) return null;
      const text = candidates.text().trim();
      const m = text.match(/(-?\d+[.,]?\d*)\s*(%|na 1\s?000|‰|let|dnů|dní)?/);
      if (!m) return null;
      return { value: parseFloat(m[1].replace(',', '.')), unit: m[2] ?? null, year: extractYear(text), strategy: 'class-named' };
    },
    // 3) <th>Národní průměr</th><td>5,2 %</td> tabulkový pattern
    () => {
      const rows = $('table tr').toArray();
      for (const row of rows) {
        const labelText = $(row).find('th, td').first().text().trim().toLowerCase();
        if (/národn|souhrn|průměr|čr|celkem/.test(labelText)) {
          const valueCell = $(row).find('td').last().text().trim();
          const m = valueCell.match(/(-?\d+[.,]?\d*)\s*(%|na 1\s?000|‰|let|dnů|dní)?/);
          if (m) return { value: parseFloat(m[1].replace(',', '.')), unit: m[2] ?? null, year: extractYear(valueCell), strategy: 'table-row' };
        }
      }
      return null;
    },
    // 4) Meta tag s hodnotou
    () => {
      const meta = $('meta[name="ukazatel-hodnota"], meta[name="national-value"]').first();
      if (!meta.length) return null;
      const v = parseFloat(meta.attr('content') ?? '');
      if (!Number.isFinite(v)) return null;
      return { value: v, unit: null, year: null, strategy: 'meta-tag' };
    },
  ];

  for (const fn of strategies) {
    try {
      const result = fn();
      if (result && Number.isFinite(result.value)) return result;
    } catch { /* try next strategy */ }
  }

  return { value: null, unit: null, year: null, strategy: 'none-matched' };
}

/**
 * Extrahuje krajský rozpad z HTML PUK detail-karty.
 * Hledá tabulku nebo seznam kraj→hodnota a vrací mapu {krajName: value}.
 *
 * @param {cheerio.CheerioAPI} $
 * @returns {{by_region: Record<string, number>, strategy: string}}
 */
export function extractRegionalBreakdown($) {
  // Strategie 1: <table> kde první sloupec je název kraje
  const tableRows = $('table tr').toArray();
  const byRegion = {};
  let matched = 0;
  for (const row of tableRows) {
    const cells = $(row).find('td, th').toArray();
    if (cells.length < 2) continue;
    const label = $(cells[0]).text().trim();
    const matchedRegion = REGIONS.find(r => label.toLowerCase().includes(r.toLowerCase()));
    if (!matchedRegion) continue;
    const valueText = $(cells[cells.length - 1]).text().trim();
    const m = valueText.match(/(-?\d+[.,]?\d*)/);
    if (!m) continue;
    byRegion[matchedRegion] = parseFloat(m[1].replace(',', '.'));
    matched++;
  }
  if (matched >= 8) return { by_region: byRegion, strategy: 'table-by-label' };

  // Strategie 2: <ul><li data-region="…" data-value="…">
  const dataLis = $('[data-region], [data-kraj]').toArray();
  for (const li of dataLis) {
    const region = $(li).attr('data-region') ?? $(li).attr('data-kraj');
    const v = parseFloat($(li).attr('data-value') ?? '');
    if (region && Number.isFinite(v)) {
      const matchedRegion = REGIONS.find(r => region.toLowerCase().includes(r.toLowerCase())) ?? region;
      byRegion[matchedRegion] = v;
    }
  }
  if (Object.keys(byRegion).length >= 8) return { by_region: byRegion, strategy: 'data-attr' };

  return { by_region: byRegion, strategy: 'partial-or-empty' };
}

function extractYear(text) {
  const m = text.match(/\b(20\d\d)\b/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Načti HTML — z fixture nebo HTTP.
 * @param {string} url
 * @param {string} fixtureName — jméno souboru v PUK_FIXTURE_DIR (např. "pooperacni-sepse.html")
 */
async function loadHtml(url, fixtureName) {
  const fixtureDir = process.env.PUK_FIXTURE_DIR;
  if (fixtureDir) {
    const fixturePath = path.resolve(fixtureDir, fixtureName);
    if (fs.existsSync(fixturePath)) {
      console.log(`  [fixture] ${fixturePath}`);
      return fs.readFileSync(fixturePath, 'utf8');
    }
    throw new Error(`Fixture not found: ${fixturePath}`);
  }
  return fetchWithRetry(url, { parse: 'text', timeoutMs: 15000 });
}

/**
 * Hlavní funkce — proběhne všechny KNOWN_INDICATORS, scrapuje, vrací výsledek.
 * @returns {Promise<{indicators: Array, log: Array, fetched_at: string}>}
 */
export async function fetchPuk() {
  const fetched_at = new Date().toISOString();
  const indicators = [];
  const log = [];

  for (const ind of KNOWN_INDICATORS) {
    const result = {
      id: ind.id,
      title_hint: ind.title_hint,
      source: 'puk',
      source_url: null,
      value_national: null,
      unit: null,
      year: null,
      by_region: {},
      fetched_at,
      status: 'pending',
    };
    const logEntry = {
      id: ind.id,
      attempts: [],
      fetched_at,
    };

    let html = null;
    let lastError = null;
    for (const url of ind.detail_url_candidates) {
      try {
        html = await loadHtml(url, `${ind.id}.html`);
        result.source_url = url;
        logEntry.attempts.push({ url, ok: true });
        break;
      } catch (err) {
        lastError = err;
        const status = err instanceof HttpError ? err.status : 'ERR';
        logEntry.attempts.push({ url, ok: false, status, message: err.message });
        continue;
      }
    }

    if (!html) {
      result.status = 'fetch-failed';
      result.error = lastError?.message ?? 'no html';
      log.push(logEntry);
      indicators.push(result);
      console.warn(`  PUK ${ind.id}: fetch failed (${lastError?.message ?? '—'})`);
      continue;
    }

    try {
      // 0) Pokud indikátor má extraction='stripline', použij stripLine strategy
      //    (PUK onko-chirurgie + CMP používají axisY.stripLines pro národní průměr)
      if (ind.extraction === 'stripline') {
        const stripResult = extractStripLineValues(html);
        const picked = pickLatestStripLine(stripResult.stripLines, ind.stripline_variant ?? null);
        if (picked) {
          result.value_national = picked.value;
          result.unit = '%';
          result.year = picked.year;
          // Build trend pro skutečně použitou variantu (může se lišit od požadované,
          // pokud byl uplatněn fallback v pickLatestStripLine — např. pankreas má
          // všechny containers s prefixem '5', ale ind.stripline_variant=null).
          const effectiveVariant = picked.variant;
          const trend = stripResult.stripLines
            .filter(s => s.year !== null && s.variant === effectiveVariant)
            .sort((a, b) => a.year - b.year)
            .map(s => ({ year: s.year, value: s.value }));
          if (trend.length > 0) result.trend = trend;
          result.status = 'ok';
          logEntry.national_strategy = stripResult.strategy;
          logEntry.stripline_variant = effectiveVariant;
          logEntry.trend_count = trend.length;
          console.log(`  PUK ${ind.id}: ok (stripline ${picked.value}%, year=${picked.year}, variant=${effectiveVariant ?? '—'}, trend=${trend.length} let)`);
          log.push(logEntry);
          indicators.push(result);
          continue;
        }
      }

      // 1) Nejdřív zkusíme CanvasJS inline data (PUK preferovaný vzor)
      const canvasResult = extractCanvasJsSeries(html, ind.series_name);
      if (canvasResult.value !== null) {
        result.value_national = canvasResult.value;
        result.unit = '%';
        result.year = canvasResult.year;
        result.trend = canvasResult.trend;
        result.series_name = canvasResult.series_name;
        result.status = 'ok';
        logEntry.national_strategy = canvasResult.strategy;
        logEntry.series_name = canvasResult.series_name;
        logEntry.trend_count = canvasResult.trend.length;
        console.log(`  PUK ${ind.id}: ok (national=${canvasResult.value}%, year=${canvasResult.year}, trend=${canvasResult.trend.length} points, series="${canvasResult.series_name}")`);
        log.push(logEntry);
        indicators.push(result);
        continue;
      }

      // 2) Fallback: cheerio strategie pro HTML tabulky / data-attrs
      const $ = cheerio.load(html);
      const nat = extractNationalValue($);
      const reg = extractRegionalBreakdown($);
      result.value_national = nat.value;
      result.unit = nat.unit;
      result.year = nat.year;
      result.by_region = reg.by_region;
      result.status = nat.value !== null ? 'ok' : 'parsed-no-value';
      logEntry.national_strategy = nat.strategy;
      logEntry.regional_strategy = reg.strategy;
      logEntry.regional_count = Object.keys(reg.by_region).length;
      if (result.status === 'parsed-no-value') {
        logEntry.html_tail = String(html).slice(-500);
      }
      console.log(`  PUK ${ind.id}: ${result.status} (national=${nat.value}, regions=${logEntry.regional_count})`);
    } catch (err) {
      result.status = 'parse-failed';
      result.error = err.message;
      logEntry.parse_error = err.message;
      console.warn(`  PUK ${ind.id}: parse failed: ${err.message}`);
    }

    log.push(logEntry);
    indicators.push(result);
  }

  writeCache(CACHE_FILE, { fetched_at, indicators });
  appendScrapingLog('puk', log, fetched_at);

  return { indicators, log, fetched_at };
}

/**
 * Připoj záznam o běhu do data/clinical-scraping-log.json.
 * Soubor je auditní stopa — kdy se scrapovalo, jak to dopadlo.
 */
export function appendScrapingLog(source, runLog, fetched_at) {
  let existing = { version: '1.0', runs: [] };
  if (fs.existsSync(LOG_FILE)) {
    try { existing = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch { /* reset */ }
  }
  if (!Array.isArray(existing.runs)) existing.runs = [];
  existing.runs.push({
    source,
    fetched_at,
    indicator_count: runLog.length,
    ok_count: runLog.filter(l => l.attempts?.some(a => a.ok) && !l.parse_error).length,
    items: runLog,
  });
  // Keep last 30 runs to bound file size
  if (existing.runs.length > 30) existing.runs = existing.runs.slice(-30);
  existing.updated_at = new Date().toISOString();
  fs.writeFileSync(LOG_FILE, JSON.stringify(existing, null, 2) + '\n');
}

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchPuk().then(
    res => console.log(`\nPUK: ${res.indicators.length} indikátorů zpracováno, viz ingest/cache/${CACHE_FILE} + data/clinical-scraping-log.json`),
    err => { console.error('PUK fail:', err); process.exit(1); }
  );
}
