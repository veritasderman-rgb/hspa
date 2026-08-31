// Krajská otevřená data o pohotovostní službě — doplněk k celostátnímu VZP.
//
// Ze 14 krajů publikují pohotovosti ve strojově čitelném tvaru čtyři:
//   Karlovarský (CZ041), Liberecký (CZ051), Královéhradecký (CZ052), Olomoucký (CZ071)
// Zbylých deset nemá v Národním katalogu otevřených dat (data.gov.cz) k tématu
// pohotovostí nic — ověřeno dotazem na dcat:Dataset s „pohotovost“, „LSPP“
// a „první pomoci“ v názvu. Tenhle nepoměr je sám o sobě zjištění a stránka
// ho ukazuje.
//
// K ČEMU TO JE, když hodiny bere web z VZP: krajská data nesou věci, které
// celostátní přehled nemá —
//   • popis místa v areálu („Pavilon interních oborů, budova B, 1. patro“),
//   • souřadnice přímo od kraje,
//   • rozpis zubních pohotovostí po konkrétních datech (Olomoucký kraj),
//   • nezávislé druhé čtení ordinační doby, na kterém jde poznat rozpor.
//
// POZOR NA STÁŘÍ: od 1. 1. 2026 pohotovosti organizují zdravotní pojišťovny
// (zákon č. 290/2025 Sb.), takže kraje své přehledy nemusí dál udržovat.
// Proto se krajská data nikdy nepoužijí jako primární zdroj hodin —
// transform je řadí až za VZP a v datech zůstává, odkud který údaj je.
//
// Výstup: ingest/cache/kraje_pohotovosti.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { parseCsv } from '../lib/csv.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';
import {
  DAY_KEYS,
  emptyWeek,
  weekFromPerDayColumns,
  parseCzechHoursSentence,
  parseRanges,
  parseIsoDate,
  daysFromLabel,
  weekHasHours,
  mergeWeeks,
  makeHours,
} from '../lib/pohotovosti-hours.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCES_FILE = path.resolve(__dirname, '..', 'mapping', 'pohotovosti_zdroje.json');
const CACHE = 'kraje_pohotovosti.json';

/** Načte registr krajských zdrojů. */
export function loadSources() {
  return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8'));
}

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sjednotí označení služby napříč kraji na kategorie webu.
 * Kraje míchají „typ služby“ a „cílovou skupinu“, každý jinak.
 * @returns {string|null}
 */
export function mapCategory({ type, target }) {
  const t = norm(type);
  const g = norm(target);

  if (/lekaren|lekarn/.test(t) || /lekaren|lekarn/.test(g)) return 'lekarna';
  if (/zubni|stomatolog/.test(t) || /zubni|stomatolog/.test(g)) return 'zubni';
  if (/deti|dorost|detsk/.test(g) || /deti|dorost|detsk/.test(t)) return 'lps_deti';
  if (/dospel/.test(g) || /dospel/.test(t)) return 'lps_dospeli';
  if (/lekarska/.test(t)) return 'lps_dospeli';
  return null;
}

/** Souřadnice z dvojice sloupců; vrací null, když jsou mimo ČR. */
function coords(lat, lon) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return { lat: null, lon: null };
  if (la < 48.4 || la > 51.2 || lo < 12.0 || lo > 18.9) return { lat: null, lon: null };
  return { lat: Number(la.toFixed(6)), lon: Number(lo.toFixed(6)) };
}

function joinAddress(street, number, psc, obec) {
  const line1 = [street, number].map(s => String(s ?? '').trim()).filter(Boolean).join(' ');
  const line2 = [String(psc ?? '').trim().replace(/(\d{3})(\d{2})/, '$1 $2'), String(obec ?? '').trim()]
    .filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join(', ');
}

