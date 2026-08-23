// Věstníky MZ fetcher — strojový archiv obsahu Věstníků Ministerstva
// zdravotnictví (mzd.gov.cz). Zdroj je dvouvrstvý:
//
//   1. WordPress REST API mzd.gov.cz/wp-json/wp/v2/vestnik — všech ~351
//      částek s titulem, datem, odkazem; u částek od ~2012 nese
//      content.rendered i obsah (číslované položky).
//   2. U starších částek (hlavně 2006–2011) je content prázdný — obsah se
//      dočte z prvních stran PDF (odkaz na PDF nese HTML stránka částky),
//      extrakce přes pdfjs-dist (viz lib/zpp_parser.js).
//
// Výstup: data/vestniky.json — částky s obsahem a deterministickou
// kategorizací položek. POZOR: soubor je tažený ze sítě, NEPATŘÍ do
// merge=generated ani do build:generated (viz CLAUDE.md).
//
// Spuštění:  npm run fetch:vestniky   (force: node ingest/fetchers/vestniky.js --force)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { extractTextItems } from '../lib/zpp_parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CACHE_DIR = path.resolve(ROOT, CONFIG.cache.dir, 'vestniky');
const OUT_FILE = path.join(ROOT, 'data', 'vestniky.json');

const API_BASE = 'https://mzd.gov.cz/wp-json/wp/v2/vestnik';
const UA = { 'User-Agent': CONFIG.uzis.user_agent };
const DELAY_MS = 400; // šetrné tempo vůči mzd.gov.cz

const sleep = ms => new Promise(r => setTimeout(r, ms));
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

/* ── čisté funkce (testovatelné) ─────────────────────────────────────── */

/** „Věstník č. 10/2026" | „Věstník 1/2008" | slug „vestnik-1-1999-2" → {cislo, rok}. */
export function parseCisloRok(title, slug = '') {
  const t = String(title ?? '');
  let m = /(\d{1,2})\s*\/\s*(\d{4})/.exec(t);
  if (m) return { cislo: Number(m[1]), rok: Number(m[2]) };
  m = /vestnik-(\d{1,2})-(\d{4})/.exec(String(slug));
  if (m) return { cislo: Number(m[1]), rok: Number(m[2]) };
  return { cislo: null, rok: null };
}

/** content.rendered → pole položek obsahu (číslované řádky bez HTML). */
export function parseObsahHtml(html) {
  const text = String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;| /g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#8211;|&ndash;/g, '–').replace(/&#8222;/g, '„').replace(/&#8220;/g, '"');
  const items = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line || /^obsah\b/i.test(line)) continue;
    const m = /^(\d{1,2}[a-z]?)[.)]\s+(.{3,})$/.exec(line);
    if (m) { items.push(m[2].trim()); continue; }
    // pokračování předchozí položky (zalomený řádek bez čísla) — jen dokud je
    // položka rozumně dlouhá; delší lepení znamená, že už nejde o titulek
    if (items.length && !/^věstník/i.test(line)
      && items[items.length - 1].length + line.length <= 240) items[items.length - 1] += ` ${line}`;
  }
  return items.map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length >= 3);
}

/** Text prvních stran PDF (řádky v pořadí čtení) → položky OBSAHu.
 *  Vrací [] když se sekce OBSAH nenajde — poctivá degradace, nic se nevymýšlí. */
export function parseObsahPdf(lines) {
  const arr = (lines ?? []).map(l => String(l).replace(/\s+/g, ' ').trim());
  const start = arr.findIndex(l => /^O\s*B\s*S\s*A\s*H\s*:?$|^OBSAH\s*:?\b/i.test(l));
  if (start === -1) return [];
  const items = [];
  for (let i = start + 1; i < arr.length; i++) {
    const line = arr[i];
    if (!line) continue;
    // konec sekce: patička, tiráž nebo začátek prvního dokumentu
    if (/^(ZN[.:]|CENA|VYDÁVÁ|Vydává|ISSN|ROČNÍK|Částka\b)/i.test(line)) break;
    const m = /^(\d{1,2}[a-z]?)[.)]\s+(.{3,})$/.exec(line);
    if (m) { items.push(m[2]); continue; }
    if (items.length) {
      const cont = ocistiRadek(line);
      if (cont && !/^\d+$/.test(cont)
        && items[items.length - 1].length + cont.length <= 240) items[items.length - 1] += ` ${cont}`;
      if (items.length >= 40) break;
    }
  }
  return items.map(s => ocistiRadek(s)).filter(s => s.length >= 3);
}

