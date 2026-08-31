// VZP · celostátní seznam pohotovostí — jediný zdroj s ordinační dobou.
//
// KONTEXT (proč zrovna pojišťovna): zákonem č. 290/2025 Sb. (novela zákona
// č. 372/2011 Sb. o zdravotních službách) přešla od 1. 1. 2026 odpovědnost
// za organizaci pohotovostní služby z krajů na ZDRAVOTNÍ POJIŠŤOVNY.
// Kraje své přehledy většinou přestaly aktualizovat; VZP jako největší
// pojišťovna provozuje veřejný celostátní vyhledávač
//   https://pohotovosti.vzp.cz/
// se čtyřmi typy služby a ordinační dobou na každý den v týdnu.
//
// CO ODSUD BEREME: název, typ, adresu, kraj a okres, telefon, web a hlavně
// otevírací dobu po dnech. Souřadnice zdroj nemá — ty přicházejí z NRPZS
// (viz `nrpzs_pohotovosti.js`) a spojují se v `transform_pohotovosti.js`.
//
// FORMÁT ZDROJE: server-rendered HTML, žádné veřejné API. Parsujeme
// defenzivně přes cheerio a výsledek necháváme projít prahovou kontrolou
// (`MIN_EXPECTED`) — kdyby VZP přestavěla šablonu, ingest spadne nahlas
// místo aby tiše smazal půlku pohotovostí z webu.
//
// SLUŠNOST K ZDROJI: jeden požadavek po druhém s pauzou CONFIG.throttle_ms
// a hlavičkou User-Agent projektu. Celkem ~300 požadavků jednou týdně.
//
// Výstup: ingest/cache/vzp_pohotovosti.json

import * as cheerio from 'cheerio';
import { CONFIG } from '../config.js';
import { fetchWithRetry } from '../lib/http.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';
import { emptyWeek, parseRanges, normalizeTime, makeHours } from '../lib/pohotovosti-hours.js';

const CACHE = 'vzp_pohotovosti.json';
const BASE = 'https://pohotovosti.vzp.cz';

/** Typy služby, jak je číslují URL parametry vyhledávače VZP. */
export const VZP_TYPES = {
  1: 'lps_dospeli',
  2: 'lps_deti',
  3: 'zubni',
  4: 'lekarna',
};

/** Pod tímhle počtem považujeme stažení za rozbité, ne za „ubylo pohotovostí“. */
const MIN_EXPECTED = 150;

/** Hlavičky tabulky v detailu → klíče týdne. */
const DAY_LABELS = {
  pondeli: 'mon',
  utery: 'tue',
  streda: 'wed',
  ctvrtek: 'thu',
  patek: 'fri',
  sobota: 'sat',
  nedele: 'sun',
  svatek: 'holiday',
};

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Rozparsuje stránku seznamu. Vrací jeden záznam na řádek tabulky.
 * @param {string} html
 * @returns {Array<{id: string, name: string, address: string, kraj: string, okres: string, typeLabel: string}>}
 */
export function parseListPage(html) {
  const $ = cheerio.load(html);
  const out = [];

  $('table tbody tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 4) return;

    const link = $(tds[3]).find('a[href*="/seznam-pohotovosti/"]').attr('href') ?? '';
    // Identifikátor může být víceúrovňový: „01003726_1“ u pevné pohotovosti,
    // ale „rotace/283“ u kraje, kde se služba střídá. Bez celé cesty by se
    // všech devět krajských rotací sesypalo na jedno „rotace“.
    const id = /\/seznam-pohotovosti\/([\w/-]+)/.exec(link)?.[1];
    if (!id) return;

    // První buňka: <strong>název</strong><br>adresa
    const nameCell = $(tds[0]);
    const name = nameCell.find('strong').first().text().trim();
    const address = nameCell.contents()
      .filter((_, n) => n.type === 'text')
      .map((_, n) => $(n).text().trim())
      .get()
      .filter(Boolean)
      .join(' ')
      .trim();

    // Druhá buňka: kraj<br>okres
    const geoParts = $(tds[1]).html()?.split(/<br\s*\/?>/i).map(s => cheerio.load(`<i>${s}</i>`)('i').text().trim()) ?? [];

    out.push({
      id,
      name,
      address,
      kraj: geoParts[0] ?? '',
      okres: geoParts[1] ?? '',
      typeLabel: $(tds[2]).text().trim(),
    });
  });

  return out;
}

