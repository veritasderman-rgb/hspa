// Síť smluvních poskytovatelů ze SEZNAMŮ POJIŠŤOVEN (doplněk prototypu pojistovny-sit.js).
//
// PROČ: prototyp v pojistovny-sit.js je jen horní odhad (ÚZIS NR-04-64 × NRPZS, stav 31. 12. 2024):
// číselník IČZ nese zařízení, ne odbornost. Tři pojišťovny ale samy zveřejňují seznam smluvních
// poskytovatelů ke stažení (ověřeno 2. 11. 2026, docs/pojistovny-sit.md kap. 8):
//   111 VZP ČR  XLSX  IČO, název, IČZ, název, ODBORNOST („207 - alergologie…“)   stav v titulku
//   205 ČPZP    XLSX  IČO, název, IČZ, název, ODBORNOST („207-alergologie…“)     stav neuveden (datum souboru)
//   201 VoZP    CSV   IČO, název, IČZ, název, obec, PSČ, ulice — BEZ ODBORNOSTI    stav v názvu souboru
// OZP, ZP MV ČR, RBP a ZPŠ seznam ke stažení nemají (jen vyhledávače); pro ně se nic nepočítá.
//
// CO JE JEDNOTKA: řádek seznamu = smluvní zařízení (IČZ) × nasmlouvaná odbornost. Seznamy NENESOU
// pracoviště (IČP) ani adresu (VZP, ČPZP). Počítá se tedy počet IČZ, která mají odbornost X
// nasmlouvanou; víc ambulancí téže odbornosti v jednom IČZ = 1. U VoZP jen počet IČZ (bez odbornosti).
// Kraj IČZ: okres z ÚZIS OIS-12-02 (Odvozený číselník IČZ v poslední dostupné verzi, CC BY 4.0);
// IČZ, které tam chybí (vzniklo po 6/2025), dostane kraj podle prvního dvojčíslí IČZ, pokud to
// dvojčíslí v číselníku ÚZIS patří z ≥ 95 % jednomu kraji; jinak zůstane bez kraje (`bez_kraje`).
//
// Výstup: doplní do data/pojistovny-sit.json bloky `seznamy_pojistoven` a `srovnani`
//         (ostatní bloky nemění). Agregáty po krajích, žádné řádky s IČO/jmény (GOVERNANCE § 6 bod 3).
// Cache:  ingest/cache/sit-seznamy/* (gitignored), surové soubory se drží 7 dní.
// Mapování odborností: ingest/mapping/pojistovny_sit_odbornosti.json (číselník VZP 770).
//
// Spuštění: node ingest/fetchers/pojistovny-sit-seznamy.js [--force]
// Slušnost: 4–7 požadavků, User-Agent projektu, max 1 req/s, TLS se nevypíná.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { CONFIG } from '../config.js';
import { parseCsv } from '../lib/csv.js';
import { cachePath, ensureCacheDir } from '../lib/cache.js';
import { norm } from './pojistovny-sit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, '..', '..', 'data', 'pojistovny-sit.json');
const MAPPING_FILE = path.resolve(__dirname, '..', 'mapping', 'pojistovny_sit_odbornosti.json');
const CACHE_SUB = 'sit-seznamy';
const TTL_H = 24 * 7;

export const ICZ_POSLEDNI_URL = 'https://data.mzcr.cz/data/distribuce/457/Otevrena-data-OIS-12-02-ciselnik-icz-pojistovny-posledni-dostupne.csv';
export const ICZ_POSLEDNI_PAGE = 'https://www.nzip.cz/data/2431-ciselnik-icz-pojistovny-posledni-dostupne-otevrena-data';
/** Dvojčíslí IČZ se použije jako záloha jen tehdy, když v číselníku ÚZIS patří aspoň z 95 % jednomu kraji. */
export const PREFIX_PRAH = 0.95;
export const PREFIX_MIN_N = 30;

/**
 * Seznamy, které pojišťovny zveřejňují. `stranka` = kde odkaz visí (zdroj pravdy pro aktuální název
 * souboru), `vzor` = regex odkazu na stránce, `url` = záloha, kdyby stránka odkaz nenesla.
 */
