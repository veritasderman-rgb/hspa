// Srovnávač zdravotních pojišťoven — grafové primitivy (.zpv-*).
//
// Balíčky P1.2 + P2.1 z PLAN-SROVNAVAC-POJISTOVEN.md (§ 2.1, § 2.4, § 3).
// Čisté funkce: vstup = data + options, výstup = HTML/SVG string. Žádný DOM,
// žádné knihovny, žádný globální stav — testovatelné v node:test.
//
//   rankedBars      seřazené vodorovné bary (HTML/CSS), referenční zóna/linka
//   segmentedBar    tall segmented bar (part-to-whole), fold do „Ostatní“
//   statTiles       KPI řada stat dlaždic (count-up hook, fallback = konečná hodnota)
//   meter           meter s trackem ve světlejším kroku téže barvy (role="meter")
//   indexedLines    SVG, index základní rok = 100, jedna osa, direct labels + legenda
//   dumbbell        plán → skutečnost (HTML/CSS), rozdíl v % v tooltipu
//   heatmap         sémantická tabulka, 4kroková modrá rampa, markup řazení
//   dotMatrix       tabulka koleček (ano / ne / částečně / —) + meter skóre
//   coverageMatrix  tabulka stavů (ikona + text, stavová paleta)
//
// Kontrakt pro ostatní moduly (src/zp-interact.js, src/pojistovny.js):
//   - datový mark má třídu `zpv-mark` a `data-zp="<kód>"` (pojišťovna) nebo
//     `data-key="<klíč>"` (cokoli jiného); barva jde přes
//     `var(--zpv-mark-color, var(--ink))` → zvýraznění „Moje pojišťovna“ řeší CSS
//   - každý mark má `data-tip` (hodnota · rok · zdroj) a `tabindex="0"`;
//     řádek / `<g>` kolem marku nese stejné `data-zp`/`data-key` a `data-tip`
//     → hit area ≥ 24 px, tooltip element dodá zp-interact.js
//   - animované prvky mají `data-zpv-anim="bar|line|count|seg|dot"`; schovají
//     se jen pod `main.zpv-anim-ready`, odhalí je `.is-in` (IntersectionObserver
//     v zp-interact.js). Bez JS i při reduced motion je vidět konečný stav.
//   - inline `style=` jen custom properties `--w`/`--i` (+ `--x` u záporných
//     barů rankedBars s allowNegative) a `width` u segmentů.
//
// Přístupnost (odchylka od briefu, vědomá): složený `aria-label` nese
// `.zpv-plot` s `role="group"`, ne `<figure role="img">`. Role img má
// v ARIA „children presentational“ → schovala by tabulkové dvojče a fokusovatelné
// marky (axe `nested-interactive`, serious). Každý mark má proto vlastní
// `role="img"` + `aria-label`; tabulky (heatmap, matice) zůstávají tabulkami.

import { escapeHtml, formatNumberCz } from './page-shared.js';

export const NA_TEXT = 'nedohledáno';
export const SORT_NOTE = 'Řazeno podle hodnoty, nejde o hodnocení pojišťoven.';
export const ZP_KODY = ['111', '201', '205', '207', '209', '211', '213'];

const esc = escapeHtml;

// ---------------------------------------------------------------------
//  Pomocné čisté funkce (exportované kvůli testům a dalším modulům)
// ---------------------------------------------------------------------

export function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Číslo v českém formátu s pevným počtem desetinných míst; null → „nedohledáno“. */
export function fmtValue(v, dec = 0, unit = '') {
  if (!isNum(v)) return NA_TEXT;
  const s = formatNumberCz(v, { minDecimals: dec, maxDecimals: dec }).replace(/^-/, '−');
  return unit ? `${s} ${unit}` : s;
}

/** Procento pro custom property (max. 2 desetinná místa, tečka). */
export function pct(part, whole) {
  if (!isNum(part) || !isNum(whole) || whole <= 0) return '0%';
  const p = Math.max(0, Math.min(100, (part / whole) * 100));
  return `${Math.round(p * 100) / 100}%`;
}

/** Atribut identity marku: data-zp pro pojišťovnu, data-key pro ostatní. */
function idAttr(item) {
  if (item && item.kod != null && item.kod !== '') return ` data-zp="${esc(item.kod)}"`;
  if (item && item.key != null && item.key !== '') return ` data-key="${esc(item.key)}"`;
  return '';
}

/** Text tooltipu: „Label: hodnota · rok · zdroj · poznámka“ (nebo item.tip). */
function tipText(item, valueText, source) {
  if (item.tip) return String(item.tip);
  const parts = [`${item.label ?? ''}: ${valueText}`];
  const src = item.zdroj ?? item.source ?? source;
  // rok jen když ho už neobsahuje popis zdroje („… · 2025“), ať se v tooltipu neopakuje
  if (item.rok != null && !(src && String(src).includes(String(item.rok)))) parts.push(String(item.rok));
  if (src) parts.push(String(src));
  if (item.note) parts.push(String(item.note));
  return parts.join(' · ');
}

function caption(o, extra = '') {
  const t = o.title ? `<span class="zpv-title">${esc(o.title)}</span>` : '';
  const s = o.sub ? `<span class="zpv-sub">${esc(o.sub)}</span>` : '';
  const m = extra ? `<span class="zpv-meta">${extra}</span>` : '';
  const z = o.source ? `<span class="zpv-src">Zdroj: ${esc(o.source)}</span>` : '';
  if (!t && !s && !m && !z) return '';
  return `<figcaption class="zpv-cap">${t}${s}${m}${z}</figcaption>`;
}