/**
 * Rozparsuje detail jedné pohotovosti — kontakty a rozvrh po dnech.
 *
 * Stránka je dvojice tabulek „štítek | hodnota“ a „den | otevírací doba“.
 * Bereme je podle textu štítku, ne podle pořadí buněk — pořadí se v šabloně
 * mění a index by tiše přiřadil telefon do webu.
 *
 * @param {string} html
 * @returns {{ workplace: string|null, phone: string|null, web: string|null, week: object, anyHours: boolean }}
 */
export function parseDetailPage(html) {
  const $ = cheerio.load(html);
  const week = emptyWeek();
  let workplace = null;
  let phone = null;
  let web = null;
  let anyHours = false;

  $('tr').each((_, tr) => {
    const cells = $(tr).find('td, th');
    if (cells.length < 2) return;

    const label = norm($(cells[0]).text());
    const value = $(cells[1]).text().trim();
    if (!label) return;

    if (label.startsWith('nazev pracoviste')) workplace = value || null;
    else if (label.startsWith('telefon')) phone = value || null;
    else if (label.startsWith('web')) web = /neuvedeno/i.test(value) ? null : (value || null);

    const dayKey = DAY_LABELS[label];
    if (dayKey) {
      const ranges = parseRanges(value);
      week[dayKey] = ranges;
      if (ranges.length) anyHours = true;
    }
  });

  return { workplace, phone, web, week, anyHours };
}

/**
 * Rozcestník rotace: v devíti krajích se zubní (a v osmi lékárenská)
 * pohotovost střídá mezi ordinacemi, takže VZP místo jedné adresy vypíše
 * seznam nejbližších termínů. Vrací data ve tvaru YYYY-MM-DD.
 * @returns {string[]}
 */
export function parseRotationIndex(html) {
  const $ = cheerio.load(html);
  const dates = new Set();
  $('a[href*="/seznam-pohotovosti/rotace/"]').each((_, a) => {
    const m = /\/rotace\/\d+\/(\d{4}-\d{2}-\d{2})$/.exec($(a).attr('href') ?? '');
    if (m) dates.add(m[1]);
  });
  return [...dates].sort();
}

/**
 * Kdo slouží v daný den. Struktura řádku je stejná jako v běžném seznamu,
 * jen odkaz míří na `/rotace/{id}/{datum}/{poradi}`.
 */
export function parseRotationDatePage(html) {
  return parseListPage(html).filter(r => r.id.startsWith('rotace/'));
}

/**
 * Detail sloužící ordinace: kontakty plus tabulka „Datum | Od | Do“.
 * @returns {{ workplace: string|null, phone: string|null, web: string|null,
 *             shifts: Array<{date: string, ranges: Array<[string,string]>}> }}
 */
export function parseRotationDetail(html) {
  const $ = cheerio.load(html);
  let workplace = null;
  let phone = null;
  let web = null;
  const shifts = [];

  $('tr').each((_, tr) => {
    const cells = $(tr).find('td, th');
    if (cells.length === 2) {
      const label = norm($(cells[0]).text());
      const value = $(cells[1]).text().trim();
      if (label.startsWith('nazev pracoviste')) workplace = value || null;
      else if (label.startsWith('telefon')) phone = value || null;
      else if (label.startsWith('web')) web = /neuvedeno/i.test(value) ? null : (value || null);
      return;
    }
    if (cells.length !== 3) return;

    // Řádek služby: „5. 9. 2026 | 8:00 | 12:00“. Hlavičku pozná podle toho,
    // že první buňka není datum.
    const date = parseCzechDate($(cells[0]).text());
    if (!date) return;
    const from = normalizeTime($(cells[1]).text());
    const to = normalizeTime($(cells[2]).text());
    // Tvar { from, to, ranges } je společný kontrakt rotační doby napříč
    // zdroji (viz lib/pohotovosti-hours.js) — jednodenní služba má from = to.
    if (from && to) shifts.push({ from: date, to: date, ranges: [[from, to]] });
  });

  return { workplace, phone, web, shifts };
}

