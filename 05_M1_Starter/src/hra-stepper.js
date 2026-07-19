// Tři židle — kampaňový stepper (společná orientační lišta herních stránek).
// Ukazuje, kde v kampani hráč právě je, co má za sebou a CO SE MEZI AKTY
// PŘEDÁVÁ (rozpočet → čekací doby) — hlavní odpověď na otázku „proč jít dál".
// Čistý model (testovatelný) + render do #hraStepper. Viz PLAN-TRI-ZIDLE.md.

import { escapeHtml } from './page-shared.js';
import { loadState } from './hra-stav.js';

/**
 * Stav kroků kampaně z uloženého stavu (bez enginů — jen přítomnost
 * a completion flagy, které akty samy ukládají).
 * @returns {Array<{id, num, label, sub, href, status: 'done'|'progress'|'todo', handoff?: string}>}
 */
export function stepperModel(state) {
  const ministrDone = Boolean(state.ministr?.alloc && Object.keys(state.ministr.alloc).length);
  const reditelStarted = Boolean(state.reditel?.decisions && Object.keys(state.reditel.decisions).length);
  const reditelDone = Boolean(state.reditel?.verdict?.complete);
  const pacientStarted = Boolean(state.pacient?.persona);
  const pacientDone = Boolean(state.pacient?.outcome?.complete);
  return [
    {
      id: 'ministr', num: 'I', label: 'Ministr', sub: 'podepíšete vyhlášku',
      href: 'vyhlaska.html',
      status: ministrDone ? 'done' : 'todo',
      handoff: 'předá se: rozpočet nemocnice',
    },
    {
      id: 'reditel', num: 'II', label: 'Ředitel', sub: 'přežijete s ní rok',
      href: 'reditel.html',
      status: reditelDone ? 'done' : reditelStarted ? 'progress' : 'todo',
      handoff: 'předá se: čekací doby',
    },
    {
      id: 'pacient', num: 'III', label: 'Pacient', sub: 'projdete výsledkem',
      href: 'pribeh-pacienta.html',
      status: pacientDone ? 'done' : pacientStarted ? 'progress' : 'todo',
      handoff: 'sečte se: výsledovka',
    },
    {
      id: 'vysledovka', num: '✓', label: 'Výsledovka', sub: 'celá kampaň pohromadě',
      href: 'hra.html',
      status: ministrDone && reditelDone && pacientDone ? 'done' : 'todo',
    },
  ];
}

/** Doporučený další krok („kam teď") pro daný stav a aktuální stránku. */
export function nextStepHint(steps, currentId) {
  const firstOpen = steps.find(s => s.status !== 'done');
  if (!firstOpen) return { href: 'hra.html', text: 'Kampaň je kompletní — podívejte se na výsledovku.' };
  if (firstOpen.id === currentId) return null; // hráč už je tam, kde má být
  const verb = firstOpen.status === 'progress' ? 'Dohrajte' : 'Pokračujte na';
  return { href: firstOpen.href, text: `${verb} akt ${firstOpen.num} — ${firstOpen.label.toLowerCase()}.` };
}

const STATUS_LABEL = { done: 'dokončeno', progress: 'rozehráno', todo: 'čeká' };

/**
 * Vyrenderuje stepper do #hraStepper (pokud na stránce je).
 * @param {string} currentId  id aktuálního kroku (ministr|reditel|pacient|vysledovka)
 */
export function renderCampaignStepper(currentId, el = (typeof document !== 'undefined' ? document.getElementById('hraStepper') : null)) {
  if (!el) return;
  const steps = stepperModel(loadState());
  const hint = nextStepHint(steps, currentId);
  el.innerHTML = `
    <div class="hra-stepper" role="navigation" aria-label="Postup kampaní Tři židle">
      <span class="hra-stepper-title">Kampaň Tři židle</span>
      <ol class="hra-stepper-steps">
        ${steps.map((s, i) => `
          <li class="hra-stepper-item">
            <a class="hra-step hra-step-${s.status}${s.id === currentId ? ' hra-step-current' : ''}"
               href="${s.href}" ${s.id === currentId ? 'aria-current="step"' : ''}
               title="${escapeHtml(`${s.label} — ${STATUS_LABEL[s.status]}`)}">
              <span class="hra-step-num" aria-hidden="true">${s.status === 'done' && s.id !== 'vysledovka' ? '✓' : s.num}</span>
              <span class="hra-step-body">
                <span class="hra-step-label">${escapeHtml(s.label)}</span>
                <span class="hra-step-sub">${escapeHtml(s.sub)}</span>
              </span>
            </a>
            ${i < steps.length - 1 ? `<span class="hra-step-arrow" aria-hidden="true">→<em>${escapeHtml(steps[i].handoff ?? '')}</em></span>` : ''}
          </li>`).join('')}
      </ol>
      ${hint ? `<a class="hra-stepper-hint" href="${hint.href}">▸ ${escapeHtml(hint.text)}</a>` : ''}
    </div>`;
}
