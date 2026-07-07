// Frontend logika stránky legislativa.html (Legislativní radar — VeKLEP).
// Načítá data/legislativa.json + data/articles.json (pro názvy propojených
// článků) a renderuje tabulku návrhů s filtrem podle fáze legislativního
// procesu a fulltextovým hledáním. Vzor: src/strategies.js.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState } from './page-shared.js';

export const PHASE_LABELS = {
  pripominky: { label: 'V připomínkovém řízení', cls: 'leg-ph-pripominky' },
  vyporadani: { label: 'Vypořádání připomínek', cls: 'leg-ph-vyporadani' },
  vlada: { label: 'Na jednání vlády', cls: 'leg-ph-vlada' },
  parlament: { label: 'V Parlamentu', cls: 'leg-ph-parlament' },
  dokonceno: { label: 'Proces dokončen', cls: 'leg-ph-dokonceno' },
};

export const TYPE_LABELS = {
  zakon: 'Návrh zákona',
  vyhlaska: 'Návrh vyhlášky',
  narizeni_vlady: 'Nařízení vlády',
};

// Pořadí fází v tabulce = postup legislativního procesu.
export const PHASE_ORDER = ['pripominky', 'vyporadani', 'vlada', 'parlament', 'dokonceno'];

// ── Legislativní plán MZ (plan_items / plan_meta) ──────────────────────────
// Samostatná sekce nad radarem: plánované předpisy podle plánu legislativních
// prací vlády a jejich plnění. Enumy typu/stavu drží krok s validátorem
// (VALID_PLAN_TYPES / VALID_PLAN_STAV v ingest/validate-legislation.js).

export const PLAN_TYPE_LABELS = {
  ustavni_zakon: 'Ústavní zákon',
  vecny_zamer: 'Věcný záměr zákona',
  zakon: 'Návrh zákona',
  novela_zakona: 'Novela zákona',
  narizeni_vlady: 'Nařízení vlády',
  novela_narizeni: 'Novela nařízení vlády',
  vyhlaska: 'Vyhláška',
  novela_vyhlasky: 'Novela vyhlášky',
};

// Barevná sémantika badge = signální paleta good/warn/bad/neutral (drží se
// existujících signal tříd, červená JEN pro withdrawal/staženo). „proces"
// příznak řídí, které stavy padají do souhrnného počitadla „v procesu".
export const PLAN_STAV_LABELS = {
  nezahajeno: { label: 'Nezahájeno', cls: 'leg-plan-badge-neutral', proces: false },
  pripominkove_rizeni: { label: 'Připomínkové řízení', cls: 'leg-plan-badge-warn', proces: true },
  vlada: { label: 'Na vládě', cls: 'leg-plan-badge-warn', proces: true },
  parlament: { label: 'V Parlamentu', cls: 'leg-plan-badge-warn', proces: true },
  sbirka: { label: 'Ve Sbírce zákonů', cls: 'leg-plan-badge-good', proces: false },
  stazeno: { label: 'Staženo', cls: 'leg-plan-badge-bad', proces: false },
};

// Stavy, které se počítají jako „v procesu" (aktivně projednávané).
export const PLAN_STAV_PROCES = Object.keys(PLAN_STAV_LABELS).filter(k => PLAN_STAV_LABELS[k].proces);

// Stavy, u kterých má smysl mluvit o zpoždění proti plánu (ještě nedoběhly
// do vlády / Parlamentu / Sbírky). Po termínu = plan_termin před aktuálním
// měsícem A stav v této množině.
export const PLAN_STAV_OVERDUE_ELIGIBLE = ['nezahajeno', 'pripominkove_rizeni'];

const CZ_MONTHS = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

/** Převede "YYYY-MM" na měsíční index (rok*12 + měsíc, 0-based měsíc); null když nevalidní. */
export function planTerminIndex(termin) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(termin ?? ''));
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return Number(m[1]) * 12 + (month - 1);
}