/** „5. 9. 2026“ → „2026-09-05“. */
export function parseCzechDate(raw) {
  const m = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(String(raw ?? ''));
  if (!m) return null;
  return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}

/**
 * Stáhne jeden krajský rozpis rotace i s ordinacemi, které v jednotlivé dny slouží.
 *
 * @param {{id: string, kraj: string, category: string, name: string}} pointer
 * @param {{ fetchImpl?: typeof fetch, throttleMs?: number, maxDates?: number }} [opts]
 */
export async function fetchRotation(pointer, opts = {}) {
  const { fetchImpl, throttleMs = CONFIG.throttle_ms, maxDates = 10 } = opts;

  const indexHtml = await fetchWithRetry(`${BASE}/seznam-pohotovosti/${pointer.id}`, { parse: 'text', fetchImpl });
  const dates = parseRotationIndex(indexHtml).slice(0, maxDates);
  if (throttleMs) await sleep(throttleMs);

  // Ordinace se v rozpisu opakuje; detail tahej jednou a pak jen doplňuj termíny.
  const byPractice = new Map();

  for (const date of dates) {
    const dayHtml = await fetchWithRetry(`${BASE}/seznam-pohotovosti/${pointer.id}/${date}`, { parse: 'text', fetchImpl });
    const rows = parseRotationDatePage(dayHtml);
    if (throttleMs) await sleep(throttleMs);

    for (const row of rows) {
      const key = `${row.name}|${row.address}`;
      if (!byPractice.has(key)) {
        const detailHtml = await fetchWithRetry(`${BASE}/seznam-pohotovosti/${row.id}`, { parse: 'text', fetchImpl });
        const detail = parseRotationDetail(detailHtml);
        if (throttleMs) await sleep(throttleMs);
        byPractice.set(key, {
          name: row.name,
          address: row.address,
          kraj: row.kraj,
          okres: row.okres,
          workplace: detail.workplace,
          phone: detail.phone,
          web: detail.web,
          detail_url: `${BASE}/seznam-pohotovosti/${row.id}`,
          shifts: [],
        });
        // Detail nese vlastní rozpis termínů té ordinace — bereme ho celý,
        // je úplnější než procházení jednotlivých dnů, takže se z dne
        // samotného už nic dopisovat nemusí.
        for (const sh of detail.shifts) byPractice.get(key).shifts.push(sh);
      }
    }
  }

  return {
    rotation_id: pointer.id,
    kraj: pointer.kraj,
    category: pointer.category,
    label: pointer.name,
    index_url: `${BASE}/seznam-pohotovosti/${pointer.id}`,
    dates,
    practices: [...byPractice.values()].map(p => ({
      ...p,
      shifts: p.shifts
        .filter(s => s.ranges.length)
        .sort((a, b) => a.from.localeCompare(b.from)),
    })),
  };
}

/**
 * Projde stránkování jednoho typu služby.
 *
 * POZOR: vyhledávač na `stranka` mimo rozsah nevrátí prázdno, ale zopakuje
 * poslední stránku. Konec proto poznáme podle toho, že nepřibyl žádný nový
 * identifikátor — ne podle prázdné odpovědi.
 */
export async function fetchTypeListing(type, opts = {}) {
  const { fetchImpl, maxPages = 40, throttleMs = CONFIG.throttle_ms } = opts;
  const seen = new Set();
  const rows = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `${BASE}/seznam-pohotovosti/?queryTyp=${type}&queryKraj=&stranka=${page}`;
    const html = await fetchWithRetry(url, { parse: 'text', fetchImpl });
    const parsed = parseListPage(html);

    const fresh = parsed.filter(r => !seen.has(r.id));
    if (!fresh.length) break;

    for (const r of fresh) {
      seen.add(r.id);
      rows.push({ ...r, category: VZP_TYPES[type] ?? null });
    }
    if (throttleMs) await sleep(throttleMs);
  }

  return rows;
}

