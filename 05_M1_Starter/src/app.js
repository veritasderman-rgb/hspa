// Frontend logika dashboardu HSPA Monitor.
// Načítá data z /data/indicators.json a renderuje karty + scorecard + regiony.
// Žádné inline data — jediný zdroj pravdy je JSON file.

import './analytics.js';
import { renderFooter, renderModuleNav } from './page-shared.js';
import { enhanceArticleVisuals } from './article-visuals.js';

if (typeof window !== 'undefined') renderModuleNav('indicators');

const DATA_URL = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';
const LS_KEY = 'zdrave-cesko/last-data';
const LS_FETCHED_KEY = 'zdrave-cesko/last-fetched-at';
const LS_AUD_KEY = 'zdrave-cesko/audience';
const STALE_HOURS = 26;

let allIndicators = [];
let allDimensions = [];
let activeArea = 'all';
let activeSearch = '';
let activeSort = 'default';
let activeDomain = '';
let activeAudience = 'public';
let activeFramework = 'all';
let activeDimension = 'all';
const chartInstances = new Map(); // id → Chart instance, kvůli destroy() proti memory leaku

const AREA_DESCRIPTIONS = {
  'Výsledky': 'Žijeme déle — ale za průměrem OECD zaostáváme v kardiovaskulární úmrtnosti a zdravých letech života. Každý rok ztracený pod průměrem je měřitelný.',
  'Výstupy': 'Péče je dostupná, ale nerovnoměrně. Finanční bariéry rostou, čekací doby se liší kraj od kraje a pacientská zkušenost chybí v datech.',
  'Procesy': 'Screeningy zachytávají pozdě, proočkovanost klesá a primární péče koordinuje méně, než by mohla. Systém léčí dobře — ale mohl by víc předcházet.',
  'Struktury': 'Lékaři stárnou, sestry odcházejí a regionální nerovnosti v kapacitách se prohlubují. Infrastruktura je moderní — lidské zdroje jsou výzva.',
};
let regionsChart = null;
let _modalChart = null;

// ====== URL HASH STATE ======

function readHash() {
  const hash = location.hash.slice(1);
  if (!hash) return {};
  return Object.fromEntries(new URLSearchParams(hash));
}

function writeHash() {
  const p = new URLSearchParams();
  if (activeArea && activeArea !== 'all') p.set('area', activeArea);
  if (activeSearch) p.set('q', activeSearch);
  if (activeSort && activeSort !== 'default') p.set('sort', activeSort);
  if (activeDomain) p.set('domain', activeDomain);
  if (activeDimension && activeDimension !== 'all') p.set('dim', activeDimension);
  if (activeFramework && activeFramework !== 'all') p.set('fw', activeFramework);
  const s = p.toString();
  history.replaceState(null, '', s ? '#' + s : location.pathname + location.search);
}

const VALID_AREAS = new Set(['all', 'Výsledky', 'Výstupy', 'Procesy', 'Struktury']);
const VALID_DIMENSIONS = new Set(['all', 'zdravi', 'dostupnost', 'kvalita', 'bezpecnost', 'efektivita', 'spravedlnost']);
const VALID_FRAMEWORKS = new Set(['all', 'hspa', 'monitoring']);

function applyHash(state) {
  if (state.area && VALID_AREAS.has(state.area)) {
    activeArea = state.area;
    const areaSel = document.getElementById('areaFilter');
    if (areaSel) areaSel.value = activeArea;
  }
  if (state.dim && VALID_DIMENSIONS.has(state.dim)) {
    activeDimension = state.dim;
    const dimSel = document.getElementById('dimensionFilter');
    if (dimSel) dimSel.value = activeDimension;
  }
  if (state.fw && VALID_FRAMEWORKS.has(state.fw)) {
    activeFramework = state.fw;
    const fwSel = document.getElementById('frameworkFilter');
    if (fwSel) fwSel.value = activeFramework;
  }
  if (state.q) {
    activeSearch = state.q;
    const searchInput = document.getElementById('searchBox');
    if (searchInput) searchInput.value = activeSearch;
  }
  if (state.sort) {
    activeSort = state.sort;
    const sortSel = document.getElementById('sortSelect');
    if (sortSel) sortSel.value = activeSort;
  }
  if (state.domain) {
    activeDomain = state.domain;
  }
}

// ====== UTIL ======

function fmtRelative(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now - d) / 3.6e6;
  if (diffH < 1) return 'před chvílí';
  if (diffH < 24) return `před ${Math.floor(diffH)} h`;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function showStatus(msg, level = 'warn') {
  const el = document.getElementById('status');
  el.className = `status ${level}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearStatus() {
  document.getElementById('status').classList.add('hidden');
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ====== DATA LOADING ======

function chartAnimationOptions() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reducedMotion ? { duration: 0 } : { duration: 500 };
}


function applyData(data, { stale = false, source = 'live' } = {}) {
  allIndicators = data.indicators || [];
  const ageH = (Date.now() - new Date(data.generated_at).getTime()) / 3.6e6;
  const isStale = stale || ageH > STALE_HOURS;
  const label = source === 'cache'
    ? `Offline kopie · ${fmtRelative(data.generated_at)}`
    : `Aktualizováno ${fmtRelative(data.generated_at)}`;
  const el = document.getElementById('lastUpdated');
  if (el) {
    el.textContent = label;
    el.classList.toggle('stale', isStale);
  }
}

function saveToLocalStorage(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    localStorage.setItem(LS_FETCHED_KEY, new Date().toISOString());
  } catch { /* quota / private mode — ignoruj */ }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function renderMastheadDateLocal() {
  const el = document.getElementById('mastheadDate');
  if (!el) return;
  const d = new Date();
  const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  el.textContent = `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function loadDimensions() {
  if (allDimensions.length) return allDimensions;
  try {
    const r = await fetch('data/dimensions.json');
    if (r.ok) {
      const d = await r.json();
      allDimensions = d.dimensions || [];
    }
  } catch {}
  return allDimensions;
}

async function loadData(bustCache = false) {
  const url = bustCache ? `${DATA_URL}?t=${Date.now()}` : DATA_URL;
  try {
    const [res] = await Promise.all([fetch(url), loadDimensions()]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    applyData(data, { source: 'live' });
    saveToLocalStorage(data);
    clearStatus();
    return data;
  } catch (err) {
    const cached = loadFromLocalStorage();
    if (cached) {
      applyData(cached, { stale: true, source: 'cache' });
      showStatus(`Server nedostupný (${err.message}). Zobrazuji offline kopii z prohlížeče.`, 'warn');
      return cached;
    }
    showStatus(`Nepodařilo se načíst data: ${err.message}. Žádná offline kopie není k dispozici.`, 'error');
    throw err;
  }
}

// ====== FILTERING / SORTING ======

const SIGNAL_ORDER = { bad: 0, warn: 1, neutral: 2, good: 3 };

export function filterAndSort(indicators, { area, search, sort, domain, framework, dimension }) {
  let xs = indicators;
  if (framework && framework !== 'all') xs = xs.filter(i => (i.framework || 'hspa') === framework);
  if (dimension && dimension !== 'all') xs = xs.filter(i => i.dimension === dimension);
  if (area && area !== 'all') xs = xs.filter(i => i.area === area);
  if (domain) xs = xs.filter(i => i.domain === domain);
  if (search) {
    const q = search.toLowerCase();
    xs = xs.filter(i =>
      (i.name || '').toLowerCase().includes(q)
      || (i.domain || '').toLowerCase().includes(q)
      || (i.subdomain || '').toLowerCase().includes(q)
    );
  }
  if (sort === 'signal') {
    xs = [...xs].sort((a, b) => (SIGNAL_ORDER[a.signal] ?? 9) - (SIGNAL_ORDER[b.signal] ?? 9));
  } else if (sort === 'name') {
    xs = [...xs].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'cs'));
  } else if (sort === 'trend') {
    xs = [...xs].sort((a, b) => Math.abs(yoyPct(b)) - Math.abs(yoyPct(a)));
  }
  return xs;
}

