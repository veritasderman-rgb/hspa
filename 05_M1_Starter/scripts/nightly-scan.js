// Noční triážní skener webu HSPA Monitor.
//
// Deterministická, OFFLINE část noční rutiny (viz PROMPT_NIGHTLY_ROUTINE.md):
// levně projde všechny PUBLIKOVANÉ články a vyrobí tříděný worklist, podle
// kterého pak agent (Claude Code) jedná. Skener sám NIC needituje a nechodí
// na síť — jen čte a reportuje. Akce (oprava, kontrola odkazu, flag) je na
// agentovi podle playbooku.
//
// Co hledá:
//   1. missing-cover     — publikovaný článek bez assets/covers/{slug}.png
//                          (auto-fixable: generate-article-cover + inject)
//   2. topical-expired   — articles.json topical_until už nastalo (téma „vypršelo")
//   3. date-passed       — v textu zmíněné konkrétní datum (D. M. RRRR), které
//                          už uplynulo → článek možná popisuje událost jako
//                          budoucí, ač už nastala (silný signál „needs update")
//   4. year-past         — „do roku RRRR / v roce RRRR" s rokem < letošní
//   5. stale-date        — publikováno před > STALE_MONTHS měsíci (nízká priorita)
//   6. ext-links         — inventář externích odkazů (zdroje) ke kontrole agentem,
//                          s prioritou pro legislativní/EU domény
//   7. claims-drift      — tvrzení z registru data/claims.json (check=auto)
//                          se odchyluje od aktuální hodnoty indikátoru přes toleranci
//   8. claims-stale      — indikátor má novější rok než tvrzení; hodnota zatím
//                          v toleranci (informativní)
//   9. claims-missing    — publikovaný článek bez záznamu v registru tvrzení
//
// Výstup:
//   - reports/nightly-audit-RRRR-MM-DD.md  (čitelný report)
//   - reports/nightly-audit-RRRR-MM-DD.json (strojový worklist pro agenta)
//   - stdout: krátké shrnutí
//
// Respektování auditu: článek s `audit.last_reviewed` mladším než
// REVIEW_SKIP_DAYS (14 dní) se ve `check-sources` PŘESKOČÍ (sladěno s triážním
// pravidlem v PROMPT_NIGHTLY_ROUTINE.md — „přeskoč články auditované < 14 dní").
// `date-passed` a `topical-expired` se NEpřeskakují (nové časové signály).
//
// Použití:
//   node scripts/nightly-scan.js              # plný sken, zapíše report
//   node scripts/nightly-scan.js --stdout     # jen vypíše, nezapisuje soubory
//   node scripts/nightly-scan.js --slug=clanek-foo.html   # jen jeden článek
//   node scripts/nightly-scan.js --no-skip-reviewed       # vč. recentně auditovaných

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ARTICLES_JSON = resolve(ROOT, 'data/articles.json');
const INDICATORS_JSON = resolve(ROOT, 'data/indicators.json');
const CLAIMS_JSON = resolve(ROOT, 'data/claims.json');
const COVERS_DIR = resolve(ROOT, 'assets/covers');
const REPORTS_DIR = resolve(ROOT, 'reports');
const INDICATOR_CARDS_DIR = resolve(ROOT, 'indicators');
const DRAFTS_DIR = resolve(ROOT, 'drafts');
// Sidecar log kontrol odkazů mimo články (#931): karty a drafty nemají
// auditní datum v articles.json, takže „kdy naposledy zkontrolováno" žije
// tady. Rutina po kontrole souboru zapíše { "<relativní cesta>": "YYYY-MM-DD" }.
const LINK_CHECK_LOG = resolve(ROOT, 'data/link-check-log.json');

const STALE_MONTHS = 12;        // publikováno dávno → připomenout revizi
const MAX_DATE_HITS = 6;        // strop zmínek dat na článek (proti šumu)
const MAX_EXT_LINKS = 12;       // strop externích odkazů na článek
const REVIEW_SKIP_DAYS = 14;    // článek auditovaný < 14 dní → přeskoč check-sources
                                // (sladěno s triážním pravidlem PROMPT_NIGHTLY_ROUTINE.md;
                                // date-passed/topical-expired se NEpřeskakují — to jsou
                                // nové časové signály, které review nemohla znát)

// Domény, jejichž odkazy mají při kontrole přednost (legislativa, EU, regulátor).
const PRIORITY_LINK_HINTS = [
  'zakonyprolidi.cz', 'e-sbirka', 'esipa.cz', 'eur-lex.europa.eu',
  'psp.cz', 'senat.cz', 'vlada.cz', 'mzcr.cz', 'mzd.gov.cz', 'ncez',
  'sukl.cz', 'uzis.cz', 'health.ec.europa.eu', 'ec.europa.eu',
];

const MONTHS_CS = {
  'ledna': 1, 'leden': 1, 'února': 2, 'únor': 2, 'března': 3, 'březen': 3,
  'dubna': 4, 'duben': 4, 'května': 5, 'květen': 5, 'června': 6, 'červen': 6,
  'července': 7, 'červenec': 7, 'srpna': 8, 'srpen': 8, 'září': 9,
  'října': 10, 'říjen': 10, 'listopadu': 11, 'listopad': 11,
  'prosince': 12, 'prosinec': 12,
};

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function loadArticles() {
  return JSON.parse(readFileSync(ARTICLES_JSON, 'utf8')).articles ?? [];
}

let _claimsCache = null;
function loadClaimsByArticle() {
  if (_claimsCache) return _claimsCache;
  let list = [];
  if (existsSync(CLAIMS_JSON)) {
    list = JSON.parse(readFileSync(CLAIMS_JSON, 'utf8')).claims ?? [];
  }
  const map = new Map();
  for (const c of list) {
    if (!map.has(c.article)) map.set(c.article, []);
    map.get(c.article).push(c);
  }
  _claimsCache = { map, total: list.length };
  return _claimsCache;
}

/**
 * Porovná tvrzení z registru (data/claims.json) s aktuální hodnotou indikátoru.
 * Jen pro check=auto (tj. relation=exact — přímá citace hodnoty indikátoru).
 *
 * @returns {{status: 'ok'|'drift'|'stale', deviation_pct?: number}}
 *   drift = relativní odchylka přes tolerance_pct (default 2 %)
 *   stale = hodnota zatím v toleranci, ale indikátor má novější rok než as_of
 */
