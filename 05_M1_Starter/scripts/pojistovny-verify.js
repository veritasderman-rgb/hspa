// Ověření čísel srovnávače pojišťoven proti textům výročních zpráv (VZ) v repu.
//
//   node scripts/pojistovny-verify.js            # zapíše data/pojistovny-verifikace.json
//   node scripts/pojistovny-verify.js --dry      # jen konzolový souhrn
//
// Prochází (1) všechny obálky {hodnota, rok, zdroj} v data/pojistovny.json a (2) čísla struktury fondu
// prevence v data/pojistovny-prevence.json (polozky[].skutecnost/zpp/predchozi_rok a celkem) a každé
// hledá v textu příslušné VZ (ingest/manual/pojistovny/vz-text/<kod>-<rok>.txt).
//
// Výsledek každé položky (pole `nalezeno`):
//   true            číslo je v textu VZ (tolerantně: formát zápisu, tis./mil./mld. = ×1000, ÷1000, ×1e6, ÷1e6),
//   false           VZ má text, číslo v něm není → signál pro redakci (přepsat / dohledat), ne chyba dat,
//   'bez-textu'     VZ je sken bez textové vrstvy, nebo její text v repu chybí → nešlo ověřit,
//   'mimo-rozsah'   zdroj hodnoty není VZ (MZ hodnocení, sněmovní tisk, vlastní výpočet) → jiný dokument, nehledá se.
// Hodnota ze zdroje „vypočteno“ se hledat nemá smysl: počítá se z jiných hodnot, ne opisuje z dokumentu.
//
// Čistá funkce verifyAll() nemá žádný vstup/výstup mimo parametry (testuje ji tests/pojistovny-vz.test.js).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNumberIndex, findValue, kontextKolem, platneCislice } from '../ingest/lib/pojistovny-vz.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
export const OUT_FILE = path.join(ROOT, 'data', 'pojistovny-verifikace.json');
const TEXT_DIR = path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'vz-text');
const MANIFEST_FILE = path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'vz-manifest.json');
const ZDROJE_VZ_2024 = path.join(ROOT, 'ingest', 'manual', 'pojistovny', 'zdroje-vz-2024.json');

const ZKRATKA_KOD = { vzp: '111', vozp: '201', cpzp: '205', ozp: '207', zps: '209', zpmv: '211', rbp: '213' };
const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Mapa URL → {kod, rok} známých VZ: nejdřív startovní seznam (meta.zdroje_hlavni, klíče vz_<zkratka>_<rok>),
 * pak manifest (přesné URL stažených PDF; má přednost).
 */
export function buildUrlMap({ zdrojeHlavni = {}, manifest = { polozky: [] } } = {}) {
  const map = new Map();
  for (const [k, url] of Object.entries(zdrojeHlavni)) {
    const m = /^vz_([a-z]+)_(\d{4})$/.exec(k);
    if (m && ZKRATKA_KOD[m[1]]) map.set(url, { kod: ZKRATKA_KOD[m[1]], rok: Number(m[2]) });
  }
  for (const p of manifest.polozky ?? []) if (p.url) map.set(p.url, { kod: p.kod, rok: p.rok });
  return map;
}

/**
 * Určí, v jakém dokumentu se má hodnota hledat.
 * @returns {{doc: {kod: string, rok: number}|null, duvod: string|null}}  doc = null → mimo rozsah (duvod říká proč)
 */
export function resolveDoc(zdroj, kod, rok, urlMap) {
  const z = String(zdroj ?? '').trim();
  if (!z) return { doc: null, duvod: 'bez zdroje' };
  if (/^https?:\/\//i.test(z)) {
    const url = z.split(/\s/)[0];
    const hit = urlMap.get(url);
    if (hit) return { doc: hit, duvod: null };
    if (/mzd\.gov\.cz/i.test(url)) return { doc: null, duvod: 'MZ hodnocení (jiný dokument)' };
    if (/psp\.cz/i.test(url)) return { doc: null, duvod: 'sněmovní tisk ZPP (jiný dokument)' };
    return { doc: null, duvod: 'zdroj není známá VZ' };
  }
  if (/výpočet|vypočteno/i.test(z)) return { doc: null, duvod: 'odvozená hodnota (vypočteno)' };
  if (/\bMZ\b|hodnocení/i.test(z) && !/\bVZ\b|výroční zpráv/i.test(z)) return { doc: null, duvod: 'MZ hodnocení (jiný dokument)' };
  if (/\bVZ\b|výroční zpráv/i.test(z)) {
    const y = /(?<!\d)(20\d\d)(?!\d)/.exec(z);
    return { doc: { kod, rok: y ? Number(y[1]) : rok }, duvod: null };
  }
  return { doc: null, duvod: 'zdroj není VZ' };
}

