// Denní akutní ambulance v nemocnicích — discovery crawler nad weby nemocnic.
//
// PROČ TO EXISTUJE: pohotovost ze zákona (vyhláška č. 380/2025 Sb.) slouží až
// PO ordinačních hodinách. V pondělí v deset dopoledne tedy nemá otevřeno
// skoro nic a odpověď „nejbližší otevřená pohotovost je 115 km daleko“ je sice
// pravdivá, ale k ničemu — protože ve stejném městě má otevřeno nemocniční
// úrazová ambulance, kam se s naraženou rukou přesně v deset dopoledne chodí.
// Bez provozní doby těch ambulancí odpovídá stránka na jinou otázku, než jakou
// člověk položil.
//
// PROČ CRAWLER A NE REGISTR: provozní dobu nevede žádná celostátní otevřená
// data. Ověřeno:
//   • NRPZS open-data distribuce (NR-01-06) je jediná v celé sérii NR-01-NRPZS
//     a ordinační hodiny nemá — má adresu, GPS, telefon, obory, nic víc.
//   • REST API nrpzs.uzis.cz podle dokumentace ordinační hodiny „pro vybraná
//     zařízení“ vrací, ale host je dlouhodobě nedostupný (503 / connection
//     reset — viz poznámka v ingest/config.js) a jeho plnění závisí na tom,
//     jestli je poskytovatel vyplnil v Jednotné technologické platformě MZ.
//   • Zdravotní pojišťovny zveřejňují jen pohotovosti, ne denní ambulance.
// Zbývá tedy web každé nemocnice.
//
// CO TENHLE SOUBOR DĚLÁ A CO NE: hledá KANDIDÁTY, nepublikuje fakta. Projde
// weby nemocnic, najde stránky, které mluví o úrazové / chirurgické / dětské
// pohotovostní ambulanci, a vytáhne z nich časové rozsahy i s okolní větou.
// Výstup je vstup pro redakci, ne pro `data/`.
//
// PROČ NE ROVNOU DO DAT: strojově vytažené číslo z nemocničního webu je
// nespolehlivé způsobem, který se nedá odchytit testem. Ve zkušebním běhu
// se mezi nálezy míchaly polední pauzy („12:30–14:00“), doby návštěv na
// lůžkovém oddělení, hodiny odběrové místnosti a rozsahy typu „7:00–7:00“.
// Rozdíl mezi „ambulance má otevřeno“ a „na tomhle webu se vyskytla dvě čísla
// s pomlčkou“ pozná jen člověk. Publikovaná provozní doba proto vzniká ručním
// zápisem do `ingest/mapping/nemocnicni-ambulance.json` se `source.url`
// a `verified_at`; tenhle crawler redakci jen řekne, kam se podívat.
//
// Vstup:  ingest/cache/nrpzs_raw.json (sdílená raw cache NRPZS)
// Výstup: ingest/cache/ambulance_kandidati.json

import { CONFIG } from '../config.js';
import { readCacheIfFresh, writeCache } from '../lib/cache.js';

const RAW_CACHE = 'nrpzs_raw.json';
const OUT_CACHE = 'ambulance_kandidati.json';

/** Obory, u kterých má smysl denní akutní ambulanci vůbec hledat. */
const RELEVANT_OBORY = ['chirurgie', 'praktické lékařství pro děti a dorost', 'dětské lékařství'];

/**
 * Klíčová slova akutní denní péče. Schválně NE „ambulance“ samotné —
 * nemocnice jich má padesát a kardiologická poradna sem nepatří.
 */
const ACUTE_RE = /(urazov|traumatologick|chirurgick[aáyé] ambulan|ambulance chirurg|pohotovostn[ií] ambulan|akutni ambulan|urgentn[ií] prijem|prvni pomoc|neodkladn)/;

/** Odkazy, které stojí za rozkliknutí (text nebo URL). */
const LINK_RE = /(urazov|traumatolog|chirurg|pohotovost|urgent|ambulance|prvni-pomoc|prvni pomoc|ordinacni|pro-pacienty|pro pacienty)/;

/** Rozsah typu 7:00–15:00, 07.00 - 15.00, 8:00—20:00. */
const RANGE_RE = /\b([01]?\d|2[0-4])[.:]([0-5]\d)\s?(?:-|–|—|až)\s?([01]?\d|2[0-4])[.:]([0-5]\d)\b/g;

/** Věci, které v okolí času znamenají „tohle nejsou hodiny ambulance“. */
const NOISE_RE = /(navstevn[ií] (doba|hodiny)|navstevy (na )?(luzkov|oddelen)|obed|polednj?[ií] (pauza|prestavka)|sanitac|uklid|parkovan|jidelna|bufet|kavarna|pokladna|vratnic)/;

