// Tři židle · Akt III — Příběh pacienta (pribeh-pacienta.html).
// Hráč si vybere personu a projde její cestu krok za krokem; po dokončení
// si tutéž cestu přehraje očima lékaře (stejné události, druhá strana
// přepážky). Kapacitně citlivé kroky posouvá verdikt aktu II (ředitel).
// Data: data/pribeh-pacienta.json; výpočet: src/pribeh-engine.js.
// Modelová hra, ne predikce. Viz PLAN-TRI-ZIDLE.md.

import './analytics.js';
import { renderModuleNav, renderMastheadDate, escapeHtml, renderErrorState, renderRelatedTools } from './page-shared.js';
import { journeyOutcome, bestCaseOutcome, waitingFromCampaign } from './pribeh-engine.js';
import { loadState, saveAct } from './hra-stav.js';
import { renderCampaignStepper } from './hra-stepper.js';

let DOC = null;
let INDICATORS = new Map();
let PHASES = new Map(); // z cesta-pacienta.json (label fází)
let PERSONA = null;
let ROLE = 'pacient'; // pacient | lekar
let WAITING = 'stejne';
let DECISIONS = {}; // zdroj pravdy rozhodnutí — lékařský režim rozhodnutí jen čte

const WAIT_BANNER = {
  kratsi: 'Vaše nemocnice z aktu II drží kratší objednací doby — kapacitně citlivé kroky se o 2 týdny zkracují.',
  delsi: 'Vaše nemocnice z aktu II má delší objednací doby — kapacitně citlivé kroky se o 2 týdny protahují.',
};

