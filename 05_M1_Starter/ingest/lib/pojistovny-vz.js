// Čisté funkce pro rutinu výročních zpráv zdravotních pojišťoven (srovnávač pojišťoven):
//  - parseVzLinks: z HTML stránky vytáhne odkazy na PDF výročních zpráv a rok každé z nich,
//  - normalizeVzText / pdfTextToVz: normalizace textu vytaženého z PDF (pdftotext),
//  - buildNumberIndex / findValue: tolerantní hledání čísla v textu (formát, měřítko tis./mil./mld.).
// Bez sítě a bez diskových zápisů; používá je ingest/fetchers/pojistovny-vz.js,
// scripts/pojistovny-verify.js a tests/pojistovny-vz.test.js.

// ---------------------------------------------------------------------------------- HTML odkazy

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n.toLowerCase()] ?? m);
}

function stripTags(html) {
  return decodeEntities(String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

const YEAR_RE = /(?<!\d)(20\d\d)(?!\d)/;

/** Rok z textu: „za rok 2022“ má přednost před prvním výskytem roku (jinak „schváleno 6. 12. 2023“ zmate). */
export function yearFromText(text) {
  if (!text) return null;
  const za = /za\s+rok\s+(20\d\d)(?!\d)/i.exec(text);
  if (za) return Number(za[1]);
  const m = YEAR_RE.exec(text);
  return m ? Number(m[1]) : null;
}

/** Rok z názvu souboru (poslední segment cesty, dekódovaný). Cesta s „2026-10“ nesvádí. */
export function yearFromUrl(url) {
  let base = String(url).split(/[?#]/)[0].split('/').pop() ?? '';
  try { base = decodeURIComponent(base); } catch { /* ponech surové */ }
  const m = YEAR_RE.exec(base);
  return m ? Number(m[1]) : null;
}

function attr(tag, name) {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? decodeEntities(m[1] ?? m[2] ?? m[3] ?? '') : null;
}

/** Omezí HTML na sekci od nadpisu odpovídajícího regexu `od` do dalšího nadpisu (h1–h6). */
export function sliceSection(html, od) {
  if (!od) return html;
  const m = new RegExp(od, 'i').exec(html);
  if (!m) return '';
  const rest = html.slice(m.index + m[0].length);
  const next = /<h[1-6][\s>]/i.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/**
 * Najde na stránce odkazy na PDF výročních zpráv.
 * @param {string} html
 * @param {string} pageUrl  URL stránky (základ pro relativní odkazy; <base href> má přednost)
 * @param {{vzory_odkazu?: string[], sekce_od?: string}} [cfg]
 * @returns {{rok: number|null, url: string, text: string, zdroj_roku: string}[]}  v pořadí na stránce, bez duplicitních URL
 */
export function parseVzLinks(html, pageUrl, cfg = {}) {
  let base = pageUrl;
  const baseTag = /<base\s[^>]*>/i.exec(html);
  if (baseTag) {
    const bh = attr(baseTag[0], 'href');
    if (bh) { try { base = new URL(bh, pageUrl).href; } catch { /* ignoruj */ } }
  }
  const body = sliceSection(html, cfg.sekce_od);
  const vzory = (cfg.vzory_odkazu ?? []).map((p) => new RegExp(p, 'i'));
  const out = [];
  const seen = new Set();
  const re = /<a\s[^>]*>[\s\S]*?<\/a>/gi;
  let m;
  while ((m = re.exec(body))) {
    const tag = /^<a\s[^>]*>/i.exec(m[0])[0];
    const href = attr(tag, 'href');
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    let abs;
    try { abs = new URL(href, base).href; } catch { continue; }
    let decoded = abs;
    try { decoded = decodeURIComponent(abs); } catch { /* surové */ }
    if (!/\.pdf(?:$|[?#])/i.test(abs)) continue;
    if (vzory.length && !vzory.some((v) => v.test(decoded))) continue;
    if (seen.has(abs)) continue;
    seen.add(abs);
    const text = stripTags(m[0]);
    const title = attr(tag, 'title') ?? '';
    let rok = null;
    let zdroj_roku = null;
    for (const [src, val] of [['text', yearFromText(text)], ['title', yearFromText(title)], ['url', yearFromUrl(abs)]]) {
      if (val) { rok = val; zdroj_roku = src; break; }
    }
    if (!rok) {
      // rok těsně před odkazem („2024 <a>ČPZP</a>“): posledních ~60 znaků holého textu před <a>
      const before = stripTags(body.slice(Math.max(0, m.index - 400), m.index)).slice(-60);
      const all = [...before.matchAll(/(?<!\d)(20\d\d)(?!\d)/g)];
      if (all.length) { rok = Number(all[all.length - 1][1]); zdroj_roku = 'predchozi-text'; }
    }
    out.push({ rok, url: abs, text, zdroj_roku: zdroj_roku ?? 'nenalezen' });
  }
  return out;
}

// ---------------------------------------------------------------------------------- text z PDF

/**
 * Normalizace textu: nezlomitelné a tenké mezery → běžná mezera (aby „1 234“ šlo najít),
 * měkký spojovník pryč, řady mezer nad 2 zkrácené na 2 (zachová sloupce z `pdftotext -layout`),
 * bez koncových mezer, nejvýš jeden prázdný řádek za sebou.
 */
export function normalizeVzText(s) {
  return String(s ?? '')
    .replace(/[        ]/g, ' ')
    .replace(/­/g, '')
    .replace(/−/g, '-')
    .replace(/\r/g, '')
    .replace(/\t/g, '  ')
    .replace(/ {3,}/g, '  ')
    .replace(/[ ]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

/** Surový výstup pdftotext (strany odděleny \f) → normalizovaný text se značkami „=== strana N ===“. */
export function pdfTextToVz(raw) {
  const pages = String(raw ?? '').split('\f');
  if (pages.length && pages[pages.length - 1].trim() === '') pages.pop();
  const body = pages.map((p, i) => `=== strana ${i + 1} ===\n${normalizeVzText(p).replace(/^\n+|\n+$/g, '')}`).join('\n');
  return { text: body + '\n', strany: pages.length };
}

/** Počet nebílých znaků mimo značky stran — rozlišení skenu bez textové vrstvy. */
export function znakuTextu(text) {
  return String(text).replace(/=== strana \d+ ===/g, '').replace(/\s+/g, '').length;
}

/** Sken bez textové vrstvy: v průměru méně než 150 znaků na stranu. */
export function jeBezTextu(text, strany) {
  return !strany || znakuTextu(text) / strany < 150;
}

// ---------------------------------------------------------------------------------- hledání čísel

/**
 * Vyhledá v textu všechna čísla v českém zápisu (mezera jako tisícový oddělovač, čárka jako desetinná,
 * tolerantně i tečka). Sousední sloupce tabulky odděluje `pdftotext -layout` aspoň dvěma mezerami
 * (normalizace je zachovává), takže „2 079 022“ je jedno číslo, ne „2 079“ + „022“. Podřady skupin se
 * záměrně negenerují: „2 079“ by jinak našlo každé číslo začínající 2 079.
 * @returns {{values: Float64Array, pos: Int32Array, len: Int32Array}} seřazeno podle hodnoty
 */
export function buildNumberIndex(text) {
  const re = /(?<![\d])(\d{1,3}(?: \d{3}){1,7}|\d+)(?:[,.](\d+))?(?![\d])/g;
  const vals = [];
  let m;
  while ((m = re.exec(text))) {
    const v = Number(m[2] ? `${m[1].replace(/ /g, '')}.${m[2]}` : m[1].replace(/ /g, ''));
    vals.push([v, m.index, m[0].length]);
  }
  vals.sort((a, b) => a[0] - b[0]);
  return {
    values: Float64Array.from(vals, (x) => x[0]),
    pos: Int32Array.from(vals, (x) => x[1]),
    len: Int32Array.from(vals, (x) => x[2]),
  };
}

function lowerBound(arr, x) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
}

/** Počet desetinných míst zápisu čísla (1.5 → 1, 2079 → 0, 11.1213 → 4). */
export function decimalsOf(v) {
  const s = String(Math.abs(v));
  if (/e/i.test(s)) {
    const [mant, exp] = s.toLowerCase().split('e');
    const md = (mant.split('.')[1] ?? '').length;
    return Math.max(0, md - Number(exp));
  }
  return (s.split('.')[1] ?? '').length;
}

/** Počet platných číslic (2079 → 4, 0.0150 → 2, 1900000 → 2). Čím méně, tím víc náhodných shod v textu. */
export function platneCislice(v) {
  const digits = String(Math.abs(v)).replace(/e.*$/i, '').replace('.', '').replace(/^0+/, '').replace(/0+$/, '');
  return digits.length;
}

/** Měřítka, ve kterých se číslo hledá: stejné, ×1000 (mld→mil, mil→tis.), ÷1000, ×1e6, ÷1e6. */
export const DEFAULT_SCALES = [1, 1000, 0.001, 1e6, 1e-6];

/**
 * Najde číslo `v` v indexu. Tolerance = polovina řádu poslední zadané číslice po přepočtu měřítka
 * (2 079 mil. ≙ 2 079 022 tis.: ±500 tis.; 297,744 mld. ≙ 297 744 mil.: ±0,5 mil.).
 * Znaménko se ignoruje (−6,4 se v textu píše i „(6 420)“).
 * Jistota shody podle počtu platných číslic: 5 a víc = vysoká, 4 = střední, méně = nízká (číslo „638“ je v textu
 * VZ kdekoli; „2 079 022“ ne).
 * @returns {{nalezeno: boolean, pocet: number, meritko: number|null, pozice: number|null, delka: number|null,
 *            vsechny: number[], jistota: 'vysoka'|'stredni'|'nizka'}}
 */
export function findValue(index, v, { scales = DEFAULT_SCALES } = {}) {
  const abs = Math.abs(v);
  const dec = decimalsOf(v);
  const sig = platneCislice(v);
  const jistota = sig >= 5 ? 'vysoka' : sig === 4 ? 'stredni' : 'nizka';
  for (const s of scales) {
    const t = abs * s;
    const tol = 0.5 * s * 10 ** -dec * (1 + 1e-9) + Math.abs(t) * 1e-12;
    const lo = lowerBound(index.values, t - tol);
    let hi = lowerBound(index.values, t + tol);
    while (hi < index.values.length && index.values[hi] <= t + tol) hi++;
    if (hi > lo) {
      let best = lo;
      for (let k = lo; k < hi; k++) if (index.pos[k] < index.pos[best]) best = k;
      const vsechny = [];
      for (let k = lo; k < hi && vsechny.length < 200; k++) vsechny.push(index.pos[k]);
      return { nalezeno: true, pocet: hi - lo, meritko: s, pozice: index.pos[best], delka: index.len[best], vsechny, jistota };
    }
  }
  return { nalezeno: false, pocet: 0, meritko: null, pozice: null, delka: null, vsechny: [], jistota };
}

/** Kontext ±`okoli` znaků kolem shody, bílé znaky sloučené do jedné mezery. */
export function kontextKolem(text, pozice, delka, okoli = 80) {
  const a = Math.max(0, pozice - okoli);
  const b = Math.min(text.length, pozice + delka + okoli);
  return text.slice(a, b).replace(/=== strana \d+ ===/g, ' ').replace(/={3,}/g, ' ').replace(/\s+/g, ' ').trim();
}
