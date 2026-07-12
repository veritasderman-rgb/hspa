// Simulátor pák (simulator.html) — kvantitativní what-if vrstva nad Modelem
// systému. Data: data/levers.json (páky + efekty + zdroje), živé hodnoty:
// data/indicators.json. Výpočet: src/levers-engine.js (čistý, testovaný).
//
// VŠE je ilustrativní modelový odhad dle citované evidence, NE predikce.
// Viz PLAN-SIMULATOR-PAK.md.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, renderRelatedTools } from './page-shared.js';
import { simulateLever } from './levers-engine.js';

let LEVERS = [];
let INDICATORS = new Map();

const STRENGTH_LABEL = { weak: 'slabě', medium: 'středně', strong: 'silně' };

// ---------------------------------------------------------------------------
// Pure helpery (formát, favorabilita) — testovatelné bez DOM
// ---------------------------------------------------------------------------

/** České formátování čísla (desetinná čárka, max 2 místa). */
export function czNum(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  const r = Math.round(v * 100) / 100;
  return r.toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
}

/**
 * Je projektovaný posun pro indikátor příznivý? Vrací 'good' | 'bad' | null
 * podle směru indikátoru (higher_is_better / lower_is_better).
 */
export function favorability(polarity, direction) {
  if (!polarity || polarity === 'flat') return null;
  if (direction === 'higher_is_better') return polarity === 'up' ? 'good' : 'bad';
  if (direction === 'lower_is_better') return polarity === 'up' ? 'bad' : 'good';
  return null;
}

/** Aktuální hodnota páky z DOM (slider → number, toggle → 0/1). */
function leverValue(lever) {
  const el = document.getElementById(`lever-${lever.id}`);
  if (!el) return 0;
  if (lever.control?.type === 'toggle') return el.checked ? 1 : 0;
  return Number(el.value) || 0;
}

/** Popisný text hodnoty páky pro <output> + aria-valuetext. */
function leverValueText(lever, value) {
  if (lever.control?.type === 'toggle') {
    return value ? (lever.control.unit || 'zapnuto') : 'vypnuto';
  }
  if (!value) return 'beze změny';
  const unit = lever.control?.unit ? ` ${lever.control.unit}` : '';
  return `+${czNum(value)}${unit}`;
}

// ---------------------------------------------------------------------------
// Render — ovládací prvky
// ---------------------------------------------------------------------------

function renderControls() {
  const host = document.getElementById('simLeversList');
  if (!host) return;
  host.innerHTML = LEVERS.map(renderLever).join('');
}