// ====== TREND ARROWS ======

export function yoyPct(ind) {
  const t = ind?.trend;
  if (!Array.isArray(t) || t.length < 2) return 0;
  const last = t[t.length - 1]?.value;
  const prev = t[t.length - 2]?.value;
  if (last == null || prev == null || prev === 0) return 0;
  return ((last - prev) / prev) * 100;
}

export function trendArrow(ind) {
  const pct = yoyPct(ind);
  if (Math.abs(pct) < 0.5) return { glyph: '→', cls: 'flat', pct };
  const positive = pct > 0;
  // higher_is_better → růst je dobrý (zelená); lower_is_better → růst je špatný (červená)
  const indicatorDir = (ind?.direction
    ?? (ind?._direction)
    ?? 'context_dependent');
  let cls;
  if (indicatorDir === 'context_dependent') cls = 'flat';
  else {
    const isImprovement = (indicatorDir === 'higher_is_better' && positive)
      || (indicatorDir === 'lower_is_better' && !positive);
    cls = isImprovement ? 'good' : 'bad';
  }
  return { glyph: positive ? '↑' : '↓', cls, pct };
}

// ====== SCORECARD ======

function updateScorecard(visible) {
  const counts = { good: 0, warn: 0, bad: 0, neutral: 0 };
  for (const ind of visible) counts[ind.signal] = (counts[ind.signal] || 0) + 1;
  // Set jak textContent (fallback bez JS animace) tak data-value pro enhanceCounters.
  // Stagger 80ms mezi dlaždicemi přes data-duration tweak.
  setCounterEl('scTotal', visible.length, { duration: 1200 });
  setCounterEl('scGood', counts.good, { duration: 900 });
  setCounterEl('scWarn', counts.warn, { duration: 1000 });
  setCounterEl('scBad', counts.bad, { duration: 1100 });
  setCounterEl('scNeutral', counts.neutral, { duration: 800 });
  // Re-enhance po každém updateScorecard (idempotentní díky data-av-init clear).
  enhanceArticleVisuals();
}

/**
 * Nastaví counter element: data-value pro animaci + textContent jako '0' (start anim).
 * Vynutí re-enhancement vyčištěním data-av-init flagu.
 */
function setCounterEl(id, val, { duration = 1200, decimals = 0, prefix = '', suffix = '' } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('av-counter');
  el.dataset.value = String(val);
  el.dataset.duration = String(duration);
  if (decimals) el.dataset.decimals = String(decimals);
  if (prefix) el.dataset.prefix = prefix;
  if (suffix) el.dataset.suffix = suffix;
  delete el.dataset.avInit; // re-enhance
  delete el.dataset.avTarget;
  el.textContent = '0';
}

// ====== EDITORIAL HERO STORY ======

