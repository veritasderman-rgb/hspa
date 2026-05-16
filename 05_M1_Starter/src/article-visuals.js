// HSPA Monitor — design system pro vizuální komponenty v článcích.
//
// Pět komponent (.av-*):
//   .av-timeline      vertikální chronologie (legislativa, reformy, epochy)
//   .av-bar-compare   srovnání hodnot pomocí horizontálních barů
//   .av-data-table    standardizovaná tabulka (země × parametry, scénáře)
//   .av-flow          flow diagram s kroky a šipkami (proces, datový tok)
//   .av-counter       animované velké číslo (IntersectionObserver count-up)
//
// Pure markup: většinu práce řeší CSS (.av-* třídy v src/styles.css).
// JS modul pouze:
//   - dopočítá šířky barů v .av-bar-compare z data-value
//   - spustí count-up animaci v .av-counter
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