/** Všechny obálky {hodnota: číslo, zdroj, rok} pod ZP (rekurzivně) s cestou. */
export function collectEnvelopes(zp) {
  const out = [];
  const walk = (o, p, blokRok) => {
    if (Array.isArray(o)) { o.forEach((x, i) => walk(x, `${p}[${i}]`, blokRok)); return; }
    if (!isObj(o)) return;
    if (isNum(o.hodnota) && 'zdroj' in o) { out.push({ cesta: p, hodnota: o.hodnota, rok: o.rok ?? blokRok ?? null, zdroj: o.zdroj }); return; }
    const rokBloku = isNum(o.rok) ? o.rok : blokRok;
    for (const [k, v] of Object.entries(o)) walk(v, `${p}.${k}`, rokBloku);
  };
  for (const blok of ['hospodareni', 'hospodareni_2025', 'prevence', 'servis', 'mereni_dopadu']) {
    if (zp[blok] != null) walk(zp[blok], `pojistovny[${zp.kod}].${blok}`, blok === 'hospodareni_2025' ? 2025 : undefined);
  }
  return out;
}

/** Čísla struktury fondu prevence (tis. Kč) — dokument = VZ téže ZP za rok struktury. */
export function collectPrevence(zp) {
  const s = zp.fond_prevence_struktura;
  if (!isObj(s)) return [];
  const rok = s.rok ?? zp.rok_vz;
  const out = [];
  // `radek` spojuje čísla jedné položky: v tabulce VZ stojí vedle sebe na jednom řádku (plán · skutečnost · loni)
  const push = (cesta, v, radek) => { if (isNum(v)) out.push({ cesta, hodnota: v, rok, zdroj: `VZ ${rok}`, radek }); };
  (s.polozky ?? []).forEach((p, i) => {
    for (const f of ['zpp', 'skutecnost', 'predchozi_rok']) push(`prevence[${zp.kod}].fond_prevence_struktura.polozky[${i}].${f}`, p?.[f], `${zp.kod}:polozky[${i}]`);
  });
  for (const f of ['zpp', 'skutecnost', 'predchozi_rok']) push(`prevence[${zp.kod}].fond_prevence_struktura.celkem.${f}`, s.celkem?.[f], `${zp.kod}:celkem`);
  return out;
}

/** Dvě čísla jedné položky fondu prevence do tolika znaků od sebe = jeden řádek tabulky VZ. */
export const RADEK_ODSTUP = 160;

/**
 * Jednotlivé číslo bývá v textu VZ náhodou (638, 442…); celý řádek tabulky (plán · skutečnost · loni
 * vedle sebe) náhodou není. Pokud najdeme aspoň dvě čísla jedné položky blízko sebe, shoda má jistotu
 * „vysoká“ (`shoda_radku: true`) a kontext míří na ten řádek.
 */
function potvrdRadky(polozky) {
  const skupiny = new Map();
  for (const p of polozky) {
    if (p._radek && p.nalezeno === true) {
      const key = `${p.kod}|${p.dokument}|${p._radek}`;
      if (!skupiny.has(key)) skupiny.set(key, []);
      skupiny.get(key).push(p);
    }
  }
  for (const clenove of skupiny.values()) {
    if (clenove.length < 2) continue;
    for (const a of clenove) {
      for (const b of clenove) {
        if (a === b) continue;
        // dvojice drobných čísel (4 a 5 tis. Kč) se ve sdílené tabulce potká i náhodou
        if (platneCislice(a.hodnota) + platneCislice(b.hodnota) < 7) continue;
        const pa = a._r.vsechny.find((x) => b._r.vsechny.some((y) => x !== y && Math.abs(x - y) <= RADEK_ODSTUP));
        if (pa == null) continue;
        a.shoda_radku = true;
        a.jistota = 'vysoka';
        a.kontext = kontextKolem(a._d.text, pa, a._r.delka);
        break;
      }
    }
  }
}

