// Frontend logika stránky barometr.html (Barometr politických prohlášení).
// Načítá data/barometr.json (závazky + výroky), data/indicators.json (živá
// aktuální hodnota indikátoru — baseline je zamrazená v barometr.json) a
// data/legislativa.json (názvy propojených předpisů). Enumy a UI labely drží
// krok s metodikou (docs/metodika-barometr.md §3, §4, §7) a validátorem
// (ingest/validate-barometr.js). Vzor stránky: src/legislativa.js.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';

// ── Enumy → UI (docs/metodika-barometr.md §3.1, §4.2) ──────────────────────
// Barevná sémantika badge = signální paleta good/warn/bad/neutral.
// Pořadí klíčů = pořadí v hero počitadlech a legendě.
export const STAV_LABELS = {
  plni_se:              { label: 'Plní se',              cls: 'bar-badge-good',    signal: 'good' },
  splneno:              { label: 'Splněno',              cls: 'bar-badge-good',    signal: 'good' },
  bez_pohybu:           { label: 'Bez pohybu',           cls: 'bar-badge-warn',    signal: 'warn' },
  opacny_smer:          { label: 'Opačný směr',          cls: 'bar-badge-bad',     signal: 'bad' },
  ceka_na_data:         { label: 'Čeká na data',         cls: 'bar-badge-neutral', signal: 'neutral' },
  nema_meritelny_obsah: { label: 'Nemá měřitelný obsah', cls: 'bar-badge-neutral', signal: 'neutral' },
};

export const VERDIKT_LABELS = {
  sedi_s_daty:        { label: 'Sedí s daty',        cls: 'bar-badge-good',    signal: 'good' },
  nesedi:             { label: 'Nesedí s daty',      cls: 'bar-badge-bad',     signal: 'bad' },
  zavadejici_kontext: { label: 'Zavádějící kontext', cls: 'bar-badge-warn',    signal: 'warn' },
  neoveritelne:       { label: 'Neověřitelné',       cls: 'bar-badge-neutral', signal: 'neutral' },
};

export const DIRECTION_WANTED_LABELS = {
  higher_is_better: 'chtěný směr: růst',
  lower_is_better: 'chtěný směr: pokles',
};

// Filtr závazků: čipy = jednotlivé stavy + „vše". Pořadí drží hero legendu.
export const STAV_FILTER_ORDER = ['plni_se', 'bez_pohybu', 'opacny_smer', 'ceka_na_data', 'nema_meritelny_obsah', 'splneno'];

// ── Čistá logika (testovatelná bez DOM) ────────────────────────────────────

/**
 * Aktuální (živá) hodnota indikátoru = poslední bod řady `trend`, jinak
 * headline `value`/`year`. Baseline se NEČTE odtud (je zamrazená v závazku).
 * @returns {{value:number, year:number}|null}
 */
export function computeCurrentValue(indicator) {
  if (!indicator || typeof indicator !== 'object') return null;
  const trend = Array.isArray(indicator.trend) ? indicator.trend.filter(p => typeof p?.value === 'number' && Number.isInteger(p?.year)) : [];
  if (trend.length) {
    const last = trend.reduce((a, b) => (b.year > a.year ? b : a));
    return { value: last.value, year: last.year };
  }
  if (typeof indicator.value === 'number') {
    return { value: indicator.value, year: Number.isInteger(indicator.year) ? indicator.year : null };
  }
  return null;
}

/**
 * Pokrok od baseline s ohledem na chtěný směr. Kladné progress = pohyb
 * chtěným směrem (§3.3). `delta` je surový rozdíl (current − baseline).
 * @returns {{delta:number, progress:number, dir:'up'|'down'|'flat'}|null}
 */
export function computeProgress(baselineValue, currentValue, directionWanted) {
  if (typeof baselineValue !== 'number' || typeof currentValue !== 'number') return null;
  const delta = currentValue - baselineValue;
  const progress = directionWanted === 'lower_is_better' ? -delta : delta;
  const EPS = 1e-9;
  const dir = delta > EPS ? 'up' : (delta < -EPS ? 'down' : 'flat');
  return { delta, progress, dir };
}

