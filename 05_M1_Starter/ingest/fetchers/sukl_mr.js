// SÚKL · OpenData fetcher — Hlášení o uvedení/přerušení/ukončení/obnovení dodávek
// léčivých přípravků na trh ("MR feed"). Slouží jako primární zdroj pro nový HSPA
// indikátor `vypadky_leciv_aktivni` (počet aktuálně přerušených/ukončených LP).
//
// SÚKL feed: https://opendata.sukl.cz/?q=katalog/hlaseni-o-uvedeni-preruseni-ukonceni-obnoveni-dodavek-leciveho-pripravku-na-trh
// ZIP archiv: https://opendata.sukl.cz/soubory/MR/mr.zip (cca 800 kB, denní update)
// Datové rozhraní: https://opendata.sukl.cz/soubory/MR_datove_rozhrani20230301.csv
//
// Sloupce mr_hlaseni:
//   POSLEDNI_PLATNE_HLASENI, KOD_SUKL, NAZEV, DOPLNEK, REG, ATC,
//   TYP_OZNAMENI (U=uvedení, P=přerušení, K=ukončení, O=obnovení),
//   PLATNOST_OD, DATUM_HLASENI, NAHRAZUJICI_LP, NAHRAZUJICI_LP_POZNAMKA,
//   DUVOD_PRERUSENI_UKONCENI, TERMIN_OBNOVENI
//
// Algoritmus:
//   1. Stáhnout CSV (zatím přes přímý CSV endpoint, ZIP extrakce viz lekárny —
//      přidá se v navazujícím milníku, jakmile bude dostupná nativní unzip lib).
//   2. Pro každý KOD_SUKL si vzít řádek s POSLEDNI_PLATNE_HLASENI=ANO (= aktuální
//      stav podle feedu); DATUM_HLASENI jen jako tiebreaker/fallback (#1120).
//   3. Spočítat:
//        - active_disruptions = řádky kde TYP_OZNAMENI ∈ {P, K} a (TERMIN_OBNOVENI
//          je v budoucnu nebo prázdný)
//        - resolutions_30d = řádky kde TYP_OZNAMENI = O a DATUM_HLASENI ≥ now-30d
//        - new_disruptions_30d = řádky kde TYP_OZNAMENI ∈ {P, K} a DATUM_HLASENI ≥ now-30d
//        - top_atc_groups = top 5 ATC tříd s nejvyšším počtem aktivních výpadků
//   4. Uložit do ingest/cache/sukl_mr_aggregated.json.
//
// Metodická poznámka: SÚKL nedrží vyhrazený "current state" snapshot — feed je
// kumulativní (od 31. 12. 2007). Aktivní výpadek = poslední platné hlášení pro
// daný KOD_SUKL je P nebo K bez následného O. Tato deduplikace je logikou tohoto
// fetcheru, nikoli SÚKL.

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fetchWithRetry } from '../lib/http.js';
import { unzipEntry } from './sukl.js';
import { cachePath, readCacheIfFresh, writeCache } from '../lib/cache.js';
import { parseCsv } from '../lib/csv.js';

const RAW_CACHE = 'sukl_mr_raw.json';
const AGG_CACHE = 'sukl_mr_aggregated.json';
const MR_ZIP_URL = 'https://opendata.sukl.cz/soubory/MR/mr.zip';

// #1132 — PROČ SE FEED NESMÍ BRÁT „JAK PŘIJDE":
// SÚKL generuje mr.zip každý den znovu (PLATNOST v mr_hlaseni_platnost.csv),
// ale servíruje ho s `Cache-Control: max-age=1209600`, tj. 14 dní. Každá
// mezilehlá cache (CDN, firemní nebo agentní proxy) tedy SMÍ vrátit až dva
// týdny starý dump — a protože „aktivní výpadek" se testuje proti systémovému
// času, starý dump číslo tiše PODSTŘELÍ: hlášením mezitím uplyne
// TERMIN_OBNOVENI, ale nová/prodloužená hlášení v dumpu chybí. Měřeno na feedu
// z 6. 9. 2026: zhruba −4 až −5 LP na každý den zpoždění a skok −120 při
// přechodu přes konec měsíce (k 30. 9. 2026 vyprší najednou 116 hlášení).
// Proto: cache-busting + no-cache hlavičky, tvrdá kontrola stáří dumpu a
// agregace proti PLATNOSTI dumpu, ne proti hodinám stroje.
const NO_CACHE_HEADERS = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };
const MAX_FEED_LAG_DAYS = 3;
// Minimální velikost CSV, aby se dal považovat za skutečný feed (má ~12 MB).
// Chrání i před fixturou z tests/sukl_mr.test.js, která bez HSPA_CACHE_DIR
// přepíše ingest/cache/sukl_mr_raw.json třířádkovým CSV (viz #1132).
const MIN_CSV_LENGTH = 100_000;