/** Karlovarský kraj — sloupec na každý den týdne. */
export function adaptKvk(rows) {
  return rows.map((r, i) => {
    const week = weekFromPerDayColumns({
      mon: r['Ordinační hodiny - pondělí'],
      tue: r['Ordinační hodiny - úterý'],
      wed: r['Ordinační hodiny - středa'],
      thu: r['Ordinační hodiny - čtvrtek'],
      fri: r['Ordinační hodiny - pátek'],
      sat: r['Ordinační hodiny - sobota'],
      sun: r['Ordinační hodiny - neděle'],
      holiday: r['Ordinační hodiny - svátek'],
    });
    const { lat, lon } = coords(
      r['Zeměpisná šířka v souřadnicovém systému WGS84'],
      r['Zeměpisná délka v souřadnicovém systému WGS84'],
    );
    return {
      source_id: `kvk-${r['OBJEKT ID'] ?? i}`,
      kraj_code: r['Kód vyššího územně samosprávného celku'] || 'CZ041',
      category: mapCategory({ type: r['Typ pohotovostní služby'], target: r['Cílová skupina'] }),
      name: String(r['Název zařízení pohotovostní služby'] ?? '').trim(),
      place_note: String(r['Místo pohotovostní služby'] ?? '').trim() || null,
      obec: String(r['Název obce'] ?? '').trim() || null,
      okres: String(r['Název okresu'] ?? '').trim() || null,
      address: joinAddress(r['Název ulice'], r['Číslo domovní'], r['Poštovní směrovací číslo'], r['Název obce']),
      lat,
      lon,
      phone: String(r['Telefonní kontakt'] ?? '').replace(/^tel:/, '').trim() || null,
      web: String(r['Webová stránka'] ?? '').trim() || null,
      hours: weekHasHours(week)
        ? makeHours({ kind: 'weekly', week, note: String(r['Poznámka'] ?? '').trim() || null })
        : null,
    };
  });
}

/** Liberecký kraj — ArcGIS FeatureServer, sloupec na každý den týdne. */
export function adaptLbk(features) {
  return features.map((f, i) => {
    const a = f.attributes ?? f;
    const week = weekFromPerDayColumns({
      mon: a.ordinacni_hodiny_pondeli,
      tue: a.ordinacni_hodiny_utery,
      wed: a.ordinacni_hodiny_streda,
      thu: a.ordinacni_hodiny_ctvrtek,
      fri: a.ordinacni_hodiny_patek,
      sat: a.ordinacni_hodiny_sobota,
      sun: a.ordinacni_hodiny_nedele,
      holiday: a.ordinacni_hodiny_svatek,
    });
    const { lat, lon } = coords(a.y, a.x);
    return {
      source_id: `lbk-${a.OBJECTID ?? a.FID ?? i}`,
      kraj_code: 'CZ051',
      category: mapCategory({ type: a.nazev, target: a.cilova_skupina }),
      name: String(a.nazev ?? '').trim(),
      place_note: String(a.popis_mista ?? '').trim() || null,
      obec: String(a.nazev_obce ?? '').trim() || null,
      okres: String(a.nazev_okresu ?? '').trim() || null,
      address: joinAddress(a.nazev_ulice, a.cislo_domovni, a.psc, a.nazev_obce),
      lat,
      lon,
      phone: String(a.telefon ?? '').trim() || null,
      web: String(a.web ?? '').trim() || null,
      ico: String(a.ico ?? '').trim() || null,
      hours: weekHasHours(week) ? makeHours({ kind: 'weekly', week }) : null,
    };
  });
}