/** Měsíční index aktuálního data (rok*12 + měsíc 0-based). */
export function monthIndex(date) {
  return date.getFullYear() * 12 + date.getMonth();
}

/** "2026-06" → "červen 2026"; neplatný vstup vrací původní řetězec / pomlčku. */
export function formatPlanTermin(termin) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(termin ?? ''));
  if (!m) return termin ? String(termin) : '—';
  const month = Number(m[2]);
  if (month < 1 || month > 12) return String(termin);
  return `${CZ_MONTHS[month - 1]} ${m[1]}`;
}

/**
 * Je položka po termínu vůči zadanému „teď"?
 * Po termínu = plan_termin (měsíc) < aktuální měsíc A stav ∈ {nezahajeno, pripominkove_rizeni}.
 * `now` je injektovatelné (Date) kvůli testovatelnosti — v prohlížeči new Date().
 */
export function isPlanItemOverdue(item, now = new Date()) {
  if (!item || !PLAN_STAV_OVERDUE_ELIGIBLE.includes(item.stav)) return false;
  const idx = planTerminIndex(item.plan_termin);
  if (idx === null) return false;
  return idx < monthIndex(now);
}

/** Souhrnné počty pro počitadla. */
export function computePlanStats(items, now = new Date()) {
  const xs = Array.isArray(items) ? items : [];
  return {
    total: xs.length,
    inProcess: xs.filter(it => PLAN_STAV_PROCES.includes(it.stav)).length,
    inSbirka: xs.filter(it => it.stav === 'sbirka').length,
    notStarted: xs.filter(it => it.stav === 'nezahajeno').length,
    overdue: xs.filter(it => isPlanItemOverdue(it, now)).length,
  };
}

/** Filtr plánu podle čipu. `now` injektovatelné kvůli filtru „po termínu". */
export function filterPlanItems(items, filter = 'all', now = new Date()) {
  const xs = Array.isArray(items) ? items : [];
  switch (filter) {
    case 'proces': return xs.filter(it => PLAN_STAV_PROCES.includes(it.stav));
    case 'nezahajeno': return xs.filter(it => it.stav === 'nezahajeno');
    case 'poterminu': return xs.filter(it => isPlanItemOverdue(it, now));
    case 'sbirka': return xs.filter(it => it.stav === 'sbirka');
    case 'all':
    default: return xs.slice();
  }
}

/** Řazení plánu: po termínu nahoře, pak podle plánovaného termínu vzestupně, pak název. */
export function sortPlanItems(items, now = new Date()) {
  return [...(items ?? [])].sort((a, b) => {
    const oa = isPlanItemOverdue(a, now) ? 0 : 1;
    const ob = isPlanItemOverdue(b, now) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    const ia = planTerminIndex(a.plan_termin) ?? Number.MAX_SAFE_INTEGER;
    const ib = planTerminIndex(b.plan_termin) ?? Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return String(a.nazev ?? '').localeCompare(String(b.nazev ?? ''), 'cs');
  });
}

// ── Časová osa (pravý sloupec radaru) ──────────────────────────────────────
// Chronologicky slévá dění z radaru (vstup do VeKLEP, termíny připomínek,
// dokončení procesu) a sliby z plánu (plan_termin) do jedné osy s markerem
// „dnes". Čistá funkce kvůli testovatelnosti.

/**
 * @returns pole událostí {date: 'YYYY-MM-DD', monthOnly, kind, status, label,
 * title, href} seřazené vzestupně. status: done | open | upcoming | overdue.
 */