// Mapování ATC anatomických tříd (1. písmeno) na lidský popis.
// Reference: WHO Collaborating Centre for Drug Statistics Methodology
// (https://www.whocc.no/atc/structure_and_principles/).
export const ATC_GROUPS = {
  A: 'Trávicí trakt a metabolismus',
  B: 'Krev a krvetvorba',
  C: 'Kardiovaskulární systém',
  D: 'Dermatologika',
  G: 'Urogenitální trakt a pohlavní hormony',
  H: 'Systémové hormonální přípravky',
  J: 'Antiinfektiva pro systémové použití',
  L: 'Cytostatika a imunomodulancia',
  M: 'Muskuloskeletální systém',
  N: 'Nervový systém',
  P: 'Antiparazitika, insekticidy, repelenty',
  R: 'Respirační systém',
  S: 'Smyslové orgány',
  V: 'Různé',
};

/**
 * Naparsuje CSV z SÚKL MR feedu.
 * Oddělovač `;`, kódování CP1250 (na úrovni HTTP fetch musí být převedeno na UTF-8;
 * lib/http.js to dělá pro `parse: 'text'`, pokud Content-Type explicitně neuvádí).
 *
 * @param {string} csvText
 * @returns {Array<{
 *   kod_sukl: string, nazev: string, doplnek: string, atc: string,
 *   typ: string, platnost_od: string, datum_hlaseni: string,
 *   nahrazujici_lp: string, duvod: string, termin_obnoveni: string,
 *   posledni_platne: string,
 * }>}
 */
// SÚKL používá v TYP_OZNAMENI slovní hodnoty; normalizace na písmenné kódy.
const TYP_MAP = {
  ZAHAJENI: 'U', UVEDENI: 'U',
  PRERUSENI: 'P',
  UKONCENI: 'K',
  OBNOVENI: 'O',
};

/** Datum SÚKL (DD.MM.YYYY) → ISO (YYYY-MM-DD); ISO projde beze změny. */
export function toIsoFromCz(d) {
  const s = (d ?? '').trim();
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
}

export function parseMrCsv(csvText) {
  const rows = parseCsv(csvText, { delimiter: ';' });
  return rows
    .map(r => {
      const typRaw = (r.TYP_OZNAMENI ?? r.typ_oznameni ?? '').trim().toUpperCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '');
      return {
        kod_sukl: (r.KOD_SUKL ?? r.kod_sukl ?? '').trim(),
        nazev: (r.NAZEV ?? r.nazev ?? '').trim(),
        doplnek: (r.DOPLNEK ?? r.doplnek ?? '').trim(),
        atc: (r.ATC ?? r.atc ?? '').trim().toUpperCase(),
        typ: TYP_MAP[typRaw] ?? typRaw,
        platnost_od: toIsoFromCz(r.PLATNOST_OD ?? r.platnost_od),
        datum_hlaseni: toIsoFromCz(r.DATUM_HLASENI ?? r.datum_hlaseni),
        nahrazujici_lp: (r.NAHRAZUJICI_LP ?? r.nahrazujici_lp ?? '').trim(),
        duvod: (r.DUVOD_PRERUSENI_UKONCENI ?? r.duvod_preruseni_ukonceni ?? '').trim(),
        termin_obnoveni: toIsoFromCz(r.TERMIN_OBNOVENI ?? r.termin_obnoveni),
        posledni_platne: (r.POSLEDNI_PLATNE_HLASENI ?? r.posledni_platne_hlaseni ?? '').trim(),
      };
    })
    .filter(r => r.kod_sukl);
}

