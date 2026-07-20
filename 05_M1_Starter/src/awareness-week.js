// Týdny zdraví — microsite (tyden.html) + sdílené pure helpery.
//
// Registr data/awareness-weeks.json drží mezinárodní dny/týdny. Který je
// „aktivní", se určuje podle dnešního data (interval start–end obsahuje
// dnešek) a statusu ready. Microsite bez ?id= vyrenderuje aktivní týden
// (nebo, mimo aktivní týden, nejbližší nadcházející); s ?id= konkrétní.
// Sekce se skládají z existujícího obsahu (články/indikátory/prevence/nástroje).
// Viz PLAN-TYDNY-ZDRAVI.md.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, isArticleVisible } from './page-shared.js';
import { activeWeekFor, upcomingWeeks, resolveWeek, formatRange } from './awareness-core.js';

// ---------------------------------------------------------------------------
// Render (DOM)
// ---------------------------------------------------------------------------

let INDICATORS = new Map();
let ARTICLES = new Map();
const SIGNAL_LABEL = { good: 'dobré', warn: 'varování', bad: 'špatné', neutral: 'neutrální' };
const TOOL_LABELS = {
  'kompas.html': 'Osobní zdravotní kompas',
  'simulator.html': 'Simulátor pák',
  'model-systemu.html': 'Model systému',
  'vyhlaska.html': 'Úhradová vyhláška: hra',
  'hra.html': 'Tři židle: hra',
  'kviz.html': 'Kvíz',
  'diagnoza.html': 'Diagnóza',
};

function articleCard(slug) {
  const a = ARTICLES.get(slug);
  if (!a || !isArticleVisible(a)) return '';
  return `<a class="aw-card" href="${escapeHtml(slug)}">
    <span class="aw-card-tag">${escapeHtml(a.tag || 'Článek')}</span>
    <span class="aw-card-title">${escapeHtml(a.title || slug)}</span>
    ${a.perex ? `<span class="aw-card-perex">${escapeHtml(a.perex.slice(0, 160))}${a.perex.length > 160 ? '…' : ''}</span>` : ''}
  </a>`;
}

function indicatorRow(id) {
  const ind = INDICATORS.get(id);
  if (!ind) return '';
  const val = typeof ind.value === 'number'
    ? ind.value.toLocaleString('cs-CZ', { maximumFractionDigits: 2 }) : escapeHtml(String(ind.value ?? '—'));
  return `<a class="aw-ind" href="indicator.html?id=${encodeURIComponent(id)}">
    <span class="aw-ind-signal aw-signal-${escapeHtml(ind.signal || 'neutral')}" title="Signál: ${escapeHtml(SIGNAL_LABEL[ind.signal] || 'neutrální')}" aria-hidden="true"></span>
    <span class="aw-ind-name">${escapeHtml(ind.name || id)}</span>
    <span class="aw-ind-val">${val}&nbsp;${escapeHtml(ind.unit || '')} <small>(${escapeHtml(String(ind.year ?? '?'))})</small></span>
  </a>`;
}

function renderSection(section, week) {
  let body = '';
  if (section.kind === 'articles') {
    body = (week.linked_articles || []).map(articleCard).filter(Boolean).join('');
    if (!body) return '';
    body = `<div class="aw-cards">${body}</div>`;
  } else if (section.kind === 'indicators') {
    body = (week.linked_indicators || []).map(indicatorRow).filter(Boolean).join('');
    if (!body) return '';
    body = `<div class="aw-ind-list">${body}</div>`;
  } else if (section.kind === 'prevention') {
    const items = (week.linked_prevention_themes || [])
      .map(t => `<a class="aw-chip" href="prevence.html#${encodeURIComponent(t)}">${escapeHtml(t)}</a>`).join('');
    if (!items) return '';
    body = `<p class="aw-chips">${items} <a class="aw-chip aw-chip-all" href="prevence.html">Celá prevence →</a></p>`;
  } else if (section.kind === 'tools') {
    const items = (week.linked_tools || [])
      .map(t => `<a class="aw-chip" href="${escapeHtml(t)}">${escapeHtml(TOOL_LABELS[t] || t)}</a>`).join('');
    if (!items) return '';
    body = `<p class="aw-chips">${items}</p>`;
  }
  const intro = section.intro ? `<p class="aw-block-intro">${escapeHtml(section.intro)}</p>` : '';
  return `<section class="aw-block"><h2 class="aw-block-h">${escapeHtml(section.h)}</h2>${intro}${body}</section>`;
}

