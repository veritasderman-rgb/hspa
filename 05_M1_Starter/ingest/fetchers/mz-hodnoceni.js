// Fetcher „Hodnocení vývoje systému veřejného zdravotního pojištění“ (MZ ČR) pro Srovnávač pojišťoven, balíček A1.1.
//
// Co dělá (1× ročně, Hodnocení vychází do konce května):
//   1. stáhne stránku MZ a parsuje odkazy vz<rok>_hodnoceni*.(pdf|xlsx) (nic natvrdo),
//   2. soubory stáhne do ingest/cache/mz-hodnoceni/ (gitignored cache; --force stáhne znovu),
//   3. zapíše manifest ingest/cache/mz-hodnoceni/manifest.json
//      ({rok, typ, url, soubor, sha256, velikost, stazeno_at, stav: ok|chyba, poznamka}).
//
// Pravidla: User-Agent z CONFIG, max 1 požadavek/s, TLS se nevypíná (při chybě certifikátu nastav
// NODE_EXTRA_CA_CERTS), HTTP chyby se zapíšou do manifestu a nic se neobchází.
//
// Spuštění:  node ingest/fetchers/mz-hodnoceni.js [--dry-run] [--force] [--rok-od 2015]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { parseLinks, STRANKA_URL } from '../lib/mz-hodnoceni.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

export const cacheDir = () => path.resolve(ROOT, CONFIG.cache.dir, 'mz-hodnoceni');
export const manifestFile = () => path.join(cacheDir(), 'manifest.json');

const PAGE_TIMEOUT_MS = 30_000;
const FILE_TIMEOUT_MS = 90_000;
const MAX_BYTES = 120 * 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function loadManifest(file = manifestFile()) {
  try {
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(m.polozky) ? m : { version: '1.0', polozky: [] };
  } catch {
    return { version: '1.0', polozky: [] };
  }
}

function hlavickaOk(buf, typ) {
  if (typ === 'pdf') return buf.subarray(0, 5).toString('latin1') === '%PDF-';
  return buf.subarray(0, 2).toString('latin1') === 'PK'; // xlsx = zip
}

/**
 * @param {{force?:boolean, dryRun?:boolean, rokOd?:number, fetchImpl?:typeof fetch, sleepImpl?:Function,
 *          pauseMs?:number, cacheRoot?:string, pageUrl?:string, now?:Date, log?:Function}} [opts]
 */
export async function fetchMzHodnoceni(opts = {}) {
  const {
    force = false, dryRun = false, rokOd = null, fetchImpl = globalThis.fetch, sleepImpl = sleep, pauseMs = 1000,
    cacheRoot = cacheDir(), pageUrl = STRANKA_URL, now = new Date(),
  } = opts;
  const log = opts.log ?? ((s) => console.log(s));
  const mFile = path.join(cacheRoot, 'manifest.json');
  const prev = loadManifest(mFile);
  const prevByUrl = new Map(prev.polozky.map((p) => [p.url, p]));

  let lastAt = 0;
  async function get(url, parse, timeoutMs) {
    const wait = lastAt + pauseMs - Date.now();
    if (wait > 0) await sleepImpl(wait);
    lastAt = Date.now();
    return fetchWithRetry(url, { parse, timeoutMs, fetchImpl, sleepImpl });
  }

  const html = await get(pageUrl, 'text', PAGE_TIMEOUT_MS);
  const links = parseLinks(html, pageUrl).filter((l) => l.typ && (rokOd == null || l.rok >= rokOd));
  log(`  ${pageUrl} → ${links.length} souborů (${[...new Set(links.map((l) => l.rok))].join(', ')})`);

  if (!dryRun) fs.mkdirSync(cacheRoot, { recursive: true });
  const polozky = [];
  for (const l of links) {
    const base = { rok: l.rok, typ: l.typ, url: l.url, soubor: l.soubor, sha256: null, velikost: null, stazeno_at: null, stav: 'ok', poznamka: '' };
    if (dryRun) { polozky.push({ ...base, poznamka: 'dry-run' }); continue; }
    const file = path.join(cacheRoot, l.soubor);
    try {
      let buf;
      let stazeno_at;
      const old = prevByUrl.get(l.url);
      if (!force && fs.existsSync(file)) {
        buf = fs.readFileSync(file);
        stazeno_at = old?.sha256 === sha256(buf) && old.stazeno_at ? old.stazeno_at : fs.statSync(file).mtime.toISOString();
        base.poznamka = 'z cache';
      } else {
        buf = await get(l.url, 'buffer', FILE_TIMEOUT_MS);
        if (buf.length > MAX_BYTES) throw new Error(`soubor je větší než ${MAX_BYTES} B`);
        if (!hlavickaOk(buf, l.typ)) throw new Error('odpověď nemá hlavičku očekávaného formátu');
        fs.writeFileSync(file, buf);
        // stejné bajty jako minule (např. --force) = původní čas stažení, ať data zůstanou idempotentní
        stazeno_at = old?.sha256 === sha256(buf) && old.stazeno_at ? old.stazeno_at : now.toISOString();
      }
      polozky.push({ ...base, sha256: sha256(buf), velikost: buf.length, stazeno_at });
      log(`  ✓ ${l.soubor} (${(buf.length / 1024).toFixed(0)} kB)${base.poznamka ? ' — ' + base.poznamka : ''}`);
    } catch (err) {
      polozky.push({ ...base, stav: 'chyba', poznamka: (err.status ? `HTTP ${err.status}` : err.message).slice(0, 200) });
      log(`  ✗ ${l.soubor}: ${polozky.at(-1).poznamka}`);
    }
  }
  const manifest = { version: '1.0', stranka: pageUrl, generated_at: now.toISOString(), polozky };
  if (!dryRun) fs.writeFileSync(mFile, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

function parseArgs(argv) {
  const o = { force: false, dryRun: false, rokOd: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') o.force = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--rok-od') o.rokOd = Number(argv[++i]);
    else { console.error(`Neznámý argument: ${a}`); process.exit(2); }
  }
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const o = parseArgs(process.argv.slice(2));
  console.log('Stahuji Hodnocení MZ (max 1 požadavek/s)…');
  fetchMzHodnoceni(o).then((m) => {
    const chyby = m.polozky.filter((p) => p.stav !== 'ok');
    console.log(`Hotovo: ${m.polozky.length} souborů, chyb ${chyby.length}`);
    if (chyby.length) process.exit(1);
  }).catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
}
