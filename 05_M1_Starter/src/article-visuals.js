// HSPA Monitor — design system pro vizuální komponenty v článcích.
//
// Šest komponent (.av-*):
//   .av-timeline      vertikální chronologie (legislativa, reformy, epochy)
//   .av-bar-compare   srovnání hodnot pomocí horizontálních barů
//   .av-data-table    standardizovaná tabulka (země × parametry, scénáře)
//   .av-flow          flow diagram s kroky a šipkami (proces, datový tok)
//   .av-counter       animované velké číslo (IntersectionObserver count-up)
//   .av-trend         animovaná SVG časová řada (draw-on-scroll čára)
//
// Pure markup: většinu práce řeší CSS (.av-* třídy v src/styles.css).
// JS modul pouze:
//   - dopočítá šířky barů v .av-bar-compare z data-value
//   - spustí count-up animaci v .av-counter
//   - vykreslí a rozanimuje SVG čáru v .av-trend
// Respektuje prefers-reduced-motion (žádná animace, hned finální stav).
//
// Použití (auto-bootstrap z src/clanky.js):
//   import { enhanceArticleVisuals } from './article-visuals.js';
//   enhanceArticleVisuals();
//
// Idempotentní — opakované volání nezpůsobí duplikaci ani re-animaci.

const REDUCED_MOTION = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Vstupní bod — prohledá DOM (nebo zadaný kořen) a postupně vylepší všechny
 * AV komponenty, které ještě nebyly inicializovány.
 *
 * @param {ParentNode} [root=document] kořen prohledávání
 */
export function enhanceArticleVisuals(root) {
  if (typeof document === 'undefined') return;
  const scope = root ?? document;
  enhanceBarCompare(scope);
  enhanceCounters(scope);
  enhanceTrends(scope);
  enhanceScrollableTables(scope);
}

// =====================================================================
//  .av-data-table-wrap — horizontálně posuvný kontejner tabulky
// =====================================================================
//
// WCAG 2.1.1 / axe scrollable-region-focusable: kontejner s overflow-x:auto
// musí být fokusovatelný klávesnicí, aby šel posouvat i bez myši/dotyku
// (na úzkých viewportech tabulka přetéká). Doplníme tabindex + role/aria.
function enhanceScrollableTables(scope) {
  // Tabulky v textu článku bez scroll wrapperu (ex-compare, hly-compare…)
  // na úzkém viewportu přetékají — obalíme je stejným posuvným kontejnerem,
  // jaký mají .av-data-table.
  for (const table of scope.querySelectorAll('.article-body table')) {
    if (table.closest('.av-data-table-wrap')) continue;
    const wrap = document.createElement('div');
    wrap.className = 'av-data-table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  }
  for (const wrap of scope.querySelectorAll('.av-data-table-wrap:not([data-av-scroll])')) {
    wrap.dataset.avScroll = '1';
    if (!wrap.hasAttribute('tabindex')) wrap.setAttribute('tabindex', '0');
    if (!wrap.hasAttribute('role')) wrap.setAttribute('role', 'region');
    if (!wrap.hasAttribute('aria-label')) {
      const cap = wrap.querySelector('caption');
      wrap.setAttribute('aria-label', cap?.textContent?.trim() || 'Posuvná tabulka s daty');
    }
  }
}

// =====================================================================
//  .av-bar-compare — horizontální bary
// =====================================================================
//
// Markup:
//   <figure class="av-bar-compare" data-max="30" data-unit="%">
//     <figcaption class="av-bar-compare-h">Titulek</figcaption>
//     <ol class="av-bar-compare-list">
//       <li class="av-bar-row av-bar-row-highlight"
//           data-value="28" data-label="Česko"></li>
//       <li class="av-bar-row" data-value="4.4" data-label="Německo"></li>
//     </ol>
//     <p class="av-bar-compare-note">Zdroj…</p>
//   </figure>
//
// Pokud chybí data-max, použije se nejvyšší data-value. data-unit se přidá
// k popisku hodnoty.

function enhanceBarCompare(scope) {
  const groups = scope.querySelectorAll('.av-bar-compare:not([data-av-init])');
  groups.forEach(group => {
    const rows = Array.from(group.querySelectorAll('.av-bar-row'));
    if (rows.length === 0) return;

    const values = rows.map(r => parseFloat(r.dataset.value));
    const maxAttr = parseFloat(group.dataset.max);
    const max = Number.isFinite(maxAttr) && maxAttr > 0
      ? maxAttr
      : Math.max(...values.filter(Number.isFinite));
    const unit = group.dataset.unit ?? '';

    rows.forEach((row, i) => {
      const val = values[i];
      const label = row.dataset.label ?? '';
      const note = row.dataset.note ?? '';
      const pct = Number.isFinite(val) && max > 0
        ? Math.max(0, Math.min(100, (val / max) * 100))
        : 0;

      const displayValue = row.dataset.display ?? formatBarValue(val, unit);

      row.innerHTML = `
        <span class="av-bar-row-label">${escapeHtml(label)}</span>
        <span class="av-bar-row-track" aria-hidden="true">
          <span class="av-bar-row-fill" style="width:${pct.toFixed(2)}%;"></span>
        </span>
        <span class="av-bar-row-value">${escapeHtml(displayValue)}</span>
        ${note ? `<span class="av-bar-row-note">${escapeHtml(note)}</span>` : ''}`;
      row.setAttribute('role', 'listitem');
      row.setAttribute(
        'aria-label',
        `${label}: ${displayValue}${note ? ' — ' + note : ''}`
      );
    });

    group.dataset.avInit = '1';
  });
}

function formatBarValue(v, unit) {
  if (!Number.isFinite(v)) return '—';
  const formatted = Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',');
  return unit ? `${formatted} ${unit}` : formatted;
}

