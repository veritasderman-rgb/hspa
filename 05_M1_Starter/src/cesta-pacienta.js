// Frontend logika stránky cesta-pacienta.html.
// Načítá data/cesta-pacienta.json a renderuje:
//   1) univerzální páteř cesty (fáze) jako horizontální stepper
//   2) přepínač diagnóz (chips)
//   3) detail zvolené diagnózy — fáze jako vertikální timeline + kredity autorů
//
// Obsah je HSPA adaptací infografik série „Cesta pacienta" (Hlas pacientů +
// LINKOS / ČOS ČLS JEP). Původní autoři a garanti jsou uvedeni u každé diagnózy.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderFooter, injectScrollToTop, escapeHtml } from './page-shared.js';

const DATA_URL = 'data/cesta-pacienta.json';

function esc(s) { return escapeHtml(String(s ?? '')); }

function getInitialDiseaseId(diseases) {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('d');
  if (q && diseases.some(d => d.id === q)) return q;
  return diseases[0]?.id;
}

function renderSpine(phases) {
  const nodes = phases.map((p, i) => `
    <li class="cp-spine-node">
      <span class="cp-spine-icon" aria-hidden="true">${esc(p.icon)}</span>
      <span class="cp-spine-label">${esc(p.label)}</span>
      <span class="cp-spine-hspa">${esc(p.hspa)}</span>
      <span class="cp-spine-desc">${esc(p.desc)}</span>
    </li>${i < phases.length - 1 ? '<li class="cp-spine-arrow" aria-hidden="true">→</li>' : ''}
  `).join('');
  return `
    <section class="cp-spine-section" aria-labelledby="cpSpineH">
      <h3 class="cp-section-h" id="cpSpineH">Univerzální páteř cesty</h3>
      <ol class="cp-spine">${nodes}</ol>
    </section>`;
}

function renderPicker(diseases, activeId) {
  const chips = diseases.map(d => `
    <button type="button" class="cp-chip${d.id === activeId ? ' cp-chip-active' : ''}"
            data-disease="${esc(d.id)}" aria-pressed="${d.id === activeId ? 'true' : 'false'}">
      <span class="cp-chip-icon" aria-hidden="true">${esc(d.icon)}</span>
      <span class="cp-chip-label">${esc(d.short)}</span>
    </button>`).join('');
  return `
    <section class="cp-picker-section" aria-labelledby="cpPickerH">
      <h3 class="cp-section-h" id="cpPickerH">Vyberte diagnózu</h3>
      <div class="cp-picker" role="group" aria-label="Výběr diagnózy">${chips}</div>
    </section>`;
}

function indicatorLinks(ids) {
  if (!Array.isArray(ids) || !ids.length) return '';
  const links = ids.map(id => `<a class="cp-ind-link" href="indicator.html?id=${esc(id)}">${esc(id)}</a>`).join('');
  return `<p class="cp-ind-links"><span class="cp-ind-lead">Související indikátory:</span> ${links}</p>`;
}

function renderPhases(disease, phases) {
  return phases.map(p => {
    const items = (disease.phases && disease.phases[p.id]) || [];
    if (!items.length) return '';
    const lis = items.map(t => `<li>${esc(t)}</li>`).join('');
    return `
      <li class="cp-phase">
        <div class="cp-phase-head">
          <span class="cp-phase-icon" aria-hidden="true">${esc(p.icon)}</span>
          <div class="cp-phase-titles">
            <h4 class="cp-phase-label">${esc(p.label)}</h4>
            <span class="cp-phase-hspa">${esc(p.hspa)}</span>
          </div>
        </div>
        <ul class="cp-phase-list">${lis}</ul>
      </li>`;
  }).join('');
}

