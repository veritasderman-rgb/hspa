// INDIKO fetcher — scraping indikátorů cesty onkologického pacienta.
//
// Endpoint: https://indiko.cz/ (HTML stránky, žádné API)
// Provozovatel: FBMI ČVUT, CzechHTA tým (ved. Aleš Tichopád)
// Souhlas: FBMI ČVUT, viz PLAN-KVALITA-PECE.md
//
// První vlna INDIKO (říjen 2025) pokrývá 3 diagnózy:
//   - karcinom plic
//   - karcinom prsu
//   - karcinom pankreatu
//
// Sledované indikátory na cestu pacienta:
//   - mediánové časy v jednotlivých fázích (podezření, diagnostika, MDT, léčba)
//   - % pacientů projednaných na MDT
//   - distribuce léčebných modalit
//
// Stejný defenzivní přístup jako puk.js — multi-selektor strategie,
// auditní log, fixture mód, non-fatal failures.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { fetchWithRetry, HttpError } from '../lib/http.js';
import { writeCache } from '../lib/cache.js';
import { appendScrapingLog } from './puk.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const INDIKO_BASE = 'https://indiko.cz';
const CACHE_FILE = 'indiko_raw.json';

const KNOWN_DIAGNOSES = [
  {
    id: 'cesta_karcinom_plic',
    diagnosis: 'karcinom plic',
    detail_url_candidates: [
      `${INDIKO_BASE}/diagnoza/karcinom-plic`,
      `${INDIKO_BASE}/karcinom-plic`,
      `${INDIKO_BASE}/onkologie/plic`,
    ],
  },
  {
    id: 'cesta_karcinom_prsu',
    diagnosis: 'karcinom prsu',
    detail_url_candidates: [
      `${INDIKO_BASE}/diagnoza/karcinom-prsu`,
      `${INDIKO_BASE}/karcinom-prsu`,
      `${INDIKO_BASE}/onkologie/prsu`,
    ],
  },
  {
    id: 'cesta_karcinom_pankreatu',
    diagnosis: 'karcinom pankreatu',
    detail_url_candidates: [
      `${INDIKO_BASE}/diagnoza/karcinom-pankreatu`,
      `${INDIKO_BASE}/karcinom-pankreatu`,
      `${INDIKO_BASE}/onkologie/pankreatu`,
    ],
  },
];

// INDIKO fáze v pořadí
const PHASES = [
  { id: 'podezreni', labels: ['podezření', 'suspicion', 'screening'] },
  { id: 'diagnostika', labels: ['diagnostika', 'diagnosis', 'biopsie'] },
  { id: 'mdt', labels: ['mdt', 'multidisciplinární komise', 'board'] },
  { id: 'lecba', labels: ['léčba', 'treatment'] },
  { id: 'follow_up', labels: ['follow-up', 'dispenzář', 'sledování'] },
];

/**
 * Extrahuje mediánové dny pro každou fázi.
 * @param {cheerio.CheerioAPI} $
 * @returns {{phases: Record<string, {median_days: number|null}>, strategy: string}}
 */
export function extractPhaseMedians($) {
  const phases = {};
  let matched = 0;

  // Strategie 1: <table> kde řádek je fáze a sloupec medián
  const rows = $('table tr').toArray();
  for (const row of rows) {
    const cells = $(row).find('td, th').toArray();
    if (cells.length < 2) continue;
    const label = $(cells[0]).text().trim().toLowerCase();
    const phase = PHASES.find(p => p.labels.some(l => label.includes(l)));
    if (!phase) continue;
    const valueText = $(cells[cells.length - 1]).text().trim();
    const m = valueText.match(/(-?\d+[.,]?\d*)/);
    if (!m) continue;
    phases[phase.id] = { median_days: parseFloat(m[1].replace(',', '.')) };
    matched++;
  }
  if (matched >= 3) return { phases, strategy: 'table-by-label' };

  // Strategie 2: data-phase a data-median atributy
  const dataEls = $('[data-phase], [data-faze]').toArray();
  for (const el of dataEls) {
    const id = $(el).attr('data-phase') ?? $(el).attr('data-faze');
    const v = parseFloat($(el).attr('data-median') ?? $(el).attr('data-median-days') ?? '');
    if (!id || !Number.isFinite(v)) continue;
    const phase = PHASES.find(p => p.id === id || p.labels.some(l => id.toLowerCase().includes(l)));
    if (phase) phases[phase.id] = { median_days: v };
  }

  return { phases, strategy: Object.keys(phases).length >= 3 ? 'data-attr' : 'partial-or-empty' };
}