/** Počty závazků podle stavu + celkem. */
export function computeStavStats(commitments) {
  const xs = Array.isArray(commitments) ? commitments : [];
  const counts = {};
  for (const key of Object.keys(STAV_LABELS)) counts[key] = 0;
  for (const c of xs) if (c && Object.prototype.hasOwnProperty.call(counts, c.stav)) counts[c.stav] += 1;
  return { total: xs.length, ...counts };
}

/** Filtr závazků podle stavu; 'all' = vše. */
export function filterCommitments(commitments, filter = 'all') {
  const xs = Array.isArray(commitments) ? commitments : [];
  if (!filter || filter === 'all') return xs.slice();
  return xs.filter(c => c && c.stav === filter);
}

// ── Formátování ────────────────────────────────────────────────────────────

/** Číslo česky (desetinná čárka), bez zbytečných koncových nul. */
function fmtNum(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: 3 });
}

/** Podepsaná delta se šipkou pro popisek (např. „▲ +0,3"). */
export function formatSignedDelta(delta) {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return '';
  const EPS = 1e-9;
  const arrow = delta > EPS ? '▲' : (delta < -EPS ? '▼' : '▬');
  const sign = delta > EPS ? '+' : '';
  return `${arrow} ${sign}${fmtNum(delta)}`;
}

function fmtDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
  const [y, m, d] = iso.split('-');
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

// ── Stav modulu ─────────────────────────────────────────────────────────────

let allCommitments = [];
let allStatements = [];
let indicatorsById = new Map();
let legislationById = new Map();
let activeStavFilter = 'all';

// ── Render: hero počitadla ──────────────────────────────────────────────────

function renderHeroStats() {
  const s = computeStavStats(allCommitments);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
  set('statCommitTotal', s.total);
  set('statPlniSe', s.plni_se + s.splneno);
  set('statCekaNaData', s.ceka_na_data);
  set('statOpacnySmer', s.opacny_smer);
  const alert = document.getElementById('statOpacnySmerBox');
  if (alert) alert.classList.toggle('bar-stat-alert', s.opacny_smer > 0);
}

// ── Render: checkpoint (baseline → aktuální hodnota) ────────────────────────

function renderCheckpoint(link) {
  const ind = indicatorsById.get(link.id);
  const name = ind?.name ?? link.id;
  const unit = ind?.unit ? ` ${escapeHtml(ind.unit)}` : '';
  const dirLabel = DIRECTION_WANTED_LABELS[link.direction_wanted] ?? '';
  const nameHtml = ind
    ? `<a class="bar-metric-name" href="indikator-${encodeURIComponent(link.id)}.html">${escapeHtml(name)}</a>`
    : `<span class="bar-metric-name">${escapeHtml(name)}</span>`;

  const baseline = `${fmtNum(link.baseline_value)}${unit} <span class="bar-metric-year">(${escapeHtml(String(link.baseline_year))})</span>`;

  const cur = computeCurrentValue(ind);
  let currentHtml = '<span class="bar-metric-nodata">zatím bez novějších dat</span>';
  let deltaHtml = '';
  if (cur) {
    const yearTag = cur.year != null ? ` <span class="bar-metric-year">(${escapeHtml(String(cur.year))})</span>` : '';
    currentHtml = `<strong class="bar-current">${fmtNum(cur.value)}${unit}${yearTag}</strong>`;
    const prog = computeProgress(link.baseline_value, cur.value, link.direction_wanted);
    if (prog && prog.dir !== 'flat') {
      const cls = prog.progress > 0 ? 'bar-delta-good' : 'bar-delta-bad';
      deltaHtml = `<span class="bar-delta ${cls}">${escapeHtml(formatSignedDelta(prog.delta))}</span>`;
    } else if (prog) {
      deltaHtml = '<span class="bar-delta bar-delta-flat">beze změny</span>';
    }
  }

  return `
    <div class="bar-metric">
      ${nameHtml}
      <div class="bar-metric-values">
        <span class="bar-baseline" title="Baseline zamrazená k datu slibu">${baseline}</span>
        <span class="bar-metric-arrow" aria-hidden="true">→</span>
        ${currentHtml}
        ${deltaHtml}
      </div>
      ${dirLabel ? `<span class="bar-direction">${escapeHtml(dirLabel)}</span>` : ''}
    </div>`;
}