// =====================================================================
//  .av-counter — animovaný počet
// =====================================================================
//
// Markup (inline):
//   <span class="av-counter"
//         data-value="154.6" data-decimals="1" data-suffix=" mld Kč"
//         data-duration="1400">154,6 mld Kč</span>
//
// Markup (blok):
//   <div class="av-counter-block">
//     <span class="av-counter" data-value="96">96</span>
//     <span class="av-counter-label">nemocnic s LPS</span>
//     <span class="av-counter-foot">stav k 2026</span>
//   </div>
//
// Vždy obsahuje fallback text — pokud JS nezareaguje (no-JS, IntersectionObserver
// chybí), zobrazí se finální hodnota napsaná v HTML.
//
// DŮLEŽITÉ — kdy NEpoužívat data-value:
//   - Datumové stringy ("1. 1. 2027" → JS by přepsalo na "2 027" a ztratil
//     by se den/měsíc).
//   - Roky bez další jednotky ("1981", "2028") — animovaly by se jako "1 981".
//     Pokud chceš zachovat plnou .av-counter typografii bez animace, jen
//     vynechej data-value (parseCounterValue vrátí null a JS skip animation).
//   - Rozsahy ("12–19", "4–8 měs.", "350–500") — JS by collapsoval na
//     jedno číslo. Použij statický text bez data-value.
//   - Hodnoty se znaménkem ("+6,4 %", "−110") — vždy doplnit data-prefix="+"
//     nebo data-prefix="−" aby se znaménko nezdráhalo při animaci.