/**
 * Z kumulativního MR feedu spočítá aktuální stav výpadků.
 *
 * Pravidla:
 *   - "Aktivní výpadek" = poslední platné hlášení pro KOD_SUKL je P (přerušení)
 *     a (a) TERMIN_OBNOVENI je prázdný nebo (b) > now.
 *   - K (ukončení) se NEpočítá jako aktivní výpadek: jde o trvalé stažení
 *     z trhu, které se ve feedu kumuluje od 2007 (12 000+ LP) — započtení by
 *     metriku nafouklo o přípravky, které dávno nejsou „ve výpadku", ale
 *     prostě se přestaly dodávat. Drží se zvlášť v discontinued_total.
 *   - Deduplikace: pokud má LP více řádků, bere se ten s nejvyšším DATUM_HLASENI
 *     (ISO datum yyyy-mm-dd se string-řazením srovná správně).
 *
 * @param {Array} rows - výstup parseMrCsv
 * @param {Date} [now] - referenční čas (pro testy)
 * @returns {{
 *   total_unique_lp: number,
 *   active_disruptions: number,
 *   active_share_pct: number,
 *   new_disruptions_30d: number,
 *   resolutions_30d: number,
 *   active_with_substitute_pct: number,
 *   top_atc_groups: Array<{atc:string, label:string, count:number}>,
 *   sample: Array,
 * }}
 */
export function aggregateMr(rows, now = new Date()) {
  // Krok 1: dedup — pro každý KOD_SUKL drž aktuální stav. Autoritativní je
  // sloupec POSLEDNI_PLATNE_HLASENI=ANO, kterým feed sám označuje platné
  // hlášení; DATUM_HLASENI slouží jen jako tiebreaker (a fallback pro LP bez
  // řádku ANO). Ostré porovnání dat samo o sobě nestačí: 232 LP mívá na
  // maximálním datu víc řádků (101 s konfliktními typy) a o výsledku by pak
  // rozhodovalo pořadí řádků v CSV — viz #1120.
  const latest = new Map();
  for (const r of rows) {
    const prev = latest.get(r.kod_sukl);
    if (!prev) { latest.set(r.kod_sukl, r); continue; }
    const rAno = r.posledni_platne === 'ANO';
    const pAno = prev.posledni_platne === 'ANO';
    if (rAno !== pAno) {
      if (rAno) latest.set(r.kod_sukl, r);
      continue;
    }
    if (r.datum_hlaseni > prev.datum_hlaseni) latest.set(r.kod_sukl, r);
  }

  // Krok 2: filtrace aktivních výpadků.
  const isoNow = toIsoDate(now);
  const iso30dAgo = toIsoDate(new Date(now.getTime() - 30 * 24 * 3600 * 1000));

  let active = 0;
  let activeWithSubstitute = 0;
  let discontinuedTotal = 0;
  const atcCounter = new Map();
  const sample = [];

  for (const r of latest.values()) {
    if (r.typ === 'K') discontinuedTotal++;
    if (r.typ === 'P') {
      const stillActive = !r.termin_obnoveni || r.termin_obnoveni > isoNow;
      if (stillActive) {
        active++;
        if (r.nahrazujici_lp) activeWithSubstitute++;
        const atcLetter = r.atc.charAt(0);
        if (atcLetter) atcCounter.set(atcLetter, (atcCounter.get(atcLetter) ?? 0) + 1);
        if (sample.length < 20) {
          sample.push({
            kod_sukl: r.kod_sukl,
            nazev: r.nazev,
            doplnek: r.doplnek,
            atc: r.atc,
            typ: r.typ,
            platnost_od: r.platnost_od,
            termin_obnoveni: r.termin_obnoveni,
            duvod: r.duvod,
            ma_nahradu: !!r.nahrazujici_lp,
          });
        }
      }
    }
  }

  // Krok 3: 30denní okno — nová hlášení.
  let new30 = 0;
  let res30 = 0;
  for (const r of rows) {
    if (!r.datum_hlaseni || r.datum_hlaseni < iso30dAgo) continue;
    if (r.typ === 'P') new30++;
    else if (r.typ === 'O') res30++;
  }

  const totalUnique = latest.size;
  const topAtc = [...atcCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([atc, count]) => ({ atc, label: ATC_GROUPS[atc] ?? 'Neuvedeno', count }));

  return {
    total_unique_lp: totalUnique,
    discontinued_total: discontinuedTotal,
    active_disruptions: active,
    active_share_pct: totalUnique > 0 ? +(active / totalUnique * 100).toFixed(2) : 0,
    new_disruptions_30d: new30,
    resolutions_30d: res30,
    active_with_substitute_pct: active > 0 ? +(activeWithSubstitute / active * 100).toFixed(1) : 0,
    top_atc_groups: topAtc,
    sample,
  };
}

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * O kolik dní je dump pozadu za dnem běhu (PLATNOST feedu vs. `now`).
 * @param {string|null|undefined} feedPlatnost ISO datum (YYYY-MM-DD)
 * @param {Date} [now]
 * @returns {number|null} null = PLATNOST chybí nebo je nečitelná
 */