export function buildTimelineEvents(items, planItems, now = new Date()) {
  const todayIso = now.toISOString().slice(0, 10);
  const events = [];

  for (const it of items ?? []) {
    const title = it.title_short ?? it.title ?? it.id;
    const href = it.veklep_url ?? null;
    if (it.dates?.authorized) {
      events.push({
        date: it.dates.authorized, monthOnly: false, kind: 'veklep',
        status: 'done', label: 'Vstup do VeKLEP', title, href,
      });
    }
    if (it.dates?.comments_until) {
      const past = it.dates.comments_until < todayIso;
      events.push({
        date: it.dates.comments_until, monthOnly: false, kind: 'pripominky',
        status: past ? 'done' : 'open',
        label: past ? 'Konec připomínkového řízení' : 'Připomínky do',
        title, href,
      });
    }
    if (it.phase === 'dokonceno' && it.dates?.last_change) {
      events.push({
        date: it.dates.last_change, monthOnly: false, kind: 'dokonceno',
        status: 'done', label: 'Proces dokončen', title, href,
      });
    }
  }

  for (const it of planItems ?? []) {
    const idx = planTerminIndex(it.plan_termin);
    if (idx === null) continue;
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    const date = `${y}-${String(m).padStart(2, '0')}-01`;
    const overdue = isPlanItemOverdue(it, now);
    const fulfilled = ['vlada', 'parlament', 'sbirka'].includes(it.stav);
    events.push({
      date, monthOnly: true, kind: 'slib',
      status: overdue ? 'overdue' : (fulfilled || idx < monthIndex(now) ? 'done' : 'upcoming'),
      label: overdue ? 'Slib plánu — po termínu' : (fulfilled ? 'Slib plánu — splněno/v procesu' : 'Slib plánu: předložení vládě'),
      title: it.nazev ?? it.id, href: it.veklep_url ?? null,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'cs'));
}

let allItems = [];
let articlesById = new Map();
let activePhase = 'all';
let activeSearch = '';

// Stav sekce plánu.
let planItems = [];
let planMeta = null;
let activePlanFilter = 'all';

/** Filtr podle fáze + fulltext přes title/title_short/annotation/submitter. */
export function filterLegislation(items, { phase, search } = {}) {
  let xs = items;
  if (phase && phase !== 'all') xs = xs.filter(it => it.phase === phase);
  if (search) {
    const q = search.toLowerCase();
    xs = xs.filter(it =>
      (it.title || '').toLowerCase().includes(q)
      || (it.title_short || '').toLowerCase().includes(q)
      || (it.annotation || '').toLowerCase().includes(q)
      || (it.submitter || '').toLowerCase().includes(q)
    );
  }
  return xs;
}

/** Seřazení: rozjednané fáze nahoře (podle PHASE_ORDER), uvnitř fáze podle poslední změny. */
export function sortLegislation(items) {
  return [...items].sort((a, b) => {
    const pa = PHASE_ORDER.indexOf(a.phase);
    const pb = PHASE_ORDER.indexOf(b.phase);
    if (pa !== pb) return pa - pb;
    return String(b.dates?.last_change ?? '').localeCompare(String(a.dates?.last_change ?? ''));
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function renderLinks(item) {
  const chips = [];
  for (const id of item.linked_indicators ?? []) {
    chips.push(`<a class="chip" href="indikator-${encodeURIComponent(id)}.html">${escapeHtml(id)}</a>`);
  }
  for (const id of item.linked_articles ?? []) {
    const art = articlesById.get(id);
    if (!art) continue;
    const label = art.title?.length > 60 ? `${art.title.slice(0, 57)}…` : (art.title ?? id);
    chips.push(`<a class="chip chip-strategy" href="${escapeHtml(art.slug)}">${escapeHtml(label)}</a>`);
  }
  return chips.length ? `<div class="chip-row leg-links">${chips.join('')}</div>` : '';
}

function renderRow(item) {
  const phase = PHASE_LABELS[item.phase] ?? { label: item.phase, cls: '' };
  const comments = item.phase === 'pripominky' && item.dates?.comments_until
    ? `<div class="leg-deadline">Připomínky do ${escapeHtml(formatDate(item.dates.comments_until))}</div>`
    : '';
  return `
    <tr class="leg-row">
      <td class="leg-cell-title">
        <span class="leg-type">${escapeHtml(TYPE_LABELS[item.type] ?? item.type)}</span>
        <strong class="leg-title">${escapeHtml(item.title_short)}</strong>
        <p class="leg-annotation">${escapeHtml(item.annotation)}</p>
        ${renderLinks(item)}
      </td>
      <td class="leg-cell-phase">
        <span class="leg-phase-pill ${phase.cls}">${escapeHtml(phase.label)}</span>
        <div class="leg-status" title="Stav materiálu ve VeKLEP">${escapeHtml(item.veklep_status ?? '')}</div>
        ${comments}
      </td>
      <td class="leg-cell-date">${escapeHtml(formatDate(item.dates?.last_change))}</td>
      <td class="leg-cell-link">
        <a href="${escapeHtml(item.veklep_url)}" target="_blank" rel="noopener" title="${escapeHtml(item.title)}">VeKLEP ↗</a>
      </td>
    </tr>
  `;
}

function renderTable() {
  const wrap = document.getElementById('legTableWrap');
  const empty = document.getElementById('emptyState');
  const filtered = sortLegislation(filterLegislation(allItems, { phase: activePhase, search: activeSearch }));

  const badge = document.getElementById('countBadge');
  if (badge) {
    badge.textContent = `${filtered.length} návrh${filtered.length === 1 ? '' : (filtered.length < 5 ? 'y' : 'ů')}`;
  }

  if (!filtered.length) {
    wrap.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  wrap.innerHTML = `
    <table class="leg-table">
      <thead>
        <tr>
          <th scope="col">Návrh předpisu</th>
          <th scope="col">Fáze procesu</th>
          <th scope="col">Poslední změna</th>
          <th scope="col">Zdroj</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(renderRow).join('')}
      </tbody>
    </table>
  `;
}

// ── Render časové osy ──────────────────────────────────────────────────────

function formatTimelineDate(ev) {
  if (ev.monthOnly) return formatPlanTermin(ev.date.slice(0, 7));
  return formatDate(ev.date);
}

function renderTimeline() {
  const host = document.getElementById('legTimeline');
  if (!host) return;
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const events = buildTimelineEvents(allItems, planItems, now);
  if (!events.length) { host.hidden = true; return; }
  host.hidden = false;

  const item = ev => `
    <li class="leg-tl-event leg-tl-${escapeHtml(ev.status)}">
      <span class="leg-tl-dot" aria-hidden="true"></span>
      <span class="leg-tl-date">${escapeHtml(formatTimelineDate(ev))}</span>
      <span class="leg-tl-label">${escapeHtml(ev.label)}</span>
      ${ev.href
        ? `<a class="leg-tl-title" href="${escapeHtml(ev.href)}" target="_blank" rel="noopener">${escapeHtml(ev.title)}</a>`
        : `<span class="leg-tl-title">${escapeHtml(ev.title)}</span>`}
    </li>`;

  const past = events.filter(e => e.date <= todayIso);
  const future = events.filter(e => e.date > todayIso);

  host.innerHTML = `
    <h3 class="leg-tl-heading">Časová osa</h3>
    <p class="leg-tl-lead">Postup prací a slibů v čase — co se stalo a jaké termíny běží.</p>
    <ol class="leg-tl-list">
      ${past.map(item).join('')}
      <li class="leg-tl-today" aria-label="Dnešní datum"><span class="leg-tl-today-line"></span><span class="leg-tl-today-lbl">dnes · ${escapeHtml(formatDate(todayIso))}</span></li>
      ${future.map(item).join('')}
    </ol>
    <p class="leg-tl-legend">
      <span class="leg-tl-key leg-tl-done">proběhlo</span>
      <span class="leg-tl-key leg-tl-open">běžící termín</span>
      <span class="leg-tl-key leg-tl-upcoming">slib plánu</span>
      <span class="leg-tl-key leg-tl-overdue">po termínu</span>
    </p>
  `;
}

function renderStats() {
  const el = (id) => document.getElementById(id);
  const inProgress = allItems.filter(it => it.phase !== 'dokonceno').length;
  const inComments = allItems.filter(it => it.phase === 'pripominky').length;
  if (el('statTotal')) el('statTotal').textContent = String(allItems.length);
  if (el('statInProgress')) el('statInProgress').textContent = String(inProgress);
  if (el('statComments')) el('statComments').textContent = String(inComments);
}

function wireFilters() {
  document.querySelectorAll('.level-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.level-nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePhase = btn.dataset.phase;
      renderTable();
    });
  });

  const search = document.getElementById('searchBox');
  if (search) {
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        activeSearch = search.value.trim();
        renderTable();
      }, 200);
    });
  }
}

