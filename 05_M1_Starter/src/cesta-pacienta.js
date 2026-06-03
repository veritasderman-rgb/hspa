// Frontend logika stránky cesta-pacienta.html.
// Načítá data/cesta-pacienta.json a renderuje cestu pacienta systémem
// pomocí zavedených komponent designsystému (.av-flow, .av-timeline, .chip).
//
// Grafika: profesionální inline SVG ikony (line, currentColor) — žádné emoji.
// Obsah je HSPA adaptací série „Cesta pacienta" (Hlas pacientů + LINKOS /
// ČOS ČLS JEP); původní autoři a garanti jsou uvedeni u každé diagnózy.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, renderFooter, injectScrollToTop, escapeHtml } from './page-shared.js';

const DATA_URL = 'data/cesta-pacienta.json';

function esc(s) { return escapeHtml(String(s ?? '')); }

// --- SVG ikon-set (24×24, stroke currentColor) -------------------------
const SVG = (body, cls = 'cp-icon') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true" focusable="false">${body}</svg>`;

const PHASE_ICONS = {
  prevence: SVG('<path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>'),
  priznaky: SVG('<path d="M12 4l9 15H3l9-15z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="16.6" x2="12" y2="16.7"/>'),
  diagnostika: SVG('<circle cx="11" cy="11" r="6"/><line x1="20" y1="20" x2="15.6" y2="15.6"/>'),
  lecba: SVG('<rect x="4" y="4" width="16" height="16" rx="3.5"/><line x1="12" y1="8.5" x2="12" y2="15.5"/><line x1="8.5" y1="12" x2="15.5" y2="12"/>'),
  sledovani: SVG('<path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L20 9"/><path d="M20 4.5V9h-4.5"/><path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4 15"/><path d="M4 19.5V15h4.5"/>'),
};