export function feedLagDays(feedPlatnost, now = new Date()) {
  if (!feedPlatnost || !/^\d{4}-\d{2}-\d{2}$/.test(feedPlatnost)) return null;
  const feed = Date.parse(`${feedPlatnost}T00:00:00Z`);
  const run = Date.parse(`${toIsoDate(now)}T00:00:00Z`);
  if (Number.isNaN(feed) || Number.isNaN(run)) return null;
  return Math.round((run - feed) / 86_400_000);
}

/**
 * Smí se obsah RAW cache použít místo stažení? Hlídá provenienci (stejný
 * endpoint), velikost (ne testovací fixtura) a stáří dumpu.
 */
export function isUsableRawCache(entry, { url, now = new Date(), maxLagDays = MAX_FEED_LAG_DAYS } = {}) {
  if (!entry || typeof entry.csv !== 'string') return false;
  if (entry.csv.length < MIN_CSV_LENGTH) return false;
  if (url && entry.url && stripQuery(entry.url) !== stripQuery(url)) return false;
  // U ZIP distribuce je PLATNOST povinná — cache bez ní neumíme datovat,
  // takže se raději stahuje znovu.
  if (String(url).endsWith('.zip') && !entry.feed_platnost) return false;
  if (entry.feed_platnost) {
    const lag = feedLagDays(entry.feed_platnost, now);
    if (lag == null || lag > maxLagDays) return false;
  }
  return true;
}

function stripQuery(u) {
  return String(u).split('?')[0];
}

/**
 * Kolik se smí hodnota posunout mezi dvěma agregáty, než ji označíme za
 * podezřelou. Kalibrace na reálné dynamice feedu: čistá denní bilance je
 * jednotky LP (medián ±3, týdenní maximum ~20 na řadě 06–09/2026), takže
 * 40 + 1,5 × počet dní nechá projít i kvartálový posun (90 dní → 175),
 * ale zachytí skok, který za dané období vzniknout nemohl.
 */
export function driftLimit(days) {
  return 40 + 1.5 * Math.max(0, days || 0);
}

/** @returns {boolean} true = skok proti minulému agregátu je nevysvětlitelný */
export function isImplausibleJump(active, previousActive, days) {
  if (!Number.isFinite(previousActive) || previousActive <= 0) return false;
  return Math.abs(active - previousActive) > driftLimit(days);
}

function readCacheRaw(name) {
  try { return JSON.parse(fs.readFileSync(cachePath(name), 'utf8')); }
  catch { return null; }
}

/**
 * Rekonstruuje historický trend aktivních přerušení z kumulativního feedu:
 * pro 31. 12. každého roku přehraje hlášení do toho dne a spočítá aktivní P.
 * (Feed je kumulativní od 2007, takže jde o věrnou rekonstrukci, ne odhad.)
 *
 * @param {Array} rows      výstup parseMrCsv
 * @param {number} fromYear první rok trendu
 * @param {number} toYear   poslední UZAVŘENÝ rok trendu
 * @returns {Array<{year:number, value:number}>}
 */