// „Proč na tom záleží" — kontextový blok microsite (nezávislý na propojeném obsahu).
function renderContext(ctx) {
  if (!ctx) return '';
  const cards = [];
  if (ctx.why) {
    cards.push(`<article class="aw-ctx-card"><h3 class="aw-ctx-h">Proč na tom záleží</h3><p>${escapeHtml(ctx.why)}</p></article>`);
  }
  if (Array.isArray(ctx.affects) && ctx.affects.length) {
    cards.push(`<article class="aw-ctx-card"><h3 class="aw-ctx-h">Co to ovlivňuje</h3>
      <ul class="aw-ctx-list">${ctx.affects.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul></article>`);
  }
  if (ctx.cz) {
    cards.push(`<article class="aw-ctx-card aw-ctx-cz"><h3 class="aw-ctx-h">Jak na tom je Česko</h3><p>${escapeHtml(ctx.cz)}</p></article>`);
  }
  if (!cards.length && !ctx.origin && !(Array.isArray(ctx.celebrate) && ctx.celebrate.length)) return '';
  let originBlock = '';
  if (ctx.origin || (Array.isArray(ctx.celebrate) && ctx.celebrate.length)) {
    const celebrate = Array.isArray(ctx.celebrate) && ctx.celebrate.length
      ? `<ul class="aw-ctx-list aw-ctx-celebrate">${ctx.celebrate.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>` : '';
    originBlock = `<section class="aw-block aw-origin">
      <h2 class="aw-block-h">Proč tenhle týden vznikl a jak ho uctít</h2>
      ${ctx.origin ? `<p class="aw-origin-lead">${escapeHtml(ctx.origin)}</p>` : ''}
      ${celebrate}
    </section>`;
  }
  const grid = cards.length ? `<section class="aw-block aw-context"><div class="aw-ctx-grid">${cards.join('')}</div></section>` : '';
  return grid + originBlock;
}

function renderWeek(week, isActive) {
  const host = document.getElementById('awContent');
  document.title = `${week.title} · Týden zdraví · HSPA Monitor`;
  const sections = (week.microsite?.sections || []).map(s => renderSection(s, week)).join('');
  host.innerHTML = `
    <section class="ed-hero aw-hero">
      <p class="ed-kicker">${isActive ? 'Právě probíhá · ' : ''}${escapeHtml(week.kicker)}</p>
      <h1>${escapeHtml(week.title)}</h1>
      <p class="ed-lead">${escapeHtml(week.lead)}</p>
      <p class="aw-hero-meta">${escapeHtml(formatRange(week))}${week.observance_source ? ` · ${escapeHtml(week.observance_source)}` : ''}</p>
    </section>
    ${renderContext(week.context)}
    ${sections}
    ${week.observance_url ? `<section class="aw-block aw-source"><p>Oficiální stránka: <a href="${escapeHtml(week.observance_url)}" target="_blank" rel="noopener">${escapeHtml(week.observance)} ↗</a></p></section>` : ''}`;
}

function renderHub(weeks, day) {
  const host = document.getElementById('awHub');
  if (!host) return;
  const up = upcomingWeeks(day, weeks).filter(w => w.status === 'ready');
  if (!up.length) { host.innerHTML = ''; return; }
  host.innerHTML = `
    <h2 class="aw-block-h">Další týdny zdraví</h2>
    <div class="aw-hub-grid">
      ${up.map(w => `<a class="aw-hub-card" href="tyden.html?id=${encodeURIComponent(w.id)}">
        <span class="aw-hub-date">${escapeHtml(formatRange(w))}</span>
        <span class="aw-hub-title">${escapeHtml(w.kicker)}</span>
      </a>`).join('')}
    </div>`;
}

async function init() {
  renderModuleNav('explainers');
  renderMastheadDate();
  const host = document.getElementById('awContent');
  if (!host) return;
  try {
    const [reg, inds, arts] = await Promise.all([
      fetch('data/awareness-weeks.json').then(r => r.json()),
      fetch('data/indicators.json').then(r => r.json()),
      fetch('data/articles.json').then(r => r.json()),
    ]);
    INDICATORS = new Map((inds.indicators || []).map(i => [i.id, i]));
    ARTICLES = new Map((arts.articles || []).map(a => [a.slug, a]));
    const today = new Date().toISOString().slice(0, 10);
    const id = new URLSearchParams(location.search).get('id');
    const week = resolveWeek(reg.weeks, today, id);
    if (!week) {
      host.innerHTML = `<section class="ed-hero aw-hero"><h1>Týden zdraví</h1>
        <p class="ed-lead">Právě neprobíhá žádný tematický týden. Sledujte kalendář — brzy tu bude další mezinárodní zdravotní den.</p></section>`;
      return;
    }
    renderWeek(week, activeWeekFor(today, reg.weeks)?.id === week.id);
    renderHub(reg.weeks.filter(w => w.id !== week.id), today);
  } catch (err) {
    host.innerHTML = renderErrorState('Týden zdraví se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
