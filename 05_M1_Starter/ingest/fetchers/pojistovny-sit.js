// Síť smluvních poskytovatelů per zdravotní pojišťovna × odbornost × kraj (PROTOTYP).
//
// PROČ DVA ZDROJE: registr NRPZS (ÚZIS, NR-01-06) zná poskytovatele, obor péče a adresu, ale NEZNÁ
// zdravotní pojišťovnu (ověřeno 2. 11. 2026: 49 sloupců, žádný odkaz na ZP). Vztah poskytovatel–ZP
// nese jiná datová sada téhož ÚZIS, odvozená z Národního registru hrazených zdravotních služeb:
// „Odvozený číselník IČZ dle údajů pojišťoven včetně historických hodnot“ (NR-04-64, CC BY 4.0):
// jeden záznam per ZP × IČZ s příznakem `smluvni_zarizeni`, IČO, adresou (RÚIAN) a platností.
// Odbornost v ní chybí (patří k IČP/pracovišti, ne k IČZ/zařízení), proto se spojuje s NRPZS
// přes IČO + adresní místo RÚIAN. Podrobně a s limity: docs/pojistovny-sit.md.
//
// CO JE JEDNOTKA: „místo poskytování z NRPZS s oborem X, které leží na IČO(+adrese) smluvního IČZ
// pojišťovny Y“. Je to HORNÍ ODHAD smluvního pracoviště odbornosti X: smlouva se uzavírá na odbornost
// pracoviště (IČP), IČZ je ale celé zařízení. U ordinací jednoho lékaře sedí, u poliklinik
// a nemocnic nadhodnocuje. Zdroj je navíc zastaralý (poslední stav 31. 12. 2024).
// Nejde o úvazky ani o počty lékařů (ty jsou v NR-02-01/02 jen celkem za všechny ZP, per ZP jen VZP).
//
// Výstup: data/pojistovny-sit.json  (schéma viz docs/pojistovny-sit.md, validátor validateSit()
//         v ingest/validate-pojistovny.js)
// Cache:  ingest/cache/nrpzs_raw.json (sdílená s uzis_nrpzs.js), ingest/cache/pojistovny_icz.json
//
// Spuštění: node ingest/fetchers/pojistovny-sit.js [--force]
// Slušnost ke zdroji: 2 stažení (NRPZS CSV 28 MB, číselník IČZ 68 MB), User-Agent projektu, 1 req/s.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { parseCsv } from '../lib/csv.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, '..', '..', 'data', 'pojistovny-sit.json');

export const ICZ_CSV_URL = 'https://data.mzcr.cz/data/distribuce/456/Otevrena-data-NR-04-64-ciselnik-icz-pojistovny-historicke.csv';
export const ICZ_PAGE_URL = 'https://www.nzip.cz/data/2430-ciselnik-icz-pojistovny-historicke-otevrena-data';
const RAW_NRPZS = 'nrpzs_raw.json';
const ICZ_CACHE = 'pojistovny_icz.json';

/** Referenční den: poslední den, k němuž číselník IČZ nese platnost záznamů (soubor z 6/2025). */
export const REF_DATE = '2024-12-31';
export const ZP_CODES = ['111', '201', '205', '207', '209', '211', '213'];

/**
 * Sledované odbornosti. `kod` = číselník VZP „Smluvní odbornosti pracovišť“ (č. 770, platí sdíleně pro
 * všechny ZP; ověřeno 2. 11. 2026), `obory` = přesné názvy oboru v NRPZS (ZZ_obor_pece, po `norm()`).
 * Pozor: kód 207 je zároveň kód OZP; v datech je odbornost vždy pod klíčem odbornosti, ZP pod klíčem ZP.
 */