// ── Render sekce plánu ─────────────────────────────────────────────────────

function renderPlanMetaLine() {
  if (!planMeta) return '';
  const parts = [];
  if (planMeta.usneseni) parts.push(`Usnesení vlády ${escapeHtml(planMeta.usneseni)}`);
  if (planMeta.schvaleno) parts.push(`schváleno ${escapeHtml(formatDate(planMeta.schvaleno))}`);
  let src = '';
  if (planMeta.zdroj_url && planMeta.zdroj_nazev) {
    src = `<a href="${escapeHtml(planMeta.zdroj_url)}" target="_blank" rel="noopener">${escapeHtml(planMeta.zdroj_nazev)} ↗</a>`;
  } else if (planMeta.zdroj_nazev) {
    src = escapeHtml(planMeta.zdroj_nazev);
  }
  const meta = parts.join(' · ');
  if (!meta && !src) return '';
  return `<p class="leg-plan-meta">${meta}${meta && src ? ' · ' : ''}${src}</p>`;
}

function renderPlanRow(item, now) {
  const stav = PLAN_STAV_LABELS[item.stav] ?? { label: item.stav, cls: 'leg-plan-badge-neutral' };
  const overdue = isPlanItemOverdue(item, now);
  const typeLabel = PLAN_TYPE_LABELS[item.typ] ?? item.typ;
  const popis = item.popis
    ? `<p class="leg-plan-popis">${escapeHtml(item.popis)}</p>`
    : '';
  const veklep = item.veklep_url
    ? `<a href="${escapeHtml(item.veklep_url)}" target="_blank" rel="noopener" title="Materiál ve VeKLEP">VeKLEP ↗</a>`
    : '<span class="leg-plan-noveklep">—</span>';
  const overdueTag = overdue
    ? '<span class="leg-plan-overdue-tag">Po termínu</span>'
    : '';
  const poznamka = item.plneni_poznamka
    ? escapeHtml(item.plneni_poznamka)
    : '<span class="leg-plan-noveklep">—</span>';
  return `
    <tr class="leg-plan-row${overdue ? ' leg-plan-row-overdue' : ''}">
      <td class="leg-plan-cell-title">
        <span class="leg-type">${escapeHtml(typeLabel)}</span>
        <strong class="leg-title" title="${escapeHtml(item.nazev)}">${escapeHtml(item.nazev)}</strong>
        ${popis}
      </td>
      <td class="leg-plan-cell-termin">${escapeHtml(formatPlanTermin(item.plan_termin))}${overdueTag}</td>
      <td class="leg-plan-cell-stav">
        <span class="leg-plan-badge ${stav.cls}">${escapeHtml(stav.label)}</span>
      </td>
      <td class="leg-plan-cell-veklep">${veklep}</td>
      <td class="leg-plan-cell-note">${poznamka}</td>
    </tr>
  `;
}