const DISEASE_ICONS = {
  prs: SVG('<circle cx="12" cy="13.5" r="7"/><circle cx="12" cy="13.5" r="1.6"/>'),
  kolorektum: SVG('<path d="M7 4v5a4 4 0 0 0 4 4 3 3 0 0 1 0 6H6"/><path d="M7 4h3"/>'),
  'delozni-hrdlo': SVG('<path d="M7.5 4c0 2.6 1.5 3.4-1 6.5M16.5 4c0 2.6-1.5 3.4 1 6.5"/><path d="M6.5 10.5a5.5 5.5 0 0 0 11 0"/><line x1="12" y1="16" x2="12" y2="20.5"/>'),
  'delozni-sliznice': SVG('<path d="M7.5 4.5c0 2.5 1.4 3.3-1 6.2M16.5 4.5c0 2.5-1.4 3.3 1 6.2"/><path d="M6.5 10.5a5.5 5.5 0 0 0 11 0z"/><line x1="12" y1="16" x2="12" y2="20.5"/>'),
  prostata: SVG('<circle cx="12" cy="14" r="5.5"/><path d="M12 8.5V4"/><path d="M9.5 4h5"/>'),
  lymfom: SVG('<circle cx="7.5" cy="8" r="2.6"/><circle cx="16" cy="9" r="2.6"/><circle cx="11.5" cy="16" r="2.6"/><line x1="9.4" y1="9.6" x2="13.6" y2="14.4"/><line x1="14.2" y1="11" x2="12.7" y2="14"/>'),
  oko: SVG('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
};

function phaseIcon(id) { return PHASE_ICONS[id] || ''; }
function diseaseIcon(id) { return DISEASE_ICONS[id] || PHASE_ICONS.diagnostika; }

// --- render bloky -------------------------------------------------------
function getInitialDiseaseId(diseases) {
  const q = new URLSearchParams(window.location.search).get('d');
  return (q && diseases.some(d => d.id === q)) ? q : diseases[0]?.id;
}

function renderSpine(phases) {
  const steps = phases.map(p => {
    const isPrev = p.id === 'prevence';
    return `
    <li class="av-flow-step cp-flow-step${isPrev ? ' cp-flow-step-prevence' : ''}">
      <span class="cp-flow-icon">${phaseIcon(p.id)}</span>
      <span class="av-flow-num"></span>
      <h3 class="av-flow-title">${esc(p.label)}${isPrev ? ' <span class="cp-prev-badge">začíná u vás</span>' : ''}</h3>
      <p class="av-flow-desc">${esc(p.desc)}</p>
      <span class="av-flow-tag">${esc(p.hspa)}</span>
      ${isPrev ? '<a class="cp-prev-link" href="prevence.html">Co s tím můžu dělat já →</a>' : ''}
    </li>`;
  }).join('');
  return `
    <section class="cp-section" aria-labelledby="cpSpineH">
      <h3 class="cp-section-h" id="cpSpineH">Univerzální páteř cesty</h3>
      <p class="cp-section-lead">U většiny onkologických diagnóz je posloupnost stejná. U konkrétní diagnózy se liší jednotlivé kroky uvnitř fází.</p>
      <ol class="av-flow cp-spine">${steps}</ol>
    </section>`;
}

function renderPreventionCTA() {
  return `
    <section class="cp-prevent-cta" aria-labelledby="cpPreventH">
      <div class="cp-prevent-cta-body">
        <h3 class="cp-prevent-cta-h" id="cpPreventH">Nejúčinnější část cesty je z velké části ve vašich rukou</h3>
        <p class="cp-prevent-cta-text">Většina kroků níže patří lékařům a systému. Ale <strong>prevence a včasný záchyt</strong> — zdravý životní styl, očkování a hlavně účast ve screeningu — rozhodují o tom, jestli se na pozdější fáze cesty vůbec dostanete.</p>
      </div>
      <a class="cp-prevent-cta-btn" href="prevence.html">Co s tím můžu dělat já →</a>
    </section>`;
}

function renderRelated() {
  const cards = [
    { href: 'prevence.html', kicker: 'Prevence v praxi', title: 'Co s tím můžu dělat já', desc: 'Konkrétní kroky — životní styl, očkování, screening. Kde máte reálnou páku a týdenní startovací balíček.' },
    { href: 'hspa-prehled.html', kicker: '80 indikátorů systému', title: 'HSPA přehled', desc: 'Screening, vakcinace a výsledky onkologické péče v datovém rámci HSPA.' },
    { href: 'strategie.html', kicker: 'Národní cíle 2030/2035', title: 'Strategie', desc: 'Co stát plánuje pro screening, včasný záchyt a snížení rizikových faktorů.' },
  ].map(c => `
    <a class="related-card" href="${c.href}">
      <div class="related-card-kicker">${esc(c.kicker)}</div>
      <h4 class="related-card-title">${esc(c.title)}</h4>
      <p class="related-card-desc">${esc(c.desc)}</p>
      <span class="related-card-arrow" aria-hidden="true">→</span>
    </a>`).join('');
  return `
    <section class="section related-section cp-section" aria-labelledby="cpRelH">
      <div class="section-title"><h3 id="cpRelH">Příbuzné sekce</h3></div>
      <div class="related-grid">${cards}</div>
    </section>`;
}

function renderPicker(diseases, activeId) {
  const chips = diseases.map(d => `
    <button type="button" class="cp-chip${d.id === activeId ? ' cp-chip-active' : ''}" data-disease="${esc(d.id)}" aria-pressed="${d.id === activeId}">
      <span class="cp-chip-icon">${diseaseIcon(d.id)}</span>${esc(d.short)}
    </button>`).join('');
  return `
    <section class="cp-section" aria-labelledby="cpPickerH">
      <h3 class="cp-section-h" id="cpPickerH">Vyberte diagnózu</h3>
      <div class="cp-picker" role="group" aria-label="Výběr diagnózy">${chips}</div>
    </section>`;
}

function indicatorLinks(ids) {
  if (!Array.isArray(ids) || !ids.length) return '';
  const links = ids.map(id => `<a class="chip chip-strategy" href="indicator.html?id=${esc(id)}">${esc(id)}</a>`).join('');
  return `<p class="cp-ind-links"><span class="cp-ind-lead">Související indikátory:</span></p><div class="chip-row">${links}</div>`;
}

function renderPhases(disease, phases) {
  return phases.map(p => {
    const items = (disease.phases && disease.phases[p.id]) || [];
    if (!items.length) return '';
    const lis = items.map(t => `<li>${esc(t)}</li>`).join('');
    const isPrev = p.id === 'prevence';
    const prevCta = isPrev ? '<p class="cp-phase-cta"><a href="prevence.html">Co můžete udělat vy → Co s tím můžu dělat já</a></p>' : '';
    return `
      <li class="av-timeline-item ${isPrev ? 'av-timeline-item-now' : 'av-timeline-item-done'} cp-phase">
        <span class="av-timeline-date"><span class="cp-phase-icon">${phaseIcon(p.id)}</span>${esc(p.label)}</span>
        <span class="cp-phase-hspa">${esc(p.hspa)}</span>
        <ul class="cp-phase-list">${lis}</ul>
        ${prevCta}
      </li>`;
  }).join('');
}

function renderCredits(disease) {
  const a = disease.authors || {};
  const row = (k, arr) => arr && arr.length
    ? `<div class="cp-credit-row"><span class="cp-credit-k">${esc(k)}</span><span class="cp-credit-v">${arr.map(esc).join(' · ')}</span></div>` : '';
  const links = (a.odkazy || []).map(l => `<a href="${esc(l.url)}" rel="noreferrer">${esc(l.label)}</a>`).join(' · ');
  const orig = a.original_pdf
    ? `<div class="cp-credit-row"><span class="cp-credit-k">Originál</span><span class="cp-credit-v"><a href="${esc(a.original_pdf)}" rel="noreferrer">Cesta pacienta — PDF</a></span></div>` : '';
  return `
    <aside class="cp-credits" aria-label="Zdroj a autoři">
      <h4 class="cp-credits-h">Zdroj a autoři</h4>
      ${row('Pacientská organizace', a.organizace)}
      ${row('Odborní garanti', a.garanti)}
      ${links ? `<div class="cp-credit-row"><span class="cp-credit-k">Odkazy</span><span class="cp-credit-v">${links}</span></div>` : ''}
      ${orig}
      <p class="cp-credits-note">HSPA adaptace infografiky ze série „Cesta pacienta" (Hlas pacientů · LINKOS / ČOS ČLS JEP). Tato stránka originál nenahrazuje.</p>
    </aside>`;
}

function renderDisease(disease, phases) {
  return `
    <article class="cp-disease" aria-labelledby="cpDisH">
      <header class="cp-disease-head">
        <span class="cp-disease-icon">${diseaseIcon(disease.id)}</span>
        <div>
          <div class="cp-disease-tag">${esc(disease.tag)}</div>
          <h3 class="cp-disease-name" id="cpDisH">${esc(disease.name)}</h3>
        </div>
      </header>
      <p class="cp-disease-summary">${esc(disease.summary)}</p>
      ${indicatorLinks(disease.linked_indicators)}
      <ol class="av-timeline cp-phases">${renderPhases(disease, phases)}</ol>
      ${renderCredits(disease)}
    </article>`;
}

function renderObecna(o) {
  if (!o || !Array.isArray(o.items)) return '';
  const lis = o.items.map(t => `<li>${esc(t)}</li>`).join('');
  return `
    <section class="cp-section cp-obecna" aria-labelledby="cpObecnaH">
      <h3 class="cp-section-h" id="cpObecnaH">${esc(o.title)}</h3>
      <ul class="cp-obecna-list">${lis}</ul>
      <p class="cp-obecna-cta"><a href="prevence.html">Podrobný plán prevence, týdenní startovací balíček a kontakty → Co s tím můžu dělat já</a></p>
      ${o.source ? `<p class="cp-source-note">${esc(o.source)}</p>` : ''}
    </section>`;
}

function renderSourceFooter(data) {
  const links = (data.source_links || []).map(l => `<a href="${esc(l.url)}" rel="noreferrer">${esc(l.label)}</a>`).join(' · ');
  return `
    <section class="cp-section cp-source" aria-labelledby="cpSourceH">
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
    btn.setAttribute('aria-pressed', String(active));
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
    ${renderPreventionCTA()}
    ${renderPicker(data.diseases, activeId)}
    <div id="cpDiseaseDetail"></div>
    ${renderObecna(data.obecna_doporuceni)}
    ${renderRelated()}
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