// ---------------------------------------------------------------------
//  Export CSV z tabulkového dvojčete (A4.1) — čisté funkce, stažení řeší zp-interact.js
// ---------------------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** HTML buňky → prostý text: značky pryč, entity rozkódované, nezlomitelné mezery → mezera. */
export function stripHtml(html) {
  return String(html ?? '')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
      }
      const v = ENTITIES[e.toLowerCase()];
      return v === undefined ? m : v;
    })
    .replace(/[\u00a0\u202f\u2007]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Jedna hodnota CSV podle RFC 4180: uvozovky, když obsahuje oddělovač, `"` nebo nový řádek. */
export function csvCell(value, sep = ';') {
  const t = String(value ?? '');
  return t.includes(sep) || /["\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/**
 * Tabulka (hlavička + řádky) → CSV text. První řádek je komentář se zdrojem a licencí.
 * BOM se nepřidává (dělá to až stažení). Buňky jsou HTML string (z tableTwin);
 * `text: true` = buňky už jsou prostý text (z textContent), nemažou se značky.
 * @param {string[]} headers
 * @param {Array<Array<string>>} rows
 * @param {{sep?: string, title?: string, source?: string, text?: boolean}} [opts]
 */
export function tableToCsv(headers, rows, { sep = ';', title = '', source = '', text = false } = {}) {
  const clean = (v) => (text ? String(v ?? '').replace(/[\u00a0\u202f\u2007]/g, ' ').replace(/\s+/g, ' ').trim() : stripHtml(v));
  const note = [title ? clean(title) : '', source ? `zdroj: ${clean(source)}` : '',
    'HSPA Monitor (skorezdravotnictvi.cz)', 'CC BY 4.0'].filter(Boolean).join(' · ');
  const line = (cells) => cells.map((c) => csvCell(clean(c), sep)).join(sep);
  return [`# ${note}`, line(headers ?? []), ...(rows ?? []).map(line)].join('\r\n') + '\r\n';
}

/** Název staženého souboru: hspa-pojistovny-<slug názvu>-<YYYY-MM-DD>.csv (slug bez diakritiky, ≤ 60 znaků). */
export function csvFilename(title, date = new Date()) {
  const slug = String(title ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '') || 'data';
  const d = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
  return `hspa-pojistovny-${slug}-${d}.csv`;
}

/** Tabulkové dvojče: headers = [text], rows = [[html…]] (první buňka = th); source jde do CSV. */
function tableTwin(title, headers, rows, numFrom = 1, source = '') {
  const head = headers.map((h, i) =>
    `<th scope="col"${i >= numFrom ? ' class="zpv-num"' : ''}>${esc(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c, i) => (i === 0
    ? `<th scope="row">${c}</th>`
    : `<td${i >= numFrom ? ' class="zpv-num"' : ''}>${c}</td>`)).join('')}</tr>`).join('');
  return `<details class="zpv-table" data-csv-title="${esc(title || 'data grafu')}" data-csv-source="${esc(source || '')}">`
    + `<summary>Zobrazit jako tabulku</summary>`
    + `<button type="button" class="zpv-csv" data-zpv-csv>Stáhnout CSV</button>`
    + `<div class="zpv-scroll" tabindex="0" role="region" aria-label="${esc('Tabulka: ' + (title || 'data grafu'))}">`
    + `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></details>`;
}

function figure(typ, o, inner, { colored = false, extraCap = '', mod = '' } = {}) {
  const cls = `zpv zpv-figure zpv-${typ}${colored ? ' is-colored' : ''}${mod ? ' ' + mod : ''}`;
  return `<figure class="${cls}">${caption(o, extraCap)}${inner}</figure>`;
}

function emptyFigure(typ, o) {
  return figure(typ, o, `<p class="zpv-empty">Údaje nejsou k dispozici (${NA_TEXT}).</p>`, { mod: 'is-empty' });
}

function normItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter((it) => it && typeof it === 'object')
    .map((it) => ({ ...it, value: isNum(it.value) ? it.value : null }));
}

/** Seřadí sestupně podle value, null na konec; stabilně. */
export function sortDesc(list, key = 'value') {
  return list
    .map((it, i) => ({ it, i }))
    .sort((a, b) => {
      const va = a.it[key];
      const vb = b.it[key];
      const na = !isNum(va);
      const nb = !isNum(vb);
      if (na && nb) return a.i - b.i;
      if (na) return 1;
      if (nb) return -1;
      return vb - va || a.i - b.i;
    })
    .map((x) => x.it);
}

/** Šířková třída pro rezervu hodnoty na špičce baru (počet znaků). */
function valWidthClass(texts) {
  const n = Math.max(0, ...texts.map((t) => String(t).length));
  if (n <= 6) return 'zpv-vw-s';
  if (n <= 10) return 'zpv-vw-m';
  return 'zpv-vw-l';
}

// ---------------------------------------------------------------------
//  1. rankedBars — seřazené vodorovné bary
// ---------------------------------------------------------------------

/**
 * @param {Array<{kod?, key?, label, value, rok?, zdroj?, note?, tip?}>} items
 * @param {{title?, sub?, unit?, dec?, ref?: {value, label, kind?: 'line'|'zone-below'|'zone-above'},
 *          sort?: 'desc'|'none', maxv?, source?, sortNote?: string|false,
 *          allowNegative?: boolean, signed?: boolean}} opts
 *
 * allowNegative: záporné hodnoty se kreslí doleva od nulové osy (diverging bar,
 * jedna barva; směr nese poloha a znaménko, ne barva). Bez záporných hodnot je
 * výstup stejný jako bez volby. signed: kladné hodnoty dostanou „+“.
 */
export function rankedBars(items, opts = {}) {
  const { unit = '', dec = 0, ref = null, sort = 'desc', maxv, source = '', allowNegative = false, signed = false } = opts;
  const list = normItems(items);
  if (!list.length) return emptyFigure('bars', opts);
  const rows = sort === 'desc' ? sortDesc(list) : list;
  const refOk = ref && isNum(ref.value);
  const vals = rows.map((r) => r.value).filter(isNum);
  const hasNeg = allowNegative && vals.some((v) => v < 0);
  const lo = hasNeg ? Math.min(0, ...vals, refOk ? ref.value : 0) : 0;
  let max = isNum(maxv) && maxv > 0 ? maxv : Math.max(0, ...vals, refOk ? ref.value : 0);
  if (!(max > 0)) max = 1;
  const span = max - lo;
  const at = (v) => pct(v - lo, span); // poloha hodnoty na ose (bez záporných = pct(v, max))
  const zero = at(0);

  const kind = refOk ? (ref.kind || 'zone-below') : null;
  let refEl = '';
  if (kind === 'line') refEl = `<span class="zpv-ref zpv-ref--line" style="--w:${at(ref.value)}" aria-hidden="true"></span>`;
  else if (kind === 'zone-above') refEl = `<span class="zpv-ref zpv-ref--above" style="--w:${at(ref.value)}" aria-hidden="true"></span>`;
  else if (kind) refEl = `<span class="zpv-ref zpv-ref--below" style="--w:${at(ref.value)}" aria-hidden="true"></span>`;
  if (hasNeg) refEl += `<span class="zpv-zero" style="--x:${zero}" aria-hidden="true"></span>`;

  const fmt = (v) => (signed && isNum(v) && v > 0 ? `+${fmtValue(v, dec, unit)}` : fmtValue(v, dec, unit));
  const texts = rows.map((r) => fmt(r.value));
  const rowsHtml = rows.map((r, i) => {
    const vt = texts[i];
    const tip = esc(tipText(r, vt, source));
    const id = idAttr(r);
    const label = esc(r.label ?? '');
    let inner;
    if (r.value == null) {
      inner = `<span class="zpv-na">${NA_TEXT}</span>`;
    } else if (hasNeg) {
      const neg = r.value < 0;
      const x = neg ? at(r.value) : zero;
      const w = pct(Math.abs(r.value), span);
      inner = `<span class="zpv-bar zpv-mark${neg ? ' zpv-bar--neg' : ''}"${id} data-zpv-anim="bar" style="--x:${x};--w:${w};--i:${i}" `
        + `tabindex="0" role="img" aria-label="${esc(`${r.label ?? ''}: ${vt}`)}" data-tip="${tip}"></span>`
        + (neg
          ? `<span class="zpv-val zpv-val--neg" style="--x:${x}">${esc(vt)}</span>`
          : `<span class="zpv-val" style="--w:${at(r.value)}">${esc(vt)}</span>`);
    } else {
      const w = pct(Math.max(0, r.value), max);
      inner = `<span class="zpv-bar zpv-mark"${id} data-zpv-anim="bar" style="--w:${w};--i:${i}" `
        + `tabindex="0" role="img" aria-label="${esc(`${r.label ?? ''}: ${vt}`)}" data-tip="${tip}"></span>`
        + `<span class="zpv-val" style="--w:${w}">${esc(vt)}</span>`;
    }
    return `<div class="zpv-row"${id} data-tip="${tip}"><span class="zpv-label">${label}</span>`
      + `<span class="zpv-track"><span class="zpv-area">${refEl}${inner}</span></span></div>`;
  }).join('');

  // ref.text (volitelný) nahradí „label: hodnota“ — pro zónu bez jednoho čísla (např. „kritické pásmo 3–4 % výdajů“)
  const refText = refOk ? (ref.text ? String(ref.text) : `${ref.label ?? 'Reference'}: ${fmtValue(ref.value, dec, unit)}`) : '';
  let extra = '';
  if (refOk) {
    extra += `<span class="zpv-refkey"><i class="zpv-refkey-sw zpv-refkey-sw--${kind === 'line' ? 'line' : 'zone'}" aria-hidden="true"></i>${esc(refText)}</span>`;
  }
  const note = opts.sortNote === undefined ? SORT_NOTE : opts.sortNote;
  if (sort === 'desc' && note) extra += `<span class="zpv-sortnote">${esc(note)}</span>`;

  const aria = `${opts.title || 'Graf'}: ${rows.map((r, i) => `${r.label ?? ''} ${texts[i]}`).join(', ')}`
    + `${refOk ? `. ${refText}` : ''}.`;
  const plot = `<div class="zpv-plot zpv-barlist ${valWidthClass(texts)}${kind === 'line' ? ' zpv-has-refline' : ''}${hasNeg ? ' zpv-has-neg' : ''}" role="group" aria-label="${esc(aria)}">${rowsHtml}</div>`;
  const table = tableTwin(opts.title, ['Položka', unit ? `Hodnota (${unit})` : 'Hodnota'],
    rows.map((r, i) => [esc(r.label ?? ''), esc(texts[i])]), 1, source);
  return figure('bars', opts, plot + table, { extraCap: extra });
}

// ---------------------------------------------------------------------
//  2. segmentedBar — tall segmented bar (part-to-whole)
// ---------------------------------------------------------------------

/** Rozdělí části na zobrazené segmenty (≤ maxParts, zbytek do „Ostatní“). */
export function foldParts(parts, maxParts = 6, otherLabel = 'Ostatní') {
  const valid = sortDesc(normItems(parts).filter((p) => isNum(p.value) && p.value > 0));
  const limit = Math.max(1, maxParts | 0);
  if (valid.length <= limit) return valid;
  const keep = valid.slice(0, limit - 1);
  const rest = valid.slice(limit - 1);
  const other = {
    key: 'ostatni',
    label: otherLabel,
    value: rest.reduce((a, p) => a + p.value, 0),
    folded: rest.map((p) => p.label),
    isOther: true,
  };
  return [...keep, other];
}

/**
 * @param {Array<{kod?, key?, label, value}>} parts
 * @param {{title?, sub?, unit?, dec?, maxParts?, otherLabel?, source?}} opts
 */
export function segmentedBar(parts, opts = {}) {
  const { unit = '', dec = 0, maxParts = 6, otherLabel = 'Ostatní', source = '' } = opts;
  const all = normItems(parts);
  if (!all.length) return emptyFigure('segmented', opts);
  const segs = foldParts(all, maxParts, otherLabel);
  const total = segs.reduce((a, p) => a + p.value, 0);
  const share = (v) => (total > 0 ? (v / total) * 100 : 0);
  const shareText = (v) => `${formatNumberCz(share(v), { minDecimals: 1, maxDecimals: 1 })} %`;

  let slot = 0;
  const segHtml = segs.map((p, i) => {
    const sh = share(p.value);
    const vt = fmtValue(p.value, dec, unit);
    const st = shareText(p.value);
    const folded = p.isOther ? ` (${p.folded.join(', ')})` : '';
    // podíl jen když se liší od hodnoty (u jednotky % jsou stejné); rok jen když ho nenese zdroj
    const srcP = p.zdroj ?? source;
    const rokP = p.rok != null && !(srcP && String(srcP).includes(String(p.rok))) ? p.rok : null;
    const tip = esc(p.tip || [`${p.label}${folded}: ${vt}`, st === vt ? null : st, rokP, srcP].filter((x) => x != null && x !== '').join(' · '));
    const slotAttr = p.kod == null ? ` data-slot="${p.isOther ? 'other' : slot++}"` : '';
    let lab = '';
    if (sh >= 14) lab = `<span class="zpv-seg-lab" aria-hidden="true">${esc(st)}</span>`;
    else if (sh >= 7) lab = `<span class="zpv-seg-lab zpv-seg-lab--s" aria-hidden="true">${esc(st)}</span>`;
    return `<span class="zpv-seg zpv-mark"${idAttr(p)}${slotAttr} data-zpv-anim="seg" style="width:${pct(p.value, total)};--i:${i}" `
      + `tabindex="0" role="img" aria-label="${esc(`${p.label}${folded}: ${vt}, ${st}`)}" data-tip="${tip}">${lab}</span>`;
  }).join('');

  let slot2 = 0;
  const legend = `<ul class="zpv-legend">${segs.map((p) => {
    const slotAttr = p.kod == null ? ` data-slot="${p.isOther ? 'other' : slot2++}"` : '';
    return `<li${idAttr(p)}><i class="zpv-sw"${idAttr(p)}${slotAttr} aria-hidden="true"></i>${esc(p.label)}</li>`;
  }).join('')}</ul>`;

  const aria = `${opts.title || 'Rozdělení celku'}: ${segs.map((p) => `${p.label} ${shareText(p.value)}`).join(', ')}.`;
  const plot = `<div class="zpv-plot zpv-segplot" role="group" aria-label="${esc(aria)}"><div class="zpv-segbar">${segHtml}</div>${legend}</div>`;

  // Tabulka nese všechny původní části (i ty složené do „Ostatní“).
  const tAll = sortDesc(all);
  const tTotal = tAll.reduce((a, p) => a + (isNum(p.value) && p.value > 0 ? p.value : 0), 0);
  const table = tableTwin(opts.title, ['Část', unit ? `Hodnota (${unit})` : 'Hodnota', 'Podíl'],
    tAll.map((p) => [
      esc(p.label ?? ''),
      esc(fmtValue(p.value, dec, unit)),
      esc(isNum(p.value) && tTotal > 0 ? `${formatNumberCz((p.value / tTotal) * 100, { minDecimals: 1, maxDecimals: 1 })} %` : NA_TEXT),
    ]), 1, source);
  return figure('segmented', opts, plot + table, { colored: true });
}

// ---------------------------------------------------------------------
//  3. statTiles — KPI řada
// ---------------------------------------------------------------------

/**
 * @param {Array<{value, unit?, label, meta?, decimals?, prefix?}>} tiles
 * @param {{title?}} [opts]
 */
export function statTiles(tiles, opts = {}) {
  const list = (Array.isArray(tiles) ? tiles : []).filter((t) => t && typeof t === 'object');
  if (!list.length) return `<ul class="zpv zpv-stats is-empty"><li class="zpv-tile"><span class="zpv-na">${NA_TEXT}</span></li></ul>`;
  const lis = list.map((t) => {
    const dec = Number.isInteger(t.decimals) ? t.decimals : 0;
    const prefix = t.prefix ? String(t.prefix) : '';
    let val;
    if (isNum(t.value)) {
      const shown = `${prefix}${fmtValue(t.value, dec)}`;
      val = `<b class="zpv-count" data-zpv-anim="count" data-value="${t.value}" data-decimals="${dec}"`
        + `${prefix ? ` data-prefix="${esc(prefix)}"` : ''}>${esc(shown)}</b>`;
    } else {
      val = `<b class="zpv-count zpv-na">${NA_TEXT}</b>`;
    }
    const unit = t.unit && isNum(t.value) ? `<span class="zpv-tile-unit">${esc(t.unit)}</span>` : '';
    const meta = t.meta ? `<span class="zpv-tile-meta">${esc(t.meta)}</span>` : '';
    return `<li class="zpv-tile"${idAttr(t)}><span class="zpv-tile-val">${val}${unit}</span>`
      + `<span class="zpv-tile-label">${esc(t.label ?? '')}</span>${meta}</li>`;
  }).join('');
  const aria = opts.title ? ` aria-label="${esc(opts.title)}"` : '';
  return `<ul class="zpv zpv-stats"${aria}>${lis}</ul>`;
}

// ---------------------------------------------------------------------
//  4. meter
// ---------------------------------------------------------------------

/** Signál z prahů: nejvyšší `at` ≤ value; bez prahů → 'neutral'. */
export function meterSignal(value, thresholds) {
  if (!isNum(value) || !Array.isArray(thresholds) || !thresholds.length) return 'neutral';
  const sorted = thresholds.filter((t) => t && isNum(t.at)).sort((a, b) => a.at - b.at);
  let sig = 'neutral';
  for (const t of sorted) if (value >= t.at) sig = t.signal || 'neutral';
  return ['good', 'warn', 'bad', 'neutral'].includes(sig) ? sig : 'neutral';
}

/**
 * @param {number|null} value
 * @param {{max?, min?, label?, thresholds?: Array<{at, signal}>, text?, unit?, dec?}} opts
 */
export function meter(value, opts = {}) {
  const { max = 100, min = 0, label = '', thresholds = [], unit = '', dec = 0 } = opts;
  const lab = esc(label || 'Měřidlo');
  if (!isNum(value)) {
    return `<span class="zpv zpv-meter is-empty"><span class="zpv-meter-text zpv-na">${NA_TEXT}</span></span>`;
  }
  const text = opts.text != null ? String(opts.text) : fmtValue(value, dec, unit);
  const sig = meterSignal(value, thresholds);
  const w = pct(value - min, max - min);
  return `<span class="zpv zpv-meter zpv-meter--${sig}" role="meter" aria-label="${lab}" `
    + `aria-valuenow="${value}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuetext="${esc(text)}">`
    + `<span class="zpv-meter-track"><span class="zpv-meter-fill" data-zpv-anim="bar" style="--w:${w}"></span></span>`
    + `<span class="zpv-meter-text">${esc(text)}</span></span>`;
}

// ---------------------------------------------------------------------
//  5. indexedLines — index (základní rok = 100), jedna osa, SVG
// ---------------------------------------------------------------------
//
// Rozhodnutí o škálování (mobil): SVG má viewBox 360 × 232 a `width:100%`,
// škáluje se rovnoměrně (žádné preserveAspectRatio="none" — kolečka by se
// deformovala a pathLength animace by se rozjela). Šířka viewBoxu 360 je
// zvolená podle mobilu: na 390px viewportu má graf ~358 px → měřítko ≈ 1,
// text 12 jednotek = ~12 px (≥ 11 px i na 360px telefonu: 328/360 × 12 = 10,9).
// Na širších kontejnerech by text rostl, proto CSS: (a) `max-width: 600px`
// na SVG, (b) container query ≥ 480 px zmenší font na 9 jednotek a čáru na
// 1,5 jednotky → na 480–600 px vychází text 12–15 px a čára 2–2,5 px.
// Rozložení popisků se počítá pro horší případ (12 jednotek), takže při
// menším písmu se nic nepřekrývá.

const LV = { W: 360, H: 232, top: 10, bottom: 22, left: 30, font: 12, gap: 13 };

/** Index řady vůči základu: base 'first' = první platný bod, číslo = rok. */
export function indexSeries(points, base = 'first') {
  const pts = (Array.isArray(points) ? points : [])
    .filter((p) => p && isNum(p.year))
    .map((p) => ({ year: p.year, value: isNum(p.value) ? p.value : null }))
    .sort((a, b) => a.year - b.year);
  let b = null;
  let baseYear = null;
  if (isNum(base)) {
    const hit = pts.find((p) => p.year === base && isNum(p.value) && p.value !== 0);
    if (hit) { b = hit.value; baseYear = hit.year; }
  }
  if (b == null) {
    const first = pts.find((p) => isNum(p.value) && p.value !== 0);
    if (first) { b = first.value; baseYear = first.year; }
  }
  return {
    baseYear,
    points: pts.map((p) => ({ ...p, index: b != null && isNum(p.value) ? (p.value / b) * 100 : null })),
  };
}

/** Pěkné kroky osy. */
export function niceTicks(lo, hi, target = 5) {
  if (!isNum(lo) || !isNum(hi)) return [];
  if (hi === lo) { hi = lo + 1; lo -= 1; }
  const raw = (hi - lo) / Math.max(1, target - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const out = [];
  for (let v = start; v <= end + step / 1e6; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/**
 * Rozestaví popisky (ideální y) tak, aby se nepřekrývaly; vrací null, když se
 * do [lo, hi] nevejdou (pak jen legenda).
 */
export function dodgeLabels(ys, gap, lo, hi) {
  const n = ys.length;
  if (!n) return [];
  if ((n - 1) * gap > hi - lo) return null;
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const pos = order.map((o) => Math.min(Math.max(o.y, lo), hi));
  for (let k = 1; k < n; k++) if (pos[k] - pos[k - 1] < gap) pos[k] = pos[k - 1] + gap;
  if (pos[n - 1] > hi) {
    pos[n - 1] = hi;
    for (let k = n - 2; k >= 0; k--) if (pos[k + 1] - pos[k] < gap) pos[k] = pos[k + 1] - gap;
  }
  const out = new Array(n);
  order.forEach((o, k) => { out[o.i] = pos[k]; });
  return out;
}

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * @param {Array<{kod?, key?, label, points: Array<{year, value}>}>} series
 * @param {{title?, sub?, base?: 'first'|number, source?, unit?, dec?,
 *   xFmt?: (x:number)=>string, xHead?: string, xTicks?: Array<{x:number,label:string}>}} opts
 *   Osa X je číselná (rok); pro měsíční řady lze předat zlomek roku (2022 + (m−1)/12) a
 *   popisky dodat přes xFmt (tooltip, aria, tabulka), xTicks (značky osy) a xHead (záhlaví tabulky).
 */
export function indexedLines(series, opts = {}) {
  const { base = 'first', source = '', unit = '', dec = 0, xFmt = (x) => String(x), xHead = 'Rok', xTicks = null } = opts;
  const list = (Array.isArray(series) ? series : [])
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({ ...s, ...indexSeries(s.points, base) }))
    .filter((s) => s.points.some((p) => isNum(p.index)));
  if (!list.length) return emptyFigure('lines', opts);

  const years = [...new Set(list.flatMap((s) => s.points.map((p) => p.year)))].sort((a, b) => a - b);
  const idx = list.flatMap((s) => s.points.map((p) => p.index).filter(isNum));
  const ticks = niceTicks(Math.min(100, ...idx), Math.max(100, ...idx), 5);
  const yLo = ticks[0];
  const yHi = ticks[ticks.length - 1];
  const baseYears = [...new Set(list.map((s) => s.baseYear))];
  const baseLabel = baseYears.length === 1 ? `${xFmt(baseYears[0])} = 100` : 'první rok = 100';

  const longest = Math.max(...list.map((s) => String(s.label ?? '').length));
  const right = Math.min(120, Math.max(40, Math.round(longest * 7.6) + 18));
  const x0 = LV.left;
  const x1 = LV.W - right;
  const y0 = LV.top;
  const y1 = LV.H - LV.bottom;
  const yMin = years[0];
  const yMax = years[years.length - 1];
  const X = (yr) => (yMax === yMin ? (x0 + x1) / 2 : x0 + ((yr - yMin) / (yMax - yMin)) * (x1 - x0));
  const Y = (v) => y1 - ((v - yLo) / (yHi - yLo)) * (y1 - y0);

  // osy: vodorovné hairline mřížky + popisky Y, roky na X
  const grid = ticks.map((t) => `<line class="zpv-grid${t === 100 ? ' zpv-grid--base' : ''}" x1="${x0}" x2="${x1}" y1="${r1(Y(t))}" y2="${r1(Y(t))}"/>`
    + `<text class="zpv-tick" x="${x0 - 5}" y="${r1(Y(t) + 4)}" text-anchor="end">${esc(formatNumberCz(t, { maxDecimals: 1 }))}</text>`).join('');
  const span = yMax - yMin;
  const step = span > 12 ? 5 : span > 5 ? 2 : 1;
  const xYears = Array.isArray(xTicks)
    ? xTicks.filter((t) => t && isNum(t.x))
    : years.filter((y) => y === yMin || y === yMax || ((y - yMin) % step === 0 && yMax - y >= step * 0.6)).map((y) => ({ x: y, label: String(y) }));
  const xAxis = `<line class="zpv-axis" x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}"/>`
    + xYears.map((t) => `<text class="zpv-tick" x="${r1(X(t.x))}" y="${y1 + 15}" text-anchor="${t.x === yMin ? 'start' : t.x === yMax ? 'end' : 'middle'}">${esc(t.label)}</text>`).join('');

  // konce řad a rozestavení popisků
  const ends = list.map((s) => {
    const valid = s.points.filter((p) => isNum(p.index));
    return valid[valid.length - 1];
  });
  const idealY = ends.map((e) => Y(e.index));
  const labelY = dodgeLabels(idealY, LV.gap, y0 + 4, y1);

  const seriesSvg = list.map((s, i) => {
    let d = '';
    let pen = false;
    for (const p of s.points) {
      if (!isNum(p.index)) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${r1(X(p.year))} ${r1(Y(p.index))}`;
      pen = true;
    }
    const e = ends[i];
    const ex = r1(X(e.year));
    const ey = r1(Y(e.index));
    const idxText = formatNumberCz(e.index, { minDecimals: 1, maxDecimals: 1 });
    const raw = isNum(e.value) ? ` · ${fmtValue(e.value, dec, unit)}` : '';
    const tip = s.tip || [`${s.label}: ${xFmt(e.year)} index ${idxText} (${xFmt(s.baseYear)} = 100)${raw}`, s.zdroj ?? source].filter(Boolean).join(' · ');
    const id = idAttr(s);
    return `<g class="zpv-series"${id} tabindex="0" role="img" aria-label="${esc(`${s.label}: ${xFmt(e.year)} index ${idxText}, ${xFmt(s.baseYear)} = 100`)}" data-tip="${esc(tip)}">`
      + `<path class="zpv-hit" d="${d}"/>`
      + `<path class="zpv-line zpv-mark"${id} d="${d}" pathLength="1" data-zpv-anim="line" style="--i:${i}"/>`
      + `<circle class="zpv-dot zpv-mark"${id} cx="${ex}" cy="${ey}" r="4" data-zpv-anim="dot" style="--i:${i}"/></g>`;
  }).join('');

  let labels = '';
  if (labelY) {
    labels = list.map((s, i) => {
      const e = ends[i];
      const ex = X(e.year);
      const ey = Y(e.index);
      const ly = labelY[i];
      const lx = ex + 14;
      const leader = Math.abs(ly - ey) > 1.5
        ? `<path class="zpv-leader" d="M${r1(ex + 6)} ${r1(ey)}L${r1(lx - 3)} ${r1(ly)}"/>` : '';
      return `${leader}<text class="zpv-endlab" x="${r1(lx)}" y="${r1(ly + 4)}">${esc(s.label ?? '')}</text>`;
    }).join('');
  }

  const svg = `<svg class="zpv-svg" viewBox="0 0 ${LV.W} ${LV.H}" width="100%">`
    + `<g class="zpv-axes" aria-hidden="true">${grid}${xAxis}</g>${seriesSvg}`
    + `<g class="zpv-labels" aria-hidden="true">${labels}</g></svg>`;

  const legend = `<ul class="zpv-legend">${list.map((s) => `<li${idAttr(s)}><i class="zpv-sw zpv-sw--line"${idAttr(s)} aria-hidden="true"></i>${esc(s.label ?? '')}</li>`).join('')}</ul>`;
  const aria = `${opts.title || 'Vývoj v čase'} (index, ${baseLabel}): ${list.map((s, i) => `${s.label} ${xFmt(ends[i].year)} ${formatNumberCz(ends[i].index, { minDecimals: 1, maxDecimals: 1 })}`).join(', ')}.`;
  const plot = `<div class="zpv-plot zpv-linesplot" role="group" aria-label="${esc(aria)}">${svg}${legend}</div>`;

  const table = tableTwin(opts.title, [xHead, ...list.map((s) => s.label ?? '')],
    years.map((y) => [esc(xFmt(y)), ...list.map((s) => {
      const p = s.points.find((q) => q.year === y);
      if (!p || !isNum(p.index)) return NA_TEXT;
      const rawv = isNum(p.value) ? ` <span class="zpv-raw">(${esc(fmtValue(p.value, dec, unit))})</span>` : '';
      return `${esc(formatNumberCz(p.index, { minDecimals: 1, maxDecimals: 1 }))}${rawv}`;
    })]), 1, source);
  return figure('lines', opts, plot + table, { colored: true, extraCap: `<span class="zpv-axisnote">Index, ${esc(baseLabel)}; jedna osa pro všechny řady.</span>` });
}

// ---------------------------------------------------------------------
//  6. dumbbell — plán → skutečnost
// ---------------------------------------------------------------------

/** Rozdíl to vůči from v % (null, když nejde spočítat). */
export function diffPct(from, to) {
  if (!isNum(from) || !isNum(to) || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

function signedPct(p) {
  if (!isNum(p)) return NA_TEXT;
  const s = formatNumberCz(Math.abs(p), { minDecimals: 1, maxDecimals: 1 });
  return `${p > 0 ? '+' : p < 0 ? '−' : '±'}${s} %`;
}

/**
 * @param {Array<{kod?, key?, label, from, to}>} items
 * @param {{title?, sub?, unit?, dec?, fromLabel?, toLabel?, source?, sort?: 'desc'|'none', maxv?}} opts
 */
export function dumbbell(items, opts = {}) {
  const { unit = '', dec = 0, fromLabel = 'plán', toLabel = 'skutečnost', source = '', sort = 'desc', maxv } = opts;
  // sortNote: jako u rankedBars (výchozí SORT_NOTE, false vypne).
  const list = (Array.isArray(items) ? items : []).filter((it) => it && typeof it === 'object')
    .map((it) => ({ ...it, from: isNum(it.from) ? it.from : null, to: isNum(it.to) ? it.to : null }));
  if (!list.length) return emptyFigure('dumbbell', opts);
  const rows = sort === 'desc' ? sortDesc(list, 'to') : list;
  const vals = rows.flatMap((r) => [r.from, r.to]).filter(isNum);
  let max = isNum(maxv) && maxv > 0 ? maxv : Math.max(0, ...vals);
  if (!(max > 0)) max = 1;
  // Osa od 0,9 × minimum, když by jinak všechny body ležely v úzkém pásu vpravo
  // (rozdíl by nebyl vidět); v záhlaví pak poznámka „osa nezačíná nulou“.
  const minv = vals.length ? Math.min(...vals) : 0;
  const lo = minv > 0 && 0.9 * minv > 0.1 * max ? 0.9 * minv : 0;
  const at = (v) => pct(v - lo, max - lo);

  const toTexts = rows.map((r) => fmtValue(r.to, dec, unit));
  const rowsHtml = rows.map((r, i) => {
    const id = idAttr(r);
    const ft = fmtValue(r.from, dec, unit);
    const tt = toTexts[i];
    const dp = diffPct(r.from, r.to);
    const tip = esc(r.tip || [`${r.label}: ${toLabel} ${tt}`, `${fromLabel} ${ft}`,
      dp != null ? `${signedPct(dp)} proti ${fromLabel === 'plán' ? 'plánu' : fromLabel}` : null,
      r.rok, r.zdroj ?? source].filter((x) => x != null && x !== '').join(' · '));
    let inner = '';
    if (r.to == null) {
      inner = `<span class="zpv-na">${NA_TEXT}</span>`;
    } else {
      const a = isNum(r.from) ? Math.max(lo, r.from) : null;
      const b = Math.max(lo, r.to);
      if (a != null) {
        const mn = Math.min(a, b);
        const dir = b >= a ? 'up' : 'down';
        inner += `<span class="zpv-db-line zpv-db-line--${dir}" data-zpv-anim="bar" style="--w:${at(mn)};width:${pct(Math.abs(b - a), max - lo)};--i:${i}" aria-hidden="true"></span>`
          + `<span class="zpv-db-from" style="--w:${at(a)}" aria-hidden="true"></span>`;
      }
      // Hodnota patří k plnému bodu („to“): vpravo od něj, při poklesu vlevo od něj;
      // vlevo jen když je tam místo (≥ 25 % osy), jinak až za prázdným bodem.
      const posB = (b - lo) / (max - lo);
      let val;
      if (a == null || b >= a) val = `<span class="zpv-val" style="--w:${at(b)}">${esc(tt)}</span>`;
      else if (posB >= 0.25) val = `<span class="zpv-val zpv-val--neg zpv-val--db" style="--x:${at(b)}">${esc(tt)}</span>`;
      else val = `<span class="zpv-val" style="--w:${at(a)}">${esc(tt)}</span>`;
      inner += `<span class="zpv-db-to zpv-mark"${id} data-zpv-anim="dot" style="--w:${at(b)};--i:${i}" tabindex="0" role="img" `
        + `aria-label="${esc(`${r.label}: ${toLabel} ${tt}, ${fromLabel} ${ft}`)}" data-tip="${tip}"></span>` + val;
    }
    return `<div class="zpv-row"${id} data-tip="${tip}"><span class="zpv-label">${esc(r.label ?? '')}</span>`
      + `<span class="zpv-track"><span class="zpv-area">${inner}</span></span></div>`;
  }).join('');

  const legend = `<ul class="zpv-legend zpv-legend--db"><li><i class="zpv-sw zpv-sw--from" aria-hidden="true"></i>${esc(fromLabel)}</li>`
    + `<li><i class="zpv-sw zpv-sw--to" aria-hidden="true"></i>${esc(toLabel)}</li></ul>`;
  const aria = `${opts.title || 'Srovnání'}: ${rows.map((r, i) => `${r.label} ${fromLabel} ${fmtValue(r.from, dec, unit)}, ${toLabel} ${toTexts[i]}`).join('; ')}.`;
  const plot = `<div class="zpv-plot zpv-barlist zpv-dbplot ${valWidthClass(toTexts)}" role="group" aria-label="${esc(aria)}">${legend}${rowsHtml}</div>`;
  const table = tableTwin(opts.title, ['Položka', fromLabel, toLabel, 'Rozdíl'],
    rows.map((r, i) => [esc(r.label ?? ''), esc(fmtValue(r.from, dec, unit)), esc(toTexts[i]), esc(signedPct(diffPct(r.from, r.to)))]), 1, source);
  let extra = lo > 0 ? `<span class="zpv-axisnote">Osa nezačíná nulou (od ${esc(fmtValue(lo, dec, unit))}).</span>` : '';
  const note = opts.sortNote === undefined ? SORT_NOTE : opts.sortNote;
  if (sort === 'desc' && note) extra += `<span class="zpv-sortnote">${esc(note)}</span>`;
  return figure('dumbbell', opts, plot + table, { extraCap: extra });
}

// ---------------------------------------------------------------------
//  Společné pro maticové tabulky (heatmap, dotMatrix, coverageMatrix)
// ---------------------------------------------------------------------

function rowId(r) {
  if (r && r.kod != null && r.kod !== '') return ` data-zp="${esc(r.kod)}"`;
  if (r && r.key != null && r.key !== '') return ` data-key="${esc(r.key)}"`;
  return '';
}

/** Rohová buňka: bez textu jako td (axe empty-table-header), s textem jako th. */
function corner(text) {
  return text ? `<th scope="col" class="zpv-corner">${esc(text)}</th>` : '<td class="zpv-corner"></td>';
}

function rowHead(r) {
  const sub = r.sub ? `<span class="zpv-rowsub">${esc(r.sub)}</span>` : '';
  return `<th scope="row"><span class="zpv-rowlab">${esc(r.label ?? '')}</span>${sub}</th>`;
}

function matrixFigure(typ, o, tableHtml, legend, extraCap = '') {
  const scroll = `<div class="zpv-scroll" tabindex="0" role="region" aria-label="${esc(o.title || 'Tabulka')}">${tableHtml}</div>`;
  return figure(typ, o, scroll + (legend || ''), { extraCap });
}

/** Věta k řaditelné heatmapě; skrytá, dokud čtenář neklikne na řazení (odkryje ji zp-interact.js). */
export const HEAT_SORT_NOTE = 'Řazeno podle stupně, nejde o hodnocení pojišťoven.';

function safeCell(fn, r, c) {
  try { return typeof fn === 'function' ? fn(r, c) : null; } catch { return null; }
}

// ---------------------------------------------------------------------
//  7. heatmap — ordinální mřížka (4 kroky jedné modré)
// ---------------------------------------------------------------------

export const HEAT_LEVELS = ['minimální', 'základní', 'silné', 'nejsilnější'];

/**
 * @param {Array<{kod?, key?, label, sub?}>} rows
 * @param {Array<{key, label}>} cols
 * @param {(row, col) => ({level: 0|1|2|3|null, text?, tipText?, tip?}|null)} cell
 *   level = barva (stupeň), text = co je v buňce (výchozí slovo stupně, může být číslo),
 *   tipText = co za dvojtečkou v tooltipu (výchozí text), tip = popis za pomlčkou
 * @param {{title?, sub?, levels?, source?, sortable?, rowHeader?, foot?}} opts  foot = věta pod legendou
 */
export function heatmap(rows, cols, cell, opts = {}) {
  const { levels = HEAT_LEVELS, sortable = true, rowHeader = '' } = opts;
  const R = (Array.isArray(rows) ? rows : []).filter(Boolean);
  const C = (Array.isArray(cols) ? cols : []).filter(Boolean);
  if (!R.length || !C.length) return emptyFigure('heat', opts);

  const head = `<tr>${corner(rowHeader)}${C.map((c) => (sortable
    ? `<th scope="col" aria-sort="none"><button type="button" class="zpv-sort" data-col="${esc(c.key)}">${esc(c.label)}<span class="zpv-sort-ic" aria-hidden="true"></span></button></th>`
    : `<th scope="col">${esc(c.label)}</th>`)).join('')}</tr>`;

  const body = R.map((r) => `<tr${rowId(r)}>${rowHead(r)}${C.map((c) => {
    const v = safeCell(cell, r, c) || {};
    const lvl = Number.isInteger(v.level) && v.level >= 0 && v.level <= 3 ? v.level : null;
    if (lvl == null) {
      return `<td class="zpv-cell" data-level="na"><span aria-hidden="true">—</span><span class="sr-only">${NA_TEXT}</span></td>`;
    }
    const text = v.text != null ? String(v.text) : (levels[lvl] ?? String(lvl));
    const tip = [`${r.label} · ${c.label}: ${v.tipText != null ? v.tipText : text}`, v.tip].filter(Boolean).join(' — ');
    const sr = v.tip ? `<span class="sr-only"> — ${esc(v.tip)}</span>` : '';
    // Fokus jen tam, kde tooltip přidá popis (v.tip): bez něj by tooltip jen
    // opakoval viditelný text buňky a Tab by procházel 63 zastávek naprázdno.
    const focus = v.tip ? ' tabindex="0"' : '';
    return `<td class="zpv-cell" data-level="${lvl}" data-col="${esc(c.key)}"${focus} data-tip="${esc(tip)}">${esc(text)}${sr}</td>`;
  }).join('')}</tr>`).join('');

  const legend = `<ul class="zpv-legend zpv-legend--ramp" aria-label="Stupně">${levels.slice(0, 4).map((l, i) => `<li><i class="zpv-sw zpv-sw--ramp" data-level="${i}" aria-hidden="true"></i>${esc(l)}</li>`).join('')}</ul>`;
  const table = `<table class="zpv-matrix zpv-heat" aria-label="${esc(opts.title || 'Matice')}"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  const note = sortable ? `<span class="zpv-sortnote" data-zpv-sortnote hidden>${esc(opts.sortNote || HEAT_SORT_NOTE)}</span>` : '';
  const foot = opts.foot ? `<p class="zpv-foot">${esc(opts.foot)}</p>` : '';
  return matrixFigure('heatmap', opts, table, legend + foot, note);
}

// ---------------------------------------------------------------------
//  8. dotMatrix — ano / ne / částečně / nedohledáno + skóre
// ---------------------------------------------------------------------

const DOT_STATE = {
  true: { cls: 'yes', text: 'ano' },
  false: { cls: 'no', text: 'ne' },
  partial: { cls: 'part', text: 'částečně' },
};

/** Skóre řádku: ano = 1, částečně = 0,5; známé = vše kromě null. */
export function dotScore(values) {
  let yes = 0;
  let known = 0;
  for (const v of values) {
    if (v === true) { yes += 1; known += 1; } else if (v === 'partial') { yes += 0.5; known += 1; } else if (v === false) known += 1;
  }
  return { yes, known, total: values.length };
}

/**
 * @param {Array<{kod?, key?, label, sub?}>} rows
 * @param {Array<{key, label}>} cols
 * @param {(row, col) => true|false|null|'partial'} cell
 * @param {{title?, sub?, scoreLabel?, source?, rowHeader?}} opts
 */
export function dotMatrix(rows, cols, cell, opts = {}) {
  const { scoreLabel = 'n/10', scoreWord = 'funkcí', rowHeader = '' } = opts;
  const R = (Array.isArray(rows) ? rows : []).filter(Boolean);
  const C = (Array.isArray(cols) ? cols : []).filter(Boolean);
  if (!R.length || !C.length) return emptyFigure('dots', opts);

  const head = `<tr>${corner(rowHeader)}${C.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('')}`
    + `<th scope="col" class="zpv-scorehead">${esc(scoreLabel)}</th></tr>`;
  const body = R.map((r) => {
    const vals = C.map((c) => safeCell(cell, r, c));
    const sc = dotScore(vals);
    const id = rowId(r);
    const cells = C.map((c, j) => {
      const v = vals[j];
      const st = v === true ? DOT_STATE.true : v === false ? DOT_STATE.false : v === 'partial' ? DOT_STATE.partial : null;
      if (!st) return `<td class="zpv-dotcell"><span aria-hidden="true">—</span><span class="sr-only">${esc(c.label)}: ${NA_TEXT}</span></td>`;
      return `<td class="zpv-dotcell" data-tip="${esc(`${r.label} · ${c.label}: ${st.text}`)}">`
        + `<span class="zpv-pip zpv-pip--${st.cls}${st.cls === 'no' ? '' : ' zpv-mark'}"${st.cls === 'no' ? '' : id} role="img" aria-label="${esc(`${c.label}: ${st.text}`)}"></span></td>`;
    }).join('');
    const scoreText = sc.known ? `${formatNumberCz(sc.yes, { maxDecimals: 1 })}/${sc.known}` : NA_TEXT;
    const unknown = sc.total - sc.known;
    const m = sc.known
      ? meter(sc.yes, { max: sc.known, label: `${r.label}: ${sc.yes} z ${sc.known} ${scoreWord}`, text: scoreText })
      : meter(null);
    const note = unknown && sc.known ? `<span class="zpv-scorenote">${unknown}× ${NA_TEXT}</span>` : '';
    return `<tr${id}>${rowHead(r)}${cells}<td class="zpv-scorecell">${m}${note}</td></tr>`;
  }).join('');

  const legend = `<ul class="zpv-legend zpv-legend--dots">`
    + `<li><i class="zpv-pip zpv-pip--yes" aria-hidden="true"></i>ano</li>`
    + `<li><i class="zpv-pip zpv-pip--part" aria-hidden="true"></i>částečně</li>`
    + `<li><i class="zpv-pip zpv-pip--no" aria-hidden="true"></i>ne</li>`
    + `<li><span class="zpv-dash" aria-hidden="true">—</span>${NA_TEXT}</li></ul>`;
  const table = `<table class="zpv-matrix zpv-dots" aria-label="${esc(opts.title || 'Matice')}"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  return matrixFigure('dots', opts, table, legend);
}

// ---------------------------------------------------------------------
//  9. coverageMatrix — stavová paleta, vždy ikona + text (SC 1.4.1)
// ---------------------------------------------------------------------

export const COVERAGE_STATES = {
  ano: { cls: 'good', icon: '✓', text: 'ano' },
  castecne: { cls: 'warn', icon: '½', text: 'částečně' },
  ne: { cls: 'bad', icon: '✕', text: 'neuvádí' },
};

/**
 * @param {Array<{kod?, key?, label, sub?}>} rows
 * @param {Array<{key, label}>} cols
 * @param {(row, col) => 'ano'|'castecne'|'ne'|null|{stav, tip?}} cell
 * @param {{title?, sub?, source?, labels?: {ano?, castecne?, ne?}, rowHeader?}} opts
 */
export function coverageMatrix(rows, cols, cell, opts = {}) {
  const { labels = {}, rowHeader = '' } = opts;
  const R = (Array.isArray(rows) ? rows : []).filter(Boolean);
  const C = (Array.isArray(cols) ? cols : []).filter(Boolean);
  if (!R.length || !C.length) return emptyFigure('coverage', opts);
  const stText = (k) => labels[k] ?? COVERAGE_STATES[k].text;

  const head = `<tr>${corner(rowHeader)}${C.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('')}</tr>`;
  const body = R.map((r) => `<tr${rowId(r)}>${rowHead(r)}${C.map((c) => {
    const raw = safeCell(cell, r, c);
    const k = raw && typeof raw === 'object' ? raw.stav : raw;
    const extraTip = raw && typeof raw === 'object' ? raw.tip : null;
    const st = COVERAGE_STATES[k];
    if (!st) return `<td class="zpv-cov" data-state="na"><span class="zpv-cov-ic" aria-hidden="true">—</span><span class="zpv-cov-tx">${NA_TEXT}</span></td>`;
    const tip = [`${r.label} · ${c.label}: ${stText(k)}`, extraTip].filter(Boolean).join(' — ');
    return `<td class="zpv-cov" data-state="${esc(k)}" data-tip="${esc(tip)}">`
      + `<span class="zpv-cov-ic zpv-tone-${st.cls}" aria-hidden="true">${st.icon}</span><span class="zpv-cov-tx">${esc(stText(k))}</span></td>`;
  }).join('')}</tr>`).join('');

  const legend = `<ul class="zpv-legend zpv-legend--cov">${Object.keys(COVERAGE_STATES).map((k) => {
    const st = COVERAGE_STATES[k];
    return `<li><span class="zpv-cov-ic zpv-tone-${st.cls}" aria-hidden="true">${st.icon}</span>${esc(stText(k))}</li>`;
  }).join('')}<li><span class="zpv-cov-ic" aria-hidden="true">—</span>${NA_TEXT}</li></ul>`;
  const table = `<table class="zpv-matrix zpv-covtable" aria-label="${esc(opts.title || 'Matice pokrytí')}"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  return matrixFigure('coverage', opts, table, legend);
}