export function checkClaim(claim, indicator) {
  if (claim.check !== 'auto' || !indicator || indicator.value == null) return { status: 'ok' };
  const tol = claim.tolerance_pct ?? 2;
  const val = Number(claim.value);
  if (!Number.isFinite(val)) return { status: 'ok' };
  const dev = (ref) => ref === 0
    ? (val === 0 ? 0 : Infinity)
    : Math.abs(val - ref) / Math.abs(ref) * 100;

  // Historické tvrzení (as_of starší než aktuální rok indikátoru) se porovnává
  // proti trendovému bodu daného roku — správná citace historie NENÍ drift.
  if (claim.as_of != null && indicator.year != null && claim.as_of < indicator.year) {
    const tp = (indicator.trend ?? []).find(t => t.year === claim.as_of);
    if (tp != null && Number.isFinite(Number(tp.value))) {
      const devH = dev(Number(tp.value));
      return devH > tol
        ? { status: 'drift', deviation_pct: devH, ref: `trend ${claim.as_of}: ${tp.value}` }
        : { status: 'ok', deviation_pct: devH };
    }
  }

  const cur = Number(indicator.value);
  if (!Number.isFinite(cur)) return { status: 'ok' };
  const devPct = dev(cur);
  if (devPct > tol) return { status: 'drift', deviation_pct: devPct };
  if (claim.as_of != null && indicator.year != null && indicator.year > claim.as_of && val !== cur) {
    return { status: 'stale', deviation_pct: devPct };
  }
  return { status: 'ok', deviation_pct: devPct };
}

let _indicatorsCache = null;
function loadIndicatorsById() {
  if (_indicatorsCache) return _indicatorsCache;
  const list = JSON.parse(readFileSync(INDICATORS_JSON, 'utf8')).indicators ?? [];
  _indicatorsCache = new Map(list.map(i => [i.id, i]));
  return _indicatorsCache;
}

// Ověřené falešné poplachy indicator-driftu (odkazy-atribuce, kde se hodnota
// indikátoru záměrně necituje) — skener je přestane hlásit. Zdroj:
// scripts/nightly-scan-ignore.json. Klíč = article + "::" + indicator.
let _driftIgnoreCache = null;
function loadDriftIgnore() {
  if (_driftIgnoreCache) return _driftIgnoreCache;
  _driftIgnoreCache = new Set();
  try {
    const doc = JSON.parse(readFileSync(resolve(ROOT, 'scripts', 'nightly-scan-ignore.json'), 'utf8'));
    for (const e of doc.ignore ?? []) {
      if (e && e.article && e.indicator) _driftIgnoreCache.add(e.article + '::' + e.indicator);
    }
  } catch { /* soubor nemusí existovat — pak se nic neignoruje */ }
  return _driftIgnoreCache;
}

/** True, když je dvojice (článek, indikátor) na seznamu ověřených falešných poplachů. */
export function isDriftIgnored(article, indicatorId, ignoreSet = loadDriftIgnore()) {
  return ignoreSet.has(article + '::' + indicatorId);
}

/**
 * Varianty zápisu hodnoty indikátoru, jak se může objevit v textu článku:
 * desetinná čárka, zaokrouhlení (2 des. → 1 des. → celé číslo), mezera
 * jako oddělovač tisíců. Např. 4564.4 → ['4564,4', '4 564,4', '4564', '4 564'].
 */
export function valueVariants(value) {
  if (value == null || !Number.isFinite(Number(value))) return [];
  const v = Number(value);
  const out = new Set();
  for (const d of [2, 1, 0]) {
    const fixed = v.toFixed(d).replace('.', ',').replace(/,?0+$/, m => m.includes(',') ? '' : m);
    const plain = v.toFixed(d).replace('.', ',');
    for (const s0 of [fixed, plain]) {
      if (!s0) continue;
      out.add(s0);
      // tisícový oddělovač (mezera i nezlomitelná mezera)
      const [int, dec] = s0.split(',');
      if (int.length > 3) {
        const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        out.add(dec ? `${grouped},${dec}` : grouped);
        out.add((dec ? `${grouped},${dec}` : grouped).replace(/ /g, '\u00a0'));
      }
    }
  }
  return [...out];
}

// Najde nejbližší obklopující <li>...</li>, POKUD leží uvnitř <ul>/<ol>
// s třídou obsahující "article-list-bullets" (seznamy typu „Související
// indikátory" — viz findIndicatorDrift pattern 2). Vrací null, když pozice
// není uvnitř <li>, nebo obklopující seznam tuto třídu nemá (běžné seznamy
// v těle článku se chovají jako dřív — širší okno bez omezení).
function enclosingBulletListItem(html, idx) {
  const liOpen = html.lastIndexOf('<li', idx);
  if (liOpen === -1) return null;
  const liOpenEnd = html.indexOf('>', liOpen);
  if (liOpenEnd === -1 || liOpenEnd > idx) return null; // idx není uvnitř <li ...>
  const liClose = html.indexOf('</li>', idx);
  if (liClose === -1) return null;
  const ulOpen = html.lastIndexOf('<ul', liOpen);
  const olOpen = html.lastIndexOf('<ol', liOpen);
  const listOpen = Math.max(ulOpen, olOpen);
  if (listOpen === -1) return null;
  const listOpenEnd = html.indexOf('>', listOpen);
  if (listOpenEnd === -1) return null;
  const listTag = html.slice(listOpen, listOpenEnd + 1);
  if (!/class="[^"]*article-list-bullets[^"]*"/.test(listTag)) return null;
  // ujisti se, že mezi otevřením seznamu a naší <li není jeho uzávěrka
  // (tj. že jsme opravdu uvnitř TOHOTO seznamu, ne nějakého předchozího)
  const closeUl = html.indexOf('</ul>', listOpen);
  const closeOl = html.indexOf('</ol>', listOpen);
  const nearestClose = [closeUl, closeOl].filter(x => x !== -1).sort((a, b) => a - b)[0];
  if (nearestClose !== undefined && nearestClose < liOpen) return null;
  return { start: liOpen, end: liClose + '</li>'.length };
}

