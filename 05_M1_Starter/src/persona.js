// Persona minihomepage (pro-*.html). Tenký HTML shell nese jen
// <body data-persona="pacient"> + statický nadpis (SEO/GA4); zbytek plní tento
// modul z data/personas.json (jeden zdroj pravdy) + kontraktu indikátorů,
// článků a tematických linií.
//
// Skladba stránky: persona hero → nástroje → pás klíčových indikátorů
// (buildTakeaway verdikt místo surového čísla) → články filtrované dle topics
// → odkazy na tematické linie → křížové odkazy na ostatní persony.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, isArticleVisible } from './page-shared.js';
import { buildTakeaway, sparklineSvg } from './indicator-takeaway.js';

const PERSONAS_URL = 'data/personas.json';
const INDICATORS_URL = 'data/indicators.json';
const ARTICLES_URL = 'data/articles.json';
const THEMES_URL = 'data/themes.json';

const MAX_ARTICLES = 4;

async function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav('');
  renderMastheadDate();

  const personaId = document.body?.dataset?.persona;
  const root = document.getElementById('personaRoot');
  if (!root) return;
  if (!personaId) {
    root.innerHTML = '<div class="status error">Chybí <code>data-persona</code> na &lt;body&gt;.</div>';
    return;
  }

  try {
    const [personasData, indData, artData, themesData] = await Promise.all([
      fetch(PERSONAS_URL).then(r => r.json()),
      fetch(INDICATORS_URL).then(r => r.json()),
      fetch(ARTICLES_URL).then(r => r.ok ? r.json() : { articles: [] }).catch(() => ({ articles: [] })),
      fetch(THEMES_URL).then(r => r.ok ? r.json() : { themes: [] }).catch(() => ({ themes: [] })),
    ]);

    const persona = (personasData.personas ?? []).find(p => p.id === personaId);
    if (!persona) {
      root.innerHTML = `<div class="status error">Persona <code>${escapeHtml(personaId)}</code> není v personas.json.</div>`;
      return;
    }
    const others = (personasData.personas ?? []).filter(p => p.id !== personaId);
    const indById = new Map((indData.indicators ?? []).map(i => [i.id, i]));
    // Pozn.: NE .filter(isArticleVisible) — filter předává i index jako 2. arg
    // (isArticleVisible(article, now)), což by rozbilo now.getTime().
    const articles = (artData.articles ?? []).filter(a => isArticleVisible(a));
    const themes = themesData.themes ?? [];

    document.title = `${persona.hero.headline} · HSPA Monitor`;
    root.innerHTML = renderPersonaPage(persona, { indById, articles, themes, others });
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="status error">Nepodařilo se načíst data: ${escapeHtml(err.message)}.</div>`;
  }
}

/**
 * Čisté sestavení HTML minihomepage (bez fetch/DOM side-effektů) — testovatelné.
 *
 * @param {object} persona — záznam z personas.json
 * @param {{indById: Map, articles: Array, themes: Array, others: Array}} ctx
 * @returns {string}
 */
export function renderPersonaPage(persona, ctx) {
  const { indById, articles, themes, others } = ctx;
  return [
    renderHero(persona),
    renderTools(persona),
    renderIndicators(persona, indById),
    renderArticles(persona, articles),
    renderThemes(persona, themes),
    renderCrossLinks(others),
  ].filter(Boolean).join('\n');
}

function renderHero(p) {
  return `
    <header class="persona-hero">
      <a class="persona-back" href="index.html">← Domů</a>
      <div class="ed-kicker">${escapeHtml(p.hero.kicker)}</div>
      <h1 class="persona-hero-h">${escapeHtml(p.hero.headline)}</h1>
      <p class="persona-hero-lead">${escapeHtml(p.hero.lead)}</p>
    </header>`;
}

function renderTools(p) {
  const cards = (p.tools ?? []).map(t => `
    <li class="persona-tool">
      <a href="${escapeHtml(t.href)}">
        <span class="persona-tool-h">${escapeHtml(t.title)}</span>
        <span class="persona-tool-desc">${escapeHtml(t.desc)}</span>
        <span class="persona-tool-arrow" aria-hidden="true">→</span>
      </a>
    </li>`).join('');
  return `
    <section class="persona-section" aria-labelledby="pToolsH">
      <h2 class="persona-section-h" id="pToolsH">Začněte tady</h2>
      <ul class="persona-tools-grid">${cards}</ul>
    </section>`;
}

function renderIndicators(p, indById) {
  const cards = (p.indicator_ids ?? []).map(id => {
    const ind = indById.get(id);
    if (!ind) return '';
    const t = buildTakeaway(ind);
    const spark = sparklineSvg(ind.trend, ind.signal);
    return `
      <li class="persona-ind ind-takeaway-${escapeHtml(t.tone)}">
        <a href="indicator.html?id=${encodeURIComponent(id)}">
          <span class="persona-ind-name">${escapeHtml(ind.name)}${spark ? `<span class="persona-ind-spark">${spark}</span>` : ''}</span>
          <span class="persona-ind-take">${escapeHtml(t.text)}</span>
        </a>
      </li>`;
  }).filter(Boolean).join('');
  if (!cards) return '';
  return `
    <section class="persona-section" aria-labelledby="pIndH">
      <h2 class="persona-section-h" id="pIndH">Čísla, která vás zajímají</h2>
      <ul class="persona-ind-grid">${cards}</ul>
    </section>`;
}

function renderArticles(p, articles) {
  const topics = new Set(p.topics ?? []);
  const matching = articles
    .filter(a => (a.topics ?? []).some(t => topics.has(t)))
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    .slice(0, MAX_ARTICLES);
  if (!matching.length) return '';
  const cards = matching.map(a => `
    <li class="persona-article">
      <a href="${escapeHtml(a.slug)}">
        ${a.tag ? `<span class="persona-article-tag">${escapeHtml(a.tag)}</span>` : ''}
        <span class="persona-article-h">${escapeHtml(a.title)}</span>
        ${a.perex ? `<span class="persona-article-perex">${escapeHtml(a.perex)}</span>` : ''}
      </a>
    </li>`).join('');
  return `
    <section class="persona-section" aria-labelledby="pArtH">
      <div class="persona-section-head">
        <h2 class="persona-section-h" id="pArtH">Články pro vás</h2>
        <a class="persona-section-all" href="clanky.html">Všechny články →</a>
      </div>
      <ul class="persona-articles-grid">${cards}</ul>
    </section>`;
}

function renderThemes(p, themes) {
  const byId = new Map(themes.map(t => [t.id, t]));
  const cards = (p.theme_ids ?? []).map(id => {
    const th = byId.get(id);
    if (!th) return '';
    return `
      <li class="persona-theme">
        <a href="tematicke-linie.html?id=${encodeURIComponent(id)}">
          <span class="persona-theme-kicker">${escapeHtml(th.kicker ?? 'Tematická linie')}</span>
          <span class="persona-theme-h">${escapeHtml(th.title)}</span>
          <span class="persona-theme-arrow" aria-hidden="true">→</span>
        </a>
      </li>`;
  }).filter(Boolean).join('');
  if (!cards) return '';
  return `
    <section class="persona-section" aria-labelledby="pThH">
      <h2 class="persona-section-h" id="pThH">Série, které stojí za přečtení</h2>
      <ul class="persona-themes-grid">${cards}</ul>
    </section>`;
}

function renderCrossLinks(others) {
  if (!others?.length) return '';
  const links = others.map(o =>
    `<a class="persona-cross-link" href="pro-${escapeHtml(o.slug)}.html"><span>${escapeHtml(o.label)}</span><span class="persona-cross-title">${escapeHtml(o.card_title)}</span></a>`
  ).join('');
  return `
    <section class="persona-section persona-cross" aria-labelledby="pCrossH">
      <h2 class="persona-section-h" id="pCrossH">Díváte se odjinud?</h2>
      <div class="persona-cross-grid">${links}</div>
    </section>`;
}

if (typeof window !== 'undefined') init();