/**
 * Hlavní logika.
 * @param {{
 *   pojistovny: object, prevence?: object, urlMap: Map, manifest?: {polozky: object[]},
 *   loadText: (kod: string, rok: number) => string|null|undefined,
 *   now?: Date,
 * }} args
 */
export function verifyAll({ pojistovny, prevence = null, urlMap, manifest = { polozky: [] }, loadText, now = new Date() }) {
  const manStav = (kod, rok) => manifest.polozky.find((p) => p.kod === kod && p.rok === rok)?.stav ?? null;
  const cache = new Map(); // "kod-rok" → {text, index} | null
  const docOf = (kod, rok) => {
    const key = `${kod}-${rok}`;
    if (!cache.has(key)) {
      const text = loadText(kod, rok);
      cache.set(key, text ? { text, index: buildNumberIndex(text) } : null);
    }
    return cache.get(key);
  };

  const polozky = [];
  const zkratky = Object.fromEntries((pojistovny.pojistovny ?? []).map((z) => [z.kod, z.zkratka]));

  const run = (kod, e) => {
    const { doc, duvod } = resolveDoc(e.zdroj, kod, e.rok, urlMap);
    const base = { cesta: e.cesta, hodnota: e.hodnota, rok: e.rok, kod };
    const startIdx = polozky.length;
    if (!doc) { polozky.push({ ...base, nalezeno: 'mimo-rozsah', duvod }); return; }
    const dokument = `${doc.kod}-${doc.rok}`;
    const d = docOf(doc.kod, doc.rok);
    if (!d) {
      // sken / chybějící text: zkus srovnávací (předchozí) sloupec v následující VZ téže ZP
      const dalsi = docOf(doc.kod, doc.rok + 1);
      if (dalsi) {
        const r = findValue(dalsi.index, e.hodnota);
        if (r.nalezeno) {
          polozky.push({ ...base, dokument: `${doc.kod}-${doc.rok + 1}`, nalezeno: true, pres_nasledujici_vz: true, jistota: r.jistota,
            meritko: r.meritko, pocet_shod: r.pocet, kontext: kontextKolem(dalsi.text, r.pozice, r.delka),
            poznamka: `VZ ${doc.rok} nemá text (${manStav(doc.kod, doc.rok) ?? 'není v manifestu'}); nalezeno v srovnávacím sloupci VZ ${doc.rok + 1}`,
            _d: dalsi, _r: r, _radek: e.radek });
          return;
        }
      }
      polozky.push({ ...base, dokument, nalezeno: 'bez-textu', duvod: `text VZ ${dokument} není k dispozici (manifest: ${manStav(doc.kod, doc.rok) ?? 'záznam chybí'})` });
      return;
    }
    const r = findValue(d.index, e.hodnota);
    polozky.push(r.nalezeno
      ? { ...base, dokument, nalezeno: true, jistota: r.jistota, meritko: r.meritko, pocet_shod: r.pocet, kontext: kontextKolem(d.text, r.pozice, r.delka), _d: d, _r: r, _radek: e.radek }
      : { ...base, dokument, nalezeno: false, jistota: r.jistota, pocet_shod: 0, kontext: null });
  };

  for (const zp of pojistovny.pojistovny ?? []) for (const e of collectEnvelopes(zp)) run(zp.kod, e);
  for (const zp of prevence?.pojistovny ?? []) for (const e of collectPrevence(zp)) run(zp.kod, e);
  potvrdRadky(polozky);
  for (const p of polozky) { delete p._d; delete p._r; delete p._radek; }

  const count = (arr, pred) => arr.filter(pred).length;
  const sum = (arr) => ({
    celkem: count(arr, (p) => p.nalezeno !== 'mimo-rozsah'),
    nalezeno: count(arr, (p) => p.nalezeno === true),
    nenalezeno: count(arr, (p) => p.nalezeno === false),
    bez_textu: count(arr, (p) => p.nalezeno === 'bez-textu'),
    mimo_rozsah: count(arr, (p) => p.nalezeno === 'mimo-rozsah'),
    jistota: {
      vysoka: count(arr, (p) => p.nalezeno === true && p.jistota === 'vysoka'),
      stredni: count(arr, (p) => p.nalezeno === true && p.jistota === 'stredni'),
      nizka: count(arr, (p) => p.nalezeno === true && p.jistota === 'nizka'),
    },
  });
  const per_zp = {};
  for (const kod of [...new Set(polozky.map((p) => p.kod))].sort()) {
    const mine = polozky.filter((p) => p.kod === kod);
    const dokumenty = [...new Set(mine.map((p) => p.dokument).filter(Boolean))].sort().map((d) => {
      const [k, r] = d.split('-');
      return { dokument: d, rok: Number(r), stav_manifestu: manStav(k, Number(r)), text: !!docOf(k, Number(r)) };
    });
    per_zp[kod] = { zkratka: zkratky[kod] ?? kod, ...sum(mine), dokumenty };
  }

  return {
    version: '1.0',
    generated_at: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    _doc: 'Výstup scripts/pojistovny-verify.js: každé číslo z data/pojistovny.json a data/pojistovny-prevence.json (fond prevence) hledané v textu výroční zprávy (ingest/manual/pojistovny/vz-text/). nalezeno: true = číslo je v textu VZ (tolerantně formát a tis./mil./mld.); false = VZ má text, číslo v něm není (signál pro redakci, ne chyba dat); "bez-textu" = sken nebo chybějící text; "mimo-rozsah" = zdroj není VZ (MZ hodnocení, sněmovní tisk, vlastní výpočet). souhrn.celkem = nalezeno + nenalezeno + bez_textu (bez mimo_rozsah). jistota (jen u nalezeno=true): "vysoka" = 5 a více platných číslic, nebo číslo z řádku tabulky potvrzené sousedním číslem téže položky (shoda_radku); "stredni" = 4 číslice; "nizka" = 3 a méně číslic — takové číslo je v textu VZ i náhodou, shoda je málo výpovědní.',
    souhrn: sum(polozky),
    per_zp,
    polozky,
  };
}

