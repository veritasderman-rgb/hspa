// Fetcher výročních zpráv (VZ) 7 zdravotních pojišťoven pro Srovnávač pojišťoven.
//
// Co dělá (opakovatelně, 1× ročně po vydání VZ — .github/workflows/pojistovny-vz.yml):
//   1. pro každou ZP z ingest/mapping/pojistovny_vz.json stáhne stránku s výročními zprávami
//      a vytáhne odkazy na PDF (rok z textu odkazu / title / názvu souboru),
//   2. PDF stáhne do ingest/cache/pojistovny-vz/<kod>-<rok>.pdf (gitignored cache, parametr force),
//   3. zapíše manifest ingest/manual/pojistovny/vz-manifest.json
//      ({kod, rok, url, sha256, velikost, stazeno_at, stav: ok|nenalezeno|chyba|bez-textu, poznamka}),
//   4. (krok --text) vytáhne z PDF text přes `pdftotext -layout`, normalizuje ho a uloží do
//      ingest/manual/pojistovny/vz-text/<kod>-<rok>.txt (strany oddělené „=== strana N ===“);
//      sken bez textové vrstvy dostane v manifestu stav „bez-textu“.
//
// Pravidla: User-Agent z CONFIG (ZdraveCesko-HSPA/1.0), max 1 požadavek/s, timeout 30 s (PDF 60 s),
// TLS se NIKDY nevypíná (při chybě certifikátu nastav NODE_EXTRA_CA_CERTS na CA bundle prostředí).
// HTTP 403/429 a jiné chyby se jen zapíšou do manifestu — nic se neobchází.
//
// Spuštění (do package.json se skripty nepřidávají, jde o třídu C):
//   node ingest/fetchers/pojistovny-vz.js                 # stažení + text (výchozí)
//   node ingest/fetchers/pojistovny-vz.js --jen-stazeni   # jen stažení + manifest
//   node ingest/fetchers/pojistovny-vz.js --jen-text      # jen text z už stažených PDF
//   volby: --force (znovu stáhnout i cachované) · --kod 111,205 · --rok-od 2024 · --dry-run

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { parseVzLinks, pdfTextToVz, jeBezTextu, znakuTextu } from '../lib/pojistovny-vz.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

export const MAPPING_FILE = path.join(ROOT, 'ingest', 'mapping', 'pojistovny_vz.json');
export const MANIFEST_FILE = path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'vz-manifest.json');
export const TEXT_DIR = path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'vz-text');
export const cacheDir = () => path.resolve(ROOT, CONFIG.cache.dir, 'pojistovny-vz');