export const SEZNAMY = [
  {
    zp: '111',
    nazev: 'VZP ČR · Seznam smluvních poskytovatelů zdravotních služeb dle odborností',
    stranka: 'https://www.vzp.cz/poskytovatele/smluvni-vztahy/seznam-smluvnich-poskytovatelu-zdravotnich-sluzeb',
    vzor: /https:\/\/media\.vzpstatic\.cz\/[^"'\s]*seznam_pzs_\d{4}-\d{2}\.xlsx/i,
    url: 'https://media.vzpstatic.cz/media/Default/dokumenty/seznam_pzs_2026-10.xlsx',
    format: 'xlsx',
    odbornost: true,
    licence: 'neuvedena (podmínky webu VZP: https://www.vzp.cz/o-nas/dokumenty/copyright-c-vzp)',
  },
  {
    zp: '205',
    nazev: 'ČPZP · Seznam poskytovatelů zdravotních služeb dle odborností',
    stranka: 'https://www.cpzp.cz/lekari',
    vzor: /[^"'\s]*import\/lekari\/PZSdleOdb\.xlsx/i,
    url: 'https://www.cpzp.cz/import/lekari/PZSdleOdb.xlsx',
    format: 'xlsx',
    odbornost: true,
    licence: 'neuvedena',
  },
  {
    zp: '201',
    nazev: 'VoZP ČR · Seznam smluvních poskytovatelů zdravotních služeb (řazený podle IČZ)',
    stranka: 'https://www.vozp.cz/seznam-smluvnich-poskytovatelu-zdravotnich-sluzeb',
    vzor: /[^"'\s]*poskytovatele_seznam\/[^"'\s]*-csv\.csv/i,
    url: 'https://www.vozp.cz/assets/_oz_soubory/poskytovatele_seznam/vozp-smluvni-poskytovatele-30.09.2026-csv.csv',
    format: 'csv',
    odbornost: false,
    licence: 'neuvedena',
  },
];

/** Pojišťovny bez seznamu ke stažení (rešerše 2. 11. 2026, docs/pojistovny-sit.md kap. 8.3). */
export const BEZ_SEZNAMU = {
  207: { stranka: 'https://www.ozp.cz/pro-klienty/smluvni-lekari-ozp', poznamka: 'Jen webová aplikace „Atlas doktorů“ (atlasdoktoru.cz, JS aplikace); soubor ke stažení nenalezen.' },
  209: { stranka: 'https://www.zpskoda.cz/smluvni-partneri', poznamka: 'Jen vyhledávač smluvních partnerů na webu; jediný XLSX na stránce Smluvní vztahy je prázdný formulář (formular_icz_icp_def.xlsx).' },
  211: { stranka: 'https://www.zpmvcr.cz/pojistenci/zdravotni-sluzby/smluvni-poskytovatele', poznamka: 'Jen interaktivní mapa (Power BI); ke stažení je jen seznam lázeňských poskytovatelů, ne celá síť.' },
  213: { stranka: 'https://www.rbp213.cz/vyhledani-smluvniho-lekare/a-5264/', poznamka: 'Jen vyhledávač v klientské aplikaci my213.cz (JS aplikace); soubor ke stažení nenalezen.' },
};

// ---------------------------------------------------------------- čisté funkce

/** Načte mapování odborností a vrátí { kody:Set, byName:Map(normNazev → kod) }. */
export function loadOdbMapping(mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'))) {
  const kody = new Set(Object.keys(mapping.odbornosti || {}));
  const byName = new Map();
  for (const [kod, o] of Object.entries(mapping.odbornosti || {})) {
    for (const n of o.nazvy || []) byName.set(norm(n), kod);
    if (o.nazev_770) byName.set(norm(o.nazev_770), kod);
  }
  return { kody, byName };
}

/**
 * Text odbornosti ze seznamu → { kod (sledovaný kód 770, nebo null), raw (kód v textu), shoda }.
 * Kód před pomlčkou má přednost; název je záloha a kontrola (`shoda: false` = kód sledovaný, ale
 * název v mapování není: počítá se podle kódu a hlásí se v kvalitě).
 */
export function normalizeOdbornost(text, mp) {
  const s = String(text ?? '').trim();
  const m = /^\s*([0-9A-Z]{3})\s*-\s*(.*)$/i.exec(s);
  if (m) {
    const raw = m[1].toUpperCase();
    if (!mp.kody.has(raw)) return { kod: null, raw, shoda: true };
    const nazev = norm(m[2]);
    return { kod: raw, raw, shoda: !nazev || mp.byName.get(nazev) === raw };
  }
  const byName = mp.byName.get(norm(s)) ?? null;
  return { kod: byName, raw: null, shoda: true };
}

/** IČZ na 8 znaků (Excel/CSV občas ořízne úvodní nuly). */
export function normIcz(v) {
  const s = String(v ?? '').replace(/\s+/g, '');
  return /^\d{1,8}$/.test(s) ? s.padStart(8, '0') : '';
}

const headKey = (c) => norm(c).replace(/[^a-z0-9]/g, '');

/**
 * Řádky listu (pole polí) → [{ icz, odb }]. Hlavičku najde podle sloupců IČZ a ODBORNOST
 * (VZP má nad ní řádek s titulkem a stavem). Vrací i titulek (text nad hlavičkou).
 */
export function parseSeznamRows(rows) {
  const hi = rows.findIndex((r) => Array.isArray(r) && r.some((c) => headKey(c) === 'icz') && r.some((c) => headKey(c) === 'odbornost'));
  if (hi < 0) throw new Error('seznam: nenalezena hlavička se sloupci IČZ a ODBORNOST');
  const h = rows[hi].map(headKey);
  const iIcz = h.indexOf('icz');
  const iOdb = h.indexOf('odbornost');
  const titulek = rows.slice(0, hi).flat().map((c) => String(c ?? '').trim()).filter(Boolean).join(' ');
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const icz = normIcz(r?.[iIcz]);
    if (!icz) continue;
    out.push({ icz, odb: String(r?.[iOdb] ?? '').trim() });
  }
  return { titulek, radky: out };
}

/** XLSX (Buffer) → parseSeznamRows prvního listu + datum vytvoření souboru z vlastností sešitu. */
export function parseSeznamXlsx(buf) {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, blankrows: false });
  const created = wb.Props?.CreatedDate ? new Date(wb.Props.CreatedDate).toISOString().slice(0, 10) : null;
  return { ...parseSeznamRows(rows), vytvoreno: created };
}