function fmt(value, unit = '') {
  if (value == null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const formatted = (Math.round(n * 10) / 10).toLocaleString('cs-CZ');
  return unit ? `${formatted} ${unit}` : formatted;
}

function gapText(value, oecd, direction) {
  if (value == null || oecd == null) return '';
  const diff = value - oecd;
  const pct = oecd !== 0 ? Math.abs(diff / oecd) * 100 : 0;
  const better = direction === 'higher_is_better' ? diff > 0 : diff < 0;
  const sign = better ? 'lépe' : 'hůře';
  return `${pct >= 10 ? Math.round(pct) : pct.toFixed(1)} % ${sign} než OECD`;
}

function escapeHtmlInner(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEditorialHero() {
  try {
    if (!Array.isArray(allIndicators) || allIndicators.length === 0) {
      return;
    }

    // Datum vlevo nahoře (kicker za bullet)
    const dateEl = document.getElementById('edHeroDate');
    if (dateEl) {
      const months = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
      const d = new Date();
      dateEl.textContent = months[d.getMonth()] + ' ' + d.getFullYear();
    }

    function findInd(id) {
      for (let i = 0; i < allIndicators.length; i++) {
        if (allIndicators[i].id === id) return allIndicators[i];
      }
      return null;
    }

    // 4 hero stats — vybrané charakteristické indikátory napříč signály
    const heroPicks = [
      { ind: findInd('nadeje_doziti_total'), label: 'Naděje dožití při narození' },
      { ind: findInd('nadeje_doziti_zdravi_65'), label: 'Roky života ve zdraví v 65 letech' },
      { ind: findInd('mortalita_kardiovaskularni'), label: 'Úmrtnost na nemoci oběhové soustavy' },
      { ind: findInd('lekari_per_1000'), label: 'Lékaři na 1 000 obyvatel' },
    ].filter(function (p) { return p.ind; });

    const statsEl = document.getElementById('edHeroStats');
    if (statsEl && heroPicks.length) {
      statsEl.innerHTML = heroPicks.map(function (p, i) {
        const bench = p.ind.benchmark || {};
        const benchVal = bench.oecd != null ? bench.oecd : bench.eu;
        const benchLabel = bench.oecd != null ? 'OECD' : (bench.eu != null ? 'EU' : '');
        const benchText = benchVal != null ? benchLabel + ' ' + fmt(benchVal) : '';
        const gap = gapText(p.ind.value, benchVal, p.ind.direction);
        const unit = escapeHtmlInner(p.ind.unit || '');
        const url = 'indicator.html?id=' + encodeURIComponent(p.ind.id);
        // Detekce desetinného počtu pro animaci (např. 7,7 → decimals=1; 79 → 0)
        const num = Number(p.ind.value);
        const decimals = Number.isFinite(num) && (num % 1 !== 0) ? 1 : 0;
        const duration = 1000 + i * 150; // stagger 150ms mezi kartami
        const counterAttrs = Number.isFinite(num)
          ? 'class="av-counter" data-value="' + num + '" data-decimals="' + decimals + '" data-duration="' + duration + '"'
          : '';
        return '<a class="ed-stat" href="' + url + '">'
          + '<div class="ed-stat-num"><span class="signal-dot ' + escapeHtmlInner(p.ind.signal || '') + '" aria-hidden="true"></span><span ' + counterAttrs + '>' + escapeHtmlInner(fmt(p.ind.value)) + '</span><span class="ed-stat-unit">' + unit + '</span></div>'
          + '<div class="ed-stat-lbl">' + escapeHtmlInner(p.label) + '</div>'
          + '<div class="ed-stat-meta">' + escapeHtmlInner(benchText) + (gap ? ' · ' + escapeHtmlInner(gap) : '') + '</div>'
          + '</a>';
      }).join('');
      // Trigger animace pro nově vložené .av-counter
      enhanceArticleVisuals();
    }

    // ed-stories ("Tento týden v datech") a ed-areas (4 oblasti) byly přesunuty:
    // ed-stories odstraněno, ed-areas → hspa-prehled.html.

    // 6 HSPA dimenzí (ZDRAVÍ/DOSTUPNOST/KVALITA/BEZPEČNOST/EFEKTIVITA/SPRAVEDLNOST)
    renderDimensionsIndex();
  } catch (err) {
    // Při selhání renderování hero (chybějící data, neočekávaná struktura)
    // necháme stránku fungovat dál (renderGrid + scorecard) a zalogujeme.
    console.error('[hero] renderEditorialHero failed:', err);
  }
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ====== 6 HSPA DIMENSIONS — INDEX (homepage) ======

function renderDimensionsIndex() {
  const grid = document.getElementById('edDimsGrid');
  if (!grid || !allDimensions.length) return;

  const byDim = {};
  for (const ind of allIndicators) {
    const d = ind.dimension || 'other';
    if (!byDim[d]) byDim[d] = { total: 0, good: 0, warn: 0, bad: 0, neutral: 0, items: [] };
    byDim[d].total++;
    byDim[d][ind.signal] = (byDim[d][ind.signal] || 0) + 1;
    byDim[d].items.push(ind);
  }

  grid.innerHTML = allDimensions.map((d, i) => {
    const stats = byDim[d.id] || { total: 0, good: 0, warn: 0, bad: 0 };
    const scoreable = (stats.good || 0) + (stats.warn || 0) + (stats.bad || 0);
    const score = scoreable > 0
      ? Math.round((stats.good * 100 + stats.warn * 50) / scoreable)
      : null;
    const num = String(i + 1).padStart(2, '0');
    // Stagger animace: každá dimenze má delay 100ms; score se animuje 0→N
    const duration = 1000 + i * 100;
    const scoreHtml = score != null
      ? `<span class="av-counter" data-value="${score}" data-duration="${duration}">0</span><span class="ed-dim-score-unit">/100</span>`
      : '—';
    const palette = `--dim-color: ${d.color}`;
    // Bar fill: render width:0, JS později nastaví target width při intersection
    return `
      <a class="ed-dim" style="${palette}" href="#indicatorsSection" data-dim="${escapeHtmlInner(d.id)}" title="${escapeHtmlInner(d.description)}">
        <div class="ed-dim-num">${num}</div>
        <div class="ed-dim-name">${escapeHtmlInner(d.label)}</div>
        <div class="ed-dim-score">${scoreHtml}</div>
        <div class="ed-dim-meta">z 100 · ${stats.total} ukazatel${stats.total === 1 ? '' : (stats.total < 5 ? 'y' : 'ů')}</div>
        <div class="ed-dim-bar"><span class="ed-dim-bar-fill ed-dim-bar-anim" style="width: 0%" data-target-width="${score || 0}"></span></div>
      </a>
    `;
  }).join('');

  // Anim. bar fillu při intersection (jednoznačně oddělené od counter animace)
  enhanceDimensionBars(grid);
  // Anim. score countup
  enhanceArticleVisuals();

  // Klik na dimension → scroll do indikátorů + nastav filtr
  grid.querySelectorAll('.ed-dim').forEach(el => {
    el.addEventListener('click', (e) => {
      const dimId = el.getAttribute('data-dim');
      if (!dimId) return;
      e.preventDefault();
      activeDimension = dimId;
      const sel = document.getElementById('dimensionFilter');
      if (sel) sel.value = dimId;
      renderGrid();
      writeHash();
      const section = document.getElementById('indicatorsSection');
      section?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/**
 * Animuje width bar fillu (.ed-dim-bar-anim) z 0% na data-target-width při
 * vstupu do viewportu. Respektuje prefers-reduced-motion. Idempotent přes
 * data-av-init flag (sdílený s enhanceCounters).
 */
function enhanceDimensionBars(scope) {
  const bars = scope.querySelectorAll('.ed-dim-bar-anim:not([data-av-init])');
  if (bars.length === 0) return;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || typeof IntersectionObserver === 'undefined') {
    bars.forEach(b => {
      b.style.width = (b.dataset.targetWidth || '0') + '%';
      b.dataset.avInit = '1';
    });
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.targetWidth, 10) || 0;
      // Stagger podle indexu mezi sourozenci (visuální vlna zleva doprava)
      const siblings = Array.from(el.closest('.ed-dims-grid').querySelectorAll('.ed-dim-bar-anim'));
      const idx = siblings.indexOf(el);
      const delay = idx * 80;
      setTimeout(() => {
        el.style.transition = 'width 1.1s cubic-bezier(0.2, 0.8, 0.2, 1)';
        el.style.width = target + '%';
      }, delay);
      el.dataset.avInit = '1';
      obs.unobserve(el);
    });
  }, { threshold: 0.3 });
  bars.forEach(b => obs.observe(b));
}

// ====== 12 NEJHŮŘE HODNOCENÝCH ======

// ====== RENDERING ======

function destroyAllCharts() {
  for (const ch of chartInstances.values()) ch.destroy();
  chartInstances.clear();
}

function getChartAnimation() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? { duration: 0 }
    : undefined;
}

function renderGrid() {
  const grid = document.getElementById('indicatorGrid');
  destroyAllCharts();
  grid.innerHTML = '';
  renderDomainFilter();
  renderTopCritical();
  const filtered = filterAndSort(allIndicators, { area: activeArea, search: activeSearch, sort: activeSort, domain: activeDomain, framework: activeFramework, dimension: activeDimension });

  const badge = `${filtered.length} indikátor${filtered.length === 1 ? '' : (filtered.length < 5 ? 'y' : 'ů')}`;
  document.getElementById('gridBadge').textContent = badge;
  document.getElementById('gridTitle').textContent =
    activeArea === 'all' ? 'Všechny indikátory' : `Oblast: ${activeArea}`;
  const areaDescEl = document.getElementById('gridAreaDesc');
  if (areaDescEl) {
    const desc = activeArea !== 'all' ? (AREA_DESCRIPTIONS[activeArea] || '') : '';
    areaDescEl.textContent = desc;
    areaDescEl.classList.toggle('hidden', !desc);
  }
  document.getElementById('emptyState').classList.toggle('hidden', filtered.length > 0);

  // ARIA live region — oznamuje asistivním technologiím změnu počtu výsledků
  let liveRegion = document.getElementById('gridLiveRegion');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'gridLiveRegion';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.getElementById('content').prepend(liveRegion);
  }
  liveRegion.textContent = `Zobrazeno ${badge}.`;

  writeHash();
  updateScorecard(filtered);

  const pendingCharts = [];
  filtered.forEach((ind) => {
    const card = document.createElement('div');
    card.className = 'indicator-card';
    card.dataset.indicatorId = ind.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${ind.name}: ${ind.value} ${ind.unit}, signál ${ind.signal}`);

    const chartId = `chart-${ind.id}`;
    const compareHTML = benchmarkBarHTML(ind);

    const arrow = trendArrow(ind);
    const arrowHTML = arrow.glyph === '→'
      ? `<span class="trend trend-${arrow.cls}" title="Stabilní">→</span>`
      : `<span class="trend trend-${arrow.cls}" title="Meziroční změna">${arrow.glyph} ${Math.abs(arrow.pct).toFixed(1)} %</span>`;

    const effectiveVerif = ind.verification_status ||
      (ind.source && ind.source.origin === 'seed' ? 'preliminary' : null);
    const verifText = {
      verified: 'Ověřeno',
      preliminary: 'Předběžné',
      illustrative: 'Ilustrativní',
    }[effectiveVerif] || '';
    const verifTitle = {
      verified: 'Data z primárního zdroje, max. 12 měsíců staré',
      preliminary: 'Data dostupná, neprošla plnou verifikací živého fetcheru',
      illustrative: 'Hodnota pochází z odhadu — nepoužívat pro citace',
    }[effectiveVerif] || '';
    const verifBadge = effectiveVerif
      ? `<span class="verif-badge ${effectiveVerif === 'verified' ? 'verif-verified' : effectiveVerif === 'preliminary' ? 'verif-preliminary' : 'verif-illustrative'}" title="${verifTitle}">${verifText} <span class="verif-hint" aria-hidden="true">ⓘ</span></span>`
      : '';

    const fwBadge = ind.framework === 'monitoring'
      ? `<span class="fw-badge fw-monitoring" title="Doplňkový monitoring nad rámec OECD HSPA">Monitoring</span>`
      : `<span class="fw-badge fw-hspa" title="Indikátor z OECD HSPA Framework for Czech Republic">HSPA</span>`;

    card.innerHTML = `
      <div class="area-tag">${ind.area} · ${ind.domain}${fwBadge}${verifBadge}</div>
      <div class="top">
        <h4>${ind.name}</h4>
        <div class="signal ${ind.signal}" title="Hodnocení: ${ind.signal}"></div>
      </div>
      <div class="value-row">
        <span class="big-value">${ind.value}</span>
        <span class="unit">${ind.unit}</span>
        ${arrowHTML}
        ${ind.year ? `<span class="year-badge">${ind.year}</span>` : ''}
      </div>
      ${compareHTML}
      <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
      <div class="source">Zdroj: ${ind.source.name}<a class="card-detail-link" href="indicator.html?id=${encodeURIComponent(ind.id)}" data-detail-link aria-label="Otevřít plný detail indikátoru s krajskou mapou">Detail →</a></div>
    `;
    card.addEventListener('click', (e) => {
      // Klik na „Detail →" odkaz následuje vlastní href; jiný klik otevře modal s metodickou kartou
      if (e.target.closest('[data-detail-link]')) return;
      openMethodCard(ind);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMethodCard(ind); }
    });
    grid.appendChild(card);

    if (Array.isArray(ind.trend) && ind.trend.length) pendingCharts.push({ ind, chartId });
  });

  renderChartsBatch(pendingCharts);
}

function renderSparkline(ind, chartId) {
  const ctx = document.getElementById(chartId);
  if (!ctx || chartInstances.has(chartId)) return;
  const color = ind.signal === 'good' ? '#38761D'
    : ind.signal === 'warn' ? '#B45F06'
    : ind.signal === 'bad' ? '#990000' : '#0B5394';
  // eslint-disable-next-line no-undef
  const ch = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ind.trend.map(t => t.year),
      datasets: [{
        data: ind.trend.map(t => t.value),
        borderColor: color, backgroundColor: color + '22',
        fill: true, tension: 0.3,
        pointRadius: 2, pointHoverRadius: 4, borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: getChartAnimation(),
      plugins: { legend: { display: false }, tooltip: { displayColors: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#888' } },
        y: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#888', maxTicksLimit: 3 } }
      }
    }
  });
  chartInstances.set(chartId, ch);
}

function renderChartsBatch(pendingCharts) {
  if (!pendingCharts.length) return;
  // Lazy rendering: karty viditelné okamžitě, ostatní až při scrollu
  if (typeof IntersectionObserver === 'undefined') {
    // Fallback pro prostředí bez IntersectionObserver
    setTimeout(() => pendingCharts.forEach(({ ind, chartId }) => renderSparkline(ind, chartId)), 50);
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const chartId = entry.target.querySelector('canvas')?.id;
      if (!chartId) { obs.unobserve(entry.target); continue; }
      const item = pendingCharts.find(c => c.chartId === chartId);
      if (item) renderSparkline(item.ind, item.chartId);
      obs.unobserve(entry.target);
    }
  }, { rootMargin: '100px' });

  for (const { chartId } of pendingCharts) {
    const canvas = document.getElementById(chartId);
    const card = canvas?.closest('.indicator-card');
    if (card) observer.observe(card);
  }
}

// ====== REGIONS ======

let regionsData = null;
let activeRegionDataset = null;

async function loadAndRenderRegions() {
  try {
    const res = await fetch(REGIONS_URL);
    if (!res.ok) return;
    const data = await res.json();

    // Podpora obou formátů: v1 (single dataset) i v2 (multi-dataset)
    if (data.datasets) {
      regionsData = data;
      populateRegionSelector(data.datasets);
      renderRegionDataset(data.datasets[0]);
    } else {
      // Legacy v1
      renderRegionsLegacy(data);
    }
  } catch { /* regiony jsou volitelné — bez nich dashboard funguje */ }
}

function populateRegionSelector(datasets) {
  const sel = document.getElementById('regionsSelect');
  if (!sel) return;
  sel.innerHTML = '';
  datasets.forEach((ds, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = ds.name;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    const ds = regionsData.datasets[parseInt(sel.value, 10)];
    if (ds) renderRegionDataset(ds);
  });
}

function renderRegionDataset(ds) {
  activeRegionDataset = ds;
  document.getElementById('regionsBadge').textContent =
    `${ds.regions.length} krajů · průměr ČR ${ds.country_avg} ${ds.unit} (${ds.year})`;

  // Teaser link na /kraje — předáme aktuální indikátor v hash, aby krajský
  // pohled rovnou ukázal stejný datový řez, který uživatel sleduje zde.
  const teaserCta = document.getElementById('regionsTeaserCta');
  if (teaserCta && ds.indicator_id) {
    teaserCta.href = `kraje.html#id=${encodeURIComponent(ds.indicator_id)}`;
  }

  const header = document.getElementById('regionsTableValueHeader');
  if (header) header.textContent = `${ds.name} (${ds.unit})`;

  const tbody = document.querySelector('#regionsTable tbody');
  tbody.innerHTML = '';
  const betterHigher = ds.direction !== 'lower_is_better';
  const sorted = [...ds.regions].sort((a, b) => betterHigher ? b.value - a.value : a.value - b.value);

  for (const r of sorted) {
    const diff = (r.value - ds.country_avg).toFixed(1);
    const diffCls = (betterHigher ? diff > 0 : diff < 0) ? 'pos' : diff == 0 ? '' : 'neg';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.name}</td>
      <td>${r.value.toFixed(r.value < 100 ? 1 : 0)}</td>
      <td class="diff ${diffCls}">${diff > 0 ? '+' : ''}${diff}</td>
    `;
    tbody.appendChild(tr);
  }

  const ctx = document.getElementById('regionsChart');
  if (!ctx) return;
  if (regionsChart) regionsChart.destroy();
  // eslint-disable-next-line no-undef
  regionsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(r => r.name),
      datasets: [{
        data: sorted.map(r => r.value),
        backgroundColor: sorted.map(r => {
          const aboveAvg = r.value >= ds.country_avg;
          const isGood = betterHigher ? aboveAvg : !aboveAvg;
          return isGood ? '#38761D' : '#B45F06';
        }),
        borderWidth: 0,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      animation: getChartAnimation(),
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${c.parsed.x.toFixed(c.parsed.x < 100 ? 1 : 0)} ${ds.unit}` } },
      },
      scales: {
        x: {
          min: Math.min(...sorted.map(r => r.value)) * (betterHigher ? 0.97 : 0.97),
          max: Math.max(...sorted.map(r => r.value)) * 1.03,
        },
        y: { ticks: { font: { size: 11 } } },
      },
    },
  });
}

