// Sloučení tří zdrojů o pohotovostech do jednoho datového kontraktu pro web.
//
// VSTUPY (každý umí něco jiného, žádný neumí všechno):
//
//   ingest/cache/vzp_pohotovosti.json     VZP · celostátní seznam
//     ✅ ordinační doba po dnech, typ služby, telefon, celá ČR
//     ❌ souřadnice; kód místa je IČZ (číslo zařízení u pojišťovny), ne IČO,
//        takže na registr se dá napojit jen přes adresu
//
//   ingest/cache/pohotovosti_places.json  ÚZIS NRPZS · registr poskytovatelů
//     ✅ souřadnice, přesná adresa, kraj/okres/ORP, urgentní příjmy a ZZS
//     ❌ ordinační doba (registr ji nevede vůbec)
//
//   ingest/cache/nrpzs_geo_index.json     ÚZIS NRPZS · adresní index celého registru
//     ✅ souřadnice budovy pro adresu ze seznamu VZP
//
//   ingest/cache/kraje_pohotovosti.json   4 kraje · otevřená data
//     ✅ popis místa v areálu, souřadnice od kraje, rozpisy zubních služeb
//     ❌ pokrývá 4 ze 14 krajů a od 1. 1. 2026 nemusí být udržované
//
//   data/obce-gps.json                    gazetteer obcí
//     ✅ záchranná síť pro geokódování, když adresa na registr nesedí
//
// VÝSTUP: data/pohotovosti.json — jediný soubor, který frontend čte.
//
// PRAVIDLO PŘEDNOSTI: ordinační doba vždy z VZP (od 1. 1. 2026 pohotovosti
// organizují pojišťovny, zákon č. 290/2025 Sb.), krajská data jen doplňují
// to, co VZP nemá. U každého údaje zůstává v datech, odkud je — stránka pak
// nemusí předstírat, že jde o jeden hladký zdroj.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from './fetchers/nrpzs_pohotovosti.js';
import { evaluateMinimum, makeHours } from './lib/pohotovosti-hours.js';
import { geocodeAddress } from './lib/pohotovosti-geo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.resolve(ROOT, process.env.HSPA_CACHE_DIR ?? 'ingest/cache');
const OUT_FILE = path.resolve(ROOT, 'data', 'pohotovosti.json');
// Akutní vrstva z registru (urgentní příjmy, akutní chirurgie, základny ZZS)
// jde do vlastního souboru — je to skoro 500 záznamů, které naprostá většina
// návštěv nepotřebuje. Stránka si je dotáhne, až když o ně uživatel požádá.
const OUT_ACUTE_FILE = path.resolve(ROOT, 'data', 'pohotovosti-akutni.json');
const SOURCES_FILE = path.resolve(__dirname, 'mapping', 'pohotovosti_zdroje.json');
const ONLINE_FILE = path.resolve(__dirname, 'mapping', 'pohotovosti_online.json');

/** Kraje podle názvu → NUTS-3, ať se dá joinovat napříč zdroji. */
export const KRAJ_CODE_BY_NAME = {
  'hlavni mesto praha': 'CZ010',
  praha: 'CZ010',
  'stredocesky kraj': 'CZ020',
  'jihocesky kraj': 'CZ031',
  'plzensky kraj': 'CZ032',
  'karlovarsky kraj': 'CZ041',
  'ustecky kraj': 'CZ042',
  'liberecky kraj': 'CZ051',
  'kralovehradecky kraj': 'CZ052',
  'kralovehradecky': 'CZ052',
  'pardubicky kraj': 'CZ053',
  'kraj vysocina': 'CZ063',
  vysocina: 'CZ063',
  'jihomoravsky kraj': 'CZ064',
  'olomoucky kraj': 'CZ071',
  'zlinsky kraj': 'CZ072',
  'moravskoslezsky kraj': 'CZ080',
};

export function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Název kraje (v libovolném zdrojovém tvaru) → NUTS-3 kód. */
export function krajCode(name) {
  const key = norm(name);
  if (KRAJ_CODE_BY_NAME[key]) return KRAJ_CODE_BY_NAME[key];
  // „Královehradecký“ bez čárky nad e, „Kraj Vysočina“ vs „Vysočina“ apod.
  const hit = Object.keys(KRAJ_CODE_BY_NAME).find(k => k.includes(key) || key.includes(k));
  return hit ? KRAJ_CODE_BY_NAME[hit] : null;
}

