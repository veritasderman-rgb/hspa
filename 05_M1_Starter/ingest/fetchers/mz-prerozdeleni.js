// Fetcher přerozdělování pojistného MZ pro Srovnávač pojišťoven (balíček A1.2).
//
// Co dělá (opakovatelně, měsíčně po zveřejnění nového měsíce — MZ aktualizuje PDF kolem 10. dne):
//   1. otevře stránku Přerozdělování pojistného na MZ a najde odkazy na prerozdelovani_pojistovna_vyber_*.pdf
//      a …_vysledek_*.pdf (nejnovější soubor se bere ze stránky; staré řady jsou pevně v SOUBORY),
//   2. PDF stáhne do ingest/cache/mz-prerozdeleni/ (gitignored) a zapíše manifest.json se sha256,
//   3. (krok text) `pdftotext -layout` → <soubor>.txt vedle PDF, parser parseVyber (ingest/lib/mz-prerozdeleni.js),
//   4. zapíše ingest/manual/pojistovny/prerozdeleni-mz-vyber.json (100% výběr 2019→ + doplněk výsledku 2019–2021).
//
// Pravidla: User-Agent z CONFIG, max 1 požadavek/s, TLS se nevypíná (NODE_EXTRA_CA_CERTS), chyba HTTP = konec
// s nenulovým kódem, nic se neobchází. Zápis jen při změně obsahu (idempotence, `overeno` se nemění bez změny dat).
//
// Spuštění (skript do package.json přidává balíček A1.6, třída C):
//   node ingest/fetchers/mz-prerozdeleni.js                  # stažení + text + JSON
//   node ingest/fetchers/mz-prerozdeleni.js --jen-stazeni    # jen stažení + manifest
//   node ingest/fetchers/mz-prerozdeleni.js --jen-text       # jen z už stažených PDF
//   volby: --force (stáhnout i cachované) · --dry-run (nic nestahuje ani nezapisuje, vypíše plán)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import {
  MZ_STRANKA, MZ_UPLOADS, parseOdkazy, nejnovejsi, parseVyber, sloucitParsovane, zkontrolujSoucty,
  sestavVyberJson, serializuj,
} from '../lib/mz-prerozdeleni.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

export const OUT_FILE = path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'prerozdeleni-mz-vyber.json');
export const cacheDir = () => path.resolve(ROOT, CONFIG.cache.dir, 'mz-prerozdeleni');
export const MANIFEST_NAME = 'manifest.json';

/** Pevné starší řady (soubory MZ jsou neměnné; 2021_12 nese 2019–2021, 2024_12 nese 2022–2024). */
export const SOUBORY_PEVNE = [
  { typ: 'vyber', soubor: 'prerozdelovani_pojistovna_vyber_2021_12.pdf' },
  { typ: 'vyber', soubor: 'prerozdelovani_pojistovna_vyber_2024_12.pdf' },
  { typ: 'vysledek', soubor: 'prerozdelovani_pojistovna_vysledek_2021_12.pdf' },
];

const PAGE_TIMEOUT_MS = 30_000;
const PDF_TIMEOUT_MS = 60_000;
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function maPdftotext() {
  try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); return true; } catch (e) { return e?.status != null; }
}
export function pdftotext(pdfFile) {
  return execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', pdfFile, '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

export function loadManifest(dir = cacheDir()) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(dir, MANIFEST_NAME), 'utf8'));
    return Array.isArray(m.polozky) ? m : { version: '1.0', polozky: [] };
  } catch { return { version: '1.0', polozky: [] }; }
}

/** Co se má stáhnout: pevné soubory + nejnovější výběr a výsledek ze stránky (duplicity se slučují). */
export function planStazeni(odkazy) {
  const m = new Map();
  for (const p of SOUBORY_PEVNE) m.set(p.soubor, { ...p, url: MZ_UPLOADS + p.soubor });
  for (const typ of ['vyber', 'vysledek']) {
    const n = nejnovejsi(odkazy, typ);
    if (n) m.set(n.soubor, { typ, soubor: n.soubor, url: n.url });
  }
  return [...m.values()];
}

/**
 * Stažení: stránka → plán → PDF → manifest.
 * @param {{ force?: boolean, dryRun?: boolean, dir?: string, fetchImpl?: typeof fetch, sleepImpl?: Function, pauseMs?: number, now?: Date, log?: Function }} [opts]
 */