// Najde rozsah <a ...>...</a>, jehož atribut href obsahuje pozici idx.
// openEnd = pozice hned za otevírací „>" (začátek viditelného labelu odkazu).
function currentAnchorSpan(html, idx) {
  const aOpen = html.lastIndexOf('<a', idx);
  if (aOpen === -1) return null;
  const aOpenEnd = html.indexOf('>', aOpen);
  if (aOpenEnd === -1 || aOpenEnd < idx) return null; // idx musí ležet uvnitř otevíracího tagu <a ...>
  const aClose = html.indexOf('</a>', aOpenEnd);
  if (aClose === -1) return null;
  return { start: aOpen, end: aClose + 4, openEnd: aOpenEnd + 1 };
}

// Posune hranici okna tak, aby neřízla doprostřed HTML tagu. Bez tohoto by
// zbytek přeťatého atributu (např. `…per_100k.html">`) přežil stripTags
// (chybí mu odpovídající „<") a jeho číslice by falešně vypadaly jako
// citovaná hodnota.
function safeTagBoundary(html, idx, dir) {
  if (dir === 'back') {
    const lt = html.lastIndexOf('<', idx);
    const gt = html.lastIndexOf('>', idx);
    if (lt > gt) {
      const tagEnd = html.indexOf('>', idx);
      return tagEnd === -1 ? idx : tagEnd + 1;
    }
    return idx;
  }
  const lt = html.indexOf('<', idx);
  const gt = html.indexOf('>', idx);
  if (gt !== -1 && (lt === -1 || gt < lt)) {
    const tagStart = html.lastIndexOf('<', idx);
    return tagStart === -1 ? idx : tagStart;
  }
  return idx;
}

/**
 * Drift-check: pro každý odkaz na indikátor v článku — statickou stránku
 * indikator-{id}.html i fallback indicator.html?id={id} — zkontroluje,
 * zda se v okolním textu (±220 znaků) vyskytuje AKTUÁLNÍ hodnota indikátoru.
 * Flaguje jen případy, kdy okno obsahuje číslo (citaci), ale žádná varianta
 * aktuální hodnoty nesedí — tj. pravděpodobně citace zastaralé hodnoty.
 *
 * Dva doložené vzory šumu (drift-revize 2026-07-07, viz PLAN-PRACE.md F3):
 *   1. Atribuční vzor „<a>Label</a> (RRRR)" — rok v závorce bezprostředně za
 *      odkazem je zdrojová poznámka („Zdroj: … — MMR (2022), HPV (2023)…"),
 *      ne citace hodnoty. Label i rok se odstraní společně — samotný label
 *      často nese vlastní číslo z názvu indikátoru („chřipka 65+", „pneumokok
 *      65+"), takže by bez odstranění labelu zůstal falešný digit-signál.
 *   2. Seznamy „Související indikátory" (<ul class="article-list-bullets">)
 *      — položka často jen odkazuje na téma bez citace hodnoty („kapacita
 *      systému", „vazba na PTSD a depresi"). Okno se u těchto odkazů omezí
 *      na obklopující <li> (jinak by digit ze SOUSEDNÍ položky — typicky
 *      „na 100 000 obyvatel" v názvu jiného indikátoru — falešně spustil
 *      kontrolu) a vlastní label aktuálního odkazu se z kontroly vyloučí
 *      (label = název indikátoru, ne citace).
 */
/**
 * Odstraní z textového okna čísla, která NEJSOU citací hodnoty indikátoru
 * (issue #688 — falešné poplachy indicator-driftu):
 *   - 4ciferné roky 19xx/20xx (samostatné i „(2022)", „roku 2024")
 *   - paragrafové/sbírkové citace „95/2004", „48/1997 Sb."
 *   - číselné skupiny z vlastního slugu indikátoru (per_100k → 100,
 *     _15_19 → 15 a 19, _65 → 65) jako samostatné tokeny vč. rozsahů 15–19
 *   - jmenovatel míry, PŘED nímž nestojí čitatel („lékařů na 1 000 obyvatel",
 *     „sestry / 1 000 obyvatel") — tam je to jen název jednotky, ne citace
 * Vrací očištěný text jen pro TEST přítomnosti citace — na shodu variant
 * hodnoty se dál používá původní okno.
 */
export function stripNonValueNumbers(window, indicatorId = '') {
  let out = String(window);
  // sbírkové citace dřív než roky (95/2004 by jinak nechalo „95/")
  out = out.replace(/\b\d{1,4}\s*\/\s*(19|20)\d{2}\b/g, ' ');
  // samostatné roky
  out = out.replace(/\b(19|20)\d{2}\b/g, ' ');
  // věkové prahy s „+" („18+", „65+", „80 +") — populační kvalifikátor, ne
  // hodnota (hodnota nemá sufix „+"). Bezpečné.
  out = out.replace(/\b\d{1,3}\s?\+/g, ' ');
  // Jmenovatel míry BEZ čitatele — „hustotu lékařů na 1 000 obyvatel",
  // „psychiatrů na 100 tisíc obyvatel", „sestry / 1 000 obyvatel". Tam je
  // vícemístné číslo pouhým názvem jednotky, a protože bývá jediným číslem
  // v okně, spouštělo falešný drift (issues #745, #793, #817, #878).
  // Rate-citace „3 sestry / 1 000 obyvatel" se NEstripuje: stojí-li poblíž
  // před jmenovatelem číslo, je to čitatel a jmenovatel se drží v okně jako
  // důkaz, že sousední (třeba jednociferná) hodnota JE citace (review PR
  // #784). Proto lookbehind blokuje strip, když v předchozích ~25 znacích
  // jakákoli číslice je.
  out = out.replace(
    /(?<!\d[^\d]{0,25})(?:\bna\b|\bper\b|\/)\s*(?:1\s?000\s?000|100\s?000|10\s?000|1\s?000|100|10|1)(?:\s?(?:tisíc|tis\.|mil\.|milion(?:ů|u)?))?(?=\s*(?:obyvatel|ob\.|osob|lidí|žen|mužů|mužu|dětí|dětských|živě|porodů|pacientů|případů|lůžek|úvazků))/gi,
    ' ',
  );
  // číselné skupiny z vlastního slugu (100k → 100; boundary, ať nezmizí
  // části skutečných hodnot)
  const slugDigits = [...new Set((indicatorId.match(/\d+/g) ?? []))];
  for (const d of slugDigits) {
    // token samostatně, v rozsahu (15–19) nebo se sufixem k (100k)
    out = out.replace(new RegExp(`(?<![\\d,.])${d}(?:\\s*[–-]\\s*\\d{1,3})?k?(?![\\d,.])`, 'g'), ' ');
  }
  return out;
}