/**
 * Extrahuje % pacientů projednaných na MDT.
 * @param {cheerio.CheerioAPI} $
 * @returns {{mdt_share: number|null, strategy: string}}
 */
export function extractMdtShare($) {
  // Strategie 1: data atribut
  const dataEl = $('[data-mdt-share], [data-podil-mdt]').first();
  if (dataEl.length) {
    const v = parseFloat(dataEl.attr('data-mdt-share') ?? dataEl.attr('data-podil-mdt') ?? '');
    if (Number.isFinite(v)) return { mdt_share: v, strategy: 'data-attr' };
  }

  // Strategie 2: text obsahující "MDT" + procenta
  const allText = $('body').text();
  const m = allText.match(/MDT[^.]*?(\d+[.,]?\d*)\s*%/i)
        ?? allText.match(/multidisciplinárn[^.]*?(\d+[.,]?\d*)\s*%/i);
  if (m) return { mdt_share: parseFloat(m[1].replace(',', '.')), strategy: 'text-pattern' };

  return { mdt_share: null, strategy: 'none-matched' };
}

async function loadHtml(url, fixtureName) {
  const fixtureDir = process.env.INDIKO_FIXTURE_DIR;
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
 * Hlavní funkce — proběhne všechny KNOWN_DIAGNOSES.
 */
export async function fetchIndiko() {
  const fetched_at = new Date().toISOString();
  const diagnoses = [];
  const log = [];

  for (const dx of KNOWN_DIAGNOSES) {
    const result = {
      id: dx.id,
      diagnosis: dx.diagnosis,
      source: 'indiko',
      source_url: null,
      phases: {},
      mdt_share: null,
      fetched_at,
      status: 'pending',
    };
    const logEntry = { id: dx.id, attempts: [], fetched_at };

    let html = null;
    let lastError = null;
    for (const url of dx.detail_url_candidates) {
      try {
        html = await loadHtml(url, `${dx.id}.html`);
        result.source_url = url;
        logEntry.attempts.push({ url, ok: true });
        break;
      } catch (err) {
        lastError = err;
        const status = err instanceof HttpError ? err.status : 'ERR';
        logEntry.attempts.push({ url, ok: false, status, message: err.message });
      }
    }

    if (!html) {
      result.status = 'fetch-failed';
      result.error = lastError?.message ?? 'no html';
      log.push(logEntry);
      diagnoses.push(result);
      console.warn(`  INDIKO ${dx.id}: fetch failed (${lastError?.message ?? '—'})`);
      continue;
    }

    try {
      const $ = cheerio.load(html);
      const ph = extractPhaseMedians($);
      const mdt = extractMdtShare($);
      result.phases = ph.phases;
      result.mdt_share = mdt.mdt_share;
      const phaseCount = Object.keys(ph.phases).length;
      result.status = phaseCount >= 3 ? 'ok' : 'parsed-partial';
      logEntry.phase_strategy = ph.strategy;
      logEntry.mdt_strategy = mdt.strategy;
      logEntry.phase_count = phaseCount;
      if (result.status === 'parsed-partial') logEntry.html_tail = String(html).slice(-500);
      console.log(`  INDIKO ${dx.id}: ${result.status} (phases=${phaseCount}, mdt=${mdt.mdt_share ?? '—'})`);
    } catch (err) {
      result.status = 'parse-failed';
      result.error = err.message;
      logEntry.parse_error = err.message;
      console.warn(`  INDIKO ${dx.id}: parse failed: ${err.message}`);
    }

    log.push(logEntry);
    diagnoses.push(result);
  }

  writeCache(CACHE_FILE, { fetched_at, diagnoses });
  appendScrapingLog('indiko', log, fetched_at);

  return { diagnoses, log, fetched_at };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchIndiko().then(
    res => console.log(`\nINDIKO: ${res.diagnoses.length} diagnóz zpracováno, viz ingest/cache/${CACHE_FILE} + data/clinical-scraping-log.json`),
    err => { console.error('INDIKO fail:', err); process.exit(1); }
  );
}
