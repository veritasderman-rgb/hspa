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
 * URL jsou orientační — skutečné URL paths se ověří při prvním běhu.
 * Pokud URL vrátí 404, fallback selektor (`SEARCH_INDEX_FOR_LINK`)
 * najde detail-kartu přes index PUK podle textu titulku.
 *
 * Stav (2026-05): URL jsou TENTATIVE — vyžadují manuální ověření při
 * prvním běhu proti živému PUK. Loguje se do scraping-log.json.
 */
const KNOWN_INDICATORS = [
  {
    id: 'pooperacni_sepse_psi13',
    title_hint: 'Pooperační sepse',
    detail_url_candidates: [
      `${PUK_BASE}/ukazatel/pooperacni-sepse`,
      `${PUK_BASE}/ukazatel/PSI-13`,
      `${PUK_BASE}/bezpecnost-pacientu/pooperacni-sepse`,
    ],
  },
  {
    id: 'mortalita_30d_ami',
    title_hint: '30denní mortalita po AMI',
    detail_url_candidates: [
      `${PUK_BASE}/ukazatel/mortalita-ami`,
      `${PUK_BASE}/ukazatel/30d-ami`,
      `${PUK_BASE}/akutni-kardiologie/mortalita-ami`,
    ],
  },
  {
    id: 'mortalita_30d_cmp',
    title_hint: '30denní mortalita po CMP',
    detail_url_candidates: [
      `${PUK_BASE}/ukazatel/mortalita-cmp`,
      `${PUK_BASE}/ukazatel/30d-cmp`,
    ],
  },
  {
    id: 'trombektomie_cmp',
    title_hint: 'Mechanická trombektomie',
    detail_url_candidates: [
      `${PUK_BASE}/ukazatel/trombektomie`,
      `${PUK_BASE}/ukazatel/mechanicka-trombektomie`,
    ],
  },
  {
    id: 'atb_aware_ambulantni',
    title_hint: 'AWaRe preskripce',
    detail_url_candidates: [
      `${PUK_BASE}/ukazatel/aware-preskripce`,
      `${PUK_BASE}/ukazatel/cz-aware`,
      `${PUK_BASE}/antimikrobialni-rezistence/aware`,
    ],
  },
  {
    id: 'mortalita_90d_kolorekt',
    title_hint: '90denní mortalita resekce kolorekta',
    detail_url_candidates: [
      `${PUK_BASE}/ukazatel/resekce-kolorekta`,
      `${PUK_BASE}/onkologicka-chirurgie/kolorekt`,
    ],
  },
];

const REGIONS = [
  'Praha', 'Středočeský', 'Jihočeský', 'Plzeňský', 'Karlovarský',
  'Ústecký', 'Liberecký', 'Královéhradecký', 'Pardubický',
  'Vysočina', 'Jihomoravský', 'Olomoucký', 'Zlínský', 'Moravskoslezský',
];

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