export function norm(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** HTML → holý text (bez skriptů a stylů), se zachovanými mezerami. */
export function stripHtml(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** Odkazy z HTML, které vypadají na stránku akutní ambulance. */
export function candidateLinks(html, baseUrl) {
  const out = new Map();
  const re = /<a[^>]+href=["']([^"'#\s]+)["'][^>]*>([\s\S]{0,160}?)<\/a>/gi;
  let m;
  while ((m = re.exec(String(html ?? ''))) !== null) {
    const href = m[1];
    if (/^(mailto|tel|javascript):/i.test(href)) continue;
    if (/\.(pdf|jpg|jpeg|png|gif|zip|docx?|xlsx?)$/i.test(href)) continue;
    const text = norm(stripHtml(m[2]));
    const hay = `${text} ${norm(href)}`;
    if (!LINK_RE.test(hay)) continue;
    let abs;
    try {
      abs = new URL(href, baseUrl).href;
    } catch {
      continue;
    }
    // Zůstaň na doméně nemocnice — odkaz na facebook.com nám hodiny nedá.
    try {
      if (new URL(abs).hostname !== new URL(baseUrl).hostname) continue;
    } catch {
      continue;
    }
    // Skóre: konkrétní „úrazová“ je lepší kandidát než obecné „pro pacienty“.
    const score = /(urazov|traumatolog|pohotovost|urgent)/.test(hay) ? 2 : 1;
    const prev = out.get(abs);
    if (!prev || prev.score < score) out.set(abs, { url: abs, text: text.slice(0, 80), score });
  }
  return [...out.values()].sort((a, b) => b.score - a.score);
}

/**
 * Ořízne kontext kolem nalezeného času tak, aby do něj nespadl čas SOUSEDNÍHO
 * pracoviště.
 *
 * Naivní okno pevné šířky propustí hodiny kardiologické poradny jen proto, že
 * hned za nimi začíná odstavec o úrazové ambulanci. Řez se proto vede na
 * hranici věty — ale jen tam, kde na druhé straně opravdu leží jiný časový
 * rozsah. Kdyby se řezalo na každé tečce, zmizel by nadpis „Úrazová
 * pohotovost.“ nad rozpisem, který k němu patří.
 *
 * Konce řádků hranice nejsou: nemocniční weby dávají nadpis a hodiny do dvou
 * sousedních elementů, takže po `stripHtml` je mezi nimi jen nový řádek.
 */
export function trimToSentence(src, matchStart, matchEnd, from, to) {
  const BOUNDARY = /[.!?]\s+(?=[A-ZÁ-Ž])/g;
  // Vlastní instance, ne sdílená RANGE_RE: ta si nese `lastIndex` z běžící
  // smyčky v extractHourCandidates a její vynulování by smyčku zacyklilo.
  const hasRange = (text) => new RegExp(RANGE_RE.source).test(text);

  let start = from;
  const before = src.slice(from, matchStart);
  BOUNDARY.lastIndex = 0;
  for (const b of before.matchAll(BOUNDARY)) {
    // Jiný čas před touhle hranicí ⇒ patří jinému pracovišti, uřízni.
    if (hasRange(before.slice(0, b.index))) start = from + b.index + b[0].length;
  }

  let end = to;
  const after = src.slice(matchEnd, to);
  BOUNDARY.lastIndex = 0;
  for (const b of after.matchAll(BOUNDARY)) {
    if (hasRange(after.slice(b.index))) { end = matchEnd + b.index + 1; break; }
  }

  return { start, end };
}

export function extractHourCandidates(text, { window = 220 } = {}) {
  const src = String(text ?? '');
  const out = [];
  const seen = new Set();
  RANGE_RE.lastIndex = 0;
  let m;
  while ((m = RANGE_RE.exec(src)) !== null) {
    const matchEnd = m.index + m[0].length;
    const { start: from, end: to } = trimToSentence(
      src,
      m.index,
      matchEnd,
      Math.max(0, m.index - window),
      Math.min(src.length, matchEnd + window),
    );
    const ctxNorm = norm(src.slice(from, to));
    if (!ACUTE_RE.test(ctxNorm)) continue;
    if (NOISE_RE.test(ctxNorm)) continue;
    const snippet = src.slice(from, to).replace(/\s+/g, ' ').trim();
    const key = `${m[0]}|${snippet.slice(0, 60)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ range: m[0], snippet });
    if (out.length >= 12) break;
  }
  return out;
}

/** Nemocnice z NRPZS, u kterých má smysl hledat denní akutní ambulanci. */
export function hospitalTargets(rows) {
  const byIco = new Map();
  for (const r of rows) {
    if (!norm(r.ZZ_druh_nazev).includes('nemocnice')) continue;
    const obor = norm(r.ZZ_obor_pece);
    if (!RELEVANT_OBORY.some(o => obor.includes(norm(o)))) continue;
    if (!norm(r.ZZ_forma_pece).includes('ambulantni')) continue;
    const web = String(r.poskytovatel_web ?? '').trim();
    if (!web) continue;
    const ico = String(r.poskytovatel_ICO ?? '').trim();
    if (!ico || byIco.has(ico)) continue;
    byIco.set(ico, {
      ico,
      nazev: String(r.poskytovatel_nazev ?? '').trim(),
      web: web.startsWith('http') ? web : `http://${web}`,
      obec: String(r.ZZ_obec ?? '').trim(),
      kraj: String(r.ZZ_kraj_nazev ?? '').trim(),
      telefon: String(r.poskytovatel_telefon ?? '').trim() || null,
    });
  }
  return [...byIco.values()];
}

