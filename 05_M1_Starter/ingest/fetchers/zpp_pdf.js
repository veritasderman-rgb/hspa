// ZPP PDF fetcher — stáhne PDF zdravotně pojistných plánů z webů 7 pojišťoven
// a uloží do ingest/cache/zpp/{payer}-{year}.pdf. Pak spustí parser a uloží
// strukturovaný JSON do {payer}-{year}.json.
//
// Pilot F2b: VZP (111) + ZP MV ČR (211), roky 2024–2026.
// V offline režimu / při chybějícím pdfjs-dist fallbackuje na ručně
// vyplněná data v ingest/manual/zpp/{payer}-{year}.json.
//
// Spuštění:
//   npm run fetch:zpp                  — všechny pilotní (111, 211)
//   node ingest/fetchers/zpp_pdf.js 111 2024  — konkrétní

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { extractTextItems, parseZpp } from '../lib/zpp_parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const ZPP_SOURCES = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'ingest', 'mapping', 'zpp_sources.json'), 'utf8')
);
const CACHE_DIR = path.resolve(ROOT, CONFIG.cache.dir, 'zpp');
const MANUAL_DIR = path.resolve(ROOT, 'ingest', 'manual', 'zpp');

const PILOT = [
  { payer: '111', year: 2024 },
  { payer: '211', year: 2024 },
];

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function resolveUrl(payerCode, year) {
  const cfg = ZPP_SOURCES.payers[payerCode];
  if (!cfg) throw new Error(`neznámý payer ${payerCode}`);
  if (cfg.urls?.[year]) return cfg.urls[year];
  if (cfg.url_template) return cfg.url_template.replace('{year}', String(year));
  return null;
}

/** Stáhne PDF nebo vrátí cestu k cachovanému. */
export async function downloadZppPdf(payer, year, opts = {}) {
  ensureDir(CACHE_DIR);
  const url = resolveUrl(payer, year);
  if (!url) throw new Error(`pro ${payer}-${year} není URL v zpp_sources.json`);
  const file = path.join(CACHE_DIR, `${payer}-${year}.pdf`);
  if (fs.existsSync(file) && !opts.force) {
    const ageDays = (Date.now() - fs.statSync(file).mtimeMs) / 86_400_000;
    if (ageDays < (opts.ttlDays ?? 30)) return file;
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': CONFIG.uzis.user_agent, 'Accept': 'application/pdf' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  return file;
}

/** Načte ručně vyplněná data (fallback pro offline / parser failure). */
function loadManual(payer, year) {
  const file = path.join(MANUAL_DIR, `${payer}-${year}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn(`manual ${file} neparsovatelný: ${err.message}`);
    return null;
  }
}

/**
 * Hlavní pipeline pro jeden záznam: stáhni PDF → parsuj → ulož JSON.
 * Pokud cokoli selže, použij manual fallback.
 */
export async function processOne(payer, year, opts = {}) {
  ensureDir(CACHE_DIR);
  const outFile = path.join(CACHE_DIR, `${payer}-${year}.json`);
  const manualData = loadManual(payer, year);

  let parsed = null;
  try {
    const pdfFile = await downloadZppPdf(payer, year, opts);
    const items = await extractTextItems(pdfFile);
    if (items) {
      parsed = parseZpp({ items, payer, year });
      if (!parsed.parsed || Object.keys(parsed.segments).length === 0) {
        parsed = null;
      }
    }
  } catch (err) {
    console.warn(`PDF download/parse failed (${payer}-${year}): ${err.message}`);
  }

  const out = parsed ?? manualData ?? {
    payer, year, segments: {}, total_tis_kc: 0, parsed: false,
    origin: 'empty',
  };
  if (!out.origin) {
    out.origin = parsed ? 'parsed' : 'manual';
  }
  out.fetched_at = new Date().toISOString();
  out.payer_name = ZPP_SOURCES.payers[payer]?.short ?? payer;

  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  return out;
}

export async function fetchZpp({ targets = PILOT, force = false, fetchImpl } = {}) {
  const results = [];
  for (const { payer, year } of targets) {
    try {
      const out = await processOne(payer, year, { force, fetchImpl });
      results.push({ payer, year, origin: out.origin, segments: Object.keys(out.segments).length });
      console.log(`✓ ${payer}-${year} (${out.origin}): ${Object.keys(out.segments).length} segmentů, ${out.total_tis_kc.toLocaleString('cs-CZ')} tis. Kč`);
    } catch (err) {
      results.push({ payer, year, error: err.message });
      console.error(`✗ ${payer}-${year}: ${err.message}`);
    }
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const positional = args.filter(a => !a.startsWith('--'));
  let targets = PILOT;
  if (positional.length === 2) {
    targets = [{ payer: positional[0], year: Number(positional[1]) }];
  }
  fetchZpp({ targets, force }).catch((err) => {
    console.error('zpp_pdf failed:', err);
    process.exit(1);
  });
}