function renderRegionsLegacy(data) {
  document.getElementById('regionsBadge').textContent =
    `${data.regions.length} krajů · průměr ČR ${data.country_avg} let`;
  const tbody = document.querySelector('#regionsTable tbody');
  tbody.innerHTML = '';
  const sorted = [...data.regions].sort((a, b) => b.value - a.value);
  for (const r of sorted) {
    const diff = (r.value - data.country_avg).toFixed(1);
    const diffCls = diff > 0 ? 'pos' : diff < 0 ? 'neg' : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.name}</td><td>${r.value.toFixed(1)}</td>
      <td class="diff ${diffCls}">${diff > 0 ? '+' : ''}${diff}</td>`;
    tbody.appendChild(tr);
  }
  const ctx = document.getElementById('regionsChart');
  if (!ctx) return;
  if (regionsChart) regionsChart.destroy();
  // eslint-disable-next-line no-undef
  regionsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(r => r.name),
      datasets: [{ data: sorted.map(r => r.value),
        backgroundColor: sorted.map(r => r.value >= data.country_avg ? '#38761D' : '#B45F06'),
        borderWidth: 0 }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      animation: getChartAnimation(),
      plugins: { legend: { display: false } },
      scales: { x: { min: Math.min(...sorted.map(r=>r.value))-1, max: Math.max(...sorted.map(r=>r.value))+1 },
                y: { ticks: { font: { size: 11 } } } },
    },
  });
}

// ====== CSV EXPORT ======

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportVisibleCsv() {
  const visible = filterAndSort(allIndicators, { area: activeArea, search: activeSearch, sort: activeSort });
  const header = ['id', 'name', 'area', 'domain', 'subdomain', 'value', 'unit', 'year', 'signal', 'oecd', 'eu', 'source'];
  const rows = visible.map(i => [
    i.id, i.name, i.area, i.domain, i.subdomain, i.value, i.unit, i.year, i.signal,
    i.benchmark?.oecd ?? '', i.benchmark?.eu ?? '', i.source?.name ?? '',
  ]);
  const csv = '﻿' + [header, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zdrave_cesko_indikatory_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportTrendCsv(indicator) {
  const rows = [['year', 'value', 'unit']];
  for (const t of indicator.trend ?? []) rows.push([t.year, t.value, indicator.unit]);
  const csv = '﻿' + rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${indicator.id}_trend.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ====== METODICKÁ KARTA (modal) ======

const DIRECTION_LABEL = {
  higher_is_better: '↑ vyšší = lepší',
  lower_is_better: '↓ nižší = lepší',
  context_dependent: '↔ kontextové',
};

function renderDataSource(ds) {
  if (!ds || typeof ds !== 'object') return '<em>Neuvedeno</em>';
  const parts = [];
  if (ds.primary) parts.push(`<div class="ds-block"><h4>Primární</h4>${renderSourceObj(ds.primary)}</div>`);
  if (ds.fallback) parts.push(`<div class="ds-block"><h4>Záložní</h4>${renderSourceObj(ds.fallback)}</div>`);
  return parts.join('') || '<em>Neuvedeno</em>';
}

function renderSourceObj(o) {
  const pairs = Object.entries(o).filter(([k]) => k !== 'note');
  const noteHTML = o.note ? `<p class="ds-note">${o.note}</p>` : '';
  const tableHTML = pairs.length
    ? `<table class="ds-table">${pairs.map(([k, v]) =>
        `<tr><th>${k}</th><td>${typeof v === 'object' ? JSON.stringify(v) : String(v)}</td></tr>`
      ).join('')}</table>`
    : '';
  return tableHTML + noteHTML;
}

function renderModalContent(card, indicator) {
  const hasChart = Array.isArray(indicator.trend) && indicator.trend.length >= 2;
  return `
    <h2 id="modalTitle">${card.name}</h2>
    <div class="sub">${card.area} · ${card.domain}${card.subdomain ? ' · ' + card.subdomain : ''}</div>
    <div class="modal-summary">
      <span class="signal-pill ${indicator.signal}">${indicator.signal}</span>
      <span><strong>${indicator.value}</strong> ${indicator.unit} (${indicator.year ?? '?'})</span>
      ${indicator.benchmark?.oecd != null ? `<span>OECD: <strong>${indicator.benchmark.oecd}</strong></span>` : ''}
      ${indicator.benchmark?.eu != null ? `<span>EU: <strong>${indicator.benchmark.eu}</strong></span>` : ''}
    </div>
    ${hasChart ? '<div class="modal-chart-wrap"><canvas id="modalTrendCanvas"></canvas></div>' : ''}
    <dl>
      <dt>Definice</dt><dd>${card.definition ?? '—'}</dd>
      <dt>Jednotka</dt><dd>${card.unit ?? indicator.unit}</dd>
      <dt>Směr</dt><dd>${DIRECTION_LABEL[card.direction] ?? card.direction ?? '—'}</dd>
      <dt>Frekvence</dt><dd>${card.frequency ?? '—'}</dd>
      <dt>Garanti</dt><dd>${(card.stewards || []).join(', ') || '—'}</dd>
      ${card.signal_thresholds ? `<dt>Prahy signálu</dt><dd>good ≥ ${card.signal_thresholds.good} %, warn nad −${card.signal_thresholds.warn} %</dd>` : ''}
      ${card.method_notes ? `<dt>Metodika</dt><dd>${card.method_notes}</dd>` : ''}
      ${card.limitations ? `<dt>Omezení</dt><dd>${card.limitations}</dd>` : ''}
    </dl>
    ${card.patient_story ? `<div class="patient-story"><div class="patient-story-label">Příběh za číslem</div><p>${escapeHtmlInner(card.patient_story).replace(/\n\n/g, '</p><p>').replace(/\n/g, ' ')}</p></div>` : ''}
    ${card.data_source ? `<h3 class="ds-heading">Zdroje dat</h3>${renderDataSource(card.data_source)}` : ''}
    <div class="modal-cross-links" id="modalCrossLinks"></div>
    <div class="modal-actions">
      <button class="btn-csv" id="btnCsvExport" data-id="${indicator.id}">Stáhnout CSV (trend)</button>
    </div>
  `;
}

// Cross-link cache pro modal
let _crossLinksCache = null;
async function loadCrossLinks() {
  if (_crossLinksCache) return _crossLinksCache;
  try {
    const [s, e, a] = await Promise.all([
      fetch('data/strategies.json').then(r => r.ok ? r.json() : { strategies: [] }).catch(() => ({ strategies: [] })),
      fetch('data/explainers.json').then(r => r.ok ? r.json() : { explainers: [] }).catch(() => ({ explainers: [] })),
      fetch('data/articles.json').then(r => r.ok ? r.json() : { articles: [] }).catch(() => ({ articles: [] })),
    ]);
    _crossLinksCache = {
      strategies: s.strategies ?? [],
      explainers: e.explainers ?? [],
      articles: (a.articles ?? []).filter(ar => ar.published !== false),
    };
  } catch {
    _crossLinksCache = { strategies: [], explainers: [], articles: [] };
  }
  return _crossLinksCache;
}

async function renderModalCrossLinks(indicatorId) {
  const target = document.getElementById('modalCrossLinks');
  if (!target) return;
  const { strategies, explainers, articles } = await loadCrossLinks();
  const linkedStrategies = strategies.filter(s => (s.linked_indicators ?? []).includes(indicatorId));
  const linkedExplainers = explainers.filter(e => (e.linked_indicators ?? []).includes(indicatorId));
  const linkedArticles = articles.filter(ar => (ar.linked_indicators ?? []).includes(indicatorId));
  if (!linkedStrategies.length && !linkedExplainers.length && !linkedArticles.length) return;

  let html = '';
  if (linkedArticles.length) {
    html += `<h3 class="ds-heading">Související články</h3><div class="chip-row">`;
    html += linkedArticles.slice(0, 6).map(ar =>
      `<a class="chip chip-article" href="${escapeText(ar.slug)}">${escapeText(ar.title)}</a>`
    ).join('');
    html += `</div>`;
  }
  if (linkedStrategies.length) {
    html += `<h3 class="ds-heading"${linkedArticles.length ? ' style="margin-top:14px"' : ''}>Souvisí se strategiemi</h3><div class="chip-row">`;
    html += linkedStrategies.slice(0, 6).map(s =>
      `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(s.id)}">${escapeText(s.title)}</a>`
    ).join('');
    html += `</div>`;
  }
  if (linkedExplainers.length) {
    html += `<h3 class="ds-heading" style="margin-top:14px">Vysvětlení</h3><div class="chip-row">`;
    html += linkedExplainers.map(e =>
      `<a class="chip chip-explainer" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">${escapeText(e.title)}</a>`
    ).join('');
    html += `</div>`;
  }
  target.innerHTML = html;
}