/** Královéhradecký kraj — ordinační doba jednou větou. */
export function adaptKhk(rows) {
  return rows.map((r, i) => {
    const raw = String(r['Ordinační hodiny'] ?? '').trim();
    const week = parseCzechHoursSentence(raw);
    const { lat, lon } = coords(
      r['Zeměpisná šířka v souřadnicovém systému WGS84'],
      r['Zeměpisná délka v souřadnicovém systému WGS84'],
    );
    return {
      source_id: `khk-${r.ID ?? i}`,
      kraj_code: r['Kód vyššího územního samosprávného celku'] || 'CZ052',
      category: mapCategory({ type: r['Název'], target: r['Cílová skupina'] }),
      name: String(r['Název'] ?? '').trim(),
      place_note: null,
      obec: String(r['Název obce'] ?? '').trim() || null,
      okres: String(r['Název okresu'] ?? '').trim() || null,
      address: joinAddress(r['Název ulice'], r['Číslo domovní'], r['PSČ'], r['Název obce']),
      lat,
      lon,
      phone: null,
      web: String(r['Webové stránky'] ?? '').trim() || null,
      hours: weekHasHours(week) ? makeHours({ kind: 'weekly', week, raw }) : null,
    };
  });
}

/**
 * Olomoucký kraj — řádek na jednu službu, ne na jedno místo.
 *
 * Dvě podoby v jednom souboru:
 *   • zubní pohotovost: rozpis po konkrétních datech (DEN_OD = DEN_DO = ta sobota)
 *   • ostatní: typ dne („všední dny“, „víkendy a svátky“) = trvalý týdenní režim
 *
 * Řádky téhož místa proto slučujeme: z dat vznikne rotace, z typů dnů týden.
 */
export function adaptOlk(rows) {
  const byPlace = new Map();

  for (const r of rows) {
    const key = [r.ID_MISTO_NRPZS, r.ICO, r.NAZEV_ZARIZENI, r.DRUH_SLUZBY].join('|');
    const ranges = parseRanges(r.ORDINACNI_DOBA);
    const from = parseIsoDate(r.DEN_OD);
    const to = parseIsoDate(r.DEN_DO) ?? from;
    const dayLabel = String(r.TYP_DNE ?? '').trim();
    // Konkrétní datum = rotační služba; obecný typ dne = trvalý týdenní režim.
    const isRotation = Boolean(from) && /sobota|nedele|neděle|svatek|svátek/i.test(dayLabel)
      && !/vikend|víkend|vsedni|všední/i.test(dayLabel);

    if (!byPlace.has(key)) {
      const { lat, lon } = coords(r.Y, r.X);
      byPlace.set(key, {
        source_id: `olk-${r.ID_MISTO_NRPZS || r.OBJECTID}-${norm(r.DRUH_SLUZBY).replace(/\s+/g, '-')}`,
        kraj_code: r.KRAJ_KOD || 'CZ071',
        category: mapCategory({ type: r.DRUH_SLUZBY, target: r.DRUH_SLUZBY }),
        name: String(r.NAZEV_ZARIZENI ?? '').trim(),
        place_note: String(r.MISTO_POPIS ?? '').trim() || null,
        obec: String(r.OBEC ?? '').trim() || null,
        okres: String(r.OKRES ?? '').trim() || null,
        address: joinAddress(r.ULICE, r.CISLO_POPISNE_ORIENTACNI, r.PSC, r.OBEC),
        lat,
        lon,
        phone: String(r.TELEFON ?? '').trim() || null,
        web: String(r.WEB ?? '').trim() || null,
        ico: String(r.ICO ?? '').trim() || null,
        nrpzs_id: String(r.ID_MISTO_NRPZS ?? '').trim() || null,
        _week: emptyWeek(),
        _shifts: [],
      });
    }

    const entry = byPlace.get(key);
    if (!ranges.length) continue;

    if (isRotation) {
      entry._shifts.push({ from, to, ranges });
    } else {
      const week = emptyWeek();
      for (const day of daysFromLabel(dayLabel)) week[day] = ranges.map(x => [...x]);
      entry._week = mergeWeeks(entry._week, week);
    }
  }

  return [...byPlace.values()].map(e => {
    const { _week, _shifts, ...rest } = e;
    let hours = null;
    if (weekHasHours(_week)) hours = makeHours({ kind: 'weekly', week: _week });
    else if (_shifts.length) hours = makeHours({ kind: 'rotation', shifts: _shifts });
    return { ...rest, hours };
  });
}