function renderPlanTable() {
  const wrap = document.getElementById('legPlanTableWrap');
  const empty = document.getElementById('legPlanEmpty');
  if (!wrap) return;
  const now = new Date();
  const filtered = sortPlanItems(filterPlanItems(planItems, activePlanFilter, now), now);

  if (!filtered.length) {
    wrap.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  wrap.innerHTML = `
    <table class="leg-plan-table">
      <thead>
        <tr>
          <th scope="col">Plánovaný předpis</th>
          <th scope="col">Plán říkal</th>
          <th scope="col">Stav</th>
          <th scope="col">Materiál</th>
          <th scope="col">Poznámka k plnění</th>
        </tr>
      </thead>
      <tbody>${filtered.map(it => renderPlanRow(it, now)).join('')}</tbody>
    </table>
  `;
}

function wirePlanFilters() {
  document.querySelectorAll('#legPlanFilters button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#legPlanFilters button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePlanFilter = btn.dataset.planFilter;
      renderPlanTable();
    });
  });
}

function renderPlan() {
  const mount = document.getElementById('legPlanMount');
  if (!mount) return;
  // Graceful: bez položek plánu se sekce nevykreslí vůbec.
  if (!planItems.length) {
    mount.innerHTML = '';
    mount.hidden = true;
    return;
  }
  mount.hidden = false;

  const now = new Date();
  const s = computePlanStats(planItems, now);
  const counter = (num, label, extra = '') =>
    `<div class="leg-plan-stat${extra}"><span class="leg-plan-stat-num">${num}</span><span class="leg-plan-stat-lbl">${label}</span></div>`;

  mount.innerHTML = `
    <div class="leg-plan-head">
      <div class="ed-kicker">Legislativní plán ministerstva</div>
      <h2 id="legPlanHeading">Co ministerstvo slíbilo připravit — a jak to plní</h2>
      <p class="leg-plan-lead">
        Vláda každý rok schvaluje plán legislativních prací — seznam předpisů, které mají resorty
        během roku předložit. Zde sledujeme zdravotnickou část plánu a porovnáváme, co plán říkal,
        s tím, kde předpis reálně je.
      </p>
      ${renderPlanMetaLine()}
    </div>

    <div class="leg-plan-stats" role="group" aria-label="Souhrn plnění plánu">
      ${counter(s.total, 'položek v plánu')}
      ${counter(s.inProcess, 'v procesu')}
      ${counter(s.inSbirka, 've Sbírce')}
      ${counter(s.notStarted, 'nezahájeno')}
      ${counter(s.overdue, 'po termínu', s.overdue > 0 ? ' leg-plan-stat-alert' : '')}
    </div>

    <nav class="leg-plan-filters level-nav" id="legPlanFilters" aria-label="Filtr plánu podle stavu">
      <button data-plan-filter="all" class="active">Vše</button>
      <button data-plan-filter="proces">V procesu</button>
      <button data-plan-filter="nezahajeno">Nezahájeno</button>
      <button data-plan-filter="poterminu">Po termínu</button>
      <button data-plan-filter="sbirka">Ve Sbírce</button>
    </nav>

    <div id="legPlanTableWrap" class="leg-plan-table-wrap"></div>
    <div class="empty-state hidden" id="legPlanEmpty">Žádná položka plánu neodpovídá filtru.</div>
  `;

  wirePlanFilters();
  renderPlanTable();
}

async function init() {
  if (typeof window === 'undefined') return;

  renderModuleNav('legislativa');
  renderMastheadDate();

  try {
    const [legRes, artsRes] = await Promise.all([
      fetch('data/legislativa.json'),
      fetch('data/articles.json').catch(() => null),
    ]);
    if (!legRes.ok) throw new Error(`HTTP ${legRes.status}`);
    const legData = await legRes.json();
    const artsData = artsRes?.ok ? await artsRes.json() : { articles: [] };

    allItems = legData.items ?? [];
    planItems = Array.isArray(legData.plan_items) ? legData.plan_items : [];
    planMeta = legData.plan_meta ?? null;
    articlesById = new Map((artsData.articles ?? []).map(a => [a.id, a]));

    renderStats();
    renderPlan();
    wireFilters();
    renderTable();
    renderTimeline();
  } catch (err) {
    console.error('legislativa load failed:', err);
    document.getElementById('listView').innerHTML = renderErrorState('Nepodařilo se načíst legislativní radar.', err);
  }
}

if (typeof window !== 'undefined') init();