/**
 * Z adresy vytáhne PSČ a obec.
 * „Na Františku 847/8, 11000 Praha 1“ → { psc: '11000', obec: 'Praha 1' }
 * „Vrchlického 5, Třeboň, 379 01“     → { psc: '37901', obec: 'Třeboň' }
 */
export function splitAddress(address) {
  const s = String(address ?? '').trim();
  if (!s) return { psc: null, obec: null, street: null };

  const pscMatch = /(\d{3})\s?(\d{2})/.exec(s);
  const psc = pscMatch ? `${pscMatch[1]}${pscMatch[2]}` : null;

  const parts = s.split(',').map(p => p.trim()).filter(Boolean);
  const street = parts[0] ?? null;

  // Obec je to, co v segmentu s PSČ zbude po odečtení PSČ; když PSČ stojí
  // v samostatném segmentu (jihočeský zápis), je obec segment před ním.
  let obec = null;
  for (const part of parts.slice(1)) {
    const withoutPsc = part.replace(/\d{3}\s?\d{2}/, '').trim();
    if (withoutPsc) { obec = withoutPsc; break; }
  }
  if (!obec && parts.length >= 2) obec = parts[parts.length - 2];

  return { psc, obec, street };
}

/** Gazetteer: název obce → souřadnice (kompaktní pole z obce-gps.json). */
export function buildGazetteer(payload) {
  const byName = new Map();
  for (const [name, lat, lon, okres] of payload?.obce ?? []) {
    const key = norm(name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push({ name, lat, lon, okres });
  }
  return byName;
}

/**
 * Geokóduje obec; při shodě názvu rozhodne okres.
 * Praha 4, Brno-střed apod. gazetteer nemá — spadne to na základní název.
 */
export function geocodeObec(gazetteer, obec, okres) {
  if (!obec) return null;
  const tryKeys = [norm(obec)];
  // „Praha 4“ → „Praha“, „Brno-Židenice“ → „Brno“
  const base = norm(obec).replace(/[\s-]+\d+$/, '').split('-')[0].trim();
  if (base && base !== tryKeys[0]) tryKeys.push(base);

  for (const key of tryKeys) {
    const hits = gazetteer.get(key);
    if (!hits?.length) continue;
    if (hits.length === 1) return { ...hits[0], exact: key === tryKeys[0] };
    const byOkres = hits.find(h => okres && norm(h.okres) === norm(okres));
    return { ...(byOkres ?? hits[0]), exact: key === tryKeys[0] };
  }
  return null;
}

function readCache(name) {
  const file = path.resolve(CACHE_DIR, name);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Telefon do jednotného tvaru +420xxxxxxxxx. */
export function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (!digits) return null;
  const compact = digits.startsWith('+') ? digits : (digits.length === 9 ? `+420${digits}` : digits);
  return /^\+\d{9,15}$/.test(compact) ? compact : null;
}

function cleanWeb(raw) {
  const s = String(raw ?? '').trim();
  if (!s || /^neuvedeno$/i.test(s)) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

/**
 * Hlavní transformace.
 * @param {{
 *   vzp: object, nrpzs: object, kraje: object, obce: object,
 *   geoIndex?: object, sources: object, now?: string
 * }} input
 */
export function buildDataset(input) {
  const { vzp, nrpzs, kraje, obce, geoIndex = {}, sources, now = new Date().toISOString() } = input;

  const gazetteer = buildGazetteer(obce);

  // Krajská data podle normalizovaného názvu + obce, pro doplnění popisu místa.
  const krajByKey = new Map();
  for (const p of kraje?.places ?? []) {
    const key = `${norm(p.name)}|${norm(p.obec)}|${p.category}`;
    if (!krajByKey.has(key)) krajByKey.set(key, p);
  }

  const places = [];
  const geoStats = { nrpzs: 0, kraj: 0, obec: 0, none: 0 };

  for (const v of vzp?.places ?? []) {
    const addr = splitAddress(v.address);
    const code = krajCode(v.kraj);

    const krajMatch = krajByKey.get(`${norm(v.name)}|${norm(addr.obec)}|${v.category}`) ?? null;

    // Pořadí zdrojů polohy: registr (adresa domu) → krajská data → střed obce.
    // Poslední možnost je o stovky metrů vedle, proto se `geo_source` propisuje
    // až do karty výsledku.
    const registryHit = geocodeAddress(geoIndex, v.address);
    let lat = null;
    let lon = null;
    let geoSource = null;
    if (registryHit) {
      ({ lat, lon } = registryHit);
      geoSource = 'nrpzs';
    } else if (krajMatch?.lat != null) {
      ({ lat, lon } = krajMatch);
      geoSource = 'kraj';
    } else {
      const hit = geocodeObec(gazetteer, addr.obec, v.okres);
      if (hit) { lat = hit.lat; lon = hit.lon; geoSource = 'obec'; }
    }
    geoStats[geoSource ?? 'none'] += 1;

    const minimum = evaluateMinimum(v.category, v.hours);

    places.push({
      id: `vzp-${v.vzp_id}`,
      name: v.name,
      workplace: v.workplace ?? krajMatch?.place_note ?? null,
      category: v.category,
      category_label: CATEGORIES[v.category] ?? v.type_label,
      kraj_code: code,
      kraj: v.kraj || null,
      okres: v.okres || null,
      obec: addr.obec ?? null,
      address: v.address || null,
      psc: addr.psc,
      lat,
      lon,
      // Odkud jsou souřadnice: 'nrpzs' a 'kraj' míří na budovu, 'obec' jen
      // do středu obce. Stránka to musí u výsledku odlišit, jinak by tvrdila
      // přesnost, kterou nemá.
      geo_source: geoSource,
      place_note: krajMatch?.place_note ?? null,
      phone: normalizePhone(v.phone) ?? null,
      web: cleanWeb(v.web) ?? cleanWeb(krajMatch?.web) ?? null,
      hours: v.hours,
      hours_source: v.hours ? 'vzp' : null,
      detail_url: v.detail_url,
      // IČZ je kód zařízení u pojišťovny, ne IČO — na registr se joinovat nedá.
      icz: v.ico ?? null,
      meets_minimum: minimum.meets,
      // Rozpis kontrol vozíme jen u těch, které minimum nesplní — u zbylých
      // 260 míst by to byl balast, který nikdo nerozklikne.
      minimum_checks: minimum.meets === false ? minimum.checks : undefined,
    });
  }

  places.sort((a, b) => (a.kraj_code ?? '').localeCompare(b.kraj_code ?? '', 'cs')
    || (a.obec ?? '').localeCompare(b.obec ?? '', 'cs')
    || a.name.localeCompare(b.name, 'cs'));

  // ── Rotace: kraje, kde se zubní (nebo lékárenská) služba střídá ──────
  const rotations = (vzp?.rotations ?? []).map(rot => {
    const code = krajCode(rot.kraj);
    return {
      // rotation_id přichází jako cesta „rotace/282“ — do id patří jen číslo.
      id: `rotace-${String(rot.rotation_id).split('/').pop()}`,
      kraj_code: code,
      kraj: rot.kraj,
      category: rot.category,
      category_label: CATEGORIES[rot.category] ?? rot.category,
      index_url: rot.index_url,
      dates: rot.dates,
      practices: rot.practices.map(p => {
        const addr = splitAddress(p.address);
        const hit = geocodeObec(gazetteer, addr.obec, p.okres);
        return {
          name: p.name,
          workplace: p.workplace,
          address: p.address,
          obec: addr.obec,
          okres: p.okres || null,
          lat: hit?.lat ?? null,
          lon: hit?.lon ?? null,
          geo_source: hit ? 'obec' : null,
          phone: normalizePhone(p.phone),
          web: cleanWeb(p.web),
          detail_url: p.detail_url,
          hours: p.shifts.length ? makeHours({ kind: 'rotation', shifts: p.shifts }) : null,
        };
      }),
    };
  });

  // ── Doplňková vrstva z registru: urgentní příjmy, ZZS, akutní chirurgie ──
  // Nejsou to pohotovosti podle vyhlášky, ale na otázku „kam když je zavřeno“
  // odpovídají — a registr u nich má souřadnice i kontakt.
  const ACUTE_CATEGORIES = ['urgentni_prijem', 'chirurgicka', 'denni_ambulance', 'zzs'];
  const acute = (nrpzs?.places ?? [])
    .filter(p => p.categories.some(c => ACUTE_CATEGORIES.includes(c)))
    .map(p => ({
      id: p.id,
      name: p.name,
      categories: p.categories.filter(c => ACUTE_CATEGORIES.includes(c)),
      evidence: Object.fromEntries(Object.entries(p.evidence)
        .filter(([c]) => ACUTE_CATEGORIES.includes(c))),
      kraj_code: p.kraj_code,
      kraj: p.kraj,
      okres: p.okres,
      obec: p.obec,
      address: p.address,
      lat: p.lat,
      lon: p.lon,
      geo_source: p.lat != null ? 'nrpzs' : null,
      phone: p.phone,
      web: cleanWeb(p.web),
    }));

  // ── Pokrytí: kolik pohotovostí na kraj a kolik z nich splní vyhlášku ──
  const byKraj = {};
  for (const p of places) {
    const key = p.kraj_code ?? 'unknown';
    byKraj[key] ??= { kraj: p.kraj, total: 0, by_category: {}, with_hours: 0, meets_minimum: 0, assessed: 0 };
    byKraj[key].total += 1;
    byKraj[key].by_category[p.category] = (byKraj[key].by_category[p.category] ?? 0) + 1;
    if (p.hours) byKraj[key].with_hours += 1;
    if (p.meets_minimum != null) {
      byKraj[key].assessed += 1;
      if (p.meets_minimum) byKraj[key].meets_minimum += 1;
    }
  }

  const byCategory = {};
  for (const p of places) {
    byCategory[p.category] ??= { total: 0, with_hours: 0, assessed: 0, meets_minimum: 0 };
    byCategory[p.category].total += 1;
    if (p.hours) byCategory[p.category].with_hours += 1;
    if (p.meets_minimum != null) {
      byCategory[p.category].assessed += 1;
      if (p.meets_minimum) byCategory[p.category].meets_minimum += 1;
    }
  }

  const regionsWithOpenData = (sources?.kraje ?? []).filter(k => k.open_data).length;

  const dataset = {
    version: '1.0',
    generated_at: now,
    generator: 'ingest/transform_pohotovosti.js',

    legal: {
      summary: 'Od 1. ledna 2026 zajišťují pohotovostní službu zdravotní pojišťovny, ne kraje.',
      law: {
        title: 'Zákon č. 290/2025 Sb., kterým se mění zákon č. 372/2011 Sb., o zdravotních službách',
        effective_from: '2026-01-01',
      },
      decree: {
        title: 'Vyhláška č. 380/2025 Sb., o pohotovostních službách',
        url: 'https://www.zakonyprolidi.cz/cs/2025-380',
        effective_from: '2026-01-01',
        minimum_scope: {
          lps_dospeli: '§ 2 odst. 1: 3 h nepřetržitě mezi 16:00 a 22:00 v pracovní den; 8 h nepřetržitě včetně pevné doby 10:00–16:00 v sobotu, neděli a den pracovního klidu',
          lps_deti: '§ 3 odst. 1: 3 h nepřetržitě mezi 16:00 a 22:00 v pracovní den; 8 h nepřetržitě včetně pevné doby 10:00–16:00 v sobotu, neděli a den pracovního klidu',
          zubni: '§ 4 odst. 1: 4 h nepřetržitě mezi 7:00 a 15:00 v sobotu, neděli a den pracovního klidu',
          lekarna: '§ 5 odst. 1: 3 h nepřetržitě mezi 17:00 a 23:00 v pracovní den a mezi 15:00 a 20:00 v sobotu, neděli a den pracovního klidu',
        },
      },
    },

    sources: [
      {
        id: 'vzp',
        name: 'VZP ČR — Pohotovosti',
        url: 'https://pohotovosti.vzp.cz/',
        role: 'Ordinační doba, typ služby, kontakt. Celostátní pokrytí.',
        fetched_at: vzp?.generated_at ?? null,
      },
      {
        id: 'nrpzs',
        name: 'ÚZIS — Národní registr poskytovatelů zdravotních služeb',
        url: 'https://datanzis.uzis.gov.cz/data/NR-01-NRPZS/NR-01-06/Otevrena-data-NR-01-06-nrpzs-mista-poskytovani-zdravotnich-sluzeb.csv',
        role: 'Souřadnice, přesná adresa, urgentní příjmy a základny záchranné služby.',
        fetched_at: nrpzs?.generated_at ?? null,
      },
      {
        id: 'kraje',
        name: `Otevřená data krajů (${regionsWithOpenData} ze 14)`,
        url: 'https://data.gov.cz/',
        role: 'Popis místa v areálu nemocnice, krajské souřadnice, rozpisy zubních služeb.',
        fetched_at: kraje?.generated_at ?? null,
      },
      {
        id: 'online',
        name: 'Krajské online pohotovosti',
        url: 'https://www.jihoceskapohotovost.cz/',
        role: 'Telemedicínská pohotovost dvou krajů — ručně ověřené podmínky, každý záznam nese vlastní zdroj a datum ověření.',
        fetched_at: null,
      },
      {
        id: 'obce',
        name: 'Wikidata — obce ČR',
        url: 'https://query.wikidata.org/sparql',
        role: 'Převod názvu obce na souřadnice ve vyhledávání (geokódování běží v prohlížeči, poloha se nikam neodesílá).',
        fetched_at: obce?.generated_at ?? null,
      },
    ],

    coverage: {
      places_total: places.length,
      places_with_hours: places.filter(p => p.hours).length,
      places_with_exact_geo: places.filter(p => p.geo_source && p.geo_source !== 'obec').length,
      geo_sources: geoStats,
      rotations_total: rotations.length,
      rotation_practices: rotations.reduce((n, r) => n + r.practices.length, 0),
      acute_total: acute.length,
      denni_ambulance_total: acute.filter(a => a.categories.includes('denni_ambulance')).length,
      online_services: (input.online?.services ?? []).length,
      regions_total: sources?.kraje?.length ?? 14,
      regions_with_open_data: regionsWithOpenData,
      by_kraj: byKraj,
      by_category: byCategory,
    },

    categories: CATEGORIES,

    // Krajské online pohotovosti. Pro denní hodiny, kdy fyzická pohotovost
    // ze zákona neslouží, je tohle často jediná odpověď, která nevyžaduje
    // cestu — proto jde do hlavního souboru, ne do líně načítané vrstvy.
    online: input.online ?? { services: [], infolines: [], not_available: null },

    regions: (sources?.kraje ?? []).map(k => ({
      kraj_code: k.kraj_code,
      kraj: k.kraj,
      has_open_data: Boolean(k.open_data),
      open_data_title: k.open_data?.title ?? null,
      open_data_url: k.open_data?.dataset_url ?? null,
      web: k.web,
      web_label: k.web_label,
    })),

    places,
    rotations,
  };

  return { dataset, acute: { version: '1.0', generated_at: now, total: acute.length, places: acute } };
}

export function run() {
  const vzp = readCache('vzp_pohotovosti.json');
  const nrpzs = readCache('pohotovosti_places.json');
  const kraje = readCache('kraje_pohotovosti.json');
  const geoIndex = readCache('nrpzs_geo_index.json') ?? {};
  const sources = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8'));
  const online = JSON.parse(fs.readFileSync(ONLINE_FILE, 'utf8'));
  const obce = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'obce-gps.json'), 'utf8'));

  if (!vzp) throw new Error('[pohotovosti] chybí ingest/cache/vzp_pohotovosti.json — spusť `npm run fetch:pohotovosti-vzp`');
  if (!nrpzs) throw new Error('[pohotovosti] chybí ingest/cache/pohotovosti_places.json — spusť `npm run fetch:pohotovosti-nrpzs`');

  const { dataset, acute } = buildDataset({ vzp, nrpzs, kraje: kraje ?? { places: [] }, obce, geoIndex, sources, online });
  // Kompaktní JSON: soubor otevírá člověk, který někoho veze k lékaři —
  // 400 kB odsazení navíc je tady cítit.
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(dataset)}\n`);
  fs.writeFileSync(OUT_ACUTE_FILE, `${JSON.stringify(acute)}\n`);

  const c = dataset.coverage;
  console.log(`  [pohotovosti] ${c.places_total} pohotovostí (${c.places_with_hours} s ordinační dobou, ${c.places_with_exact_geo} s přesnou polohou)`);
  console.log(`  [pohotovosti] ${c.rotations_total} krajských rozpisů rotace (${c.rotation_practices} ordinací), ${c.acute_total} akutních pracovišť z registru`);
  console.log('  [pohotovosti] → data/pohotovosti.json + data/pohotovosti-akutni.json');
  return dataset;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    run();
  } catch (err) {
    console.error('[pohotovosti] FAIL:', err.message);
    process.exit(1);
  }
}