export function yearEndTrend(rows, fromYear, toYear) {
  const trend = [];
  for (let y = fromYear; y <= toYear; y++) {
    const ref = `${y}-12-31`;
    const latest = new Map();
    for (const r of rows) {
      if (!r.datum_hlaseni || r.datum_hlaseni > ref) continue;
      const prev = latest.get(r.kod_sukl);
      if (!prev || r.datum_hlaseni > prev.datum_hlaseni) latest.set(r.kod_sukl, r);
    }
    let active = 0;
    for (const r of latest.values()) {
      if (r.typ === 'P' && (!r.termin_obnoveni || r.termin_obnoveni > ref)) active++;
    }
    trend.push({ year: y, value: active });
  }
  return trend;
}

/**
 * Hlavní vstupní bod fetcheru.
 *
 * Kontrakt (#1132): agregát se do cache zapíše jen tehdy, když je dump
 * prokazatelně čerstvý. Když je starý/nedostupný, funkce vrátí
 * `aggregated: null` a NEPŘEPÍŠE `sukl_mr_aggregated.json` — v datovém
 * kontraktu tak zůstane poslední ověřená hodnota (transform ji vezme jako
 * seed) místo tiše podstřeleného čísla.
 *
 * @param {{ force?: boolean, fetchImpl?: typeof fetch, endpoint?: string, now?: Date }} [opts]
 */
