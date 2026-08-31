// ÚZIS · NRPZS fetcher — pohotovostní a neodkladná péče.
//
// Zdroj: stejná open-data distribuce jako `uzis_nrpzs.js`
//   https://datanzis.uzis.gov.cz/data/NR-01-NRPZS/NR-01-06/Otevrena-data-NR-01-06-nrpzs-mista-poskytovani-zdravotnich-sluzeb.csv
// (Národní registr poskytovatelů zdravotních služeb, ~41 tis. míst poskytování,
//  měsíční aktualizace.)
//
// PROČ SAMOSTATNÝ FETCHER: `uzis_nrpzs.js` dělá agregát kraj × obor pro
// indikátory. Tady potřebujeme opak — jednotlivé řádky s adresou, GPS
// a kontaktem, filtrované na pohotovostní péči. Sdílené je jen CSV
// (obě větve čtou stejnou cache `nrpzs_raw.json`, takže se netahá dvakrát).
//
// CO REGISTR UMÍ A NEUMÍ — klíčové pro poctivost stránky:
//   ✅ KDO má oprávnění pohotovost provozovat, KDE (adresa + GPS), kontakt.
//   ❌ KDY má otevřeno. NRPZS provozní dobu nevede vůbec. Ordinační hodiny
//      LPS jsou roztroušené po webech krajů, nemocnic a zdravotních pojišťoven,
//      každý v jiném formátu, žádný z nich strojově čitelný.
//   → Provozní doba přichází z ručně ověřovaného overlaye
//     `data/pohotovosti-hodiny.json`; join dělá `ingest/transform_pohotovosti.js`.
//
// Výstupy:
//   ingest/cache/nrpzs_raw.json           — sdílená raw cache (shodná s uzis_nrpzs.js)
//   ingest/cache/pohotovosti_places.json  — vyfiltrovaná místa pohotovostní péče
//   ingest/cache/nrpzs_geo_index.json     — adresní index CELÉHO registru pro
//                                           geokódování seznamu VZP (ten souřadnice nemá)

import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { parseCsv } from '../lib/csv.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';
import { buildAddressGeoIndex } from '../lib/pohotovosti-geo.js';

const RAW_CACHE = 'nrpzs_raw.json';
const OUT_CACHE = 'pohotovosti_places.json';
const GEO_CACHE = 'nrpzs_geo_index.json';

/** Kategorie pohotovostní péče, jak je stránka nabízí uživateli. */
export const CATEGORIES = {
  lps_dospeli: 'Lékařská pohotovostní služba pro dospělé',
  lps_deti: 'Lékařská pohotovostní služba pro děti a dorost',
  zubni: 'Zubní (stomatologická) pohotovost',
  chirurgicka: 'Chirurgická a úrazová akutní péče',
  urgentni_prijem: 'Urgentní příjem nemocnice',
  lekarna: 'Lékárenská pohotovostní služba',
  zzs: 'Zdravotnická záchranná služba (výjezdová základna)',
  denni_ambulance: 'Chirurgická nebo úrazová ambulance nemocnice',
};