function escapeText(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderFallbackCard(indicator) {
  return {
    name: indicator.name,
    area: indicator.area,
    domain: indicator.domain,
    subdomain: indicator.subdomain,
    definition: '—',
    unit: indicator.unit,
    direction: indicator.direction ?? 'context_dependent',
    frequency: '—',
    stewards: [],
    signal_thresholds: null,
    method_notes: null,
    limitations: null,
    patient_story: null,
    data_source: indicator.source ? { primary: { type: indicator.source.name, note: indicator.source.url ?? '' } } : null,
  };
}

async function openMethodCard(indicator) {
  _lastFocusedBeforeModal = document.activeElement;
  const modal = document.getElementById('modalBackdrop');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<p>Načítám metodickou kartu…</p>';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', indicator.name);

  let card;
  try {
    const res = await fetch(indicator.method_card_url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    card = await res.json();
  } catch {
    card = renderFallbackCard(indicator);
    const notice = document.createElement('p');
    notice.className = 'card-notice';
    notice.textContent = 'Detailní metodická karta není dostupná. Zobrazuji základní data indikátoru.';
    content.innerHTML = '';
    content.appendChild(notice);
    content.insertAdjacentHTML('beforeend', renderModalContent(card, indicator));
    const csvBtn = document.getElementById('btnCsvExport');
    if (csvBtn) csvBtn.addEventListener('click', () => exportTrendCsv(indicator));
    renderModalChart(indicator);
    renderModalCrossLinks(indicator.id);
    trapFocus(modal);
    return;
  }

  content.innerHTML = renderModalContent(card, indicator);
  const csvBtn = document.getElementById('btnCsvExport');
  if (csvBtn) csvBtn.addEventListener('click', () => exportTrendCsv(indicator));
  renderModalChart(indicator);
  renderModalCrossLinks(indicator.id);
  trapFocus(modal);
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
  document.getElementById('modalBackdrop').setAttribute('aria-hidden', 'true');
  if (_modalChart) { _modalChart.destroy(); _modalChart = null; }
}

// ====== BENCHMARK GAUGE (mini-pruh v kartách) ======

function benchmarkBarHTML(ind) {
  const czVal = ind.value;
  const oecdVal = ind.benchmark?.oecd ?? null;
  const euVal = ind.benchmark?.eu ?? null;
  const bestVal = ind.benchmark?.oecd_best ?? null;
  if (oecdVal == null && euVal == null && bestVal == null) return '';

  const refs = [czVal, oecdVal, euVal, bestVal].filter(v => v != null);
  const maxVal = Math.max(...refs);
  if (maxVal === 0) return '';

  const czPct = Math.min(100, Math.round(czVal / maxVal * 100));
  const signalColor = ind.signal === 'good' ? '#38761D'
    : ind.signal === 'warn' ? '#B45F06'
    : ind.signal === 'bad' ? '#990000' : '#0B5394';

  let rows = `
    <div class="bm-row">
      <span class="bm-key">ČR</span>
      <div class="bm-track"><div class="bm-fill" style="width:${czPct}%;background:${signalColor}"></div></div>
      <span class="bm-val">${czVal}</span>
    </div>`;

  if (oecdVal != null) {
    const p = Math.min(100, Math.round(oecdVal / maxVal * 100));
    rows += `
    <div class="bm-row">
      <span class="bm-key" title="Průměr OECD">OECD</span>
      <div class="bm-track"><div class="bm-fill" style="width:${p}%;background:#4A90D9"></div></div>
      <span class="bm-val">${oecdVal}</span>
    </div>`;
  }

  if (euVal != null) {
    const p = Math.min(100, Math.round(euVal / maxVal * 100));
    rows += `
    <div class="bm-row">
      <span class="bm-key" title="Průměr EU">EU</span>
      <div class="bm-track"><div class="bm-fill" style="width:${p}%;background:#E69138"></div></div>
      <span class="bm-val">${euVal}</span>
    </div>`;
  }

  if (bestVal != null) {
    const p = Math.min(100, Math.round(bestVal / maxVal * 100));
    const bestCountry = ind.benchmark?.oecd_best_country ?? null;
    const tooltip = bestCountry
      ? `Nejlepší výkon v OECD: ${bestCountry} (${bestVal}${ind.unit ? ' ' + ind.unit : ''})`
      : 'Nejlepší výkon v OECD';
    rows += `
    <div class="bm-row bm-best" title="${escapeText(tooltip)}">
      <span class="bm-key">Top</span>
      <div class="bm-track"><div class="bm-fill" style="width:${p}%;background:#16A34A"></div></div>
      <span class="bm-val">${bestVal}${bestCountry ? `<small class="bm-country"> · ${escapeText(bestCountry)}</small>` : ''}</span>
    </div>`;
  }

  return `<div class="bm-gauge">${rows}</div>`;
}

// ====== DOMAIN FILTER ======

function renderDomainFilter() {
  const container = document.getElementById('domainFilter');
  if (!container) return;

  let base = allIndicators;
  if (activeArea && activeArea !== 'all') base = base.filter(i => i.area === activeArea);

  const domainCounts = new Map();
  for (const ind of base) {
    if (ind.domain) domainCounts.set(ind.domain, (domainCounts.get(ind.domain) || 0) + 1);
  }

  if (domainCounts.size <= 1) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'domain-chip' + (!activeDomain ? ' active' : '');
  allBtn.textContent = `Vše (${base.length})`;
  allBtn.addEventListener('click', () => { activeDomain = ''; renderGrid(); });
  container.appendChild(allBtn);

  const sorted = [...domainCounts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'cs'));
  for (const [domain, count] of sorted) {
    const btn = document.createElement('button');
    btn.className = 'domain-chip' + (activeDomain === domain ? ' active' : '');
    btn.textContent = `${domain} (${count})`;
    btn.dataset.domain = domain;
    btn.addEventListener('click', () => { activeDomain = domain; renderGrid(); });
    container.appendChild(btn);
  }
}

