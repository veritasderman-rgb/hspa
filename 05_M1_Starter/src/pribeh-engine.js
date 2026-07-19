// Tři židle · Akt III — Příběh pacienta: čistý výpočetní engine (bez DOM,
// testovatelný). Persona prochází lineární sekvencí kroků; rozhodnutí hráče
// posouvají čas a platby z kapsy, kapacitně citlivé kroky (wait_sensitive)
// posouvá modifikátor čekacích dob z aktu II (Rok ředitele nemocnice).
// Žádná náhoda — jen rozhodnutí. Data: data/pribeh-pacienta.json.
// Modelová hra, ne predikce. Viz PLAN-TRI-ZIDLE.md.

export const WAITINGS = ['kratsi', 'stejne', 'delsi'];

/** Modifikátor čekacích dob z uloženého stavu aktu II (default stejne). */
export function waitingFromCampaign(reditelState) {
  const w = reditelState?.verdict?.waiting;
  return WAITINGS.includes(w) ? w : 'stejne';
}

/** Vybraná option rozhodnutí kroku (null, pokud hráč nevybral nebo krok rozhodnutí nemá). */
export function optionFor(step, decisions) {
  if (!step.decision) return null;
  const optId = decisions?.[step.id];
  return step.decision.options.find(o => o.id === optId) ?? null;
}

/**
 * Čas kroku v týdnech: základ + delta zvolené option + posun z aktu II
 * na kapacitně citlivých krocích. Nikdy nejde pod nulu.
 */
export function stepTimeWeeks(step, decisions, waiting = 'stejne', shiftWeeks = 0) {
  let weeks = step.base_time_weeks;
  const opt = optionFor(step, decisions);
  if (opt) weeks += opt.time_weeks_delta || 0;
  if (step.wait_sensitive) {
    if (waiting === 'delsi') weeks += shiftWeeks;
    if (waiting === 'kratsi') weeks -= shiftWeeks;
  }
  return Math.max(0, weeks);
}

/**
 * Výsledek cesty persony: celkový čas, platby z kapsy, kompletnost
 * rozhodnutí a rozpad po krocích (pro timeline v UI).
 * decisions = { stepId: optionId }.
 */
export function journeyOutcome(persona, decisions, waiting = 'stejne', shiftWeeks = 0) {
  let weeks = 0, oop = 0, answered = 0, totalDecisions = 0;
  const steps = [];
  for (const step of persona.steps) {
    const opt = optionFor(step, decisions);
    if (step.decision) {
      totalDecisions += 1;
      if (opt) answered += 1;
    }
    const w = stepTimeWeeks(step, decisions, waiting, shiftWeeks);
    weeks += w;
    if (opt) oop += opt.cost_oop_kc || 0;
    steps.push({
      id: step.id,
      weeks: w,
      wait_shifted: Boolean(step.wait_sensitive) && waiting !== 'stejne',
      option: opt?.id ?? null,
    });
  }
  return {
    weeks,
    oop_kc: oop,
    answered,
    totalDecisions,
    complete: answered === totalDecisions,
    waiting,
    steps,
  };
}

/**
 * Referenční („nejhladší") průchod: u každého rozhodnutí option s nejmenším
 * časem (při shodě s nejmenší platbou), bez posunu z aktu II. Slouží ve
 * výsledovce jako srovnání „kolik vás stála rozhodnutí a stav systému".
 */
export function bestCaseOutcome(persona) {
  const decisions = {};
  for (const step of persona.steps) {
    if (!step.decision) continue;
    decisions[step.id] = [...step.decision.options].sort((a, b) =>
      (a.time_weeks_delta || 0) - (b.time_weeks_delta || 0)
      || (a.cost_oop_kc || 0) - (b.cost_oop_kc || 0))[0].id;
  }
  return journeyOutcome(persona, decisions, 'stejne', 0);
}
