// Animovaná hero vizualizace na homepage: křivka naděje dožití (ČR) navázaná
// na headline „Češi se dožívají vyššího věku, ale zdravějších let mají méně…".
// Křivka se při načtení nakreslí (stroke-dashoffset); reduced-motion ji ukáže
// rovnou celou. Čistá funkce bez DOM — testovatelná.

import { formatNumberCz } from './page-shared.js';

const SIGNAL_COLOR = { good: '#38761D', warn: '#B45F06', bad: '#990000', neutral: '#0B5394' };

/**
 * Sestaví HTML hero grafu (SVG + titulek + popisek) pro daný indikátor.
 *
 * @param {object} ind — indikátor s trendem a benchmarkem (naděje dožití)
 * @param {object|null} healthyInd — doplňkový indikátor pro popisek (zdravé roky)
 * @returns {string} HTML nebo '' když nejsou data
 */
export function buildHeroViz(ind, healthyInd = null) {
  const trend = (ind?.trend ?? []).filter(t => Number.isFinite(Number(t.value)));
  if (trend.length < 2) return '';

  const W = 340, H = 208;
  const L = 12, R = 14, T = 30, B = 28;
  const plotW = W - L - R, plotH = H - T - B;
  const color = SIGNAL_COLOR[ind.signal] ?? SIGNAL_COLOR.neutral;

  const eu = ind.benchmark?.eu != null ? Number(ind.benchmark.eu) : null;
  const oecd = ind.benchmark?.oecd != null ? Number(ind.benchmark.oecd) : null;
  const refVal = eu != null ? eu : oecd;
  const refLabel = eu != null ? 'EU' : 'OECD';

  const vals = trend.map(t => Number(t.value)).concat(refVal != null ? [refVal] : []);
  let yMin = Math.min(...vals), yMax = Math.max(...vals);
  const pad = Math.max(0.4, (yMax - yMin) * 0.18);
  yMin -= pad; yMax += pad;
  const span = yMax - yMin || 1;

  const xAt = i => L + (i / (trend.length - 1)) * plotW;
  const yAt = v => T + plotH * (1 - (v - yMin) / span);

  const linePts = trend.map((t, i) => `${xAt(i).toFixed(1)},${yAt(Number(t.value)).toFixed(1)}`).join(' ');
  const areaPts = `${xAt(0).toFixed(1)},${(T + plotH).toFixed(1)} ${linePts} ${xAt(trend.length - 1).toFixed(1)},${(T + plotH).toFixed(1)}`;

  const lastX = xAt(trend.length - 1), lastY = yAt(Number(trend[trend.length - 1].value));
  const firstYear = trend[0].year, lastYear = trend[trend.length - 1].year;
  const latestTxt = `${formatNumberCz(ind.value)} ${ind.unit ?? ''}`.trim();

  const refLine = refVal != null ? `
    <line class="hero-viz-ref" x1="${L}" y1="${yAt(refVal).toFixed(1)}" x2="${(W - R).toFixed(1)}" y2="${yAt(refVal).toFixed(1)}"/>
    <text class="hero-viz-ref-lbl" x="${(W - R).toFixed(1)}" y="${(yAt(refVal) - 4).toFixed(1)}" text-anchor="end">${refLabel} ${formatNumberCz(refVal)}</text>` : '';

  const svg = `<svg class="hero-viz-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vývoj naděje dožití v Česku ${firstYear}–${lastYear}, poslední hodnota ${latestTxt}">
    <text class="hero-viz-title" x="${L}" y="16">${escXml(ind.name)} · ČR</text>
    ${refLine}
    <polygon class="hero-viz-area" points="${areaPts}" fill="${color}"/>
    <polyline class="hero-viz-line" points="${linePts}" pathLength="1" stroke="${color}"/>
    <circle class="hero-viz-dot" cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.4" fill="${color}"/>
    <text class="hero-viz-val" x="${lastX.toFixed(1)}" y="${(lastY - 9).toFixed(1)}" text-anchor="end" fill="${color}">${escXml(latestTxt)}</text>
    <text class="hero-viz-ax" x="${L}" y="${(H - 8)}">${firstYear}</text>
    <text class="hero-viz-ax" x="${(W - R).toFixed(1)}" y="${(H - 8)}" text-anchor="end">${lastYear}</text>
  </svg>`;

  const cap = buildCaption(ind, healthyInd);
  return `<figure class="ed-hero-viz-card">${svg}${cap ? `<figcaption class="ed-hero-viz-cap">${cap}</figcaption>` : ''}</figure>`;
}

function buildCaption(ind, healthyInd) {
  const hv = healthyInd && Number.isFinite(Number(healthyInd.value)) ? Number(healthyInd.value) : null;
  const hRef = healthyInd?.benchmark?.oecd ?? healthyInd?.benchmark?.eu ?? null;
  if (hv != null && hRef != null) {
    return `Roste — ale zdravých let v 65 z toho jen <strong>${formatNumberCz(hv)}</strong>, průměr OECD ${formatNumberCz(Number(hRef))}.`;
  }
  return `Naděje dožití roste, ale zůstává pod průměrem ${ind.benchmark?.eu != null ? 'EU' : 'OECD'}.`;
}

function escXml(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