async function getHtml(url, { timeoutMs = 20_000, fetchImpl = globalThis.fetch } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': CONFIG.uzis.user_agent, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: ac.signal,
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const ct = res.headers?.get?.('content-type') ?? '';
    if (ct && !/html|text/i.test(ct)) return { error: `content-type ${ct}` };
    return { html: await res.text(), url: res.url ?? url };
  } catch (e) {
    return { error: String(e?.message ?? e).slice(0, 60) };
  } finally {
    clearTimeout(timer);
  }
}

/** Projde jednu nemocnici: homepage → nejslibnější podstránky → kandidáti. */
export async function crawlHospital(target, opts = {}) {
  const { maxPages = 4, fetchImpl, timeoutMs } = opts;
  const home = await getHtml(target.web, { fetchImpl, timeoutMs });
  if (home.error) return { ...target, stav: 'web nedostupny', detail: home.error, nalezy: [] };

  const pages = [{ url: home.url, html: home.html }];
  for (const link of candidateLinks(home.html, home.url).slice(0, maxPages - 1)) {
    const page = await getHtml(link.url, { fetchImpl, timeoutMs });
    if (page.error) continue;
    pages.push({ url: page.url, html: page.html });
  }

  const nalezy = [];
  for (const page of pages) {
    const text = stripHtml(page.html);
    const hits = extractHourCandidates(text);
    if (hits.length) nalezy.push({ url: page.url, kandidati: hits });
  }
  const stav = nalezy.length
    ? 'kandidati nalezeni'
    : pages.length > 1
      ? 'stranky prosly, hodiny nenalezeny'
      : 'zadna slibna podstranka';
  return { ...target, stav, stranek: pages.length, nalezy };
}

/**
 * Projde weby všech relevantních nemocnic a uloží kandidáty do cache.
 * Není součástí `npm run ingest` — pouští se ručně při redakční revizi.
 */
export async function fetchAmbulanceHodiny(opts = {}) {
  const { force = false, limit = 0, concurrency = 4, ttlHours = 24 * 30 } = opts;
  if (!force) {
    const cached = readCacheIfFresh(OUT_CACHE, ttlHours);
    if (cached) return cached;
  }

  const raw = readCacheIfFresh(RAW_CACHE, 24 * 365);
  if (!raw) throw new Error('Chybí ingest/cache/nrpzs_raw.json — spusť nejdřív `npm run fetch:pohotovosti-nrpzs`.');
  const rows = Array.isArray(raw) ? raw : Object.values(raw);

  let targets = hospitalTargets(rows);
  if (limit > 0) targets = targets.slice(0, limit);

  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const target = targets[cursor++];
      results.push(await crawlHospital(target, opts));
      if (opts.onProgress) opts.onProgress(results.length, targets.length);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  const payload = {
    generated_at: new Date().toISOString(),
    nemocnic: targets.length,
    s_kandidaty: results.filter(r => r.nalezy.length).length,
    nedostupnych: results.filter(r => r.stav === 'web nedostupny').length,
    poznamka: 'Kandidáti pro redakční ověření. NEPUBLIKOVAT přímo — viz hlavička ingest/fetchers/ambulance_hodiny.js.',
    vysledky: results.sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs')),
  };
  writeCache(OUT_CACHE, payload);
  return payload;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const force = process.argv.includes('--force');
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;
  fetchAmbulanceHodiny({
    force,
    limit,
    onProgress: (done, total) => {
      if (done % 10 === 0 || done === total) process.stderr.write(`  ${done}/${total}\n`);
    },
  })
    .then(p => {
      console.log(`Nemocnic: ${p.nemocnic} · s kandidáty: ${p.s_kandidaty} · nedostupných: ${p.nedostupnych}`);
      console.log('→ ingest/cache/ambulance_kandidati.json');
    })
    .catch(e => {
      console.error(e.message);
      process.exit(1);
    });
}