function renderLever(lever) {
  const id = escapeHtml(lever.id);
  const descId = `desc-${id}`;
  const outId = `out-${id}`;
  const c = lever.control || {};
  const group = lever.group ? `<span class="sim-lever-group">${escapeHtml(lever.group)}</span>` : '';

  let controlHtml;
  if (c.type === 'toggle') {
    controlHtml = `
      <span class="sim-switch">
        <input type="checkbox" id="lever-${id}" class="sim-toggle" role="switch"
               aria-describedby="${descId}" aria-labelledby="lbl-${id}">
        <span class="sim-switch-track" aria-hidden="true"></span>
      </span>`;
  } else {
    controlHtml = `
      <input type="range" id="lever-${id}" class="sim-slider"
             min="${c.min}" max="${c.max}" step="${c.step}" value="${c.default ?? c.min ?? 0}"
             aria-describedby="${descId}" aria-labelledby="lbl-${id}"
             aria-valuetext="beze změny">`;
  }

  return `
    <div class="sim-lever" data-lever-id="${id}">
      <div class="sim-lever-head">
        ${group}
        <span class="sim-lever-label" id="lbl-${id}">${escapeHtml(lever.label)}</span>
      </div>
      <p class="sim-lever-desc" id="${descId}">${escapeHtml(lever.desc || '')}</p>
      <div class="sim-lever-control">
        ${controlHtml}
        <output class="sim-lever-value" id="${outId}" for="lever-${id}">${escapeHtml(leverValueText(lever, c.type === 'toggle' ? 0 : (c.default ?? 0)))}</output>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Render — výsledky (modelový dopad)
// ---------------------------------------------------------------------------

function renderResults() {
  const host = document.getElementById('simResultsList');
  if (!host) return;

  const active = LEVERS
    .map(l => ({ lever: l, value: leverValue(l) }))
    .filter(({ lever, value }) => (lever.control?.type === 'toggle' ? value === 1 : value > 0));

  if (!active.length) {
    host.innerHTML = `<p class="sim-empty">Zatáhněte za některou páku vlevo a tady se objeví modelový dopad na indikátory.</p>`;
    return;
  }

  host.innerHTML = active.map(({ lever, value }) => {
    const effects = simulateLever(lever, value, INDICATORS);
    const rows = effects.map(renderEffect).join('');
    return `
      <div class="sim-result-group">
        <h3 class="sim-result-lever">${escapeHtml(lever.label)}
          <span class="sim-result-setting">${escapeHtml(leverValueText(lever, value))}</span>
        </h3>
        <div class="sim-result-effects">${rows}</div>
      </div>`;
  }).join('');
}

function renderEffect(eff) {
  const ind = INDICATORS.get(eff.indicator);
  const name = ind?.name || eff.indicator;
  const unit = ind?.unit ? ` ${escapeHtml(ind.unit)}` : '';
  const dir = ind?.direction;
  const fav = favorability(eff.polarity, dir);
  const favTag = fav === 'good'
    ? `<span class="sim-fav sim-fav-good">příznivý směr</span>`
    : fav === 'bad'
      ? `<span class="sim-fav sim-fav-bad">nepříznivý směr</span>`
      : '';

  let value;
  if (eff.kind === 'elasticity' && eff.before != null && eff.after != null) {
    const arrow = eff.polarity === 'down' ? '↓' : eff.polarity === 'up' ? '↑' : '→';
    const deltaTxt = eff.deltaPct != null
      ? ` <span class="sim-delta">(${eff.deltaPct > 0 ? '+' : ''}${czNum(eff.deltaPct)} %)</span>`
      : '';
    value = `<span class="sim-before">${czNum(eff.before)}${unit}</span>
             <span class="sim-arrow sim-arrow-${eff.polarity || 'flat'}" aria-hidden="true">${arrow}</span>
             <span class="sim-after">${czNum(eff.after)}${unit}</span>${deltaTxt}`;
  } else {
    // directional
    const arrow = eff.polarity === 'down' ? '↓' : eff.polarity === 'up' ? '↑' : '→';
    const strength = eff.strength ? STRENGTH_LABEL[eff.strength] || eff.strength : '';
    const cur = eff.before != null ? `<span class="sim-before">dnes ${czNum(eff.before)}${unit}</span> ` : '';
    value = `${cur}<span class="sim-arrow sim-arrow-${eff.polarity || 'flat'}" aria-hidden="true">${arrow}</span>
             <span class="sim-direction">${escapeHtml(eff.polarity === 'down' ? 'klesá' : 'roste')}${strength ? ` (${escapeHtml(strength)})` : ''}</span>`;
  }

  const note = eff.note ? `<p class="sim-effect-note">${escapeHtml(eff.note)}</p>` : '';
  const kindTag = eff.kind === 'elasticity'
    ? `<span class="sim-kind">odhad čísla</span>`
    : `<span class="sim-kind sim-kind-dir">jen směr</span>`;

  return `
    <div class="sim-effect">
      <div class="sim-effect-head">
        <span class="sim-effect-name">${escapeHtml(name)}</span>
        ${kindTag}${favTag}
      </div>
      <div class="sim-effect-value">${value}</div>
      ${note}
    </div>`;
}

// ---------------------------------------------------------------------------
// Render — zdroje
// ---------------------------------------------------------------------------

function renderSources() {
  const host = document.getElementById('simSources');
  if (!host) return;
  const seen = new Set();
  const items = [];
  for (const lever of LEVERS) {
    for (const eff of lever.effects || []) {
      if (eff.source && !seen.has(eff.source)) {
        seen.add(eff.source);
        items.push(eff.source);
      }
    }
  }
  host.innerHTML = items.map(s => `<li>${escapeHtml(s)}</li>`).join('');
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function updateOutput(lever) {
  const value = leverValue(lever);
  const out = document.getElementById(`out-${lever.id}`);
  const txt = leverValueText(lever, value);
  if (out) out.textContent = txt;
  if (lever.control?.type !== 'toggle') {
    const el = document.getElementById(`lever-${lever.id}`);
    if (el) el.setAttribute('aria-valuetext', txt);
  }
}

function wire() {
  const form = document.getElementById('simControls');
  if (!form) return;

  form.addEventListener('input', (e) => {
    const el = e.target.closest('[id^="lever-"]');
    if (!el) return;
    const lever = LEVERS.find(l => `lever-${l.id}` === el.id);
    if (!lever) return;
    updateOutput(lever);
    renderResults();
  });

  form.addEventListener('reset', () => {
    // reset event běží před přenastavením hodnot → počkej tick
    setTimeout(() => {
      LEVERS.forEach(updateOutput);
      renderResults();
    }, 0);
  });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function init() {
  renderModuleNav('explainers');
  renderMastheadDate();
  renderRelatedTools('simulator');

  const host = document.getElementById('simLeversList');
  if (!host) return;
  try {
    const [leversDoc, indsDoc] = await Promise.all([
      fetch('data/levers.json').then(r => r.json()),
      fetch('data/indicators.json').then(r => r.json()),
    ]);
    LEVERS = leversDoc.levers ?? [];
    INDICATORS = new Map((indsDoc.indicators ?? []).map(i => [i.id, i]));

    renderControls();
    renderSources();
    renderResults();
    wire();
  } catch (err) {
    host.innerHTML = renderErrorState('Simulátor pák se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
