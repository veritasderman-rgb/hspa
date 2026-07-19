// Tři židle · Akt II — Rok ředitele nemocnice (reditel.html).
// Rozpočet modelové okresní nemocnice se odvodí z vyhlášky, kterou hráč
// podepsal v aktu I (hra na ministra); 4 kvartály rozhodnutí, personál
// a pacienti reagují podle doložených precedentů (Pelhřimov/Znojmo 2026).
// Data: data/reditel-hra.json; výpočet: src/reditel-engine.js.
// Modelová hra, ne predikce. Viz PLAN-TRI-ZIDLE.md.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, renderRelatedTools } from './page-shared.js';
import { budgetFromMinistr, verdict } from './reditel-engine.js';
import { loadState, saveAct } from './hra-stav.js';
import { renderCampaignStepper } from './hra-stepper.js';

let DOC = null;
let INDICATORS = new Map();
let MINISTR = null; // stav aktu I (nebo null → default vyhlášky)

const AXIS_TONE_LABEL = { good: 'v pořádku', mid: 'napjaté', bad: 'kritické' };
const WAIT_LABEL = {
  kratsi: 'kratší než dnes',
  stejne: 'zhruba jako dnes',
  delsi: 'delší než dnes',
};

function czNum(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return '—';
  return (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('cs-CZ', { maximumFractionDigits: d });
}

function currentDecisions() {
  const out = {};
  for (const d of DOC.decisions) {
    const checked = document.querySelector(`input[name="rd-${d.id}"]:checked`);
    if (checked) out[d.id] = checked.value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Render — handoff z aktu I
// ---------------------------------------------------------------------------

function renderHandoff() {
  const host = document.getElementById('rdHandoff');
  if (!host) return;
  const { growthPct, fromCampaign } = budgetFromMinistr(MINISTR, DOC.handoff);
  const base = DOC.hospital.baseline_budget_mil;
  const extra = base * (growthPct / 100);
  host.innerHTML = `
    <div class="rd-handoff ${fromCampaign ? 'rd-handoff-campaign' : ''}">
      <span class="rd-handoff-label">${fromCampaign ? 'Rozpočet z vaší vyhlášky (akt I)' : 'Rozpočet podle reálné vyhlášky'}</span>
      <span class="rd-handoff-value">${czNum(base, 0)} mil. Kč <span class="rd-handoff-growth">+${czNum(growthPct)} % (+${czNum(extra, 0)} mil.)</span></span>
      <p class="rd-handoff-note">${fromCampaign
        ? 'Růst úhrad, který jste jako ministr přidělili akutní a následné lůžkové péči, teď určuje váš rozpočet. Vlastní rozhodnutí shora — vaše omezení zdola.'
        : `Bez odehraného aktu I počítáme s růstem +${czNum(DOC.handoff.default_growth_pct)} % dle reálné vyhlášky. <a href="vyhlaska.html">Zahrajte si nejdřív na ministra</a> a rozpočet si podepište sami.`}</p>
    </div>`;
}

// ---------------------------------------------------------------------------
// Render — kvartály a rozhodnutí
// ---------------------------------------------------------------------------

function renderDecisions() {
  const host = document.getElementById('rdDecisionsList');
  if (!host) return;
  const quarters = [1, 2, 3, 4];
  host.innerHTML = quarters.map(q => `
    <div class="rd-quarter">
      <h3 class="rd-quarter-h">${q}. kvartál</h3>
      ${DOC.decisions.filter(d => d.quarter === q).map(renderDecision).join('')}
    </div>`).join('');
}

function renderDecision(d) {
  const id = escapeHtml(d.id);
  const chips = (d.indicator_links || []).map(ind => {
    const meta = INDICATORS.get(ind);
    return `<a class="rd-ind-chip" href="indicator.html?id=${encodeURIComponent(ind)}">${escapeHtml(meta?.name || ind)}</a>`;
  }).join('');
  return `
    <fieldset class="rd-decision" data-decision-id="${id}">
      <legend class="rd-decision-label">${escapeHtml(d.label)}</legend>
      <p class="rd-decision-q">${escapeHtml(d.question)}</p>
      <p class="rd-decision-context">${escapeHtml(d.context)} <span class="rd-decision-src">(${escapeHtml(d.context_source)})</span></p>
      <div class="rd-options">
        ${d.options.map(o => `
          <label class="rd-option">
            <input type="radio" name="rd-${id}" value="${escapeHtml(o.id)}">
            <span class="rd-option-body">
              <span class="rd-option-head">
                <span class="rd-option-label">${escapeHtml(o.label)}</span>
                <span class="rd-option-cost ${o.cost_mil > 0 ? 'rd-cost-spend' : o.cost_mil < 0 ? 'rd-cost-save' : ''}">${o.cost_mil > 0 ? `−${czNum(o.cost_mil, 0)} mil.` : o.cost_mil < 0 ? `+${czNum(-o.cost_mil, 0)} mil.` : 'zdarma'}</span>
              </span>
              <span class="rd-option-note">${escapeHtml(o.note)}</span>
            </span>
          </label>`).join('')}
      </div>
      ${chips ? `<p class="rd-ind-row">Souvisí: ${chips}</p>` : ''}
    </fieldset>`;
}

// ---------------------------------------------------------------------------
// Render — výsledky roku
// ---------------------------------------------------------------------------

function renderResults(decisions) {
  const host = document.getElementById('rdResultsList');
  if (!host) return;
  const v = verdict(DOC, decisions, MINISTR);
  const p = v.projection;

  const projHtml = `
    <div class="rd-block">
      <h3 class="rd-block-h">Projekce roku</h3>
      <table class="rd-proj" aria-label="Roční bilance nemocnice">
        <tr><td>Růst úhrad (+${czNum(v.growthPct)} %)</td><td class="rd-num rd-plus">+${czNum(p.revenue_growth_mil, 0)} mil.</td></tr>
        <tr><td>Nákladový drift (mzdy ~+${czNum(DOC.hospital.personnel_drift_pct, 0)} %, věcné ~+${czNum(DOC.hospital.other_drift_pct, 0)} %)</td><td class="rd-num rd-minus">−${czNum(p.cost_drift_mil, 0)} mil.</td></tr>
        <tr><td>Strukturální deficit</td><td class="rd-num rd-minus">−${czNum(p.structural_mil, 0)} mil.</td></tr>
        <tr><td>Vaše rozhodnutí (${v.answered}/${v.total})</td><td class="rd-num">${czNum(p.balance_mil - v.axes.hospodareni, 0) === '0' ? '±0' : (v.axes.hospodareni < p.balance_mil ? '−' : '+') + czNum(Math.abs(v.axes.hospodareni - p.balance_mil), 0)} mil.</td></tr>
      </table>
    </div>`;

  const axesHtml = `
    <div class="rd-block">
      <h3 class="rd-block-h">Tři osy vašeho roku</h3>
      ${DOC.axes.map(a => {
        const val = v.axes[a.id];
        const tone = v.tones[a.id];
        const shown = a.id === 'hospodareni' ? `${val > 0 ? '+' : ''}${czNum(val, 0)} mil. Kč` : `${val > 0 ? '+' : ''}${val}`;
        return `<div class="rd-axis rd-tone-${tone}">
          <span class="rd-axis-label">${escapeHtml(a.label)}</span>
          <span class="rd-axis-val">${shown}</span>
          <span class="rd-axis-tone">${AXIS_TONE_LABEL[tone]}</span>
        </div>`;
      }).join('')}
      <p class="rd-note">${v.complete ? '' : `Zbývá rozhodnout ${v.total - v.answered} z ${v.total} situací — verdikt se průběžně přepočítává.`}</p>
    </div>`;

  const reactionsHtml = `
    <div class="rd-block">
      <h3 class="rd-block-h">Jak nemocnice reaguje</h3>
      ${v.reactions.length ? v.reactions.map(r => `
        <div class="rd-reaction rd-reaction-${r.axis}">
          <strong>${escapeHtml(r.label)}.</strong> ${escapeHtml(r.desc)}
          <span class="rd-reaction-src">Precedent: ${escapeHtml(r.precedent_source)}</span>
        </div>`).join('') : '<p class="rd-note">Zatím klid — žádný práh nespuštěn. Reakce mají doložené precedenty, ne náhodu.</p>'}
    </div>`;

  const ctaHtml = v.complete ? `
    <div class="rd-block rd-campaign-cta">
      <h3 class="rd-block-h">Kampaň Tři židle</h3>
      <p class="rd-note">Rok máte za sebou. Objednací doby ve vaší nemocnici budou <strong>${WAIT_LABEL[v.waiting]}</strong> —
        a přesně do téhle čekárny teď vstoupí pacient.</p>
      <a class="rd-campaign-link" href="pribeh-pacienta.html">Pokračovat jako pacient →</a>
    </div>` : '';

  host.innerHTML = projHtml + axesHtml + reactionsHtml + ctaHtml;

  if (v.answered > 0) {
    saveAct('reditel', {
      decisions,
      verdict: { axes: v.axes, tones: v.tones, waiting: v.waiting, complete: v.complete },
    });
  }
}

function renderSources() {
  const host = document.getElementById('rdSources');
  if (!host) return;
  const seen = new Set();
  const items = [];
  const push = (s) => { if (s && !seen.has(s)) { seen.add(s); items.push(s); } };
  const h = DOC.hospital;
  [h.profile_source, h.baseline_budget_source, h.structural_deficit_source,
    h.personnel_share_source, h.personnel_drift_source, h.other_drift_source,
    DOC.handoff.weights_source, DOC.handoff.default_growth_source, DOC.handoff.demand_ref_source].forEach(push);
  for (const d of DOC.decisions) push(d.context_source);
  for (const r of DOC.reactions) push(r.precedent_source);
  host.innerHTML = items.map(s => `<li>${escapeHtml(s)}</li>`).join('');
}

// ---------------------------------------------------------------------------
// Wiring + bootstrap
// ---------------------------------------------------------------------------

function refresh() {
  renderResults(currentDecisions());
  renderCampaignStepper('reditel');
}

async function init() {
  renderModuleNav('financing');
  renderMastheadDate();
  renderRelatedTools('tri-zidle');

  const host = document.getElementById('rdDecisionsList');
  if (!host) return;
  try {
    const [doc, inds] = await Promise.all([
      fetch('data/reditel-hra.json').then(r => r.json()),
      fetch('data/indicators.json').then(r => r.json()),
    ]);
    DOC = doc;
    INDICATORS = new Map((inds.indicators ?? []).map(i => [i.id, i]));
    MINISTR = loadState().ministr;

    renderHandoff();
    renderDecisions();
    renderSources();

    // obnova dříve uložených rozhodnutí (návrat na stránku v rámci kampaně)
    const savedDecisions = loadState().reditel?.decisions || {};
    for (const [dId, optId] of Object.entries(savedDecisions)) {
      const input = document.querySelector(`input[name="rd-${CSS.escape(dId)}"][value="${CSS.escape(optId)}"]`);
      if (input) input.checked = true;
    }
    refresh();

    const form = document.getElementById('rdControls');
    form.addEventListener('input', refresh);
    form.addEventListener('reset', () => setTimeout(refresh, 0));
  } catch (err) {
    host.innerHTML = renderErrorState('Hru se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