export async function fetchSuklMr(opts = {}) {
  const { force = false, fetchImpl, endpoint, now = new Date() } = opts;
  const url = endpoint ?? MR_ZIP_URL;
  const isZip = url.endsWith('.zip');

  let cached = force ? null : readCacheIfFresh(RAW_CACHE);
  if (cached && !isUsableRawCache(cached, { url, now })) {
    console.warn('  [sukl-mr] RAW cache ignorována (jiný endpoint, testovací fixtura nebo zastaralá PLATNOST)');
    cached = null;
  }
  let raw = cached?.csv ?? null;
  const fromCache = raw != null;
  let feedMeta = fromCache
    ? { feed_platnost: cached.feed_platnost, zip_sha256: cached.zip_sha256 }
    : {};
  let fetchedAt = cached?.fetched_at ?? null;

  if (!raw) {
    try {
      // Cache-busting parametr + no-cache: bez nich smí mezilehlá cache podle
      // hlaviček SÚKL vrátit až 14 dní starý dump (viz komentář nahoře).
      const reqUrl = `${url}${url.includes('?') ? '&' : '?'}cb=${toIsoDate(now)}-${Date.now()}`;
      console.log(`  [sukl-mr] stahuji ${url}`);
      if (isZip) {
        const buf = await fetchWithRetry(reqUrl, { fetchImpl, parse: 'buffer', headers: NO_CACHE_HEADERS });
        raw = unzipEntry(buf, /mr_hlaseni\.csv$/i);
        // Dohledatelnost běhu (#1120): hash ZIPu + PLATNOST feedu do cache,
        // aby šla každá zaingestovaná hodnota zpětně spárovat s konkrétním dumpem.
        feedMeta.zip_sha256 = createHash('sha256').update(buf).digest('hex');
        try {
          const platnostCsv = unzipEntry(buf, /mr_hlaseni_platnost\.csv$/i);
          const m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(platnostCsv);
          if (m) feedMeta.feed_platnost = `${m[3]}-${m[2]}-${m[1]}`;
        } catch { /* starší dumpy soubor platnosti nemají */ }
        console.log(`  [sukl-mr] feed PLATNOST=${feedMeta.feed_platnost ?? '?'} sha256=${feedMeta.zip_sha256.slice(0, 12)}…`);
      } else {
        raw = await fetchWithRetry(reqUrl, { fetchImpl, parse: 'text', headers: NO_CACHE_HEADERS });
      }
      fetchedAt = new Date().toISOString();
    } catch (err) {
      console.warn(`  [sukl-mr] ${url} failed: ${err.message}`);
      console.warn('  [sukl-mr] all endpoints failed; agregát se nezmění');
      return { fromCache: false, aggregated: null, error: err.message };
    }
  } else {
    console.log(`  [sukl-mr] using fresh cache (PLATNOST=${feedMeta.feed_platnost ?? '?'})`);
  }

  // Brána čerstvosti: u ZIP distribuce je PLATNOST povinná a nesmí být starší
  // než MAX_FEED_LAG_DAYS. Starý dump = tichý propad indikátoru (#1132).
  const lag = feedLagDays(feedMeta.feed_platnost, now);
  if (isZip && (lag == null || lag > MAX_FEED_LAG_DAYS)) {
    const msg = `feed PLATNOST=${feedMeta.feed_platnost ?? '?'} je ${lag ?? '?'} dní pozadu (limit ${MAX_FEED_LAG_DAYS}) — agregát se nemění`;
    console.warn(`  [sukl-mr] ${msg}`);
    return { fromCache, aggregated: null, error: msg };
  }

  if (!fromCache) {
    writeCache(RAW_CACHE, { url, fetched_at: fetchedAt, ...feedMeta, csv: raw });
  }

  const rows = parseMrCsv(raw);
  // Referenční datum agregace = PLATNOST dumpu, ne hodiny stroje. Díky tomu je
  // hodnota čistou funkcí staženého souboru (reprodukovatelná ze sha256) a
  // nemůže se rozejít s daty, když dorazí starší dump (#1132).
  const referenceDate = feedMeta.feed_platnost
    ? new Date(`${feedMeta.feed_platnost}T00:00:00Z`)
    : now;
  const aggregated = aggregateMr(rows, referenceDate);
  const refYear = referenceDate.getUTCFullYear();
  aggregated.trend = yearEndTrend(rows, refYear - 7, refYear - 1);

  // Plauzibilitní brána proti minulému agregátu — skok, který za uplynulé dny
  // vzniknout nemohl, se označí `suspect` a transform ho ignoruje.
  const previous = readCacheRaw(AGG_CACHE);
  const prevRef = previous?.reference_date ?? (previous?.generated_at ?? '').slice(0, 10);
  const daysSincePrev = prevRef ? feedLagDays(prevRef, referenceDate) : null;
  const suspect = isImplausibleJump(
    aggregated.active_disruptions,
    previous?.active_disruptions,
    daysSincePrev ?? 0,
  );
  if (suspect) {
    console.warn(`  [sukl-mr] POZOR: ${previous.active_disruptions} → ${aggregated.active_disruptions} za ${daysSincePrev ?? '?'} dní překračuje očekávaný drift (${driftLimit(daysSincePrev ?? 0)}); agregát označen suspect`);
  }

  writeCache(AGG_CACHE, {
    generated_at: new Date().toISOString(),
    // fetched_at MUSÍ být v agregátu — transform.js ho čte právě odsud a bez
    // něj razítkoval do kontraktu čas vlastního běhu (#1132).
    fetched_at: fetchedAt ?? new Date().toISOString(),
    feed_platnost: feedMeta.feed_platnost ?? null,
    zip_sha256: feedMeta.zip_sha256 ?? null,
    reference_date: toIsoDate(referenceDate),
    rows_parsed: rows.length,
    source: 'https://opendata.sukl.cz/?q=katalog/hlaseni-o-uvedeni-preruseni-ukonceni-obnoveni-dodavek-leciveho-pripravku-na-trh',
    ...(suspect
      ? { suspect: true, previous_active_disruptions: previous.active_disruptions }
      : {}),
    ...aggregated,
  });

  console.log(`  [sukl-mr] ${aggregated.active_disruptions} aktivních výpadků z ${aggregated.total_unique_lp} LP (${aggregated.active_share_pct} %) k ${toIsoDate(referenceDate)}`);
  return { fromCache, aggregated, suspect };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchSuklMr().catch(err => {
    console.error('[sukl-mr] FAIL:', err.message);
    process.exit(1);
  });
}