const ADAPTERS = { kvk: adaptKvk, lbk: adaptLbk, khk: adaptKhk, olk: adaptOlk };

/**
 * Stáhne a znormalizuje jeden krajský zdroj.
 * @returns {Promise<Array<object>>}
 */
export async function fetchRegion(entry, opts = {}) {
  const { fetchImpl } = opts;
  const cfg = entry.open_data;
  if (!cfg) return [];

  const adapter = ADAPTERS[cfg.adapter];
  if (!adapter) throw new Error(`[kraje] neznámý adaptér ${cfg.adapter} pro ${entry.kraj_code}`);

  if (cfg.format === 'arcgis') {
    const json = await fetchWithRetry(cfg.url, { parse: 'json', fetchImpl, timeoutMs: 60_000 });
    return adapter(json?.features ?? []);
  }

  const csv = await fetchWithRetry(cfg.url, { parse: 'text', fetchImpl, timeoutMs: 60_000 });
  // ArcGIS Hub odpovídá na první CSV požadavek HTTP 202 s JSON „Pending“
  // (generuje export na pozadí). Pro takový kraj raději nic než rozsypané řádky.
  if (csv.trim().startsWith('{')) {
    console.warn(`  [kraje] ${entry.kraj_code}: export se teprve generuje (HTTP 202) — přeskočeno`);
    return [];
  }
  // `relax_column_count`: karlovarský export má u pár řádků méně buněk, než
  // slibuje hlavička (chybí koncové sloupce geometrie). Striktní parser na
  // tom spadl a přišli jsme o celý kraj kvůli dvěma prázdným polím.
  return adapter(parseCsv(csv, { relax_column_count: true }));
}

/**
 * @param {{ force?: boolean, fetchImpl?: typeof fetch }} [opts]
 */
export async function fetchKrajePohotovosti(opts = {}) {
  const { force = false, fetchImpl } = opts;

  const cached = force ? null : readCacheIfFresh(CACHE);
  if (cached) {
    console.log(`  [kraje] using fresh cache (${cached.places?.length ?? 0} míst)`);
    return { ...cached, fromCache: true };
  }

  const sources = loadSources();
  const places = [];
  const perRegion = {};
  const errors = [];

  for (const entry of sources.kraje) {
    if (!entry.open_data) continue;
    try {
      const rows = await fetchRegion(entry, { fetchImpl });
      perRegion[entry.kraj_code] = rows.length;
      places.push(...rows.map(r => ({
        ...r,
        source: {
          name: entry.open_data.title,
          url: entry.open_data.dataset_url,
          download_url: entry.open_data.url,
          publisher_ico: entry.open_data.publisher_ico,
        },
      })));
      console.log(`  [kraje] ${entry.kraj_code} ${entry.kraj}: ${rows.length} míst`);
    } catch (err) {
      // Výpadek jednoho kraje nesmí shodit celý ingest — ostatní data jsou
      // pořád k něčemu a chyba se propíše do výstupu, ať je vidět.
      errors.push({ kraj_code: entry.kraj_code, message: err.message });
      console.warn(`  [kraje] ${entry.kraj_code} SELHALO: ${err.message}`);
    }
    if (CONFIG.throttle_ms) await new Promise(r => setTimeout(r, CONFIG.throttle_ms));
  }

  const payload = {
    generated_at: new Date().toISOString(),
    regions_with_open_data: Object.keys(perRegion).length,
    regions_total: sources.kraje.length,
    per_region: perRegion,
    errors,
    total: places.length,
    places,
  };

  writeCache(CACHE, payload);
  console.log(`  [kraje] celkem ${places.length} míst ze ${Object.keys(perRegion).length} krajů`);
  return { ...payload, fromCache: false };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchKrajePohotovosti({ force: process.argv.includes('--force') }).catch(err => {
    console.error('[kraje] FAIL:', err.message);
    process.exit(1);
  });
}