/** CSV VoZP (UTF-8, čárka) → [{ icz }]; sloupec IČZ se hledá podle hlavičky. */
export function parseSeznamCsv(text) {
  const recs = parseCsv(String(text ?? ''));
  if (!recs.length) return { radky: [] };
  const col = Object.keys(recs[0]).find((k) => headKey(k) === 'icz');
  if (!col) throw new Error('seznam CSV: chybí sloupec IČZ');
  return { radky: recs.map((r) => ({ icz: normIcz(r[col]) })).filter((r) => r.icz) };
}

/** „… k 1. 10. 2026 …“ nebo „…-30.09.2026-…“ → ISO datum, jinak null. */
export function parseStavK(s) {
  const m = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(String(s ?? ''));
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/**
 * Z řádků ÚZIS OIS-12-02 sestaví { okres: Map(IČZ → kraj NUTS3), prefix: Map(dvojčíslí → kraj) }.
 * Kraj = prvních 5 znaků okresu RÚIAN (CZ0631 → CZ063). `krajKody` omezí na kraje z pojistovny-sit.json.
 */
export function buildIczKraj(rows, krajKody, { prah = PREFIX_PRAH, minN = PREFIX_MIN_N } = {}) {
  const okres = new Map();
  const pref = new Map();
  for (const r of rows) {
    const icz = normIcz(r.ICZ);
    const kr = String(r.okres_RUIAN ?? '').trim().slice(0, 5);
    if (!icz || !kr || (krajKody && !krajKody.has(kr))) continue;
    okres.set(icz, kr);
    const p = icz.slice(0, 2);
    if (!pref.has(p)) pref.set(p, new Map());
    const m = pref.get(p);
    m.set(kr, (m.get(kr) || 0) + 1);
  }
  const prefix = new Map();
  for (const [p, m] of pref) {
    const tot = [...m.values()].reduce((a, b) => a + b, 0);
    const [kr, n] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    if (tot >= minN && n / tot >= prah) prefix.set(p, kr);
  }
  return { okres, prefix };
}

/** Kraj IČZ: číselník ÚZIS, jinak jednoznačné dvojčíslí, jinak null. */
export function krajForIcz(icz, ik) {
  const k = ik.okres.get(icz);
  if (k) return { kraj: k, uroven: 'ciselnik' };
  const p = ik.prefix.get(icz.slice(0, 2));
  if (p) return { kraj: p, uroven: 'prefix' };
  return { kraj: null, uroven: 'neurcen' };
}

/**
 * Agregace jednoho seznamu. `radky` = [{icz, odb?}], `odbKody` = sledované kódy v pořadí.
 * Řádek IČZ × odbornost se počítá nejvýše jednou (duplicitní řádky v seznamu se ignorují).
 */
export function aggregateSeznam(radky, { mp, ik, odbKody, sOdbornosti = true }) {
  const kvalita = { radku: radky.length, icz: 0, kraj_ciselnik: 0, kraj_prefix: 0, kraj_neurcen: 0 };
  if (sOdbornosti) Object.assign(kvalita, { odbornost_bez_kodu: 0, odbornost_nazev_nesouhlasi: 0 });
  const iczKraj = new Map();
  for (const r of radky) {
    if (iczKraj.has(r.icz)) continue;
    const k = krajForIcz(r.icz, ik);
    iczKraj.set(r.icz, k.kraj);
    kvalita[`kraj_${k.uroven}`]++;
  }
  kvalita.icz = iczKraj.size;
  const icz_kraj = {};
  let iczBezKraje = 0;
  for (const kr of iczKraj.values()) {
    if (kr) icz_kraj[kr] = (icz_kraj[kr] || 0) + 1;
    else iczBezKraje++;
  }
  const out = { icz_celkem: iczKraj.size, icz_kraj, icz_bez_kraje: iczBezKraje, kvalita };
  if (!sOdbornosti) return { ...out, matice: null, celkem: null, bez_kraje: null };

  const matice = Object.fromEntries(odbKody.map((k) => [k, {}]));
  const celkem = Object.fromEntries(odbKody.map((k) => [k, 0]));
  const bez_kraje = Object.fromEntries(odbKody.map((k) => [k, 0]));
  const seen = new Set();
  for (const r of radky) {
    const o = normalizeOdbornost(r.odb, mp);
    if (o.raw == null && o.kod == null) kvalita.odbornost_bez_kodu++;
    if (!o.kod || !(o.kod in celkem)) continue;
    if (!o.shoda) kvalita.odbornost_nazev_nesouhlasi++;
    const key = `${r.icz}|${o.kod}`;
    if (seen.has(key)) continue;
    seen.add(key);
    celkem[o.kod]++;
    const kr = iczKraj.get(r.icz);
    if (kr) matice[o.kod][kr] = (matice[o.kod][kr] || 0) + 1;
    else bez_kraje[o.kod]++;
  }
  return { ...out, matice, celkem, bez_kraje };
}

const r3 = (x) => Math.round(x * 1000) / 1000;

/**
 * Srovnání seznam × horní odhad NR-04-64 (součet `matice[zp][odb]` přes kraje, ČR celkem).
 * pomer = seznam / odhad (0,8 = odhad je o 25 % vyšší než seznam). Jen pro ZP se seznamem s odborností.
 */
export function buildSrovnani(sit, seznamy) {
  const zp = {};
  for (const [kod, s] of Object.entries(seznamy || {})) {
    if (s?.stav !== 'seznam' && s?.stav !== 'seznam-bez-odbornosti') continue;
    const odbornosti = s.celkem ? {} : null;
    if (odbornosti) {
      for (const [odb, n] of Object.entries(s.celkem)) {
        const odhad = Object.values(sit?.matice?.[kod]?.[odb] || {}).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
        odbornosti[odb] = { seznam: n, odhad, pomer: odhad > 0 ? r3(n / odhad) : null };
      }
    }
    zp[kod] = { stav_k: s.zdroj?.stav_k ?? null, odbornosti };
  }
  return {
    metoda: 'pomer = počet IČZ s nasmlouvanou odborností podle seznamu pojišťovny / horní odhad NR-04-64 × NRPZS (místa poskytování, stav 31. 12. 2024), obojí ČR celkem. Pomer pod 1 znamená, že odhad je vyšší než seznam. Jednotky nejsou totožné (IČZ × odbornost vs. místo poskytování) a dělí je téměř dva roky, poměr proto ukazuje řád nadhodnocení, ne přesnou chybu.',
    odhad_ref_datum: sit?.ref_datum ?? null,
    zp,
  };
}

/** Sestaví blok `seznamy_pojistoven` pro všech 7 ZP (bez seznamu = stav 'bez-seznamu', nic se nepočítá). */
export function buildSeznamyBlock(perZp, { overeno, zpCodes = ['111', '201', '205', '207', '209', '211', '213'] } = {}) {
  const out = {};
  for (const kod of zpCodes) {
    if (perZp[kod]) { out[kod] = perZp[kod]; continue; }
    const b = BEZ_SEZNAMU[kod];
    out[kod] = {
      stav: 'bez-seznamu',
      zdroj: { nazev: null, url: null, stranka: b?.stranka ?? null, overeno: overeno ?? null },
      poznamka: b?.poznamka ?? 'Seznam ke stažení nenalezen nebo se ho nepodařilo stáhnout.',
    };
  }
  return out;
}

// ---------------------------------------------------------------- síť

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastReq = 0;
async function politeFetch(url, fetchImpl, accept = '*/*') {
  const wait = lastReq + 1000 - Date.now();
  if (wait > 0) await sleep(wait);
  lastReq = Date.now();
  const res = await fetchImpl(url, { headers: { 'User-Agent': CONFIG.uzis.user_agent, Accept: accept } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res;
}

/** Stáhne soubor do ingest/cache/sit-seznamy/<name> (nebo vezme z cache ≤ 7 dní). */
async function cachedFile(url, name, { force, fetchImpl }) {
  ensureCacheDir();
  const dir = cachePath(CACHE_SUB);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  const meta = `${file}.meta.json`;
  if (!force && fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < TTL_H * 3_600_000) {
    const m = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')) : {};
    return { buf: fs.readFileSync(file), lastModified: m.lastModified ?? null, http: m.http ?? 200, cache: true };
  }
  const res = await politeFetch(url, fetchImpl);
  const buf = Buffer.from(await res.arrayBuffer());
  const lastModified = res.headers.get('last-modified');
  fs.writeFileSync(file, buf);
  fs.writeFileSync(meta, JSON.stringify({ url, http: res.status, lastModified, staženo: new Date().toISOString() }, null, 2));
  return { buf, lastModified, http: res.status, cache: false };
}

/** Najde aktuální odkaz na seznam na stránce pojišťovny; když to nejde, vrátí zálohu `s.url`. */
async function discoverUrl(s, fetchImpl) {
  try {
    const res = await politeFetch(s.stranka, fetchImpl, 'text/html');
    const html = await res.text();
    const m = s.vzor.exec(html);
    if (m) return new URL(m[0], s.stranka).href;
  } catch (e) {
    console.warn(`  [sit-seznamy] ${s.zp}: stránku ${s.stranka} nejde načíst (${e.message}), beru zálohu`);
  }
  return s.url;
}

const isoDate = (h) => { const t = Date.parse(h ?? ''); return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10); };

/** Hlavní pipeline. */
export async function fetchPojistovnySitSeznamy(opts = {}) {
  const { force = false, fetchImpl = globalThis.fetch, outFile = OUT_FILE, today = new Date().toISOString().slice(0, 10) } = opts;
  const sit = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  const krajKody = new Set((sit.kraje || []).map((k) => k.kod));
  const odbKody = (sit.odbornosti || []).map((o) => o.kod);
  const mp = loadOdbMapping();

  console.log(`  [sit-seznamy] číselník IČZ ÚZIS OIS-12-02 ${ICZ_POSLEDNI_URL}`);
  const ic = await cachedFile(ICZ_POSLEDNI_URL, 'icz-posledni.csv', { force, fetchImpl });
  const ik = buildIczKraj(parseCsv(ic.buf.toString('utf8')), krajKody);

  const perZp = {};
  for (const s of SEZNAMY) {
    try {
      const url = await discoverUrl(s, fetchImpl);
      const name = decodeURIComponent(url.split('/').pop());
      const f = await cachedFile(url, name, { force, fetchImpl });
      const parsed = s.format === 'xlsx' ? parseSeznamXlsx(f.buf) : parseSeznamCsv(f.buf.toString('utf8'));
      let stav_k = parseStavK(parsed.titulek) || parseStavK(name);
      let stav_k_zdroj = parseStavK(parsed.titulek) ? 'titulek souboru' : stav_k ? 'název souboru' : null;
      if (!stav_k) { stav_k = parsed.vytvoreno || isoDate(f.lastModified); stav_k_zdroj = 'soubor stav neuvádí: datum vytvoření souboru'; }
      const agg = aggregateSeznam(parsed.radky, { mp, ik, odbKody, sOdbornosti: s.odbornost });
      perZp[s.zp] = {
        stav: s.odbornost ? 'seznam' : 'seznam-bez-odbornosti',
        zdroj: {
          nazev: s.nazev, url, stranka: s.stranka, format: s.format.toUpperCase(), velikost_b: f.buf.length, http: f.http,
          stav_k, stav_k_zdroj, soubor_datum: isoDate(f.lastModified), overeno: today, licence: s.licence,
        },
        jednotka: s.odbornost
          ? 'smluvní zařízení (IČZ) s nasmlouvanou odborností podle seznamu pojišťovny; seznam nenese pracoviště (IČP), víc ambulancí téže odbornosti v jednom IČZ se počítá jednou'
          : 'smluvní zařízení (IČZ) podle seznamu pojišťovny; seznam nenese odbornost, proto jen počty IČZ po krajích (včetně lékáren a výdejen zdravotnických prostředků)',
        kraj_metoda: `okres IČZ z ÚZIS OIS-12-02 (soubor ${isoDate(ic.lastModified) ?? '?'}), jinak první dvojčíslí IČZ, pokud v číselníku ÚZIS patří z ≥ ${Math.round(PREFIX_PRAH * 100)} % jednomu kraji`,
        ...agg,
      };
      console.log(`  [sit-seznamy] ${s.zp}: ${agg.kvalita.radku} řádků, ${agg.icz_celkem} IČZ, bez kraje ${agg.icz_bez_kraje}`);
    } catch (e) {
      console.warn(`  [sit-seznamy] ${s.zp}: FAIL ${e.message} — blok zůstane prázdný`);
      perZp[s.zp] = { stav: 'chyba', zdroj: { nazev: s.nazev, url: s.url, stranka: s.stranka, overeno: today }, poznamka: `Stažení nebo parsování selhalo: ${e.message}` };
    }
  }

  sit.seznamy_pojistoven = buildSeznamyBlock(perZp, { overeno: today });
  sit.seznamy_pojistoven_zdroj_kraje = { nazev: 'ÚZIS · Odvozený číselník IČZ dle údajů pojišťoven v poslední dostupné verzi (OIS-12-02)', url: ICZ_POSLEDNI_PAGE, soubor: ICZ_POSLEDNI_URL, licence: 'CC BY 4.0', aktualizace: isoDate(ic.lastModified) };
  sit.srovnani = buildSrovnani(sit, sit.seznamy_pojistoven);
  fs.writeFileSync(outFile, JSON.stringify(sit, null, 2) + '\n');
  console.log(`  [sit-seznamy] zapsáno → ${path.relative(process.cwd(), outFile)}`);
  return sit;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchPojistovnySitSeznamy({ force: process.argv.includes('--force') }).catch((err) => {
    console.error('[pojistovny-sit-seznamy] FAIL:', err.message);
    process.exit(1);
  });
}