// ====== TOP CRITICAL PANEL ======

function renderTopCritical() {
  const container = document.getElementById('topCritical');
  if (!container) return;

  const bad = allIndicators.filter(i => i.signal === 'bad');
  if (!bad.length) { container.classList.add('hidden'); return; }

  // Seřaď podle procentuálního odchýlení od benchmarku (OECD primárně, EU fallback)
  const scored = bad.map(ind => {
    const bench = ind.benchmark?.oecd != null ? ind.benchmark.oecd : ind.benchmark?.eu;
    const benchLabel = ind.benchmark?.oecd != null ? 'OECD' : (ind.benchmark?.eu != null ? 'EU' : null);
    const gap = bench != null ? Math.abs((ind.value - bench) / bench * 100) : 0;
    return { ind, gap, bench, benchLabel };
  }).sort((a, b) => b.gap - a.gap);

  const top = scored.slice(0, 3);
  container.classList.remove('hidden');

  const items = top.map(({ ind, gap, bench, benchLabel }) => {
    const gapStr = bench != null ? `${gap.toFixed(0)} % od ${benchLabel}` : '';
    return `
      <div class="top-critical-item" role="button" tabindex="0" data-id="${ind.id}"
           aria-label="${escapeText(ind.name)}: ${ind.value} ${ind.unit}">
        <span class="signal bad" title="Kritický"></span>
        <span class="top-critical-name">${escapeText(ind.name)}</span>
        <span class="top-critical-value">${ind.value} ${ind.unit}</span>
        ${bench != null ? `<span class="top-critical-oecd">${benchLabel}: ${bench}</span>` : ''}
        ${gapStr ? `<span class="top-critical-gap">${gapStr}</span>` : ''}
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="top-critical-header"><span class="top-critical-icon">⚠</span> Nejkritičtější oblasti</div>
    <div class="top-critical-list">${items}</div>`;

  container.querySelectorAll('.top-critical-item').forEach(el => {
    const handler = () => {
      window.location.href = `indicator.html?id=${encodeURIComponent(el.dataset.id)}`;
    };
    el.addEventListener('click', handler);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
  });
}

// ====== MODAL TREND CHART ======

function renderModalChart(indicator) {
  const canvas = document.getElementById('modalTrendCanvas');
  if (!canvas) return;
  if (_modalChart) { _modalChart.destroy(); _modalChart = null; }

  const trend = indicator.trend || [];
  if (trend.length < 2) return;

  const color = indicator.signal === 'good' ? '#38761D'
    : indicator.signal === 'warn' ? '#B45F06'
    : indicator.signal === 'bad' ? '#990000' : '#0B5394';

  const labels = trend.map(t => t.year);
  const datasets = [{
    label: 'ČR',
    data: trend.map(t => t.value),
    borderColor: color, backgroundColor: color + '22',
    fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5,
  }];

  if (indicator.benchmark?.oecd != null) {
    datasets.push({
      label: 'OECD průměr',
      data: labels.map(() => indicator.benchmark.oecd),
      borderColor: '#4A90D9', backgroundColor: 'transparent',
      borderDash: [6, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }
  if (indicator.benchmark?.eu != null) {
    datasets.push({
      label: 'EU průměr',
      data: labels.map(() => indicator.benchmark.eu),
      borderColor: '#E69138', backgroundColor: 'transparent',
      borderDash: [3, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }

  // eslint-disable-next-line no-undef
  _modalChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: chartAnimationOptions(),
      plugins: {
        legend: { display: datasets.length > 1, position: 'top', labels: { font: { size: 11 }, boxWidth: 16 } },
        tooltip: { displayColors: true },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#EDF2F7' }, ticks: { font: { size: 11 }, maxTicksLimit: 5 } },
      },
    },
  });
}

// ====== INTERAKCE ======

// ====== DARK MODE ======

// ====== FOCUS TRAP (modal) ======

function trapFocus(modal) {
  const focusable = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  first.focus();
  modal.addEventListener('keydown', function onKey(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (modal.classList.contains('hidden')) modal.removeEventListener('keydown', onKey);
  });
}

let _lastFocusedBeforeModal = null;

function wireUp() {
  // Empty state CTA
  const emptyClear = document.getElementById('emptyStateClear');
  if (emptyClear) {
    emptyClear.addEventListener('click', () => {
      activeSearch = ''; activeArea = 'all'; activeSort = 'default'; activeDomain = '';
      const s = document.getElementById('searchBox'); if (s) s.value = '';
      const a = document.getElementById('areaFilter'); if (a) a.value = 'all';
      const so = document.getElementById('sortSelect'); if (so) so.value = 'default';
      renderGrid(); writeHash();
    });
  }
  const emptyResults = document.getElementById('emptyStateResults');
  if (emptyResults) {
    emptyResults.addEventListener('click', () => {
      activeArea = 'Výsledky'; activeSearch = '';
      const a = document.getElementById('areaFilter'); if (a) a.value = 'Výsledky';
      const s = document.getElementById('searchBox'); if (s) s.value = '';
      renderGrid(); writeHash();
    });
  }

  // Area filter (dropdown <select>)
  const areaSel = document.getElementById('areaFilter');
  if (areaSel) {
    areaSel.addEventListener('change', () => {
      activeArea = areaSel.value;
      activeDomain = '';
      renderGrid();
      writeHash();
    });
  }

  // Framework filter (HSPA / Monitoring / All)
  const fwSel = document.getElementById('frameworkFilter');
  if (fwSel) {
    fwSel.addEventListener('change', () => {
      activeFramework = fwSel.value;
      renderGrid();
      writeHash();
    });
  }

  // Dimension filter (6 HSPA dimenzí)
  const dimSel = document.getElementById('dimensionFilter');
  if (dimSel) {
    dimSel.addEventListener('change', () => {
      activeDimension = dimSel.value;
      renderGrid();
      writeHash();
    });
  }

  // Search
  const searchInput = document.getElementById('searchBox');
  if (searchInput) {
    const onSearch = debounce(() => { activeSearch = searchInput.value.trim(); renderGrid(); writeHash(); }, 200);
    searchInput.addEventListener('input', onSearch);
  }

  // Sort
  const sortSel = document.getElementById('sortSelect');
  if (sortSel) sortSel.addEventListener('change', () => { activeSort = sortSel.value; renderGrid(); writeHash(); });

  // CSV export-all
  const btnCsv = document.getElementById('btnExportCsv');
  if (btnCsv) btnCsv.addEventListener('click', exportVisibleCsv);

  // Reload button
  const btnReload = document.getElementById('btnReload');
  if (btnReload) btnReload.addEventListener('click', async () => {
    btnReload.disabled = true;
    btnReload.textContent = 'Načítám…';
    try {
      await loadData(true);
      renderGrid();
    } finally {
      btnReload.disabled = false;
      btnReload.textContent = '⟳ Načíst znovu';
    }
  });

  // Modal close — vrátí fokus na spouštěcí kartu
  const closeModalAndFocus = () => {
    closeModal();
    if (_lastFocusedBeforeModal) { _lastFocusedBeforeModal.focus(); _lastFocusedBeforeModal = null; }
  };
  document.getElementById('modalClose').addEventListener('click', closeModalAndFocus);
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModalAndFocus();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModalAndFocus(); });

  // Hashchange — back/forward navigation
  window.addEventListener('hashchange', () => {
    const state = readHash();
    applyHash(state);
    renderGrid();
  });
}

// ====== INIT ======

(async () => {
  if (typeof window === 'undefined') return; // skip in node test environment
  const hashState = readHash();
  applyHash(hashState);
  wireUp();
  renderMastheadDateLocal();
  renderFooter();
  try {
    await loadData();
  } catch (err) {
    console.error('Initial load failed:', err);
  }
  // Renderování — každá funkce má vlastní try/catch, takže selhání jedné
  // nezabrání renderování ostatních.
  try { renderEditorialHero(); } catch (err) { console.error('hero render failed:', err); }
  try { renderGrid(); } catch (err) { console.error('grid render failed:', err); }
  try { loadAndRenderRegions(); } catch (err) { console.error('regions render failed:', err); }
  try { renderFinanceDonut(); } catch (err) { console.error('finance donut failed:', err); }
  try { loadAndRenderHomeArticles(); } catch (err) { console.error('home articles failed:', err); }
  // Animace statických .av-counter elementů v index.html (hero skóre, donut center,
  // finance tiles) + bar fillů ve finance tiles. Spuštěno po všech renderech aby
  // se animace navázaly i na elementy přidané JS-em.
  try { enhanceArticleVisuals(); } catch (err) { console.error('av enhance failed:', err); }
  try { enhanceFinanceTileFills(document); } catch (err) { console.error('finance tile fill failed:', err); }
})();

/**
 * Animuje width finance tile fill barů (.finance-tile-fill) z 0% na data-target-width
 * při vstupu do viewportu. Respektuje prefers-reduced-motion.
 */
function enhanceFinanceTileFills(scope) {
  const fills = scope.querySelectorAll('.finance-tile-fill:not([data-av-init])');
  if (fills.length === 0) return;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || typeof IntersectionObserver === 'undefined') {
    fills.forEach(b => {
      b.style.width = (b.dataset.targetWidth || '0') + '%';
      b.dataset.avInit = '1';
    });
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.targetWidth) || 0;
      // Stagger podle pozice v rámci .finance-tiles
      const siblings = Array.from(el.closest('.finance-tiles').querySelectorAll('.finance-tile-fill'));
      const idx = siblings.indexOf(el);
      const delay = idx * 100;
      setTimeout(() => {
        el.style.transition = 'width 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
        el.style.width = target + '%';
      }, delay);
      el.dataset.avInit = '1';
      obs.unobserve(el);
    });
  }, { threshold: 0.3 });
  fills.forEach(b => obs.observe(b));
}