export const STAVY = ['ok', 'nenalezeno', 'chyba', 'bez-textu'];
const PAGE_TIMEOUT_MS = 30_000;
const PDF_TIMEOUT_MS = 60_000;
const MAX_PDF_BYTES = 120 * 1024 * 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function loadMapping(file = MAPPING_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadManifest(file = MANIFEST_FILE) {
  try {
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(m.polozky) ? m : { version: '1.0', polozky: [] };
  } catch {
    return { version: '1.0', polozky: [] };
  }
}

/** Roky, které chceme mít: roky_od … loňský rok (VZ za letošek ještě nevyšla) + roky_navic ZP. */
export function ocekavaneRoky(zp, { rokOd, now = new Date() } = {}) {
  const od = rokOd ?? zp._roky_od;
  const posledni = now.getUTCFullYear() - 1;
  const roky = new Set(zp.roky_navic ?? []);
  for (let r = od; r <= posledni; r++) roky.add(r);
  return [...roky].sort((a, b) => a - b);
}

/** Čtení textu chyby na jednu řádku pro manifest (HTTP status, síť, TLS). */
function popisChyby(err) {
  const status = err?.status ?? null;
  const cause = err?.cause?.code ? ` (${err.cause.code})` : '';
  return { status, poznamka: status ? `HTTP ${status}` : `${err?.message ?? 'chyba'}${cause}`.slice(0, 200) };
}

/**
 * Hlavní krok: stránky → odkazy → PDF → manifest.
 * @param {{
 *   kody?: string[], force?: boolean, rokOd?: number, now?: Date, dryRun?: boolean,
 *   fetchImpl?: typeof fetch, sleepImpl?: (ms:number)=>Promise<void>, pauseMs?: number,
 *   mapping?: object, manifestFile?: string, cacheRoot?: string,
 * }} [opts]
 */
export async function fetchPojistovnyVz(opts = {}) {
  const {
    kody = null, force = false, rokOd = null, now = new Date(), dryRun = false,
    fetchImpl = globalThis.fetch, sleepImpl = sleep, pauseMs = 1000,
    mapping = loadMapping(), manifestFile = MANIFEST_FILE, cacheRoot = cacheDir(),
  } = opts;
  const roky_od = rokOd ?? mapping.roky_od;
  const prev = loadManifest(manifestFile);
  const prevByKey = new Map(prev.polozky.map((p) => [`${p.kod}-${p.rok}`, p]));
  const log = opts.log ?? ((s) => console.log(s));

  let lastAt = 0;
  async function throttle() {
    const wait = lastAt + pauseMs - Date.now();
    if (wait > 0) await sleepImpl(wait);
    lastAt = Date.now();
  }
  async function get(url, parse, timeoutMs) {
    await throttle();
    return fetchWithRetry(url, { parse, timeoutMs, fetchImpl, sleepImpl });
  }

  fs.mkdirSync(cacheRoot, { recursive: true });
  const polozky = [];

  for (const zp of mapping.pojistovny) {
    if (kody && !kody.includes(zp.kod)) continue;
    const roky = ocekavaneRoky({ ...zp, _roky_od: roky_od }, { rokOd: roky_od, now });
    const stranky = Array.isArray(zp.stranka_vz) ? zp.stranka_vz : [zp.stranka_vz];

    // 1) odkazy ze stránek (rok → první nalezený odkaz)
    const nalezene = new Map();
    const chybyStranek = [];
    for (const url of stranky) {
      try {
        const html = await get(url, 'text', PAGE_TIMEOUT_MS);
        const links = parseVzLinks(html, url, zp);
        log(`  ${zp.zkratka}: ${url} → ${links.length} odkazů na PDF`);
        for (const l of links) {
          if (!l.rok) continue;
          if (!nalezene.has(l.rok)) nalezene.set(l.rok, { url: l.url, dalsi: 0 });
          else if (nalezene.get(l.rok).url !== l.url) nalezene.get(l.rok).dalsi++;
        }
      } catch (err) {
        const e = popisChyby(err);
        chybyStranek.push({ url, ...e });
        log(`  ${zp.zkratka}: stránka ${url} — ${e.poznamka}`);
      }
    }
    // ruční odkazy mají přednost (VZ, která na stránce ještě není)
    for (const [rok, url] of Object.entries(zp.rucni_pdf ?? {})) {
      nalezene.set(Number(rok), { url, dalsi: 0, rucne: true });
    }

    // 2) po rocích: PDF → cache → manifest
    for (const rok of roky) {
      const key = `${zp.kod}-${rok}`;
      const base = { kod: zp.kod, rok, url: null, sha256: null, velikost: null, stazeno_at: null, stav: 'nenalezeno', poznamka: '' };
      const hit = nalezene.get(rok);
      if (!hit) {
        if (chybyStranek.length === stranky.length) {
          const c = chybyStranek[0];
          polozky.push({ ...base, stav: 'chyba', http_status: c.status, poznamka: `stránka s výročními zprávami nedostupná: ${c.poznamka} (${c.url})` });
        } else {
          const nejnovejsi = roky[roky.length - 1];
          polozky.push({ ...base, poznamka: rok === nejnovejsi && !(zp.roky_navic ?? []).includes(rok)
            ? 'na stránce zatím není (VZ za poslední rok bývá zveřejněna až v průběhu roku)'
            : 'odkaz na stránce nenalezen' });
        }
        continue;
      }
      const file = path.join(cacheRoot, `${key}.pdf`);
      const poznamky = [];
      if (hit.rucne) poznamky.push('URL z rucni_pdf v mapování');
      if (hit.dalsi) poznamky.push(`na stránce ještě ${hit.dalsi} další odkaz(y) pro stejný rok, použit první`);
      if (dryRun) { polozky.push({ ...base, url: hit.url, stav: 'ok', poznamka: ['dry-run', ...poznamky].join('; ') }); continue; }

      try {
        let buf;
        let stazeno_at;
        const old = prevByKey.get(key);
        if (!force && fs.existsSync(file)) {
          buf = fs.readFileSync(file);
          stazeno_at = old?.url === hit.url && old.sha256 === sha256(buf) && old.stazeno_at
            ? old.stazeno_at
            : fs.statSync(file).mtime.toISOString();
          poznamky.push('z cache');
        } else {
          buf = await get(hit.url, 'buffer', PDF_TIMEOUT_MS);
          if (buf.length > MAX_PDF_BYTES) throw Object.assign(new Error(`PDF je větší než ${MAX_PDF_BYTES} B`), {});
          if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
            throw Object.assign(new Error('odpověď není PDF (chybí hlavička %PDF-)'), {});
          }
          fs.writeFileSync(file, buf);
          stazeno_at = new Date().toISOString();
        }
        polozky.push({ ...base, url: hit.url, sha256: sha256(buf), velikost: buf.length, stazeno_at, stav: 'ok', poznamka: poznamky.join('; ') });
        log(`  ✓ ${zp.zkratka} ${rok}: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
      } catch (err) {
        const e = popisChyby(err);
        polozky.push({ ...base, url: hit.url, stav: 'chyba', http_status: e.status, poznamka: [e.poznamka, ...poznamky].join('; ') });
        log(`  ✗ ${zp.zkratka} ${rok}: ${e.poznamka}`);
      }
    }
  }

  // položky ZP, které se tentokrát nezpracovávaly (--kod), zůstanou beze změny
  const zpracovane = new Set(polozky.map((p) => p.kod));
  const zachovane = prev.polozky.filter((p) => !zpracovane.has(p.kod));
  const vse = [...zachovane, ...polozky].sort((a, b) => a.kod.localeCompare(b.kod) || a.rok - b.rok);
  const manifest = { version: '1.0', generated_at: now.toISOString(), polozky: vse };
  if (!dryRun) writeManifest(manifest, manifestFile);
  return manifest;
}

export function writeManifest(manifest, file = MANIFEST_FILE) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
}

// ---------------------------------------------------------------------------------- extrakce textu

export function maPdftotext() {
  try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); return true; } catch (e) { return e?.status != null; }
}

/** Spustí `pdftotext -layout` a vrátí surový text (strany odděleny \f). */
export function pdftotext(pdfFile) {
  return execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', pdfFile, '-'], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
}

/**
 * Z PDF v cache udělá normalizovaný text v repu a doplní do manifestu stav bez-textu / chyba.
 * Položky bez PDF v cache se přeskočí (text z minula zůstává).
 */
export function extractTexts(opts = {}) {
  const { kody = null, manifestFile = MANIFEST_FILE, cacheRoot = cacheDir(), textDir = TEXT_DIR, extract = pdftotext } = opts;
  const log = opts.log ?? ((s) => console.log(s));
  if (!opts.extract && !maPdftotext()) {
    throw new Error('Chybí příkaz pdftotext (poppler). Nainstaluj: apt-get install -y poppler-utils (Debian/Ubuntu/CI) nebo brew install poppler (macOS).');
  }
  const manifest = loadManifest(manifestFile);
  fs.mkdirSync(textDir, { recursive: true });
  let hotovo = 0;
  for (const p of manifest.polozky) {
    if (kody && !kody.includes(p.kod)) continue;
    if (!['ok', 'bez-textu'].includes(p.stav)) continue;
    const pdf = path.join(cacheRoot, `${p.kod}-${p.rok}.pdf`);
    if (!fs.existsSync(pdf)) continue;
    const out = path.join(textDir, `${p.kod}-${p.rok}.txt`);
    try {
      const { text, strany } = pdfTextToVz(extract(pdf));
      if (jeBezTextu(text, strany)) {
        p.stav = 'bez-textu';
        p.strany = strany;
        p.text_znaku = znakuTextu(text);
        p.poznamka = [(p.poznamka ?? '').replace(/;?\s*sken bez textové vrstvy/, ''), 'sken bez textové vrstvy (OCR není součástí rutiny)'].filter(Boolean).join('; ');
        fs.rmSync(out, { force: true });
        log(`  ${p.kod}-${p.rok}: bez textové vrstvy (${strany} stran)`);
        continue;
      }
      const hlavicka = `# Výroční zpráva ${p.kod}-${p.rok}; zdroj: ${p.url}; sha256 PDF: ${p.sha256}; extrahováno pdftotext -layout, normalizováno (ingest/lib/pojistovny-vz.js)\n`;
      fs.writeFileSync(out, hlavicka + text);
      p.stav = 'ok';
      p.strany = strany;
      p.text_znaku = znakuTextu(text);
      p.poznamka = (p.poznamka ?? '').replace(/;?\s*sken bez textové vrstvy[^;]*/, '').replace(/^;\s*/, '');
      hotovo++;
      log(`  ✓ ${p.kod}-${p.rok}: ${strany} stran, ${(Buffer.byteLength(text) / 1024 / 1024).toFixed(2)} MB textu`);
    } catch (err) {
      p.stav = 'chyba';
      p.poznamka = `extrakce textu selhala: ${String(err.message).split('\n')[0].slice(0, 160)}`;
      log(`  ✗ ${p.kod}-${p.rok}: ${p.poznamka}`);
    }
  }
  manifest.generated_at = new Date().toISOString();
  writeManifest(manifest, manifestFile);
  return { manifest, hotovo };
}

// ---------------------------------------------------------------------------------- CLI

function parseArgs(argv) {
  const o = { force: false, jenStazeni: false, jenText: false, dryRun: false, kody: null, rokOd: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') o.force = true;
    else if (a === '--jen-stazeni') o.jenStazeni = true;
    else if (a === '--jen-text') o.jenText = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--kod') o.kody = (argv[++i] ?? '').split(',').filter(Boolean);
    else if (a === '--rok-od') o.rokOd = Number(argv[++i]);
    else { console.error(`Neznámý argument: ${a}`); process.exit(2); }
  }
  return o;
}

function souhrn(manifest) {
  const per = {};
  for (const p of manifest.polozky) {
    per[p.kod] ??= {};
    per[p.kod][p.stav] = (per[p.kod][p.stav] ?? 0) + 1;
  }
  for (const [kod, s] of Object.entries(per)) console.log(`  ${kod}: ${Object.entries(s).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  let manifest;
  if (!o.jenText) {
    console.log('Stahuji výroční zprávy (max 1 požadavek/s)…');
    manifest = await fetchPojistovnyVz({ kody: o.kody, force: o.force, rokOd: o.rokOd, dryRun: o.dryRun });
  }
  if (!o.jenStazeni && !o.dryRun) {
    console.log('Extrahuji text z PDF…');
    manifest = extractTexts({ kody: o.kody }).manifest;
  }
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_FILE)}`);
  souhrn(manifest ?? loadManifest());
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
}