export const ODBORNOSTI = [
  { kod: '001', nazev: 'Praktický lékař pro dospělé', obory: ['vseobecne prakticke lekarstvi'] },
  { kod: '002', nazev: 'Praktický lékař pro děti a dorost', obory: ['prakticke lekarstvi pro deti a dorost'] },
  { kod: '014', nazev: 'Zubní lékař', obory: ['zubni lekarstvi'] },
  { kod: '207', nazev: 'Alergologie a klinická imunologie', obory: ['alergologie a klinicka imunologie'] },
  { kod: '305', nazev: 'Psychiatrie', obory: ['psychiatrie'] },
  { kod: '404', nazev: 'Dermatovenerologie', obory: ['dermatovenerologie'] },
  { kod: '603', nazev: 'Gynekologie a porodnictví', obory: ['gynekologie a porodnictvi'] },
];

/** Bez diakritiky, malá písmena, jednotné mezery. */
export function norm(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Rozseká čárkou oddělený výčet oborů registru. */
export function splitObory(s) {
  return String(s ?? '').split(',').map(norm).filter(Boolean);
}

/** NRPZS obor (normalizovaný) → kód sledované odbornosti, nebo null. */
const OBOR_TO_KOD = new Map(ODBORNOSTI.flatMap(o => o.obory.map(n => [n, o.kod])));
export function oborToKod(oborNorm) {
  return OBOR_TO_KOD.get(oborNorm) ?? null;
}

/**
 * Z řádků číselníku IČZ nechá jen smluvní záznamy platné v referenční den.
 * Poslední verze záznamu (`posledni_zaznam`=1) se smluvním příznakem a platností do ref. dne (včetně
 * „rozšířené“ platnosti podle vykázané péče, viz metodika NR-04-64 § 1.4).
 * @returns {Array<{zp:string, icz:string, ico:string, ruian:string, okres:string}>}
 */
export function filterContractRows(rows, refDate = REF_DATE) {
  const out = [];
  for (const r of rows) {
    if (String(r.posledni_zaznam) !== '1') continue;
    if (String(r.smluvni_zarizeni) !== '1') continue;
    if (!ZP_CODES.includes(String(r.CPO))) continue;
    if (!r.plat_do_rozsirena || r.plat_do_rozsirena < refDate) continue;
    if (r.plat_od_rozsirena && r.plat_od_rozsirena > refDate) continue;
    const ico = String(r.ICO ?? '').trim();
    if (!ico || /^0+$/.test(ico)) continue;
    out.push({
      zp: String(r.CPO),
      icz: String(r.ICZ),
      ico,
      ruian: String(r.adresa_RUIAN ?? '').trim(),
      okres: String(r.okres_RUIAN || r.okres || '').trim(),
    });
  }
  return out;
}

/**
 * Agregace: počet míst poskytování z NRPZS s oborem sledované odbornosti, která patří ke smluvnímu IČZ
 * dané ZP, po krajích; plus celkové počty míst v registru (bez ohledu na smlouvu) jako jmenovatel.
 *
 * Párování IČZ → místo NRPZS (nejpřísnější první):
 *  1. `adresa`  — shoda IČO + RÚIAN kód adresního místa;
 *  2. `okres`   — shoda IČO + okres (IČZ bez adresního místa, nebo adresa v NRPZS jiná);
 *  3. `jediny`  — IČO má v NRPZS právě jedno místo;
 *  jinak IČZ zůstává nepřiřazeno (`nepriraditelne`) a do matice se nezapočítá.
 * Místo se každé ZP počítá nejvýše jednou, i když na něm leží víc IČZ.
 *
 * @param {Array<Record<string,string>>} places — řádky NRPZS (NR-01-06)
 * @param {ReturnType<typeof filterContractRows>} contracts
 */
export function aggregateSit(places, contracts) {
  const kraje = new Map(); // kód → název
  const byIcoRuian = new Map();
  const byIco = new Map();
  const placeKod = []; // per místo: pole kódů sledovaných odborností
  const placeKraj = [];

  places.forEach((p, i) => {
    const kod = new Set(splitObory(p.ZZ_obor_pece).map(oborToKod).filter(Boolean));
    placeKod[i] = [...kod];
    const kr = p.ZZ_kraj_kod || '';
    placeKraj[i] = kr;
    if (kr) kraje.set(kr, p.ZZ_kraj_nazev || kr);
    const ico = String(p.poskytovatel_ICO ?? '').trim();
    if (!ico) return;
    const k = `${ico}|${String(p.ZZ_RUIAN_kod ?? '').trim()}`;
    if (!byIcoRuian.has(k)) byIcoRuian.set(k, []);
    byIcoRuian.get(k).push(i);
    if (!byIco.has(ico)) byIco.set(ico, []);
    byIco.get(ico).push(i);
  });

  const celkem_cr = {};
  const matice = {};
  for (const o of ODBORNOSTI) celkem_cr[o.kod] = {};
  for (const zp of ZP_CODES) {
    matice[zp] = {};
    for (const o of ODBORNOSTI) matice[zp][o.kod] = {};
  }
  places.forEach((_, i) => {
    for (const kod of placeKod[i]) {
      const kr = placeKraj[i];
      if (!kr) continue;
      celkem_cr[kod][kr] = (celkem_cr[kod][kr] || 0) + 1;
    }
  });

  const kvalita = {};
  const placesByZp = {};
  for (const zp of ZP_CODES) {
    kvalita[zp] = { icz_smluvni: 0, adresa: 0, okres: 0, jediny: 0, nepriraditelne: 0 };
    placesByZp[zp] = new Set();
  }
  // okres místa NRPZS: ZZ_okres_kod (CZ0315); ZP uvádí NUTS4 stejného tvaru, u Prahy někdy CZ0106 vs CZ0100.
  const okresOf = (i) => String(places[i].ZZ_okres_kod || '');
  const samePrahaOrOkres = (a, b) => a === b || (a.startsWith('CZ010') && b.startsWith('CZ010'));

  for (const c of contracts) {
    const q = kvalita[c.zp];
    if (!q) continue;
    q.icz_smluvni++;
    let hit = c.ruian ? byIcoRuian.get(`${c.ico}|${c.ruian}`) : null;
    let level = 'adresa';
    if (!hit?.length) {
      const all = byIco.get(c.ico) || [];
      const inOkres = c.okres ? all.filter(i => samePrahaOrOkres(okresOf(i), c.okres)) : [];
      if (inOkres.length) { hit = inOkres; level = 'okres'; }
      else if (all.length === 1) { hit = all; level = 'jediny'; }
      else hit = null;
    }
    if (!hit?.length) { q.nepriraditelne++; continue; }
    q[level]++;
    for (const i of hit) placesByZp[c.zp].add(i);
  }

  for (const zp of ZP_CODES) {
    for (const i of placesByZp[zp]) {
      const kr = placeKraj[i];
      if (!kr) continue;
      for (const kod of placeKod[i]) matice[zp][kod][kr] = (matice[zp][kod][kr] || 0) + 1;
    }
  }

  return {
    kraje: [...kraje.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([kod, nazev]) => ({ kod, nazev })),
    matice,
    celkem_cr,
    kvalita,
    mist_nrpzs: places.length,
  };
}

/** Sestaví finální dokument pro data/pojistovny-sit.json. */
export function buildDocument(agg, { generatedAt = new Date().toISOString(), nrpzsModified = null, iczModified = null } = {}) {
  return {
    version: '0.1-prototyp',
    generated_at: generatedAt,
    stav: 'prototyp',
    zdroj: {
      nrpzs: { nazev: 'NRPZS · Místa poskytování zdravotních služeb (NR-01-06)', url: CONFIG.uzis.nrpzs_opendata_csv, licence: 'https://data.gov.cz/podmínky-užití/volný-přístup/', aktualizace: nrpzsModified },
      icz: { nazev: 'NRHZS · Odvozený číselník IČZ dle údajů pojišťoven včetně historických hodnot (NR-04-64)', url: ICZ_PAGE_URL, soubor: ICZ_CSV_URL, licence: 'CC BY 4.0', aktualizace: iczModified },
      odbornosti: 'VZP · Číselník smluvních odborností pracovišť č. 770 (https://www.vzp.cz/poskytovatele/ciselniky/smluvni-odbornosti-pracovist)',
    },
    rok: Number(REF_DATE.slice(0, 4)),
    ref_datum: REF_DATE,
    jednotka: 'místa poskytování z NRPZS s oborem odbornosti, která leží na IČO (adrese) smluvního IČZ pojišťovny — horní odhad smluvních pracovišť, ne úvazky ani lékaři',
    metoda: [
      'IČZ pojišťovny: poslední záznam s příznakem smluvni_zarizeni=1 a platností k 31. 12. 2024 (vč. platnosti rozšířené podle vykázané péče).',
      'Párování IČZ → místo NRPZS: 1) IČO + RÚIAN adresní místo, 2) IČO + okres, 3) IČO s jediným místem v NRPZS; ostatní nepřiřazeno (viz kvalita).',
      'Odbornost místa: obory NRPZS (ZZ_obor_pece) přemapované na kódy číselníku VZP 770; místo s více obory se počítá do každé sledované odbornosti.',
      'Smlouva se uzavírá na odbornost pracoviště (IČP), číselník nese jen zařízení (IČZ): u poliklinik a nemocnic je odhad nadhodnocený.',
    ],
    odbornosti: ODBORNOSTI.map(({ kod, nazev }) => ({ kod, nazev })),
    kraje: agg.kraje,
    matice: agg.matice,
    celkem_cr: agg.celkem_cr,
    kvalita: agg.kvalita,
    mist_nrpzs: agg.mist_nrpzs,
  };
}

async function headModified(url, fetchImpl = globalThis.fetch) {
  try {
    const res = await fetchImpl(url, { method: 'HEAD', headers: { 'User-Agent': CONFIG.uzis.user_agent } });
    return res.headers.get('last-modified');
  } catch {
    return null;
  }
}

/** Hlavní pipeline: stáhne (nebo vezme z cache), agreguje, zapíše data/pojistovny-sit.json. */
export async function fetchPojistovnySit(opts = {}) {
  const { force = false, fetchImpl, outFile = OUT_FILE } = opts;

  let places = force ? null : readCacheIfFresh(RAW_NRPZS, 24 * 7);
  if (!places) {
    console.log(`  [sit] stahuji NRPZS ${CONFIG.uzis.nrpzs_opendata_csv}`);
    const csv = await fetchWithRetry(CONFIG.uzis.nrpzs_opendata_csv, { parse: 'text', timeoutMs: 120_000, fetchImpl });
    places = parseCsv(csv);
    writeCache(RAW_NRPZS, places);
  } else {
    console.log('  [sit] NRPZS z cache');
  }

  let contracts = force ? null : readCacheIfFresh(ICZ_CACHE, 24 * 7);
  if (!contracts) {
    await new Promise(r => setTimeout(r, 1000)); // max 1 req/s
    console.log(`  [sit] stahuji číselník IČZ ${ICZ_CSV_URL}`);
    const csv = await fetchWithRetry(ICZ_CSV_URL, { parse: 'text', timeoutMs: 300_000, fetchImpl });
    contracts = filterContractRows(parseCsv(csv));
    writeCache(ICZ_CACHE, contracts);
  } else {
    console.log('  [sit] číselník IČZ z cache');
  }

  const agg = aggregateSit(places, contracts);
  const doc = buildDocument(agg, {
    nrpzsModified: await headModified(CONFIG.uzis.nrpzs_opendata_csv, fetchImpl),
    iczModified: await headModified(ICZ_CSV_URL, fetchImpl),
  });
  fs.writeFileSync(outFile, JSON.stringify(doc, null, 2) + '\n');
  console.log(`  [sit] ${agg.mist_nrpzs} míst NRPZS, ${contracts.length} smluvních IČZ → ${path.relative(process.cwd(), outFile)}`);
  return doc;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchPojistovnySit({ force: process.argv.includes('--force') }).catch(err => {
    console.error('[pojistovny-sit] FAIL:', err.message);
    process.exit(1);
  });
}