/** Odstraní vodicí linky a stránkové odkazy z položky obsahu. Vodicí linka
 *  („. . . . ." / „……") položku UKONČUJE — vše za ní (číslo stránky, přilepené
 *  záhlaví další strany) se zahazuje. */
export function ocistiRadek(s) {
  return String(s)
    .replace(/(?:\s*[.…]){3,}[\s\S]*$/, '')
    .replace(/\bstr\.\s*\d*\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Deterministická kategorizace položky obsahu podle klíčových slov. */
export const KATEGORIE = [
  ['screening', /screening|čas(ný|ného|ném) záchyt/i],
  ['ockovani', /očkov|vakcin|imunizac/i],
  ['centra', /centr(um|a|um)? vysoce specializ|onkologick(á|é) péče|\bHOC\b|\bKOC\b|\bIKTOV|traumacentr|perinatolog/i],
  ['leciva', /léčiv|antiinfektiv|\bSEAI\b|lékov|opiát|omamn|psychotropn/i],
  ['cenove', /cenov(ý|é|á)|maximální cen|regulace cen|úhrad|bodov(é|á) hodnot/i],
  ['standardy', /standard|doporučen(ý|ého|é) postup|metodick(ý|é|á)|metodika|guidelines/i],
  ['vzdelavani', /vzdělávac|specializační|akreditac|atestac|kmen(e|ů)?\b|rezidenčn|kvalifikačn/i],
  ['spravni', /oprávnění|osvědčen|jmenován|statut|jednací řád|komise|výběrov(é|á) řízení|seznam (soudních )?znalc/i],
  ['dotace', /dotač|dotace|program podpory|grantov/i],
];

export function kategorie(polozka) {
  for (const [kat, re] of KATEGORIE) if (re.test(polozka)) return kat;
  return 'ostatni';
}

/** Anotace položek obsahu skupinami MZ podle deterministických pravidel
 *  (ingest/mapping/vestniky_souvislosti.json) — pole g na položce vykresluje
 *  archiv jako badge s odkazem na orgán. Čistá funkce, mutuje castky in-place. */
export function anotujSkupiny(castky, mapping) {
  const rules = (mapping?.skupiny ?? []).map(r => ({ g: r.g, re: new RegExp(r.re, 'i') }));
  let n = 0;
  for (const c of castky) {
    for (const o of c.obsah) {
      const gs = rules.filter(r => r.re.test(o.t)).map(r => r.g);
      if (gs.length) { o.g = gs; n++; } else { delete o.g; }
    }
  }
  return n;
}

/** Doplní do částky data z předchozího výstupu, když čerstvý běh nic nemá:
 *  obsah částky je neměnný, takže výpadek stránky MZ či nečitelné PDF nesmí
 *  přepsat dřív získaná data prázdnem. Čistá funkce. */
export function mergePrev(castka, prevRec) {
  if (!prevRec) return castka;
  const out = { ...castka };
  if (!out.obsah.length && prevRec.obsah?.length) {
    out.obsah = prevRec.obsah.map(o => ({ t: o.t, kat: kategorie(o.t) }));
  }
  if (!out.pdf && prevRec.pdf) out.pdf = prevRec.pdf;
  return out;
}

/** Sestaví záznam částky pro data/vestniky.json. */
export function buildCastka(rec, obsah, pdfUrl) {
  const { cislo, rok } = parseCisloRok(rec.title?.rendered, rec.slug);
  return {
    id: rec.id,
    cislo,
    rok,
    titul: String(rec.title?.rendered ?? '').replace(/&#\d+;/g, '').trim(),
    datum: (rec.date ?? '').slice(0, 10) || null,
    url: rec.link,
    pdf: pdfUrl ?? null,
    obsah: obsah.map(t => ({ t, kat: kategorie(t) })),
  };
}

/* ── síťové kroky ────────────────────────────────────────────────────── */

async function cachedFetch(url, file, { force = false, parse = 'json', ttlDays = 6 } = {}) {
  const p = path.join(CACHE_DIR, file);
  if (!force && fs.existsSync(p)) {
    const ageDays = (Date.now() - fs.statSync(p).mtimeMs) / 86_400_000;
    if (ageDays < ttlDays) {
      const raw = fs.readFileSync(p, parse === 'buffer' ? null : 'utf8');
      return parse === 'json' ? JSON.parse(raw) : raw;
    }
  }
  const body = await fetchWithRetry(url, { headers: UA, parse, timeoutMs: 60_000 });
  fs.writeFileSync(p, parse === 'json' ? JSON.stringify(body) : body);
  await sleep(DELAY_MS);
  return body;
}

/** Všechny záznamy z WP API (stránkované po 100). */
export async function fetchApiZaznamy(opts = {}) {
  ensureDir(CACHE_DIR);
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const url = `${API_BASE}?per_page=100&page=${page}&orderby=date&order=desc`;
    let batch;
    try {
      batch = await cachedFetch(url, `api-${page}.json`, opts);
    } catch (err) {
      if (err?.status === 400 && all.length) break; // za poslední stránkou
      throw err;
    }
    if (!Array.isArray(batch) || !batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

/** URL PDF z HTML stránky částky (první odkaz na .pdf). */
export function extractPdfUrl(html) {
  const m = /href="([^"]+\.pdf[^"]*)"/i.exec(String(html ?? ''));
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

async function fetchPdfObsah(rec, pdfUrl, opts) {
  const file = path.join(CACHE_DIR, `pdf-${rec.slug}.pdf`);
  if (opts.force || !fs.existsSync(file)) {
    const buf = await fetchWithRetry(pdfUrl, { headers: UA, parse: 'buffer', timeoutMs: 120_000 });
    fs.writeFileSync(file, Buffer.from(buf));
    await sleep(DELAY_MS);
  }
  // OBSAH je na prvních stranách — celé PDF (u starých částek i stovky stran)
  // se číst nemusí; šetří to čas týdenního cronu na čerstvém runneru
  const items = await extractTextItems(file, { maxPages: 3 });
  if (!items) return []; // pdfjs-dist není k dispozici
  // řádky prvních 3 stran v pořadí čtení (y klesá, x roste)
  const lines = [];
  for (let p = 1; p <= 3; p++) {
    const pageItems = items.filter(i => i.page === p && i.text);
    const rows = new Map();
    for (const it of pageItems) {
      const key = Math.round(it.y / 4) * 4;
      (rows.get(key) ?? rows.set(key, []).get(key)).push(it);
    }
    const sorted = [...rows.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, cells] of sorted) {
      lines.push(cells.sort((a, b) => a.x - b.x).map(c => c.text).join(' '));
    }
  }
  return parseObsahPdf(lines);
}

/* ── main ────────────────────────────────────────────────────────────── */

export async function fetchVestniky(opts = {}) {
  ensureDir(CACHE_DIR);
  const zaznamy = await fetchApiZaznamy(opts);
  console.log(`API: ${zaznamy.length} částek`);

  // Předchozí výstup: obsah částky je neměnný, takže co už jednou máme, se
  // znovu nestahuje (týdenní cron na čerstvém runneru tak řeší jen novinky)
  // a výpadek jedné stránky MZ nepřepíše dřív získaná data prázdnem.
  let prev = new Map();
  try {
    const p = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    prev = new Map((p.castky ?? []).map(c => [c.id, c]));
  } catch { /* první běh — žádný předchozí výstup */ }

  const castky = [];
  let zPdf = 0, bezObsahu = 0;
  for (const rec of zaznamy) {
    const prevRec = opts.force ? null : prev.get(rec.id);
    const apiObsah = parseObsahHtml(rec.content?.rendered);
    let obsah = apiObsah;
    let pdfUrl = prevRec?.pdf ?? null;
    if (!pdfUrl) {
      try {
        const html = await cachedFetch(rec.link, `html-${rec.slug}.html`, { ...opts, parse: 'text', ttlDays: 30 });
        pdfUrl = extractPdfUrl(html);
      } catch (err) {
        console.warn(`⚠ HTML ${rec.slug}: ${err.message}`);
      }
    }
    if (!obsah.length && pdfUrl && !prevRec?.obsah?.length) {
      try {
        obsah = await fetchPdfObsah(rec, pdfUrl, opts);
      } catch (err) {
        console.warn(`⚠ PDF ${rec.slug}: ${err.message}`);
      }
    }
    const c = mergePrev(buildCastka(rec, obsah, pdfUrl), prevRec);
    if (!apiObsah.length && c.obsah.length) zPdf++;
    if (!c.obsah.length) bezObsahu++;
    castky.push(c);
  }

  castky.sort((a, b) => (b.rok ?? 0) - (a.rok ?? 0) || (b.cislo ?? 0) - (a.cislo ?? 0));

  // prolinkování se skupinami MZ (badge v archivu) — deterministická pravidla
  let mapping = null;
  try {
    mapping = JSON.parse(fs.readFileSync(path.join(ROOT, 'ingest', 'mapping', 'vestniky_souvislosti.json'), 'utf8'));
    anotujSkupiny(castky, mapping);
  } catch (err) {
    console.warn(`⚠ vestniky_souvislosti mapping: ${err.message}`);
  }
  const out = {
    version: '1.0',
    zdroj: 'mzd.gov.cz — Věstníky Ministerstva zdravotnictví (WP REST API + PDF)',
    stav_k: castky.map(c => c.datum).filter(Boolean).sort().at(-1),
    pozn: 'Obsah částek: u novějších z webu MZ, u starších extrahován z prvních stran PDF. '
      + 'Částka s prázdným polem obsah znamená, že se obsah nepodařilo strojově přečíst — '
      + 'NEZNAMENÁ to, že je částka prázdná; odkaz na PDF platí. Kategorie jsou '
      + 'deterministické podle klíčových slov (orientační).',
    pocty: {
      castky: castky.length,
      polozky: castky.reduce((n, c) => n + c.obsah.length, 0),
      z_pdf: zPdf,
      bez_obsahu: bezObsahu,
    },
    castky,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 1) + '\n');
  console.log(`✓ data/vestniky.json — ${out.pocty.castky} částek, ${out.pocty.polozky} položek obsahu, `
    + `${zPdf} z PDF, ${bezObsahu} bez strojového obsahu`);

  // vazby na indikátory + názvy skupin pro badge — malý soubor pro lazy-load
  // (drží se v kroku fetch, aby ho týdenní cron aktualizoval spolu s archivem)
  if (mapping) {
    try {
      const { buildVazby } = await import('../build-vestniky-vazby.js');
      const ppo = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'ppo.json'), 'utf8'));
      const gids = new Set((mapping.skupiny ?? []).map(r => r.g));
      const nazvy = Object.fromEntries(ppo.skupiny.filter(s => gids.has(s.id)).map(s => [s.id, s.nazev]));
      const vaz = buildVazby(out, mapping, nazvy);
      const vp = path.join(ROOT, 'data', 'vestniky-vazby.json');
      fs.writeFileSync(vp, JSON.stringify(vaz, null, 1) + '\n');
      console.log(`✓ data/vestniky-vazby.json (${(fs.statSync(vp).size / 1024).toFixed(0)} kB)`);
    } catch (err) {
      console.warn(`⚠ vestniky-vazby: ${err.message}`);
    }
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  fetchVestniky({ force: process.argv.includes('--force') })
    .catch(err => { console.error('fetch:vestniky selhal:', err); process.exit(1); });
}