/** Diakritiku a velikost písmen z porovnávání pryč — registr je psaný nejednotně. */
export function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rozseká čárkou oddělený výčet registru na položky. */
export function splitList(s) {
  return String(s ?? '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

/** Přesné názvy oborů z číselníku NRPZS — pozor na podobory. */
const OBOR_ZUBNI = 'zubni lekarstvi';
const OBORY_DETSKE = ['prakticke lekarstvi pro deti a dorost', 'detske lekarstvi'];

/**
 * Zařadí jeden řádek NRPZS do kategorií pohotovostní péče.
 *
 * Registr nemá jedno pole „tohle je pohotovost“ — signál je rozprostřený:
 *   - ZZ_druh_nazev / _sekundarni  → „Zařízení LPS“ (druh 380), „Výjezdová skupina záchranné služby“ (483)
 *   - ZZ_rozsah_pece               → volný text, kde bývá „lékařská pohotovostní služba
 *                                     pro dospělé“, „urgentní příjem“, „pohotovostní
 *                                     služba v oboru zubní lékařství“ (a spousta překlepů)
 *   - ZZ_druh_pece                 → „zdravotnická záchranná služba“, „lékárenská péče“
 *   - ZZ_obor_pece                 → registrované obory místa poskytování
 *
 * Ke každé kategorii vrací i sílu důkazu:
 *   'registr'   — registr to takhle přímo pojmenovává (druh 380, text v rozsahu péče)
 *   'odvozeno'  — dovodili jsme z kombinace druhu zařízení, formy péče a oborů
 *
 * Rozlišení je podstatné: u odvozených záznamů stránka říká „podle registru
 * tady akutní péče je, ale že jde o pohotovost, jsme dovodili“ — ne „je tu
 * pohotovost“. Registr sám pohotovosti jako síť nikde nevede.
 *
 * POZOR na podobory: nemocnice, která je „Zařízení LPS“, má v ZZ_obor_pece
 * vypsané VŠECHNY své obory. „dětská endokrinologie“ proto nesmí zakládat
 * dětskou pohotovost — musí tam být přímo „praktické lékařství pro děti
 * a dorost“ nebo „dětské lékařství“. Bez toho vycházelo 91 dětských LPS
 * místo reálných ~30.
 *
 * @param {Record<string,string>} r — řádek CSV
 * @returns {Record<string, 'registr'|'odvozeno'>}
 */
export function classifyPlace(r) {
  const nazev = norm(r.ZZ_nazev);
  const druh = norm(r.ZZ_druh_nazev);
  const sekundarni = norm(r.ZZ_druh_nazev_sekundarni);
  const rozsah = norm(r.ZZ_rozsah_pece);
  const obory = splitList(r.ZZ_obor_pece).map(norm);
  const forma = norm(r.ZZ_forma_pece);
  const druhPece = norm(r.ZZ_druh_pece);

  /** @type {Record<string,'registr'|'odvozeno'>} */
  const out = {};
  // 'registr' nikdy nepřepsat na 'odvozeno' — tvrdší důkaz vyhrává.
  const mark = (cat, evidence) => {
    if (out[cat] !== 'registr') out[cat] = evidence;
  };

  // „Zařízení LPS“ je jediný tvrdý příznak v číselníku druhů (kód 380);
  // u nemocnic bývá schovaný v sekundárním výčtu druhů.
  const zarizeniLps = /zarizeni lps/.test(druh) || /zarizeni lps/.test(sekundarni);

  // POZOR: „lékárenská pohotovostní služba“ (noční výdej léků) NENÍ lékařská
  // pohotovost. V ZZ_rozsah_pece se obojí mísí a bez tohohle rozlišení by se
  // do LPS napočítaly desítky lékáren.
  const lekarenskaPohotovost = /lekarensk\w* pohotov/.test(rozsah);
  const lekarskaPohotovost =
    /lekarsk\w* pohotov|pohotovostni sluzb|pohotovsotni|lspp/.test(rozsah)
    && !lekarenskaPohotovost;

  const chirurgickeObory = ['chirurgie', 'detska chirurgie', 'traumatologie', 'ortopedie a traumatologie pohyboveho ustroji', 'urazova chirurgie'];

  const dentalOnly = obory.length > 0 && obory.every(o => o === OBOR_ZUBNI);
  const maZubniObor = obory.includes(OBOR_ZUBNI);
  const maDetskyObor = OBORY_DETSKE.some(o => obory.includes(o));
  const detskeOnly = obory.length > 0 && obory.every(o => OBORY_DETSKE.includes(o));

  // ── Lékárenská pohotovost ────────────────────────────────────────────
  if (lekarenskaPohotovost && (/lekarensk/.test(druhPece) || /lekarna/.test(druh) || /lekarna/.test(nazev))) {
    mark('lekarna', 'registr');
  }

  // ── Zubní pohotovost ─────────────────────────────────────────────────
  const zubniText = /pohotovostni sluzb\w* v oboru zubni|zubni pohotov|stomatologick\w* pohotov|lspp zubni|lps zubni|zubni lspp|zubni lps/;
  if (zubniText.test(rozsah) || zubniText.test(nazev)) mark('zubni', 'registr');
  else if (zarizeniLps && maZubniObor) mark('zubni', 'odvozeno');

  // ── LPS pro děti a dorost ────────────────────────────────────────────
  const detskyText = /pro deti a dorost|pro deti\b|detsk\w* pohotov|detske lspp/;
  if (lekarskaPohotovost && detskyText.test(rozsah)) mark('lps_deti', 'registr');
  else if (detskyText.test(nazev) && /pohotov|lspp|lps\b/.test(nazev)) mark('lps_deti', 'registr');
  else if (zarizeniLps && maDetskyObor) mark('lps_deti', 'odvozeno');

  // ── LPS pro dospělé ──────────────────────────────────────────────────
  // Registr u dospělé LPS bývá mlčenlivý — je to ta „výchozí“ varianta.
  // Kdo je Zařízení LPS a není výhradně zubní ani výhradně dětský, slouží dospělým.
  const jenDetskaZminka = detskyText.test(rozsah) && !/pro dospele/.test(rozsah);
  if (lekarskaPohotovost && !dentalOnly && !jenDetskaZminka) mark('lps_dospeli', 'registr');
  else if (zarizeniLps && !dentalOnly && !detskeOnly) mark('lps_dospeli', 'odvozeno');

  // ── Urgentní příjem ──────────────────────────────────────────────────
  const akutniLuzka = /akutni luzkova pece/.test(forma);
  if (/urgentni prijem|urgent typu|urgentniho prijmu/.test(rozsah)) mark('urgentni_prijem', 'registr');
  else if (obory.includes('urgentni medicina') && akutniLuzka) mark('urgentni_prijem', 'odvozeno');

  // ── Chirurgická / úrazová akutní péče ────────────────────────────────
  // Vždy odvozená: nemocnice, která má akutní lůžka a chirurgický obor, drží
  // nepřetržitou úrazovou ambulanci. Registr to takhle nepojmenovává.
  if (akutniLuzka && chirurgickeObory.some(o => obory.includes(o))) mark('chirurgicka', 'odvozeno');

  // ── Denní chirurgická / úrazová ambulance nemocnice ──────────────────
  // Kdo tohle potřebuje: pohotovost podle zákona slouží až PO ordinačních
  // hodinách, takže v pondělí dopoledne nemá otevřeno. S naraženou rukou
  // se tehdy chodí do chirurgické ambulance nemocnice — a ta v seznamu
  // pohotovostí není, protože pohotovost to formálně není.
  //
  // Konkrétní případ, který to odhalil: Nemocnice Mariánské Lázně má
  // chirurgickou ambulanci i LPS, ale NEMÁ akutní lůžka, takže do kategorie
  // `chirurgicka` (akutní nemocnice) nespadá. Uživateli v Mariánských Lázních
  // pak stránka v deset dopoledne nabídla nejbližší otevřenou pohotovost
  // v Praze, 115 km daleko, místo nemocnice 470 metrů od něj.
  //
  // Omezeno na NEMOCNICE (druh 101–105) schválně: „chirurgie + ambulantní
  // péče“ samo o sobě sedí i na soukromou laserovou kliniku nebo ordinaci
  // jednoho chirurga, kam se s úrazem bez objednání nechodí.
  const nemocnice = ['101', '102', '103', '105'].includes(String(r.ZZ_druh_kod ?? '').trim());
  const ambulantni = /ambulantni pece/.test(forma);
  if (nemocnice && ambulantni && chirurgickeObory.some(o => obory.includes(o))) {
    mark('denni_ambulance', 'odvozeno');
  }

  // ── Zdravotnická záchranná služba ────────────────────────────────────
  if (/zdravotnicka zachranna sluzba/.test(druhPece) || /vyjezdova skupina zachranne/.test(druh)) {
    mark('zzs', 'registr');
  }

  return out;
}

/**
 * NRPZS ukládá souřadnice jako WKT `POINT(lat lon)` — pozor, je to
 * POINT(šířka délka), tedy prohozeně proti standardnímu WKT POINT(x y).
 * Ověřeno na Českých Budějovicích: POINT(48.959 14.470) = 48,96 N / 14,47 E.
 * @returns {{lat: number, lon: number} | null}
 */
export function parseGps(wkt) {
  const m = /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i.exec(String(wkt ?? ''));
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  // Hrubý sanity check na bounding box ČR — chrání před prohozenými osami
  // i před nulovými souřadnicemi, kterých je v registru pár desítek.
  if (!(lat >= 48.4 && lat <= 51.2) || !(lon >= 12.0 && lon <= 18.9)) return null;
  return { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
}

/** Telefon do tvaru +420xxxxxxxxx; nesmyslné hodnoty zahodí. */
export function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (!digits) return null;
  const compact = digits.startsWith('+') ? digits : (digits.length === 9 ? `+420${digits}` : digits);
  if (!/^\+\d{9,15}$/.test(compact)) return null;
  return compact;
}

/** Poskládá adresu z rozdrobených polí registru. */
export function formatAddress(r) {
  const ulice = [r.ZZ_ulice, r.ZZ_cislo_domovni_orientacni].map(s => String(s ?? '').trim()).filter(Boolean).join(' ');
  const obec = String(r.ZZ_obec ?? '').trim();
  const psc = String(r.ZZ_PSC ?? '').trim().replace(/(\d{3})(\d{2})/, '$1 $2');
  return [ulice, [psc, obec].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

/** Stabilní id místa — ZZ_ID je primární klíč registru a mezi měsíci se nemění. */
export function placeId(r) {
  return `nrpzs-${String(r.ZZ_ID ?? r.ZZ_misto_poskytovani_ID ?? '').trim()}`;
}

/**
 * Z celého CSV vytáhne místa pohotovostní péče v normalizovaném tvaru.
 * @param {Array<Record<string,string>>} rows
 * @returns {Array<object>}
 */
export function extractEmergencyPlaces(rows) {
  const out = [];
  const seen = new Set();

  for (const r of rows) {
    const evidence = classifyPlace(r);
    const categories = Object.keys(evidence).sort();
    if (!categories.length) continue;

    const id = placeId(r);
    if (!id || id === 'nrpzs-' || seen.has(id)) continue;
    seen.add(id);

    const gps = parseGps(r.ZZ_GPS);

    out.push({
      id,
      nrpzs_id: String(r.ZZ_ID ?? '').trim() || null,
      ico: String(r.poskytovatel_ICO ?? '').trim() || null,
      name: String(r.ZZ_nazev ?? '').trim(),
      provider: String(r.poskytovatel_nazev ?? '').trim() || null,
      categories,
      // Síla důkazu na kategorii: 'registr' = registr to tak přímo pojmenovává,
      // 'odvozeno' = dovodili jsme z druhu zařízení + formy péče + oborů.
      // Stránka to čtenáři říká; bez toho by odvozená chirurgie vypadala
      // stejně spolehlivě jako registrovaná LPS.
      evidence,
      kraj_code: String(r.ZZ_kraj_kod ?? '').trim() || null,
      kraj: String(r.ZZ_kraj_nazev ?? '').trim() || null,
      okres_code: String(r.ZZ_okres_kod ?? '').trim() || null,
      okres: String(r.ZZ_okres_nazev ?? '').trim() || null,
      orp: String(r.ZZ_ORP_nazev ?? '').trim() || null,
      obec: String(r.ZZ_obec ?? '').trim() || null,
      address: formatAddress(r),
      psc: String(r.ZZ_PSC ?? '').trim() || null,
      lat: gps?.lat ?? null,
      lon: gps?.lon ?? null,
      phone: normalizePhone(r.poskytovatel_telefon),
      email: String(r.poskytovatel_email ?? '').trim() || null,
      web: String(r.poskytovatel_web ?? '').trim() || null,
      scope_raw: String(r.ZZ_rozsah_pece ?? '').trim() || null,
    });
  }

  // Determinismus: stejný vstup → stejné pořadí → čitelný git diff.
  out.sort((a, b) => (a.kraj_code ?? '').localeCompare(b.kraj_code ?? '', 'cs')
    || (a.obec ?? '').localeCompare(b.obec ?? '', 'cs')
    || a.id.localeCompare(b.id));
  return out;
}

/**
 * Hlavní vstupní bod fetcheru.
 * @param {{ force?: boolean, fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<{ places: Array<object>, fromCache: boolean }>}
 */
export async function fetchPohotovosti(opts = {}) {
  const { force = false, fetchImpl } = opts;

  let raw = force ? null : readCacheIfFresh(RAW_CACHE);
  let fromCache = raw != null;

  if (!raw) {
    const url = CONFIG.uzis.nrpzs_opendata_csv;
    console.log(`  [pohotovosti] fetching ${url}`);
    const csv = await fetchWithRetry(url, { parse: 'text', fetchImpl });
    raw = parseCsv(csv);
    writeCache(RAW_CACHE, raw);
  } else {
    console.log('  [pohotovosti] using fresh cache');
  }

  const rows = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
  const places = extractEmergencyPlaces(rows);

  const byCategory = {};
  for (const p of places) {
    for (const c of p.categories) {
      byCategory[c] ??= { registr: 0, odvozeno: 0 };
      byCategory[c][p.evidence[c]] += 1;
    }
  }

  // Adresní index staví nad VŠEMI místy registru, ne jen nad pohotovostmi:
  // budovu nemocnice zná registr i z jejích ostatních ambulancí a seznam VZP
  // se na registr nedá napojit jinak než adresou (jeho kód je IČZ, ne IČO).
  const geoIndex = buildAddressGeoIndex(rows);
  writeCache(GEO_CACHE, geoIndex);
  console.log(`  [pohotovosti] adresní index: ${Object.keys(geoIndex).length} klíčů`);

  writeCache(OUT_CACHE, {
    generated_at: new Date().toISOString(),
    source: CONFIG.uzis.nrpzs_opendata_csv,
    total: places.length,
    by_category: byCategory,
    places,
  });

  console.log(`  [pohotovosti] ${places.length} míst; kategorie: ${JSON.stringify(byCategory)}`);
  console.log(`  [pohotovosti] bez GPS: ${places.filter(p => p.lat == null).length}`);
  return { places, fromCache };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchPohotovosti({ force: process.argv.includes('--force') }).catch(err => {
    console.error('[pohotovosti] FAIL:', err.message);
    process.exit(1);
  });
}
