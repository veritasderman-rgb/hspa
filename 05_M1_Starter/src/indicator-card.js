// Sdílená (DOM-free) karta indikátoru ve vizuálu homepage: area-tag, hodnota,
// meziroční šipka, benchmark bary (ČR/OECD/EU) a trendový graf (inline SVG).
// Reuse na persona minihomepage (pás 20–30 indikátorů) beze závislosti na
// app.js (homepage modul spouští vlastní init) a bez Chart.js (graf je
// self-contained SVG — stejně jako fallback homepage).

import { escapeHtml, formatNumberCz, verifBadgeHtml } from './page-shared.js';
import { computeYoy } from './indicator-takeaway.js';

function fwBadgeHtml(ind) {
  return ind.framework === 'monitoring'
    ? '<span class="fw-badge fw-monitoring" title="Doplňkový monitoring nad rámec českého rámce HSPA">Monitoring</span>'
    : '<span class="fw-badge fw-hspa" title="Indikátor z HSPA Framework for the Czech Republic (OECD/MZ ČR 2023)">HSPA</span>';
}

function trendArrowHtml(ind) {
  const yoy = computeYoy(ind);
  if (!yoy) return '';
  if (yoy.cls === 'flat' || Math.abs(yoy.pct) < 0.5) {
    return '<span class="trend trend-flat" title="Stabilní">→</span>';
  }
  const pctTxt = formatNumberCz(Math.abs(yoy.pct), { minDecimals: 1, maxDecimals: 1 });
  return `<span class="trend trend-${escapeHtml(yoy.cls)}" title="Meziroční změna">${yoy.glyph} ${pctTxt} %</span>`;
}

/** Benchmark bary ČR/OECD/EU/top OECD — replika benchmarkBarHTML z app.js. */
function benchmarkBarsHtml(ind) {
  const cz = Number(ind.value);
  const b = ind.benchmark || {};
  const oecd = b.oecd != null ? Number(b.oecd) : null;
  const eu = b.eu != null ? Number(b.eu) : null;
  const best = b.oecd_best != null ? Number(b.oecd_best) : null;
  if (oecd == null && eu == null && best == null) return '';

  const refs = [cz, oecd, eu, best].filter(v => v != null && Number.isFinite(v));
  const maxVal = Math.max(...refs);
  if (!Number.isFinite(maxVal) || maxVal === 0) return '';

  const color = ind.signal === 'good' ? '#38761D'
    : ind.signal === 'warn' ? '#B45F06'
    : ind.signal === 'bad' ? '#990000' : '#0B5394';
  const row = (key, val, bg, title) => {
    const pct = Math.min(100, Math.round(val / maxVal * 100));
    return `<div class="bm-row"><span class="bm-key"${title ? ` title="${title}"` : ''}>${key}</span>`
      + `<div class="bm-track"><div class="bm-fill" style="width:${pct}%;background:${bg}"></div></div>`
      + `<span class="bm-val">${formatNumberCz(val)}</span></div>`;
  };
  let rows = row('ČR', cz, color);
  if (oecd != null) rows += row('OECD', oecd, '#4A90D9', 'Průměr OECD');
  if (eu != null) rows += row('EU', eu, '#E69138', 'Průměr EU');
  if (best != null) rows += row('Top', best, '#16A34A', 'Nejlepší OECD');
  return rows;
}

/** Trendový graf jako filled-area inline SVG (bez CDN). '' pro < 2 body. */
function cardChartSvg(ind) {
  const pts = (ind.trend || []).filter(t => Number.isFinite(Number(t.value)));
  if (pts.length < 2) return '';
  const color = ind.signal === 'good' ? '#38761D'
    : ind.signal === 'warn' ? '#B45F06'
    : ind.signal === 'bad' ? '#990000' : '#0B5394';
  const W = 320, H = 60, PAD = 4;
  const vals = pts.map(t => Number(t.value));
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const xy = pts.map((t, i) => {
    const x = PAD + (i / (pts.length - 1)) * (W - 2 * PAD);
    const y = H - PAD - ((Number(t.value) - min) / span) * (H - 2 * PAD);
    return [x, y];
  });
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${PAD.toFixed(1)},${(H - PAD).toFixed(1)} ${line} ${(W - PAD).toFixed(1)},${(H - PAD).toFixed(1)}`;
  return `<svg class="card-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="${H}" role="img" aria-label="Trend indikátoru">`
    + `<polygon points="${area}" fill="${color}" fill-opacity="0.12"/>`
    + `<polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
    + `</svg>`;
}

/**
 * HTML jedné karty indikátoru ve vizuálu homepage. Čistá funkce (testovatelná).
 * Odkaz „Detail →" míří na indicator.html?id= (dynamická stránka s verdiktem).
 *
 * @param {object} ind — záznam z data/indicators.json
 * @returns {string}
 */
export function indicatorCardHtml(ind) {
  if (!ind || ind.value == null) return '';
  const bench = benchmarkBarsHtml(ind);
  const chart = cardChartSvg(ind);
  return `<article class="indicator-card" data-indicator-id="${escapeHtml(ind.id)}">
    <div class="area-tag">${escapeHtml(ind.area ?? '')} · ${escapeHtml(ind.domain ?? '')}${fwBadgeHtml(ind)}${verifBadgeHtml(ind)}</div>
    <div class="top">
      <h4>${escapeHtml(ind.name)}</h4>
      <div class="signal ${escapeHtml(ind.signal ?? 'neutral')}" title="Hodnocení: ${escapeHtml(ind.signal ?? '')}"></div>
    </div>
    <div class="value-row">
      <span class="big-value">${formatNumberCz(ind.value)}</span>
      <span class="unit">${escapeHtml(ind.unit ?? '')}</span>
      ${trendArrowHtml(ind)}
      ${ind.year ? `<span class="year-badge">${escapeHtml(String(ind.year))}</span>` : ''}
    </div>
    ${bench}
    ${chart ? `<div class="chart-wrap">${chart}</div>` : ''}
    <div class="source">Zdroj: ${escapeHtml(ind.source?.name ?? '?')}<a class="card-detail-link" href="indicator.html?id=${encodeURIComponent(ind.id)}" aria-label="Otevřít detail indikátoru: ${escapeHtml(ind.name)}">Detail →</a></div>
  </article>`;
}
