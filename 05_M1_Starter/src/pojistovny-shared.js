// Sdílené pomocné funkce srovnávače pojišťoven (čisté, bez DOM kromě `set`).
// Používají je src/pojistovny.js (hero, kmen) a src/pojistovny-prevence.js (aplikace, prevence, otázky).
// Exportované čisté funkce (fmtKc, hbarSvg, sparkSvg, levelBadge) testuje tests/pojistovny.test.js
// přes re-export v src/pojistovny.js.

import { escapeHtml, formatNumberCz } from './page-shared.js';
import { ZP, zpColor } from './zp-palette.js';

// Barvy pojišťoven: jedna paleta s Atlasem pojištěnců, tokeny --zp-* (src/zp-palette.js).
export const ZP_COLOR = Object.fromEntries(ZP.map((z) => [z.kod, zpColor(z.kod)]));
export const NA = '<span class="zpc-na" title="nedohledáno">—</span>';
export const esc = escapeHtml;

export function fmtKc(v, dec = 0) {
  if (v == null || v === '') return '—';
  return formatNumberCz(v, { minDecimals: dec, maxDecimals: dec });
}
export const num = (v, dec = 0) => (v == null ? NA : fmtKc(v, dec));
export const h = (obj) => (obj && typeof obj === 'object' && 'hodnota' in obj ? obj.hodnota : obj);

/** Vodorovný sloupcový graf (SVG, škálovaný; hodnota null = „nedohledáno“). */
export function hbarSvg(items, { unit = '', dec = 1, ref = null, refLabel = '', width = 640, maxv = null } = {}) {
  const vals = items.map((i) => i.value).filter((v) => v != null);
  if (!vals.length) return '<p class="zpc-na">Data nejsou k dispozici.</p>';
  const mx = maxv ?? Math.max(...vals, ref ?? 0) * 1.12;
  const rh = 26, gap = 8, labW = 120, valW = 92;
  const hgt = items.length * (rh + gap) + 28;
  const bw = width - labW - valW - 8;
  let out = `<svg viewBox="0 0 ${width} ${hgt}" width="100%" role="img" aria-label="graf" style="max-width:${width}px;font-family:var(--sans)">`;
  if (ref != null) {
    const x = labW + bw * ref / mx;
    out += `<line x1="${x.toFixed(1)}" y1="2" x2="${x.toFixed(1)}" y2="${hgt - 16}" stroke="var(--red)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    out += `<text x="${(x + 4).toFixed(1)}" y="${hgt - 4}" font-size="11" fill="var(--red)">${esc(refLabel)}</text>`;
  }
  items.forEach((it, i) => {
    const y = 8 + i * (rh + gap);
    out += `<text x="${labW - 8}" y="${(y + rh * 0.68).toFixed(1)}" text-anchor="end" font-size="13" fill="var(--ink)">${esc(it.label)}</text>`;
    if (it.value == null) {
      out += `<text x="${labW + 4}" y="${(y + rh * 0.68).toFixed(1)}" font-size="12" fill="var(--ink-mut)">nedohledáno</text>`;
      return;
    }
    const w = Math.max(2, bw * it.value / mx);
    out += `<rect x="${labW}" y="${y}" width="${w.toFixed(1)}" height="${rh}" fill="${it.color}" rx="2"/>`;
    const txt = fmtKc(it.value, dec) + unit;
    out += `<text x="${(labW + w + 6).toFixed(1)}" y="${(y + rh * 0.68).toFixed(1)}" font-size="13" font-weight="600" fill="var(--ink)" style="font-variant-numeric:tabular-nums">${esc(txt)}</text>`;
    if (it.sub) out += `<text x="${(labW + w + 6 + txt.length * 7.5 + 6).toFixed(1)}" y="${(y + rh * 0.68).toFixed(1)}" font-size="11" fill="var(--ink-mut)">${esc(it.sub)}</text>`;
  });
  return out + '</svg>';
}

/** Sparkline tržního podílu. */
export function sparkSvg(trend, color, w = 120, hh = 28) {
  const vals = trend.map((t) => t.share_pct);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = (mx - mn) || 1;
  const pts = vals.map((v, i) => [2 + i * (w - 4) / (vals.length - 1), hh - 2 - (v - mn) / rng * (hh - 6)]);
  const d = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}" aria-hidden="true"><polyline points="${d}" fill="none" stroke="${color}" stroke-width="1.6"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2.4" fill="${color}"/></svg>`;
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
export const short = (s, n = 70) => (s ? (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s)) : '');

export async function loadJson(url, attempt = 0) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
    return await r.json();
  } catch (err) {
    if (attempt < 1) { await new Promise((res) => setTimeout(res, 300)); return loadJson(url, attempt + 1); }
    console.warn('pojistovny:', err.message);
    return null;
  }
}