function enhanceCounters(scope) {
  const els = scope.querySelectorAll('.av-counter:not([data-av-init])');
  if (els.length === 0) return;

  els.forEach(el => {
    const target = parseCounterValue(el);
    if (target === null) {
      el.dataset.avInit = '1';
      return;
    }
    el.dataset.avTarget = String(target);
    el.dataset.avInit = '1';
    el.setAttribute('aria-live', 'off');
  });

  if (REDUCED_MOTION || typeof IntersectionObserver === 'undefined') {
    // Reduced motion nebo starý prohlížeč → ponecháme statický fallback text.
    return;
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      runCounter(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  els.forEach(el => {
    if (el.dataset.avTarget !== undefined) obs.observe(el);
  });
}

function parseCounterValue(el) {
  const v = parseFloat(el.dataset.value);
  return Number.isFinite(v) ? v : null;
}

function runCounter(el) {
  const target = parseFloat(el.dataset.avTarget);
  if (!Number.isFinite(target)) return;
  const decimals = clampInt(parseInt(el.dataset.decimals, 10), 0, 4, 0);
  const duration = clampInt(parseInt(el.dataset.duration, 10), 200, 5000, 1200);
  const prefix = el.dataset.prefix ?? '';
  const suffix = el.dataset.suffix ?? '';
  const start = 0;
  const t0 = performance.now();

  function step(now) {
    const p = Math.min(1, (now - t0) / duration);
    const eased = easeOutQuart(p);
    const v = start + (target - start) * eased;
    el.textContent = prefix + formatNumber(v, decimals) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = prefix + formatNumber(target, decimals) + suffix;
  }
  requestAnimationFrame(step);
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function clampInt(v, min, max, fallback) {
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

/**
 * České formátování čísla — mezera jako oddělovač tisíců, čárka jako desetinný.
 * Drží se Intl.NumberFormat cs-CZ, pokud je dostupný; jinak fallback.
 *
 * @param {number} v
 * @param {number} decimals
 */
export function formatNumber(v, decimals) {
  if (!Number.isFinite(v)) return '—';
  if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
    return new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  }
  const rounded = decimals > 0
    ? v.toFixed(decimals).replace('.', ',')
    : String(Math.round(v));
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// =====================================================================
//  .av-trend — animovaná SVG časová řada
// =====================================================================
//
// Markup:
//   <figure class="av-trend" data-unit="%">
//     <figcaption class="av-trend-h">Titulek</figcaption>
//     <div class="av-trend-chart"
//          data-points='[{"year":2000,"value":90.6},{"year":2024,"value":75.1}]'
//          data-min="60" data-max="100"
//          data-break-year="2020" data-break-label="změna vykazování"></div>
//     <p class="av-trend-note">Zdroj…</p>
//   </figure>
//
// Osa X je úměrná roku (nerovnoměrné řady se nekreslí jako rovnoměrné —
// mezera 2000→2015 je vizuálně delší než 2021→2022). Popisky hodnot nesou
// první, poslední a minimální bod; roky všechny body. data-break-year vloží
// svislou přerušovanou linku (např. změna metodiky) — poctivost řady.
// Animace: čára se „kreslí" přes stroke-dashoffset po vstupu do viewportu,
// body a popisky nabíhají se zpožděním. Reduced motion → statický finální stav.

const TREND_W = 640;
const TREND_H = 240;
const TREND_PAD = { left: 30, right: 46, top: 34, bottom: 30 };

/**
 * Pure geometrie trendu — souřadnice bodů, SVG path a index minima.
 * Exportováno pro testy (bez DOM).
 *
 * @param {{year:number, value:number}[]} points
 * @param {{min?:number, max?:number}} [opts] rozsah osy Y (default z dat ±8 % pásmo)
 * @returns {null | {dots:{x:number,y:number,year:number,value:number}[], path:string,
 *   area:string, minIdx:number, yMin:number, yMax:number, xForYear:(y:number)=>number}}
 */
export function trendGeometry(points, opts = {}) {
  const pts = (points || []).filter(p => p && Number.isFinite(p.year) && Number.isFinite(p.value));
  if (pts.length < 2) return null;
  const sorted = [...pts].sort((a, b) => a.year - b.year);
  const years = sorted.map(p => p.year);
  const values = sorted.map(p => p.value);
  const y0 = Math.min(...years);
  const y1 = Math.max(...years);
  if (y1 === y0) return null;
  const vLo = Math.min(...values);
  const vHi = Math.max(...values);
  const span = (vHi - vLo) || 1;
  const yMin = Number.isFinite(opts.min) ? opts.min : vLo - span * 0.12;
  const yMax = Number.isFinite(opts.max) ? opts.max : vHi + span * 0.12;
  if (yMax <= yMin) return null;

  const plotW = TREND_W - TREND_PAD.left - TREND_PAD.right;
  const plotH = TREND_H - TREND_PAD.top - TREND_PAD.bottom;
  const xForYear = (yr) => TREND_PAD.left + ((yr - y0) / (y1 - y0)) * plotW;
  const yForVal = (v) => TREND_PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const dots = sorted.map(p => ({
    x: round2(xForYear(p.year)), y: round2(yForVal(p.value)), year: p.year, value: p.value,
  }));
  const path = dots.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x} ${d.y}`).join(' ');
  const baseline = round2(TREND_H - TREND_PAD.bottom);
  const area = `${path} L${dots[dots.length - 1].x} ${baseline} L${dots[0].x} ${baseline} Z`;
  let minIdx = 0;
  dots.forEach((d, i) => { if (d.value < dots[minIdx].value) minIdx = i; });
  return { dots, path, area, minIdx, yMin, yMax, xForYear };
}

function round2(v) { return Math.round(v * 100) / 100; }

function enhanceTrends(scope) {
  const groups = scope.querySelectorAll('.av-trend:not([data-av-init])');
  groups.forEach(group => {
    group.dataset.avInit = '1';
    const chart = group.querySelector('.av-trend-chart');
    if (!chart) return;
    let points;
    try { points = JSON.parse(chart.dataset.points || '[]'); } catch { return; }
    const geo = trendGeometry(points, {
      min: parseFloat(chart.dataset.min),
      max: parseFloat(chart.dataset.max),
    });
    if (!geo) return;
    const unit = chart.dataset.unit ?? group.dataset.unit ?? '';
    const fmt = (v) => formatNumber(v, Number.isInteger(v) ? 0 : 1) + (unit ? ` ${unit}` : '');

    // Popisky hodnot: první, poslední a minimum (pokud je jiný bod).
    const labelIdx = new Set([0, geo.dots.length - 1, geo.minIdx]);
    const baseline = TREND_H - TREND_PAD.bottom;

    let breakMarkup = '';
    const breakYear = parseFloat(chart.dataset.breakYear);
    if (Number.isFinite(breakYear)) {
      const bx = round2(geo.xForYear(breakYear));
      const bl = chart.dataset.breakLabel || '';
      breakMarkup = `
        <line class="av-trend-break" x1="${bx}" y1="${TREND_PAD.top - 6}" x2="${bx}" y2="${baseline}" />
        ${bl ? `<text class="av-trend-break-label" x="${bx}" y="${TREND_PAD.top - 12}" text-anchor="middle">${escapeHtml(bl)}</text>` : ''}`;
    }

    const dotsMarkup = geo.dots.map((d, i) => {
      const isMin = i === geo.minIdx && labelIdx.size > 2;
      // Popisek minima jde POD bod — nad ním prochází klesající čára a text
      // by s ní kolidoval; první/poslední bod mají popisek nad sebou.
      const labelY = isMin ? d.y + 22 : d.y - 10;
      const label = labelIdx.has(i)
        ? `<text class="av-trend-val${isMin ? ' av-trend-val-min' : ''}" x="${d.x}" y="${labelY}" text-anchor="middle">${escapeHtml(fmt(d.value))}</text>`
        : '';
      const yearLabel = labelIdx.has(i)
        ? `<text class="av-trend-year" x="${d.x}" y="${baseline + 18}" text-anchor="middle">${d.year}</text>`
        : '';
      return `<g class="av-trend-dot-g" style="transition-delay:${0.9 + i * 0.12}s">
        <circle class="av-trend-dot${isMin ? ' av-trend-dot-min' : ''}" cx="${d.x}" cy="${d.y}" r="4" />
        ${label}${yearLabel}</g>`;
    }).join('');

    const aria = chart.getAttribute('aria-label')
      || `Vývoj v čase: ${geo.dots.map(d => `${d.year} ${fmt(d.value)}`).join(', ')}`;
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', aria);
    chart.innerHTML = `
      <svg viewBox="0 0 ${TREND_W} ${TREND_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        <line class="av-trend-axis" x1="${TREND_PAD.left}" y1="${baseline}" x2="${TREND_W - TREND_PAD.right}" y2="${baseline}" />
        <path class="av-trend-area" d="${geo.area}" />
        ${breakMarkup}
        <path class="av-trend-line" d="${geo.path}" />
        ${dotsMarkup}
      </svg>`;

    const line = chart.querySelector('.av-trend-line');
    if (REDUCED_MOTION || typeof IntersectionObserver === 'undefined'
        || typeof line?.getTotalLength !== 'function') {
      group.classList.add('av-trend--drawn');
      return;
    }
    // Draw-on: dashoffset od plné délky k nule; CSS transition to rozjede
    // po přidání třídy av-trend--drawn (IntersectionObserver níže).
    let len = 0;
    try { len = line.getTotalLength(); } catch { /* detached svg (jsdom) */ }
    if (len > 0) {
      line.style.strokeDasharray = String(len);
      line.style.strokeDashoffset = String(len);
    }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        group.classList.add('av-trend--drawn');
        if (len > 0) line.style.strokeDashoffset = '0';
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    obs.observe(group);
  });
}

// =====================================================================
//  Pomocné — pure exports pro testy
// =====================================================================

/**
 * Spočte šířku baru v procentech vůči maximu. Záporné hodnoty jsou 0,
 * překročení maxima je clampnuté na 100.
 *
 * @param {number} value
 * @param {number} max
 * @returns {number} 0–100
 */
export function barWidthPct(value, max) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  if (value <= 0) return 0;
  return Math.min(100, (value / max) * 100);
}

export { easeOutQuart, clampInt };

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