export function findIndicatorDrift(htmlRaw, indicatorsById) {
  // Odstraň bloky, kde čísla nejsou citace hodnot indikátoru, ale popisky/roky
  // u cross-link karet: „Příbuzné sekce" (article-related), „Primární zdroje"
  // (article-sources) a „Datový klíč: HSPA indikátory" (article-databox).
  // Databox je seznam příbuzných indikátorů s popisnou větou a oblastním
  // štítkem — čísla v něm (např. „140/90", „95/2004 Sb.") jsou popisky, ne
  // citace hodnot. Drift se má hlásit jen z těla článku.
  const html = htmlRaw
    .replace(/<(aside|section)\b[^>]*class="[^"]*article-related[^"]*"[\s\S]*?<\/\1>/gi, '')
    .replace(/<(aside|section)\b[^>]*class="[^"]*article-sources[^"]*"[\s\S]*?<\/\1>/gi, '')
    .replace(/<(aside|section)\b[^>]*class="[^"]*article-databox[^"]*"[\s\S]*?<\/\1>/gi, '')
    // Vzor 1: „<a href="indikator-…">Label</a> (RRRR)" — atribuce, ne citace.
    .replace(/(<a[^>]*href="[^"]*indikator[^"]*"[^>]*>)[\s\S]*?(<\/a>)\s*\(\d{4}\)/g, '$1$2');

  const drifts = [];
  // Celý text článku (bez cross-link karet) — pro kontrolu, zda je aktuální
  // hodnota přítomna kdekoli v článku, ne jen v okně daného odkazu (issue
  // #688: „cílová hodnota je v článku přítomna, jen mimo okno").
  const fullText = stripTags(html);
  // Varianta hodnoty se v textu shoduje jako samostatné číslo (ne podřetězec
  // jiného čísla — „2" uvnitř „2026" nesmí platit).
  const valuePresent = (variants, hay) => variants.some(v => {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![\\d,.])${escaped}(?![\\d,.])`).test(hay);
  });
  // Statická stránka indikator-{id}.html (preferovaná) i fallback indicator.html?id={id}.
  const re = /indikator-([a-z0-9_]+)\.html|indicator\.html\?id=([a-z0-9_]+)/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1] || m[2];
    if (seen.has(id)) continue;
    const ind = indicatorsById.get(id);
    if (!ind || ind.value == null) { seen.add(id); continue; }

    // Vzor 2: uvnitř seznamu "article-list-bullets" omez okno na <li>.
    const li = enclosingBulletListItem(html, m.index);
    let start = Math.max(0, m.index - 60);
    let end = Math.min(html.length, m.index + 220 + id.length);
    if (li) {
      start = li.start;
      end = li.end;
    } else {
      start = safeTagBoundary(html, start, 'back');
      end = safeTagBoundary(html, end, 'forward');
    }

    let slice = html.slice(start, end);
    if (li) {
      // vyluč vlastní label aktuálního odkazu (název indikátoru, ne citace)
      const anchor = currentAnchorSpan(html, m.index);
      if (anchor) {
        const relOpenEnd = anchor.openEnd - start;
        const relClose = anchor.end - start;
        if (relOpenEnd >= 0 && relClose <= slice.length) {
          slice = slice.slice(0, relOpenEnd) + slice.slice(relClose);
        }
      }
    }

    const window = stripTags(slice);
    // citace čísla v okně? (číslo s desetinnou čárkou, nebo ≥2 cifry vedle
    // sebe) — čísla, která citací hodnoty nejsou (roky, věkové rozsahy,
    // číslice z vlastního slugu, paragrafové citace), se před testem
    // odfiltrují (issue #688 — falešné poplachy).
    const testWindow = stripNonValueNumbers(window, id);
    if (!/\d+,\d+|\d{2,}/.test(testWindow)) {
      // Položka seznamu bez čísla → není co ověřovat u TOHOTO výskytu, ale
      // stejný indikátor může být citován s hodnotou jinde v článku —
      // nezaznamenávej jako „viděno" a zkus další výskyt.
      if (li) continue;
      seen.add(id);
      continue;
    }
    seen.add(id);
    const variants = valueVariants(ind.value);
    // Aktuální hodnota v okně odkazu → citace sedí, žádný drift.
    if (valuePresent(variants, window)) continue;
    // Aktuální hodnota kdekoli v článku → citace je jen mimo okno tohoto
    // odkazu (typicky odkaz-atribuce vedle čísla jiné metriky/benchmarku).
    // Není to zastaralá citace — nehlásit (issue #688/#745: 13 falešných
    // poplachů, kde okno chytlo sousední číslo, ale správná hodnota je
    // citována jinde v témže článku).
    if (valuePresent(variants, fullText)) continue;
    drifts.push({
      id,
      current: `${ind.value} ${ind.unit ?? ''} (${ind.year ?? '?'})`.trim(),
      context: window.replace(/\s+/g, ' ').trim().slice(0, 180),
    });
  }
  return drifts;
}

// Odstraní HTML tagy a vrátí čistý text (pro extrakci vět a dat).
function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Vytáhne kontext (okno ±110 znaků) okolo pozice — NE podle tečky, protože
// české datum „18. 5. 2026" obsahuje tečky a rozbilo by větu.
function windowAround(text, idx, len = 0) {
  const start = Math.max(0, idx - 95);
  const end = Math.min(text.length, idx + len + 95);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

// Dopředná formulace v okolí data → výrok byl psán jako budoucí.
const FORWARD_RE = /\b(od|do|účinnost|účinn\w*|nabýv\w*|nabýt|vstoup\w*|platnost\w*|plánuj\w*|plánován\w*|očekáv\w*|měl[aoy]?\s+by|mají\s+|spustí\w*|spuštěn\w*|zaveden\w*|zavede|termín\w*|deadline|bude|budou|chystá\w*|připravuj\w*|projednáv\w*|schválen\w*|má\s+nabýt|má\s+vstoupit|do\s+roku)\b/i;

// Kolik znaků VLEVO od data se zkoumá na razítko. Krátké okno schválně:
// razítko stojí těsně před datem („staženo 14. 8. 2026"), zatímco dopředná
// formulace může být kdekoli v širším okolí.
const STAMP_LOOKBEHIND = 48;

/**
 * Razítko pořízení dat, nikoli slíbená událost. Datum stažení, ověření,
 * aktualizace nebo „stav k" je popis toho, KDY redakce zdroj četla — takové
 * datum je v článku vždy pozdější než publikace a vždy už uplynulo, takže
 * `findPassedDates` ho jinak hlásí donekonečna. A protože FORWARD_RE stačí
 * jediné „od"/„do" kdekoli v okolí (a v české větě u datového zdroje je
 * skoro vždy), spustí se to prakticky u každé zdrojové poznámky.
 *
 * Praktický důsledek: po každé noční revizi, která do článku zapíše datum
 * kontroly, se článek příští noc vrátí do fronty `date-passed` — a protože
 * `date-passed` obchází přeskočení recentně auditovaných článků, vytlačuje
 * z 3–5 revizí za noc skutečnou práci. (Nalezeno review botem na PR #1013.)
 *
 * Co veto NEŘEŠÍ (a řešit nemá): datum konce datového pokrytí („řada končí
 * týdnem do 5. 7. 2026"). To razítko není a někdy jde o skutečný signál
 * („data se čekala do…"). Když takové datum leží až po publikaci článku,
 * flag dál vzniká — správně, protože zaslouží lidské oko.
 */
const STAMP_RE = /\b(stažen\w*|ověřen\w*|re-?verifik\w*|verifikován\w*|zkontrolován\w*|kontrol\w*|aktualizac\w*|aktualizován\w*|doplněno|refresh\w*|pull|publikován\w*|generován\w*|vydáno|naposledy|přečten\w*|dotaz\w*|stav\s+k|data\s+k|k\s+datu|updated|as\s+of|soubor\s+z|feed\s+z)\b/i;

/**
 * Je datum na pozici `idx` jen razítkem pořízení dat?
 * Zkoumá se úzké okno vlevo — razítko datu předchází („staženo 14. 8. 2026",
 * „refresh datové sady z 19. 8. 2026"); text vpravo o povaze data nevypovídá.
 * Okno je schválně krátké: čím delší, tím větší riziko, že se razítkem umlčí
 * skutečný slib stojící o větu vedle.
 */
export function isSourceStamp(text, idx) {
  const left = text.slice(Math.max(0, idx - STAMP_LOOKBEHIND), idx);
  return STAMP_RE.test(left);
}

/**
 * Najde konkrétní data D. M. RRRR, která byla v době psaní BUDOUCÍ (po datu
 * publikace článku), DNES už ale uplynula, a v jejichž okolí je dopředná
 * formulace. To je silný signál „očekávaná událost už nastala → revize".
 *
 * @param {string} text   čistý text článku
 * @param {string} today  YYYY-MM-DD
 * @param {string} pubDate YYYY-MM-DD datum publikace článku (nebo null)
 */
function findPassedDates(text, today, pubDate) {
  const hits = [];
  const re = /\b(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d{2})\b/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(text)) !== null) {
    const [whole, d, mo, y] = m;
    if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) continue;
    const iso = `${y}-${String(+mo).padStart(2, '0')}-${String(+d).padStart(2, '0')}`;
    // Musí být: po publikaci (byl budoucí) A už uplynulý (dnes minulý).
    if (iso > today) continue;
    if (pubDate && iso < pubDate) continue; // historické datum — ne signál
    const ctx = windowAround(text, m.index, whole.length);
    if (!FORWARD_RE.test(ctx)) continue;    // bez dopředné formulace = ne signál
    if (isSourceStamp(text, m.index)) continue; // razítko pořízení dat, ne slib
    if (seen.has(iso)) continue;
    seen.add(iso);
    hits.push({ date: iso, raw: whole.replace(/\s+/g, ' ').trim(), context: ctx.slice(0, 220) });
    if (hits.length >= MAX_DATE_HITS) break;
  }
  return hits;
}

// Dekóduje HTML entity v hodnotě atributu href. V HTML se ampersand
// v query stringu píše jako &amp; — bez dekódování by report nabízel
// ke kontrole URL, která takhle neexistuje (např. psp.cz/…?o=10&amp;t=235).
function decodeHref(href) {
  return href
    .replace(/&(?:amp|AMP);/g, '&')
    .replace(/&(?:quot|QUOT);/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&(?:lt|LT);/g, '<')
    .replace(/&(?:gt|GT);/g, '>');
}

/**
 * Inventář externích odkazů (http/https), s prioritou pro legislativní domény.
 */
function findExternalLinks(html, { cap = MAX_EXT_LINKS } = {}) {
  const links = [];
  const re = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const scanLimit = Number.isFinite(cap) ? cap * 3 : Infinity;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = decodeHref(m[1]);
    const label = stripTags(m[2]).slice(0, 80);
    const priority = PRIORITY_LINK_HINTS.some(h => url.includes(h));
    links.push({ url, label, priority });
    if (links.length >= scanLimit) break;
  }
  // dedup podle url, priority napřed
  const seen = new Set();
  const dedup = links.filter(l => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });
  dedup.sort((a, b) => (b.priority - a.priority));
  return Number.isFinite(cap) ? dedup.slice(0, cap) : dedup;
}

function monthsSince(iso, today) {
  if (!iso) return null;
  const a = new Date(iso), b = new Date(today);
  if (isNaN(a)) return null;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA), b = new Date(isoB);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

// Vytáhne audit.last_reviewed (YYYY-MM-DD) z HTML komentáře v hlavičce článku.
export function parseLastReviewed(html) {
  const m = html.match(/last_reviewed:\s*["']?(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export { daysBetween, REVIEW_SKIP_DAYS, scanArticle, findExternalLinks };

function scanArticle(article, today, { skipReviewed = true } = {}) {
  const slug = article.slug;
  const htmlPath = resolve(ROOT, slug);
  const flags = [];
  const item = { slug, title: article.title, number: article.number, date: article.date, flags };

  // 1) cover
  const pngPath = resolve(COVERS_DIR, slug.replace(/\.html$/, '.png'));
  if (!existsSync(pngPath)) {
    flags.push({ type: 'missing-cover', severity: 'auto-fix',
      note: 'Chybí náhledová grafika — vygeneruj a injektuj (generate-article-cover.js + inject-article-covers.js).' });
  }

  // 2) topical_until
  if (article.topical_until && article.topical_until <= today) {
    flags.push({ type: 'topical-expired', severity: 'review',
      note: `topical_until ${article.topical_until} už nastalo — téma mohlo přejít do „po události“; zkontroluj aktuálnost.` });
  }

  // 3) stale date
  const age = monthsSince(article.date, today);
  if (age != null && age >= STALE_MONTHS) {
    flags.push({ type: 'stale-date', severity: 'low',
      note: `Publikováno před ${age} měsíci (${article.date}) — zvaž revizi čísel a zdrojů.` });
  }

  // 3b) taxonomie — článek bez vazby na indikátory je sirotek mimo
  // sémantickou síť (Související články, zpětné odkazy, linie). Validátor
  // to hlásí jen jako warning; noční worklist je vehikl, jak dluh splácet.
  if (!Array.isArray(article.linked_indicators) || article.linked_indicators.length === 0) {
    flags.push({ type: 'missing-indicators', severity: 'review',
      note: 'Chybí linked_indicators — doplň vazbu na 1–3 indikátory datového kontraktu (článek je mimo sémantickou síť).' });
  }

  // text-based (vyžaduje HTML)
  if (existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, 'utf8');
    const text = stripTags(html);

    // Recentně auditovaný článek (< REVIEW_SKIP_DAYS) → check-sources se přeskočí.
    // date-passed/topical-expired ale surfují dál (nové časové signály).
    const lastReviewed = parseLastReviewed(html);
    const daysSinceReview = lastReviewed ? daysBetween(lastReviewed, today) : null;
    const recentlyReviewed = daysSinceReview != null && daysSinceReview >= 0
      && daysSinceReview < REVIEW_SKIP_DAYS;
    if (lastReviewed) item.last_reviewed = lastReviewed;

    const passed = findPassedDates(text, today, article.date);
    for (const p of passed) {
      flags.push({ type: 'date-passed', severity: 'review', date: p.date,
        note: `Datum ${p.raw} bylo při publikaci budoucí, dnes už uplynulo → ověř, zda článek nepopisuje událost jako očekávanou, ač nastala (a doplň výsledek).`,
        context: p.context });
    }

    // 6b) indicator-drift — citovaná čísla u odkazů na indikátory vs. aktuální
    //     hodnota datového kontraktu (zachytí články, které po verifikaci
    //     indikátoru zůstaly se starou hodnotou).
    const drifts = findIndicatorDrift(html, loadIndicatorsById());
    for (const d of drifts) {
      // Ověřené falešné poplachy (odkaz-atribuce bez citace hodnoty) přeskoč.
      if (isDriftIgnored(slug, d.id)) continue;
      flags.push({ type: 'indicator-drift', severity: 'review', indicator: d.id,
        note: `Okolí odkazu na indikátor ${d.id} cituje číslo, které neodpovídá aktuální hodnotě ${d.current} — ověř a aktualizuj citaci.`,
        context: d.context });
    }

    // 6c) registr tvrzení (data/claims.json) — přesná kontrola citovaných hodnot
    //     proti aktuálnímu datovému kontraktu (PLAN-CLAIMS.md).
    const { map: claimsByArticle, total: claimsTotal } = loadClaimsByArticle();
    const claims = claimsByArticle.get(slug) ?? [];
    for (const c of claims) {
      const ind = c.indicator_id ? loadIndicatorsById().get(c.indicator_id) : null;
      const res = checkClaim(c, ind);
      if (res.status === 'drift') {
        flags.push({ type: 'claims-drift', severity: 'review', claim: c.id, indicator: c.indicator_id,
          note: `Tvrzení „${c.quote.slice(0, 120)}…“ cituje ${c.value} ${c.unit}, aktuální hodnota indikátoru ${c.indicator_id} je ${ind.value} ${ind.unit ?? ''} (${ind.year ?? '?'}) — odchylka ${res.deviation_pct === Infinity ? '∞' : res.deviation_pct.toFixed(1)} %.` });
      } else if (res.status === 'stale') {
        flags.push({ type: 'claims-stale', severity: 'low', claim: c.id, indicator: c.indicator_id,
          note: `Indikátor ${c.indicator_id} má novější rok (${ind.year}) než tvrzení (${c.as_of}); hodnota zatím v toleranci — zvaž aktualizaci na nový rok.` });
      }
    }
    if (claimsTotal > 0 && claims.length === 0) {
      flags.push({ type: 'claims-missing', severity: 'low',
        note: 'Publikovaný článek nemá žádný záznam v registru tvrzení (data/claims.json) — doplň při příští revizi.' });
    }

    const links = findExternalLinks(html);
    if (links.length) {
      item.ext_links = links;
      const prio = links.filter(l => l.priority);
      if (prio.length) {
        if (skipReviewed && recentlyReviewed) {
          // Zaznamenej (pro report), ale neflaguj — auditováno < 14 dní.
          item.check_sources_skipped = { count: prio.length, last_reviewed: lastReviewed };
        } else {
          flags.push({ type: 'check-sources', severity: 'review',
            note: `${prio.length} prioritních (legislativa/EU/regulátor) odkazů ke kontrole na posun.`,
            links: prio.map(l => l.url) });
        }
      }
    }
  } else {
    flags.push({ type: 'no-html', severity: 'review', note: 'HTML soubor článku nenalezen.' });
  }

  return item;
}

// ============================================================
// Sweep mimo články (#931): metodické karty a drafty.
// Článek-centrický scanArticle odkazy v indicators/*.json a drafts/
// nevidí — mrtvý zdroj v kartě se tak opravoval jen náhodou. Tenhle
// sweep vyrábí worklist pro FÁZI check-sources noční rutiny; místo
// auditního data článku rozhoduje sidecar data/link-check-log.json.
// ============================================================

export function loadLinkCheckLog(path = LINK_CHECK_LOG) {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    // Soubor má obálku { _doc, checks: {...} }; tolerujeme i plochý tvar.
    const log = raw && typeof raw === 'object' ? (raw.checks ?? raw) : {};
    return log && typeof log === 'object' ? log : {};
  } catch { return {}; }
}

// Posbírá http(s) URL ze všech string hodnot JSON objektu (rekurzivně).
export function extractUrlsFromJson(node, out = []) {
  if (typeof node === 'string') {
    // Závorky jsou v URL legální (Lancet: …(22)00199-2/fulltext; OECD: ?fs[0]=…).
    // Proto je v matchi necháváme a až dodatečně odřezáváme koncovou interpunkci
    // a NEPÁROVOU pravou závorku — tedy „(https://…)" v próze přijde o závěr,
    // ale vyvážené závorky uvnitř URL přežijí (heuristika běžných autolinkerů).
    const re = /https?:\/\/[^\s"'<>]+/g;
    let m;
    while ((m = re.exec(node)) !== null) {
      let u = m[0].replace(/[.,;:]+$/, '');
      while (u.endsWith(')') && (u.split('(').length - 1) < (u.split(')').length - 1)) {
        u = u.slice(0, -1).replace(/[.,;:]+$/, '');
      }
      out.push(u);
    }
  } else if (Array.isArray(node)) {
    for (const v of node) extractUrlsFromJson(v, out);
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) extractUrlsFromJson(v, out);
  }
  return [...new Set(out)];
}

// Má se soubor přeskočit? (čistá — zrcadlí REVIEW_SKIP_DAYS u článků)
export function isRecentlyLinkChecked(relPath, today, log = {}) {
  const stamp = log[relPath];
  if (!stamp || !/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return false;
  // Budoucí razítko (překlep roku) ani kalendářně nevalidní datum (2026-99-99,
  // daysBetween → null) nesmí soubor umlčet — chceme konečný nezáporný věk.
  const age = daysBetween(stamp, today);
  return Number.isFinite(age) && age >= 0 && age < REVIEW_SKIP_DAYS;
}

export function scanCardLinks(today, { skipChecked = true, log = loadLinkCheckLog(), dir = INDICATOR_CARDS_DIR } = {}) {
  if (!existsSync(dir)) return [];
  const items = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const rel = `indicators/${f}`;
    let urls = [];
    try { urls = extractUrlsFromJson(JSON.parse(readFileSync(resolve(dir, f), 'utf8'))); }
    catch { items.push({ file: rel, error: 'invalid-json', urls: [], priority: [] }); continue; }
    if (!urls.length) continue;
    const priority = urls.filter(u => PRIORITY_LINK_HINTS.some(h => u.includes(h)));
    const skipped = skipChecked && isRecentlyLinkChecked(rel, today, log);
    items.push({ file: rel, urls, priority, skipped });
  }
  return items;
}

export function scanDraftLinks(today, { skipChecked = true, log = loadLinkCheckLog(), dir = DRAFTS_DIR } = {}) {
  if (!existsSync(dir)) return [];
  const items = [];
  for (const f of readdirSync(dir).filter(f => f.startsWith('clanek-') && f.endsWith('.html')).sort()) {
    const rel = `drafts/${f}`;
    // Bez capu: sidecar log značí zkontrolovaný CELÝ soubor, takže worklist
    // musí nést úplnou deduplikovanou sadu odkazů (drafty mívají přes 12 URL).
    const links = findExternalLinks(readFileSync(resolve(dir, f), 'utf8'), { cap: Infinity });
    if (!links.length) continue;
    const priority = links.filter(l => l.priority).map(l => l.url);
    const skipped = skipChecked && isRecentlyLinkChecked(rel, today, log);
    items.push({ file: rel, urls: links.map(l => l.url), priority, skipped });
  }
  return items;
}

function buildOffArticleSection(cards, drafts) {
  const lines = [];
  const worklist = [...cards, ...drafts].filter(i => !i.skipped && !i.error);
  const skipped = [...cards, ...drafts].filter(i => i.skipped).length;
  const broken = [...cards, ...drafts].filter(i => i.error);
  lines.push('## Mimo články — metodické karty a drafty (`check-sources-cards`)');
  lines.push('');
  if (!worklist.length && !broken.length) {
    lines.push('Žádný soubor ke kontrole.' + (skipped ? ` (${skipped} přeskočeno — kontrolováno < ${REVIEW_SKIP_DAYS} dní dle data/link-check-log.json.)` : ''));
    lines.push('');
    return lines.join('\n');
  }
  lines.push(`Soubory s externími odkazy ke kontrole (po kontrole zapiš datum do \`data/link-check-log.json\`):`);
  lines.push('');
  for (const i of worklist) {
    lines.push(`- \`${i.file}\` — ${i.urls.length} URL${i.priority.length ? ` (${i.priority.length} prioritních)` : ''}`);
  }
  for (const i of broken) lines.push(`- \`${i.file}\` — ⚠️ nevalidní JSON`);
  if (skipped) lines.push(`\n> ℹ️ ${skipped} souborů přeskočeno — kontrolováno < ${REVIEW_SKIP_DAYS} dní.`);
  lines.push('');
  return lines.join('\n');
}

function buildReport(items, today) {
  const withFlags = items.filter(i => i.flags.length);
  const byType = {};
  for (const i of withFlags) for (const f of i.flags) byType[f.type] = (byType[f.type] || 0) + 1;

  const sev = t => ({ 'auto-fix': 0, 'review': 1, 'low': 2 }[t] ?? 3);
  const lines = [];
  lines.push(`# Noční audit webu — ${today}`);
  lines.push('');
  lines.push(`Skenováno **${items.length}** publikovaných článků, ` +
             `**${withFlags.length}** má nějaký flag. Generuje \`scripts/nightly-scan.js\`.`);
  lines.push('');
  lines.push('## Souhrn podle typu');
  lines.push('');
  lines.push('| Typ | Počet | Co s tím |');
  lines.push('| --- | ---: | --- |');
  const TYPE_ACTION = {
    'missing-cover': 'Auto-fix: vygenerovat + injektovat cover',
    'missing-indicators': 'Revize: doplnit linked_indicators (sirotek mimo sémantickou síť)',
    'topical-expired': 'Revize: aktualizovat na „po události“',
    'date-passed': 'Revize: ověřit budoucí vs. minulý čas u data',
    'check-sources': 'Revize: zkontrolovat zdrojové odkazy (WebFetch)',
    'indicator-drift': 'Revize: citace neodpovídá aktuální hodnotě indikátoru',
    'claims-drift': 'Revize: tvrzení z registru se rozešlo s hodnotou indikátoru',
    'claims-stale': 'Nízká: indikátor má novější rok než tvrzení',
    'claims-missing': 'Nízká: článek chybí v registru tvrzení',
    'year-past': 'Nízká: ověřit zmínku roku',
    'stale-date': 'Nízká: zvážit revizi starého článku',
    'no-html': 'Revize: chybí HTML soubor',
  };
  for (const [t, n] of Object.entries(byType).sort((a, b) => sev(flagSeverity(a[0])) - sev(flagSeverity(b[0])))) {
    lines.push(`| \`${t}\` | ${n} | ${TYPE_ACTION[t] || ''} |`);
  }
  lines.push('');

  const skipped = items.filter(i => i.check_sources_skipped);
  if (skipped.length) {
    lines.push(`> ℹ️ \`check-sources\` přeskočeno u **${skipped.length}** článků auditovaných ` +
               `< ${REVIEW_SKIP_DAYS} dní (\`last_reviewed\`). Plný worklist: \`--no-skip-reviewed\`.`);
    lines.push('');
  }

  // Auto-fixovatelné napřed
  const autoFix = withFlags.filter(i => i.flags.some(f => f.severity === 'auto-fix'));
  if (autoFix.length) {
    lines.push('## 🟢 Auto-fix (smí agent udělat sám)');
    lines.push('');
    for (const i of autoFix) {
      const f = i.flags.filter(x => x.severity === 'auto-fix');
      lines.push(`- **${i.slug}** — ${f.map(x => x.note).join(' ')}`);
    }
    lines.push('');
  }

  // Review
  const review = withFlags.filter(i => i.flags.some(f => f.severity === 'review'));
  if (review.length) {
    lines.push('## 🟠 K revizi (flag + draft/issue, NE auto-publikace)');
    lines.push('');
    for (const i of review) {
      lines.push(`### ${i.slug} — ${i.title ?? ''}`);
      for (const f of i.flags.filter(x => x.severity === 'review')) {
        lines.push(`- \`${f.type}\` — ${f.note}`);
        if (f.context) lines.push(`  > …${f.context}…`);
        if (f.links) for (const u of f.links) lines.push(`  - ${u}`);
      }
      lines.push('');
    }
  }

  // Low
  const low = withFlags.filter(i => i.flags.every(f => f.severity === 'low'));
  if (low.length) {
    lines.push('## ⚪ Nízká priorita');
    lines.push('');
    for (const i of low) {
      lines.push(`- **${i.slug}** — ${i.flags.map(f => f.note).join(' ')}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('_Skener nic needituje ani nechodí na síť. Akce dle `PROMPT_NIGHTLY_ROUTINE.md`._');
  return lines.join('\n') + '\n';
}

function flagSeverity(type) {
  return ({
    'missing-cover': 'auto-fix', 'missing-indicators': 'review', 'topical-expired': 'review', 'date-passed': 'review',
    'check-sources': 'review', 'no-html': 'review', 'year-past': 'low', 'stale-date': 'low',
    'indicator-drift': 'review', 'claims-drift': 'review', 'claims-stale': 'low', 'claims-missing': 'low',
  })[type] || 'review';
}

function main() {
  const args = process.argv.slice(2);
  const stdoutOnly = args.includes('--stdout');
  // Defaultně přeskakuj check-sources u recentně auditovaných (< 14 dní).
  // --no-skip-reviewed vynutí úplný worklist (vč. recentně auditovaných).
  const skipReviewed = !args.includes('--no-skip-reviewed');
  const slugArg = (args.find(a => a.startsWith('--slug=')) || '').split('=')[1];

  const today = todayUtc();
  let articles = loadArticles().filter(a => a.published === true);
  if (slugArg) articles = articles.filter(a => a.slug === slugArg || a.id === slugArg);

  const items = articles.map(a => scanArticle(a, today, { skipReviewed }));
  // #931: sweep mimo články — metodické karty a drafty (link-check worklist)
  const cards = scanCardLinks(today, { skipChecked: skipReviewed });
  const drafts = scanDraftLinks(today, { skipChecked: skipReviewed });
  const report = buildReport(items, today) + '\n' + buildOffArticleSection(cards, drafts);

  const withFlags = items.filter(i => i.flags.length);
  const counts = { 'auto-fix': 0, review: 0, low: 0 };
  for (const i of withFlags) for (const f of i.flags) counts[f.severity] = (counts[f.severity] || 0) + 1;
  const skippedCS = items.filter(i => i.check_sources_skipped).length;

  if (!stdoutOnly) {
    mkdirSync(REPORTS_DIR, { recursive: true });
    const mdPath = resolve(REPORTS_DIR, `nightly-audit-${today}.md`);
    const jsonPath = resolve(REPORTS_DIR, `nightly-audit-${today}.json`);
    writeFileSync(mdPath, report);
    writeFileSync(jsonPath, JSON.stringify({ generated_at: new Date().toISOString(), today, items: withFlags, off_article: { cards: cards.filter(c => !c.skipped), drafts: drafts.filter(d => !d.skipped) } }, null, 2) + '\n');
    console.log(`Report: reports/nightly-audit-${today}.md (+ .json)`);
  } else {
    console.log(report);
  }
  const skipNote = skipReviewed && skippedCS
    ? ` | check-sources přeskočeno (auditováno <${REVIEW_SKIP_DAYS} d): ${skippedCS}`
    : '';
  const offArticle = [...cards, ...drafts].filter(i => !i.skipped).length;
  console.log(`Skenováno ${items.length} článků | flagů: auto-fix ${counts['auto-fix']}, review ${counts.review}, low ${counts.low}${skipNote} | mimo články (karty+drafty) ke kontrole: ${offArticle}`);
}

// Spusť jen při přímém spuštění (node scripts/nightly-scan.js), ne při importu z testu.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