function renderCredits(disease) {
  const a = disease.authors || {};
  const block = (title, arr) => arr && arr.length
    ? `<div class="cp-credit-row"><span class="cp-credit-k">${esc(title)}</span><span class="cp-credit-v">${arr.map(esc).join(' · ')}</span></div>` : '';
  const links = (a.odkazy || []).map(l => `<a href="${esc(l.url)}" rel="noreferrer">${esc(l.label)}</a>`).join(' · ');
  const orig = a.original_pdf
    ? `<div class="cp-credit-row"><span class="cp-credit-k">Originál</span><span class="cp-credit-v"><a href="${esc(a.original_pdf)}" rel="noreferrer">Cesta pacienta — PDF</a></span></div>` : '';
  return `
    <aside class="cp-credits" aria-label="Zdroj a autoři">
      <h4 class="cp-credits-h">Zdroj a autoři</h4>
      ${block('Pacientská organizace', a.organizace)}
      ${block('Odborní garanti', a.garanti)}
      ${links ? `<div class="cp-credit-row"><span class="cp-credit-k">Odkazy</span><span class="cp-credit-v">${links}</span></div>` : ''}
      ${orig}
      <p class="cp-credits-note">HSPA adaptace infografiky ze série „Cesta pacienta" (Hlas pacientů · LINKOS / ČOS ČLS JEP). Tato stránka originál nenahrazuje.</p>
    </aside>`;
}

function renderDisease(disease, phases) {
  return `
    <article class="cp-disease" aria-labelledby="cpDisH">
      <header class="cp-disease-head">
        <span class="cp-disease-icon" aria-hidden="true">${esc(disease.icon)}</span>
        <div>
          <div class="cp-disease-tag">${esc(disease.tag)}</div>
          <h3 class="cp-disease-name" id="cpDisH">${esc(disease.name)}</h3>
        </div>
      </header>
      <p class="cp-disease-summary">${esc(disease.summary)}</p>
      ${indicatorLinks(disease.linked_indicators)}
      <ol class="cp-phases">${renderPhases(disease, phases)}</ol>
      ${renderCredits(disease)}
    </article>`;
}

function renderObecna(o) {
  if (!o || !Array.isArray(o.items)) return '';
  const lis = o.items.map(t => `<li>${esc(t)}</li>`).join('');
  return `
    <section class="cp-obecna" aria-labelledby="cpObecnaH">
      <h3 class="cp-section-h" id="cpObecnaH">${esc(o.title)}</h3>
      <ul class="cp-obecna-list">${lis}</ul>
      ${o.source ? `<p class="cp-source-note">${esc(o.source)}</p>` : ''}
    </section>`;
}

function renderSourceFooter(data) {
  const links = (data.source_links || []).map(l => `<a href="${esc(l.url)}" rel="noreferrer">${esc(l.label)}</a>`).join(' · ');
  return `
    <section class="cp-source" aria-labelledby="cpSourceH">
      <h3 class="cp-section-h" id="cpSourceH">O této stránce</h3>
      <p class="cp-source-note">${esc(data.source_note)}</p>
      ${links ? `<p class="cp-source-links">${links}</p>` : ''}
    </section>`;
}

function selectDisease(data, id) {
  const disease = data.diseases.find(d => d.id === id) || data.diseases[0];
  const detail = document.getElementById('cpDiseaseDetail');
  if (detail) detail.innerHTML = renderDisease(disease, data.phases);
  document.querySelectorAll('.cp-chip').forEach(btn => {
    const active = btn.dataset.disease === disease.id;
    btn.classList.toggle('cp-chip-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  const params = new URLSearchParams(window.location.search);
  params.set('d', disease.id);
  history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
}

async function init() {
  renderModuleNav('cesta-pacienta');
  renderMastheadDate();
  renderFooter();
  injectScrollToTop();

  const app = document.getElementById('cpApp');
  if (!app) return;

  let data;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    app.innerHTML = `<p class="cp-error">Nepodařilo se načíst data cesty pacienta. Originální materiály najdete na <a href="https://www.hlaspacientu.cz">hlaspacientu.cz</a>.</p>`;
    return;
  }

  const activeId = getInitialDiseaseId(data.diseases);
  app.innerHTML = `
    ${renderSpine(data.phases)}
    ${renderPicker(data.diseases, activeId)}
    <div id="cpDiseaseDetail"></div>
    ${renderObecna(data.obecna_doporuceni)}
    ${renderSourceFooter(data)}
  `;

  app.querySelectorAll('.cp-chip').forEach(btn => {
    btn.addEventListener('click', () => selectDisease(data, btn.dataset.disease));
  });

  selectDisease(data, activeId);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