/**
 * Hlavní vstupní bod.
 * @param {{ force?: boolean, fetchImpl?: typeof fetch, throttleMs?: number, ttlHours?: number }} [opts]
 */
export async function fetchVzpPohotovosti(opts = {}) {
  const { force = false, fetchImpl, throttleMs = CONFIG.throttle_ms, ttlHours = CONFIG.cache.ttl_hours } = opts;

  const cached = force ? null : readCacheIfFresh(CACHE, ttlHours);
  if (cached) {
    console.log(`  [vzp] using fresh cache (${cached.places?.length ?? 0} míst)`);
    return { ...cached, fromCache: true };
  }

  const listing = [];
  for (const type of Object.keys(VZP_TYPES)) {
    const rows = await fetchTypeListing(Number(type), { fetchImpl, throttleMs });
    console.log(`  [vzp] typ ${type} (${VZP_TYPES[type]}): ${rows.length} míst`);
    listing.push(...rows);
  }

  if (listing.length < MIN_EXPECTED) {
    throw new Error(`[vzp] staženo jen ${listing.length} míst (min ${MIN_EXPECTED}) — šablona VZP se nejspíš změnila`);
  }

  // Rozcestníky rotace nejsou místa — jsou to odkazy na krajský rozpis.
  // Řeší se zvlášť (mají jiné stránky i jiný tvar provozní doby).
  const rotationPointers = listing.filter(r => r.id.startsWith('rotace'));
  const fixedListing = listing.filter(r => !r.id.startsWith('rotace'));

  const places = [];
  let withHours = 0;
  for (const row of fixedListing) {
    const url = `${BASE}/seznam-pohotovosti/${row.id}`;
    const html = await fetchWithRetry(url, { parse: 'text', fetchImpl });
    const detail = parseDetailPage(html);
    if (detail.anyHours) withHours += 1;

    places.push({
      vzp_id: row.id,
      // Identifikátor detailu je „{IČO}_{typ}“ — IČO je klíč na NRPZS.
      ico: /^(\d{6,8})_/.exec(row.id)?.[1] ?? null,
      category: row.category,
      type_label: row.typeLabel,
      name: row.name,
      workplace: detail.workplace,
      address: row.address,
      kraj: row.kraj,
      okres: row.okres,
      phone: detail.phone,
      web: detail.web,
      detail_url: url,
      hours: detail.anyHours ? makeHours({ kind: 'weekly', week: detail.week }) : null,
    });

    if (throttleMs) await sleep(throttleMs);
  }

  places.sort((a, b) => a.vzp_id.localeCompare(b.vzp_id));

  const rotations = [];
  for (const pointer of rotationPointers) {
    try {
      const rot = await fetchRotation(pointer, { fetchImpl, throttleMs });
      rotations.push(rot);
      console.log(`  [vzp] rotace ${rot.kraj} (${rot.category}): ${rot.practices.length} ordinací, ${rot.dates.length} termínů`);
    } catch (err) {
      // Rozpis jednoho kraje nesmí shodit celé stažení — pevné pohotovosti
      // jsou důležitější a bez rotace se stránka obejde (řekne to nahlas).
      console.warn(`  [vzp] rotace ${pointer.kraj} SELHALA: ${err.message}`);
    }
  }
  rotations.sort((a, b) => a.rotation_id.localeCompare(b.rotation_id));

  const payload = {
    generated_at: new Date().toISOString(),
    source: { name: 'VZP ČR — Pohotovosti', url: `${BASE}/` },
    total: places.length,
    with_hours: withHours,
    rotations_total: rotations.length,
    places,
    rotations,
  };

  writeCache(CACHE, payload);
  console.log(`  [vzp] ${places.length} pevných míst (${withHours} s ordinační dobou) + ${rotations.length} krajských rozpisů rotace`);
  return { ...payload, fromCache: false };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchVzpPohotovosti({ force: process.argv.includes('--force') }).catch(err => {
    console.error('[vzp] FAIL:', err.message);
    process.exit(1);
  });
}
