// Gazetteer obcí ČR se souřadnicemi — podklad pro vyhledávání „napiš město“.
//
// PROČ TENHLE SOUBOR EXISTUJE: stránka pohotovostí stojí na jedné otázce —
// „kde jsem?“. Prohlížečová geolokace ji zodpoví u těch, kdo ji povolí; zbytek
// napíše název obce. K tomu je potřeba převést název na souřadnice, a to
// offline (žádné geokódovací API, žádný klíč, žádné odesílání polohy
// uživatele třetí straně — viz bezpečnostní pravidla projektu).
//
// ZDROJ: Wikidata SPARQL endpoint, třída „obec v Česku“ (Q5153359).
//   https://query.wikidata.org/sparql
// Proč ne ČSÚ/ČÚZK: číselník obcí ČSÚ (kód 43) souřadnice nevede vůbec
// a exportní endpointy apl.czso.cz i services.cuzk.gov.cz vracely 404;
// RÚIAN výměnný formát je gigabajtový ZIP s adresními místy, což je na
// jeden centroid obce nepřiměřené. Wikidata drží u každé obce kód RÚIAN
// (P782 jako LAU „CZxxxxxx“), takže záznamy jsou zpětně dohledatelné
// v oficiálním registru.
//
// Gazetteer NENÍ zdravotnická data — je to jen převodník název → souřadnice.
// Nepřesnost centroidu obce (stovky metrů) je pro řazení pohotovostí
// podle vzdálenosti nepodstatná.
//
// Výstup: data/obce-gps.json (kompaktní formát, viz níže)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { parseCsv } from '../lib/csv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT_FILE = path.resolve(ROOT, 'data', 'obce-gps.json');

const ENDPOINT = 'https://query.wikidata.org/sparql';

export const SPARQL = `SELECT ?obec ?nazev ?lat ?lon ?kod ?okresNazev WHERE {
  ?obec wdt:P31 wd:Q5153359 .
  ?obec p:P625/psv:P625 ?coord .
  ?coord wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  OPTIONAL { ?obec wdt:P782 ?kod . }
  OPTIONAL { ?obec wdt:P131 ?okres . ?okres rdfs:label ?okresNazev . FILTER(LANG(?okresNazev)="cs") }
  ?obec rdfs:label ?nazev . FILTER(LANG(?nazev)="cs")
}`;

/** Bounding box ČR — odfiltruje zjevně chybné souřadnice z Wikidat. */
export function inCzechia(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= 48.4 && lat <= 51.2 && lon >= 12.0 && lon <= 18.9;
}

/**
 * SPARQL vrací kartézský součin (obec × souřadnice × nadřazená jednotka),
 * takže jedna obec přijde i desetkrát. Sesypeme na jeden řádek na obec.
 *
 * @param {Array<Record<string,string>>} rows — rozparsované CSV z endpointu
 * @returns {Array<{name: string, lat: number, lon: number, okres: string|null, lau: string|null}>}
 */
export function dedupeObce(rows) {
  const byEntity = new Map();

  for (const r of rows) {
    const entity = String(r.obec ?? '').trim();
    const name = String(r.nazev ?? '').trim();
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    if (!entity || !name || !inCzechia(lat, lon)) continue;

    const existing = byEntity.get(entity);
    // „okres Kolín“ je použitelný rozlišovač, „Středočeský kraj“ ne —
    // duplicitních názvů obcí je v ČR přes 400 a okres je ta úroveň,
    // na které je člověk rozliší.
    const okresRaw = String(r.okresNazev ?? '').trim();
    const okres = /^okres\s/i.test(okresRaw) ? okresRaw.replace(/^okres\s+/i, '') : null;
    const lau = String(r.kod ?? '').trim() || null;

    if (!existing) {
      byEntity.set(entity, { name, lat, lon, okres, lau });
    } else {
      // Doplň, co v prvním řádku chybělo — pořadí řádků z endpointu není zaručené.
      if (!existing.okres && okres) existing.okres = okres;
      if (!existing.lau && lau) existing.lau = lau;
    }
  }

  const out = [...byEntity.values()];
  out.sort((a, b) => a.name.localeCompare(b.name, 'cs') || (a.okres ?? '').localeCompare(b.okres ?? '', 'cs'));
  return out;
}

/**
 * Kompaktní serializace: 6 250 obcí jako pole objektů má přes 700 kB,
 * jako pole polí s zaokrouhlenými souřadnicemi 280 kB. Stránka gazetteer
 * načítá líně (až když uživatel začne psát), ale i tak se to vyplatí.
 *
 * Formát: `["Beroun", 49.9638, 14.0721, "Beroun", "CZ531057"]`
 * 4 desetinná místa ≈ 11 m — na řazení podle vzdálenosti bohatě stačí.
 */
export function toCompact(obce) {
  return obce.map(o => [
    o.name,
    Number(o.lat.toFixed(4)),
    Number(o.lon.toFixed(4)),
    o.okres ?? '',
    o.lau ?? '',
  ]);
}

/**
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<{ count: number, file: string }>}
 */
export async function fetchObceGps(opts = {}) {
  const { fetchImpl } = opts;

  console.log('  [obce-gps] dotaz na Wikidata SPARQL…');
  const csv = await fetchWithRetry(`${ENDPOINT}?query=${encodeURIComponent(SPARQL)}`, {
    parse: 'text',
    fetchImpl,
    // Dotaz vrací ~12 tis. řádků a endpoint na něm stráví desítky sekund;
    // výchozích 30 s z lib/http.js na to nestačí.
    timeoutMs: 180_000,
    headers: {
      Accept: 'text/csv',
      'User-Agent': CONFIG.uzis.user_agent,
    },
  });

  const rows = parseCsv(csv);
  const obce = dedupeObce(rows);
  if (obce.length < 5000) {
    throw new Error(`[obce-gps] podezřele málo obcí: ${obce.length} (čekáno ~6 250) — endpoint asi ořízl odpověď`);
  }

  const payload = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    generator: 'ingest/fetchers/obce_gps.js',
    source: {
      name: 'Wikidata',
      url: ENDPOINT,
      query_class: 'Q5153359 (obec v Česku)',
      note: 'Centroidy obcí pro převod názvu na souřadnice. Kód LAU (P782) odkazuje na RÚIAN/ČSÚ.',
    },
    fields: ['name', 'lat', 'lon', 'okres', 'lau'],
    count: obce.length,
    obce: toCompact(obce),
  };

  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload)}\n`);
  console.log(`  [obce-gps] ${obce.length} obcí → data/obce-gps.json`);
  return { count: obce.length, file: OUT_FILE };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchObceGps().catch(err => {
    console.error('[obce-gps] FAIL:', err.message);
    process.exit(1);
  });
}