// ---------------------------------------------------------------------------------- CLI

function readJson(f, fallback = null) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; }
}

export function loadInputs() {
  const pojistovny = readJson(path.join(ROOT, 'data', 'pojistovny.json'));
  if (!pojistovny) throw new Error('data/pojistovny.json nenalezen nebo nečitelný');
  const prevence = readJson(path.join(ROOT, 'data', 'pojistovny-prevence.json'));
  const manifest = readJson(MANIFEST_FILE, { polozky: [] });
  const zdrojeHlavni = readJson(ZDROJE_VZ_2024, {})?.meta?.zdroje_hlavni ?? {};
  const loadText = (kod, rok) => {
    try { return fs.readFileSync(path.join(TEXT_DIR, `${kod}-${rok}.txt`), 'utf8'); } catch { return null; }
  };
  return { pojistovny, prevence, manifest, urlMap: buildUrlMap({ zdrojeHlavni, manifest }), loadText };
}

function printSummary(v) {
  const s = v.souhrn;
  console.log(`pojistovny-verify: ${s.celkem} ověřitelných čísel: ${s.nalezeno} nalezeno (jistota vysoká ${s.jistota.vysoka}, střední ${s.jistota.stredni}, nízká ${s.jistota.nizka}), ${s.nenalezeno} nenalezeno, ${s.bez_textu} bez textu; ${s.mimo_rozsah} mimo rozsah (zdroj není VZ)`);
  for (const [kod, z] of Object.entries(v.per_zp)) {
    console.log(`  ${kod} ${z.zkratka.padEnd(9)} nalezeno ${String(z.nalezeno).padStart(3)} · nenalezeno ${String(z.nenalezeno).padStart(3)} · bez textu ${String(z.bez_textu).padStart(3)} · mimo rozsah ${String(z.mimo_rozsah).padStart(3)}`);
  }
}

function main() {
  const dry = process.argv.includes('--dry');
  const v = verifyAll({ ...loadInputs() });
  printSummary(v);
  if (!dry) {
    fs.writeFileSync(OUT_FILE, JSON.stringify(v, null, 2) + '\n');
    console.log(`Zapsáno: ${path.relative(ROOT, OUT_FILE)}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