/**
 * Render donut grafu „Kam jdou peníze" v sekci finance-section. Data jsou
 * derived z OIS-11-24 (Náklady ZP podle segmentů, 2023, všech 7 pojišťoven).
 * Žádný fetch — meta-data jsou statická pro daný snapshot, indikátory v
 * data/indicators.json drží jednotlivé podíly + per-capita úhradu.
 */
function renderFinanceDonut() {
  const ctx = document.getElementById('financeDonut');
  if (!ctx) return;
  if (typeof Chart === 'undefined') return;
  const segments = [
    { label: 'Lůžková péče',         pct: 55.9, color: '#B45F06' },
    { label: 'Ambulantní péče',      pct: 28.5, color: '#38761D' },
    { label: 'Léky (recept)',        pct: 9.9,  color: '#0B5394' },
    { label: 'Zdravotnické prostředky', pct: 2.4, color: '#7A6A4F' },
    { label: 'Lázně',                pct: 1.2,  color: '#A99577' },
    { label: 'Stomatologie',         pct: 1.0,  color: '#8B5A9C' },
    { label: 'Doprava + ZZS',        pct: 0.5,  color: '#5F7A8B' },
    { label: 'Ostatní / vyrovnání',  pct: 0.6,  color: '#999' },
  ];
  // eslint-disable-next-line no-undef
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: segments.map(s => s.label),
      datasets: [{
        data: segments.map(s => s.pct),
        backgroundColor: segments.map(s => s.color),
        borderWidth: 1,
        borderColor: '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      animation: chartAnimationOptions(),
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => `${c.label}: ${c.parsed.toFixed(1)} % (≈ ${(c.parsed * 4.59).toFixed(1)} mld Kč)`,
          },
        },
      },
    },
  });
}