function renderLegislativaChips(ids) {
  const chips = (Array.isArray(ids) ? ids : []).map(id => {
    const leg = legislationById.get(id);
    const label = leg?.title_short ?? leg?.nazev ?? id;
    return `<a class="bar-chip bar-chip-leg" href="legislativa.html" title="${escapeHtml(leg?.title ?? label)}">${escapeHtml(label)}</a>`;
  });
  return chips.length ? `<div class="bar-chip-row"><span class="bar-chip-lbl">Legislativa:</span>${chips.join('')}</div>` : '';
}

function renderCommitment(c) {
  const stav = STAV_LABELS[c.stav] ?? { label: c.stav, cls: 'bar-badge-neutral' };
  const zdroj = c.zdroj ?? {};
  const zdrojHtml = zdroj.url
    ? `<a href="${escapeHtml(zdroj.url)}" target="_blank" rel="noopener">${escapeHtml(zdroj.nazev ?? 'zdroj')} ↗</a>`
    : escapeHtml(zdroj.nazev ?? '');
  const checkpoints = (Array.isArray(c.linked_indicators) ? c.linked_indicators : []).map(renderCheckpoint).join('');
  const duvod = c.stav_duvod
    ? `<p class="bar-stav-duvod"><span class="bar-label">Proč tento stav</span> ${escapeHtml(c.stav_duvod)}</p>`
    : '';
  return `
    <article class="bar-commit" data-stav="${escapeHtml(c.stav)}">
      <div class="bar-commit-head">
        <span class="bar-badge ${stav.cls}">${escapeHtml(stav.label)}</span>
        ${c.oblast ? `<span class="bar-oblast">${escapeHtml(c.oblast)}</span>` : ''}
      </div>
      <blockquote class="bar-citace">
        ${escapeHtml(c.citace_verbatim)}
        <cite class="bar-cite">— ${zdrojHtml}${zdroj.datum ? ` · ${escapeHtml(fmtDate(zdroj.datum))}` : ''}</cite>
      </blockquote>
      <div class="bar-interpretace">
        <span class="bar-label">Náš checkpoint <span class="bar-label-note">(interpretaci lze rozporovat)</span></span>
        <p>${escapeHtml(c.interpretace)}</p>
      </div>
      ${checkpoints ? `<div class="bar-checkpoints">${checkpoints}</div>` : ''}
      ${renderLegislativaChips(c.legislativa_ids)}
      ${duvod}
    </article>`;
}