export async function stahni(opts = {}) {
  const { force = false, dryRun = false, dir = cacheDir(), fetchImpl = globalThis.fetch, sleepImpl = sleep, pauseMs = 1000, now = new Date() } = opts;
  const log = opts.log ?? ((s) => console.log(s));
  let lastAt = 0;
  const get = async (url, parse, timeoutMs) => {
    const wait = lastAt + pauseMs - Date.now();
    if (wait > 0) await sleepImpl(wait);
    lastAt = Date.now();
    return fetchWithRetry(url, { parse, timeoutMs, fetchImpl, sleepImpl });
  };

  const html = await get(MZ_STRANKA, 'text', PAGE_TIMEOUT_MS);
  const odkazy = parseOdkazy(html);
  log(`  stránka MZ: ${odkazy.length} odkazů na PDF přerozdělení`);
  const plan = planStazeni(odkazy);
  if (dryRun) { for (const p of plan) log(`  [dry-run] ${p.typ} ${p.url}`); return { plan, manifest: null }; }

  fs.mkdirSync(dir, { recursive: true });
  const prev = loadManifest(dir);
  const prevBy = new Map(prev.polozky.map((p) => [p.soubor, p]));
  const polozky = [];
  for (const p of plan) {
    const file = path.join(dir, p.soubor);
    let buf;
    let stazeno_at;
    const old = prevBy.get(p.soubor);
    if (!force && fs.existsSync(file)) {
      buf = fs.readFileSync(file);
      stazeno_at = old?.sha256 === sha256(buf) && old.stazeno_at ? old.stazeno_at : fs.statSync(file).mtime.toISOString();
      log(`  ✓ ${p.soubor} (z cache)`);
    } else {
      buf = await get(p.url, 'buffer', PDF_TIMEOUT_MS);
      if (buf.length > MAX_PDF_BYTES) throw new Error(`${p.soubor}: PDF je větší než ${MAX_PDF_BYTES} B`);
      if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error(`${p.soubor}: odpověď není PDF`);
      fs.writeFileSync(file, buf);
      stazeno_at = now.toISOString();
      log(`  ✓ ${p.soubor}: ${(buf.length / 1024).toFixed(0)} kB`);
    }
    polozky.push({ typ: p.typ, soubor: p.soubor, url: p.url, sha256: sha256(buf), velikost: buf.length, stazeno_at });
  }
  const manifest = { version: '1.0', generated_at: now.toISOString(), polozky };
  fs.writeFileSync(path.join(dir, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + '\n');
  return { plan, manifest };
}

/** Text z PDF v cache → parsování → ingest/manual/pojistovny/prerozdeleni-mz-vyber.json. */
export function zpracujText(opts = {}) {
  const { dir = cacheDir(), out = OUT_FILE, extract = pdftotext, now = new Date(), dryRun = false } = opts;
  const log = opts.log ?? ((s) => console.log(s));
  if (!opts.extract && !maPdftotext()) throw new Error('Chybí příkaz pdftotext (poppler). Nainstaluj: apt-get install -y poppler-utils');
  const manifest = loadManifest(dir);
  if (!manifest.polozky.length) throw new Error('Manifest je prázdný — nejdřív stáhni PDF (bez --jen-text).');
  const razene = [...manifest.polozky].sort((a, b) => a.soubor.localeCompare(b.soubor)); // starší soubory první, novější přepisují
  const parsed = { vyber: [], vysledek: [] };
  const soubory = { vyber: [], vysledek: [] };
  for (const p of razene) {
    const pdf = path.join(dir, p.soubor);
    if (!fs.existsSync(pdf)) throw new Error(`${p.soubor}: PDF chybí v cache`);
    const txt = extract(pdf);
    fs.writeFileSync(path.join(dir, p.soubor.replace(/\.pdf$/, '.txt')), txt);
    const r = parseVyber(txt);
    const chyby = zkontrolujSoucty(sloucitParsovane([r]).roky);
    if (!Object.keys(r.roky).length) throw new Error(`${p.soubor}: parser nenašel žádný rok`);
    if (chyby.length) throw new Error(`${p.soubor}: kontrola součtů selhala: ${chyby.slice(0, 5).join('; ')}`);
    // zapamatujeme celkem/zamestnanecke u roku
    parsed[p.typ].push(r);
    soubory[p.typ].push(p.url);
    log(`  ${p.soubor}: roky ${Object.keys(r.roky).join(', ')}`);
  }
  const vyber = sloucitParsovane(parsed.vyber);
  if (vyber.rozdily.length) throw new Error(`překryv výběru v různých souborech se liší: ${vyber.rozdily.slice(0, 5).join('; ')}`);
  const vysl = sloucitParsovane(parsed.vysledek);
  if (vysl.rozdily.length) throw new Error(`překryv výsledku se liší: ${vysl.rozdily.slice(0, 5).join('; ')}`);
  // doplněk po přerozdělení: jen roky, které ještě nejsou v prerozdeleni-mz-pojistovna.json (tj. před 2022)
  const dopl = { roky: {} };
  for (const [rok, r] of Object.entries(vysl.roky)) if (Number(rok) < 2022) dopl.roky[rok] = r;

  const base = { vyber, vysledekDoplnek: Object.keys(dopl.roky).length ? dopl : null, soubory: soubory.vyber, souboryDoplnek: soubory.vysledek };
  let predchozi = null;
  try { predchozi = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* ještě není */ }
  const overenoPrev = predchozi?.zdroj?.overeno;
  const dnes = now.toISOString().slice(0, 10);
  let data = sestavVyberJson({ ...base, overeno: overenoPrev ?? dnes });
  const stejne = predchozi && JSON.stringify({ ...predchozi, zdroj: { ...predchozi.zdroj, overeno: 0 } }) === JSON.stringify({ ...data, zdroj: { ...data.zdroj, overeno: 0 } });
  if (!stejne) data = sestavVyberJson({ ...base, overeno: dnes });
  if (!stejne && !dryRun) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, serializuj(data)); }
  return { zmeneno: !stejne, data };
}

function parseArgs(argv) {
  const o = { force: false, jenStazeni: false, jenText: false, dryRun: false };
  for (const a of argv) {
    if (a === '--force') o.force = true;
    else if (a === '--jen-stazeni') o.jenStazeni = true;
    else if (a === '--jen-text') o.jenText = true;
    else if (a === '--dry-run') o.dryRun = true;
    else { console.error(`Neznámý argument: ${a}`); process.exit(2); }
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.jenText) {
    console.log('Stahuji přerozdělení pojistného z MZ (max 1 požadavek/s)…');
    await stahni({ force: o.force, dryRun: o.dryRun });
  }
  if (!o.jenStazeni && !o.dryRun) {
    console.log('Extrahuji a parsuji text z PDF…');
    const r = zpracujText();
    const roky = Object.keys(r.data.roky);
    console.log(`✓ ${path.relative(ROOT, OUT_FILE)}: roky ${roky[0]}–${roky[roky.length - 1]}${r.zmeneno ? '' : ' — beze změny'}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
}