/**
 * Načte data/articles.json a vyrenderuje 3 nejnovější (dle date desc, pak number desc)
 * do bloku #homeArticlesGrid na hlavní stránce. Manifest vynechán — má své vlastní
 * vizuální zvýraznění v sekci /clanky.html a do "nejnovějších" nepatří jako řadový text.
 */
async function loadAndRenderHomeArticles() {
  const grid = document.getElementById('homeArticlesGrid');
  if (!grid) return;
  try {
    const res = await fetch('data/articles.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const articles = (data.articles ?? [])
      .filter(a => a.kind !== 'manifest')
      .filter(a => a.published !== false)
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (db !== da) return db - da;
        return parseInt(b.number, 10) - parseInt(a.number, 10);
      })
      .slice(0, 3);

    grid.innerHTML = articles.map(a => `
      <li class="home-article-card">
        <a class="home-article-link" href="${a.slug}">
          <div class="home-article-meta">
            <span class="home-article-num">${a.number}</span>
            <span class="home-article-tag">${a.tag}</span>
            <span class="home-article-date">${formatArticleDate(a.date)}</span>
          </div>
          <h4 class="home-article-title">${a.title}</h4>
          <p class="home-article-perex">${a.perex}</p>
          <span class="home-article-cta">Číst článek →</span>
        </a>
      </li>
    `).join('');
  } catch (err) {
    console.error('home articles load failed:', err);
    grid.innerHTML = '<li class="home-article-card"><p class="home-article-perex">Články se nepodařilo načíst.</p></li>';
  }
}

function formatArticleDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}