function czNum(v, d = 0) {
  if (v == null || !Number.isFinite(v)) return '—';
  return (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('cs-CZ', { maximumFractionDigits: d });
}

function currentDecisions() {
  return DECISIONS;
}

/** Přečte zaškrtnutá rozhodnutí z DOMu (jen pohled pacienta radia renderuje). */
function readDecisionsFromDom() {
  const out = { ...DECISIONS };
  for (const s of PERSONA.steps) {
    if (!s.decision) continue;
    const checked = document.querySelector(`input[name="pp-${s.id}"]:checked`);
    if (checked) out[s.id] = checked.value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Render — výběr persony
// ---------------------------------------------------------------------------

function renderPicker() {
  const host = document.getElementById('ppPicker');
  if (!host) return;
  host.innerHTML = `
    <div class="pp-picker-grid">
      ${DOC.personas.map(p => `
        <button type="button" class="pp-persona ${PERSONA?.id === p.id ? 'pp-persona-active' : ''}" data-persona-id="${escapeHtml(p.id)}">
          <span class="pp-persona-label">${escapeHtml(p.label)}</span>
          <span class="pp-persona-sub">${escapeHtml(p.sublabel)}</span>
        </button>`).join('')}
    </div>`;
  host.querySelectorAll('.pp-persona').forEach(btn => {
    btn.addEventListener('click', () => selectPersona(btn.dataset.personaId));
  });
}

function selectPersona(id) {
  PERSONA = DOC.personas.find(p => p.id === id) || null;
  ROLE = 'pacient';
  DECISIONS = {};
  renderPicker();
  renderJourney();
  refresh();
  const journey = document.getElementById('ppJourney');
  if (journey && PERSONA) journey.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------------------------------------------------------------------
// Render — cesta persony
// ---------------------------------------------------------------------------

function renderJourney() {
  const host = document.getElementById('ppJourney');
  if (!host) return;
  if (!PERSONA) {
    host.innerHTML = '';
    return;
  }
  const p = PERSONA;
  host.innerHTML = `
    <div class="pp-journey-head">
      <h2 class="pp-h" id="ppJourneyHead">${escapeHtml(p.label)} — ${escapeHtml(p.sublabel)}</h2>
      <div class="pp-role-toggle" role="group" aria-label="Úhel pohledu">
        <button type="button" class="pp-role ${ROLE === 'pacient' ? 'pp-role-active' : ''}" data-role="pacient">Očima pacienta</button>
        <button type="button" class="pp-role ${ROLE === 'lekar' ? 'pp-role-active' : ''}" data-role="lekar" id="ppRoleLekar">Očima lékaře</button>
      </div>
    </div>
    <p class="pp-intro">${escapeHtml(p.intro)} <span class="pp-src">(${escapeHtml(p.intro_source)})</span></p>
    ${ROLE === 'lekar' ? `<p class="pp-mode-banner" role="note"><strong>Stejná cesta, jiné oči.</strong>
      Teď čtete dokumentaci a vidíte kapacity, protokoly a čísla systému.
      Rozhodnutí už padla v pohledu pacienta — tady vidíte jen jejich stopu v kartě.
      A u každého kroku i to, co lékař <em>nevidí vůbec</em>.</p>` : ''}
    ${WAIT_BANNER[WAITING] ? `<p class="pp-wait-banner">${escapeHtml(WAIT_BANNER[WAITING])} <a href="reditel.html">Akt II →</a></p>` : ''}
    <form id="ppSteps">
      <ol class="pp-steps">
        ${p.steps.map(renderStep).join('')}
      </ol>
    </form>`;
  host.querySelectorAll('.pp-role').forEach(btn => {
    btn.addEventListener('click', () => {
      if (ROLE === 'pacient') DECISIONS = readDecisionsFromDom();
      ROLE = btn.dataset.role;
      renderJourney();
      restoreDecisions(DECISIONS);
      refresh();
    });
  });
  document.getElementById('ppSteps').addEventListener('input', () => {
    if (ROLE === 'pacient') DECISIONS = readDecisionsFromDom();
    refresh();
  });
}

function renderStep(s, idx) {
  const phase = PHASES.get(s.phase_ref);
  const shifted = s.wait_sensitive && WAITING !== 'stejne';
  const chips = (s.indicators || []).map(ind => {
    const meta = INDICATORS.get(ind);
    return `<a class="pp-ind-chip" href="indicator.html?id=${encodeURIComponent(ind)}">${escapeHtml(meta?.name || ind)}</a>`;
  }).join('');
  const foot = `
      <p class="pp-step-foot">
        ${shifted ? `<span class="pp-shift-note">${WAITING === 'delsi' ? `+${DOC.waiting_shift_weeks} týd. — stav vaší nemocnice (akt II)` : `−${DOC.waiting_shift_weeks} týd. — stav vaší nemocnice (akt II)`}</span>` : ''}
        ${chips ? `<span class="pp-ind-row">Data: ${chips}</span>` : ''}
        <span class="pp-src">Zdroje: ${s.sources.map(escapeHtml).join(' · ')}</span>
      </p>`;
  const head = `
      <div class="pp-step-head">
        <span class="pp-step-num" aria-hidden="true">${idx + 1}</span>
        <span class="pp-step-title">${escapeHtml(s.title)}</span>
        ${ROLE === 'lekar' ? '<span class="pp-record-chip">záznam</span>' : ''}
        <span class="pp-phase-chip">${escapeHtml(phase?.label || s.phase_ref)}</span>
      </div>`;

  // ── Pohled pacienta: příběh + interaktivní rozhodnutí ──
  if (ROLE === 'pacient') {
    return `
    <li class="pp-step ${shifted ? `pp-step-shift-${WAITING}` : ''}">
      ${head}
      <p class="pp-view pp-view-pacient">${escapeHtml(s.views.pacient || '')}</p>
      ${s.decision ? `
        <fieldset class="pp-decision">
          <legend class="pp-decision-q">${escapeHtml(s.decision.question)}</legend>
          ${s.decision.options.map(o => `
            <label class="pp-option">
              <input type="radio" name="pp-${escapeHtml(s.id)}" value="${escapeHtml(o.id)}">
              <span class="pp-option-body">
                <span class="pp-option-head">
                  <span class="pp-option-label">${escapeHtml(o.label)}</span>
                  <span class="pp-option-meta">${o.cost_oop_kc ? `${czNum(o.cost_oop_kc)} Kč z kapsy · ` : ''}${o.time_weeks_delta > 0 ? `+${o.time_weeks_delta} týd.` : o.time_weeks_delta < 0 ? `${o.time_weeks_delta} týd.` : '±0 týd.'}</span>
                </span>
                <span class="pp-option-note">${escapeHtml(o.note)}</span>
              </span>
            </label>`).join('')}
        </fieldset>` : ''}
      ${foot}
    </li>`;
  }

  // ── Pohled lékaře: dokumentace místo příběhu — fakta systému, stopa
  //    pacientova rozhodnutí v kartě a slepá skvrna. Žádná interakce:
  //    rozhodnutí už padla, tady se čte, co po nich zbylo. ──
  const chosen = s.decision ? s.decision.options.find(o => o.id === DECISIONS[s.id]) : null;
  const facts = (s.lekar_facts || []).map(f => `
      <div class="pp-fact"><dt class="pp-fact-label">${escapeHtml(f.label)}</dt><dd class="pp-fact-value">${escapeHtml(f.value)}</dd></div>`).join('');
  return `
    <li class="pp-step pp-step-lekar ${shifted ? `pp-step-shift-${WAITING}` : ''}">
      ${head}
      <p class="pp-view pp-view-lekar">${escapeHtml(s.views.lekar || '')}</p>
      ${s.views.reditel_note ? `<p class="pp-reditel-note">${escapeHtml(s.views.reditel_note)}</p>` : ''}
      ${facts ? `<dl class="pp-lekar-facts" aria-label="Fakta systému k tomuto kroku">${facts}</dl>` : ''}
      ${s.decision ? (chosen ? `
        <div class="pp-lekar-record">
          <span class="pp-lekar-record-h">Stopa v dokumentaci</span>
          <p class="pp-lekar-record-choice">Pacient: ${chosen.label.startsWith('„') ? escapeHtml(chosen.label) : `„${escapeHtml(chosen.label)}“`}</p>
          <p class="pp-lekar-record-note">${escapeHtml(chosen.lekar_reflection || '')}</p>
        </div>` : `
        <div class="pp-lekar-record pp-lekar-record-empty">
          <span class="pp-lekar-record-h">Stopa v dokumentaci</span>
          <p class="pp-lekar-record-note">Rozhodnutí zatím nepadlo — přepněte na „Očima pacienta“ a rozhodněte. Lékař vidí až důsledek.</p>
        </div>`) : ''}
      <p class="pp-lekar-blind"><span class="pp-lekar-blind-h" aria-hidden="true">⌀</span> <strong>Lékař nevidí:</strong> ${escapeHtml(s.lekar_blind || '')}</p>
      ${foot}
    </li>`;
}

function restoreDecisions(decisions) {
  for (const [stepId, optId] of Object.entries(decisions)) {
    const input = document.querySelector(`input[name="pp-${CSS.escape(stepId)}"][value="${CSS.escape(optId)}"]`);
    if (input) input.checked = true;
  }
}

// ---------------------------------------------------------------------------
// Render — výsledovka cesty
// ---------------------------------------------------------------------------

function renderOutcome(decisions) {
  const host = document.getElementById('ppOutcome');
  if (!host) return;
  if (!PERSONA) {
    host.innerHTML = `<p class="pp-empty">Vyberte si nahoře personu — každá nese jinou lekci o tomtéž systému.</p>`;
    return;
  }
  const o = journeyOutcome(PERSONA, decisions, WAITING, DOC.waiting_shift_weeks);
  const best = bestCaseOutcome(PERSONA);
  const monthsTxt = o.weeks >= 8 ? ` (~${czNum(o.weeks / 4.3, 1)} měs.)` : '';
  host.innerHTML = `
    <div class="pp-block">
      <h3 class="pp-block-h">Cesta v číslech</h3>
      <div class="pp-stat"><span class="pp-stat-lbl">Čas od začátku po stabilizaci</span><span class="pp-stat-val">${czNum(o.weeks)} týdnů${monthsTxt}</span></div>
      <div class="pp-stat"><span class="pp-stat-lbl">Zaplaceno z kapsy</span><span class="pp-stat-val">${czNum(o.oop_kc)} Kč</span></div>
      <div class="pp-stat"><span class="pp-stat-lbl">Nejhladší možný průchod</span><span class="pp-stat-val">${czNum(best.weeks)} týdnů</span></div>
      ${o.weeks > best.weeks ? `<p class="pp-note">Rozdíl ${czNum(o.weeks - best.weeks)} týdnů jde za vašimi rozhodnutími${WAITING === 'delsi' ? ' a za stavem nemocnice z aktu II' : ''}.</p>` : `<p class="pp-note">Rychleji to systémem projít nešlo${WAITING === 'kratsi' ? ' — pomohla i nemocnice z aktu II' : ''}.</p>`}
      ${o.complete ? '' : `<p class="pp-note">Zbývá rozhodnout ${o.totalDecisions - o.answered} z ${o.totalDecisions} situací.</p>`}
    </div>
    ${o.complete ? (ROLE === 'lekar' ? `
      <div class="pp-block pp-outcome-note">
        <h3 class="pp-block-h">Dvojí pravda jedné cesty</h3>
        <p class="pp-truth"><span class="pp-truth-who">Pacient si odnáší:</span> ${escapeHtml(PERSONA.outcome_note)}</p>
        <p class="pp-truth pp-truth-lekar"><span class="pp-truth-who">Lékař si odnáší:</span> ${escapeHtml(PERSONA.outcome_lekar)}</p>
        <p class="pp-note">Oba mají pravdu — a každý viděl jen půlku. Přesně proto tenhle web měří systém daty, ne dojmy jedné židle.</p>
      </div>` : `
      <div class="pp-block pp-outcome-note">
        <h3 class="pp-block-h">Co si z cesty odnést</h3>
        <p class="pp-note">${escapeHtml(PERSONA.outcome_note)}</p>
        <button type="button" class="pp-replay" id="ppReplay">Přehrát tutéž cestu očima lékaře →</button>
      </div>`) + `
      <div class="pp-block pp-campaign-cta">
        <h3 class="pp-block-h">Kampaň Tři židle</h3>
        <p class="pp-note">Prošli jste systém shora dolů: ministr → ředitel → pacient. Epilog ukáže celou mapu — a co z ní každá židle ve skutečnosti vidí.</p>
        <a class="pp-campaign-link" href="hra.html">Výsledovka kampaně →</a>
        <a class="pp-campaign-link pp-campaign-link-sec" href="model-systemu.html">Mapa systému: Tři židle →</a>
      </div>` : ''}`;

  const replay = document.getElementById('ppReplay');
  if (replay) {
    replay.addEventListener('click', () => {
      DECISIONS = readDecisionsFromDom();
      ROLE = 'lekar';
      renderJourney();
      refresh();
      document.getElementById('ppJourney')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (o.answered > 0 || o.complete) {
    saveAct('pacient', {
      persona: PERSONA.id,
      decisions,
      outcome: { weeks: o.weeks, oop_kc: o.oop_kc, complete: o.complete, waiting: WAITING },
    });
  }
}

function refresh() {
  renderOutcome(PERSONA ? currentDecisions() : {});
  renderCampaignStepper('pacient');
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function init() {
  renderModuleNav('explainers');
  renderMastheadDate();
  renderRelatedTools('tri-zidle');

  const host = document.getElementById('ppPicker');
  if (!host) return;
  try {
    const [doc, cesta, inds] = await Promise.all([
      fetch('data/pribeh-pacienta.json').then(r => r.json()),
      fetch('data/cesta-pacienta.json').then(r => r.json()),
      fetch('data/indicators.json').then(r => r.json()),
    ]);
    DOC = doc;
    PHASES = new Map((cesta.phases ?? []).map(p => [p.id, p]));
    INDICATORS = new Map((inds.indicators ?? []).map(i => [i.id, i]));

    const campaign = loadState();
    WAITING = waitingFromCampaign(campaign.reditel);

    renderPicker();

    // deep-link ?persona= / návrat v rámci kampaně
    const urlPersona = new URLSearchParams(location.search).get('persona');
    const startId = urlPersona && DOC.personas.some(p => p.id === urlPersona)
      ? urlPersona : campaign.pacient?.persona;
    if (startId && DOC.personas.some(p => p.id === startId)) {
      selectPersona(startId);
      DECISIONS = campaign.pacient?.decisions || {};
      restoreDecisions(DECISIONS);
    }
    refresh();
  } catch (err) {
    host.innerHTML = renderErrorState('Hru se nepodařilo načíst.', err);
    console.error(err);
  }
}

if (typeof window !== 'undefined') init();