function renderCommitments() {
  const wrap = document.getElementById('barCommitList');
  const empty = document.getElementById('barCommitEmpty');
  if (!wrap) return;
  const filtered = filterCommitments(allCommitments, activeStavFilter);

  const badge = document.getElementById('barCommitCount');
  if (badge) badge.textContent = `${filtered.length} závaz${filtered.length === 1 ? 'ek' : (filtered.length < 5 ? 'ky' : 'ků')}`;

  if (!filtered.length) {
    wrap.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  wrap.innerHTML = filtered.map(renderCommitment).join('');
}

// ── Render: Ověřovna (výroky) ───────────────────────────────────────────────

function renderStatement(s) {
  const verdikt = VERDIKT_LABELS[s.verdikt] ?? { label: s.verdikt, cls: 'bar-badge-neutral' };
  const kde = s.kde ?? {};
  const kdeHtml = kde.url
    ? `<a href="${escapeHtml(kde.url)}" target="_blank" rel="noopener">${escapeHtml(kde.nazev ?? 'zdroj')} ↗</a>`
    : escapeHtml(kde.nazev ?? '');
  const kdo = [s.kdo, s.funkce].filter(Boolean).map(escapeHtml).join(', ');
  const indChips = (Array.isArray(s.linked_indicators) ? s.linked_indicators : []).map(id => {
    const ind = indicatorsById.get(id);
    return `<a class="bar-chip" href="indikator-${encodeURIComponent(id)}.html">${escapeHtml(ind?.name ?? id)}</a>`;
  });
  const zdrojeChips = (Array.isArray(s.zdroje) ? s.zdroje : []).map(z => {
    if (z && typeof z === 'object' && z.url) return `<a class="bar-chip bar-chip-src" href="${escapeHtml(z.url)}" target="_blank" rel="noopener">${escapeHtml(z.nazev ?? z.url)} ↗</a>`;
    if (typeof z === 'string') return `<span class="bar-chip bar-chip-src">${escapeHtml(z)}</span>`;
    return '';
  }).filter(Boolean);
  const chips = [...indChips, ...zdrojeChips];

  return `
    <article class="bar-statement" data-verdikt="${escapeHtml(s.verdikt)}">
      <div class="bar-commit-head">
        <span class="bar-badge ${verdikt.cls}">${escapeHtml(verdikt.label)}</span>
      </div>
      <blockquote class="bar-vyrok">
        ${escapeHtml(s.vyrok_verbatim)}
        <cite class="bar-cite">— ${kdo}${s.kdy ? ` · ${escapeHtml(fmtDate(s.kdy))}` : ''}${kdeHtml ? ` · ${kdeHtml}` : ''}</cite>
      </blockquote>
      <div class="bar-interpretace">
        <span class="bar-label">Zdůvodnění verdiktu</span>
        <p>${escapeHtml(s.verdikt_zduvodneni)}</p>
      </div>
      ${chips.length ? `<div class="bar-chip-row">${chips.join('')}</div>` : ''}
    </article>`;
}

function renderStatements() {
  const wrap = document.getElementById('barStatementList');
  const empty = document.getElementById('barStatementEmpty');
  const badge = document.getElementById('barStatementCount');
  if (badge) badge.textContent = `${allStatements.length} výrok${allStatements.length === 1 ? '' : (allStatements.length < 5 ? 'y' : 'ů')}`;
  if (!wrap) return;
  if (!allStatements.length) {
    wrap.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  wrap.innerHTML = allStatements.map(renderStatement).join('');
}

function wireFilters() {
  document.querySelectorAll('#barStavFilters button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#barStavFilters button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeStavFilter = btn.dataset.stavFilter;
      renderCommitments();
    });
  });
}

async function init() {
  if (typeof window === 'undefined') return;

  renderModuleNav('barometr');
  renderMastheadDate();

  try {
    const [barRes, indRes, legRes] = await Promise.all([
      fetch('data/barometr.json'),
      fetch('data/indicators.json').catch(() => null),
      fetch('data/legislativa.json').catch(() => null),
    ]);
    if (!barRes.ok) throw new Error(`HTTP ${barRes.status}`);
    const barData = await barRes.json();
    const indData = indRes?.ok ? await indRes.json() : { indicators: [] };
    const legData = legRes?.ok ? await legRes.json() : { items: [], plan_items: [] };

    allCommitments = Array.isArray(barData.commitments) ? barData.commitments : [];
    allStatements = Array.isArray(barData.statements) ? barData.statements : [];
    indicatorsById = new Map((indData.indicators ?? []).map(i => [i.id, i]));
    legislationById = new Map([
      ...(legData.items ?? []).map(x => [x.id, x]),
      ...(legData.plan_items ?? []).map(x => [x.id, x]),
    ]);

    renderHeroStats();
    wireFilters();
    renderCommitments();
    renderStatements();
  } catch (err) {
    console.error('barometr load failed:', err);
    const host = document.getElementById('listView');
    if (host) host.innerHTML = renderErrorState('Nepodařilo se načíst Barometr.', err);
  }
}

if (typeof window !== 'undefined') init();
