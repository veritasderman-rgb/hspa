// Sdílené pomocné funkce srovnávače pojišťoven (čisté, bez DOM kromě `set`).
// Používají je src/pojistovny.js (hero, kmen) a src/pojistovny-prevence.js (aplikace, prevence, otázky).
// Exportované čisté funkce (fmtKc, levelBadge, miniIndexSvg) testuje tests/pojistovny.test.js
// přes re-export v src/pojistovny.js. Grafy kreslí src/zp-viz.js (hbarSvg/sparkSvg odstraněny v P1.4).

import { escapeHtml, formatNumberCz } from './page-shared.js';
import { ZP, zpColor } from './zp-palette.js';

// Barvy pojišťoven: jedna paleta s Atlasem pojištěnců, tokeny --zp-* (src/zp-palette.js).
export const ZP_COLOR = Object.fromEntries(ZP.map((z) => [z.kod, zpColor(z.kod)]));
export const NA = '<span class="zpc-na" title="nedohledáno">—</span>';
export const esc = escapeHtml;

export function fmtKc(v, dec = 0) {
  if (v == null || v === '') return '—';
  // Záporná čísla s typografickým minus (U+2212), stejně jako fmtValue v zp-viz.js.
  return formatNumberCz(v, { minDecimals: dec, maxDecimals: dec }).replace(/^-/, '−');
}
export const num = (v, dec = 0) => (v == null ? NA : fmtKc(v, dec));
export const h = (obj) => (obj && typeof obj === 'object' && 'hodnota' in obj ? obj.hodnota : obj);

/**
 * Miniaturní indexovaný graf do karty pojišťovny (náhrada sparkline): řada
 * {year, value} přepočtená na index prvního roku = 100, vodorovná linka 100,
 * popisky krajních let a koncová hodnota indexu. Čistá funkce → SVG string.
 * Pevná velikost (bez škálování), text 11 px; barva čáry přes CSS
 * (.zpc-mini-line, výchozí inkoust, ve vybrané kartě barva pojišťovny).
 */
export function miniIndexSvg(points, { w = 176, hh = 44, label = '' } = {}) {
  const pts = (Array.isArray(points) ? points : [])
    .filter((p) => p && Number.isFinite(p.year) && Number.isFinite(p.value))
    .sort((a, b) => a.year - b.year);
  const base = pts.find((p) => p.value !== 0);
  if (pts.length < 2 || !base) return '<span class="zpc-na">vývoj kmene nedohledán</span>';
  const idx = pts.map((p) => ({ year: p.year, i: (p.value / base.value) * 100 }));
  const lo = Math.min(100, ...idx.map((p) => p.i));
  const hi = Math.max(100, ...idx.map((p) => p.i));
  const rng = (hi - lo) || 1;
  const x0 = 2, x1 = w - 34, y0 = 4, y1 = hh - 17;
  const y0yr = idx[0].year, y1yr = idx[idx.length - 1].year;
  const X = (yr) => x0 + ((yr - y0yr) / ((y1yr - y0yr) || 1)) * (x1 - x0);
  const Y = (v) => y1 - ((v - lo) / rng) * (y1 - y0);
  const r = (v) => Math.round(v * 10) / 10;
  const d = idx.map((p, k) => `${k ? 'L' : 'M'}${r(X(p.year))} ${r(Y(p.i))}`).join('');
  const end = idx[idx.length - 1];
  const endTxt = fmtKc(end.i, 0);
  const aria = `${label ? label + ': ' : ''}počet pojištěnců ${y1yr} = ${endTxt} % stavu ${y0yr} (index ${y0yr} = 100)`;
  return `<svg class="zpc-mini" viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}" role="img" aria-label="${esc(aria)}">`
    + `<line class="zpc-mini-base" x1="${x0}" x2="${x1}" y1="${r(Y(100))}" y2="${r(Y(100))}"/>`
    + `<path class="zpc-mini-line" d="${d}"/>`
    + `<circle class="zpc-mini-dot" cx="${r(X(end.year))}" cy="${r(Y(end.i))}" r="2.5"/>`
    + `<text class="zpc-mini-end" x="${r(X(end.year) + 5)}" y="${r(Y(end.i) + 4)}">${esc(endTxt)}</text>`
    + `<text class="zpc-mini-yr" x="${x0}" y="${hh - 3}">${y0yr}</text>`
    + `<text class="zpc-mini-yr" x="${r(x1)}" y="${hh - 3}" text-anchor="end">${y1yr}</text></svg>`;
}
export const LEVELS = { nejsilnejsi: 3, silne: 2, zakladni: 1, minimalni: 0 };
export const LEVEL_LABEL = { 3: 'nejsilnější', 2: 'silné', 1: 'základní', 0: 'minimální' };
export function levelBadge(stupen) {
  if (stupen == null) return NA;
  const n = typeof stupen === 'number' ? stupen : LEVELS[String(stupen).toLowerCase()];
  if (n == null) return esc(String(stupen));
  return `<span class="zpc-lvl zpc-lvl-${n}">${LEVEL_LABEL[n]}</span>`;
}
export const boolMark = (v) => (v === true ? '<span class="zpc-yes">✓</span>' : v === false ? '<span class="zpc-no">✗</span>' : v === 'partial' ? '<span class="zpc-part">◐</span>' : NA);
export const dot = (kod) => `<span class="zpc-dot" style="--c:${ZP_COLOR[kod] || 'var(--ink)'}"></span>`;
export const li = (arr) => (arr || []).map((s) => `<li>${esc(s)}</li>`).join('') || '<li class="zpc-na">—</li>';
export const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
/** ISO datum (YYYY-MM-DD, případně s časem) → „14. 10. 2026“; cokoli jiného se vrátí beze změny. */
export function datumCz(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : String(iso ?? '');
}
export const short = (s, n = 70) => (s ? (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s)) : '');

async function fetchJson(url, attempt = 0) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
    return await r.json();
  } catch (err) {
    if (attempt < 1) { await new Promise((res) => setTimeout(res, 300)); return fetchJson(url, attempt + 1); }
    console.warn('pojistovny:', err.message);
    return null;
  }
}

// Jeden fetch na URL a stránku: shell (zdroje), orchestrátor i semafor čtou
// data/pojistovny.json — sdílejí tentýž promise. Neúspěch (null) se necachuje.
const jsonCache = new Map();
export function loadJson(url) {
  if (!jsonCache.has(url)) {
    const pr = fetchJson(url).then((v) => { if (v == null) jsonCache.delete(url); return v; });
    jsonCache.set(url, pr);
  }
  return jsonCache.get(url);
}
