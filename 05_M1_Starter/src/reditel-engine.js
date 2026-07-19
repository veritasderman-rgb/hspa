// Tři židle · Akt II — Rok ředitele nemocnice: čistý výpočetní engine
// (bez DOM, testovatelný). Rozpočet se odvodí z aktu I (hra na ministra),
// hráčova rozhodnutí se sčítají do tří os (hospodaření / personál / pacienti),
// reakce se spouštějí deterministicky podle prahů s doloženými precedenty.
// Data: data/reditel-hra.json. Modelová hra, ne predikce. Viz PLAN-TRI-ZIDLE.md.

/**
 * Růst rozpočtu nemocnice v % z alokace ministra (vážený růst lůžkových
 * segmentů). Bez odehraného aktu I vrací doložený default reálné vyhlášky.
 * @returns {{growthPct: number, fromCampaign: boolean}}
 */
export function budgetFromMinistr(ministrState, handoff) {
  const alloc = ministrState?.alloc;
  if (!alloc || !handoff.segments.some(s => Number.isFinite(Number(alloc[s.id])))) {
    return { growthPct: handoff.default_growth_pct, fromCampaign: false };
  }
  let growth = 0;
  for (const s of handoff.segments) {
    growth += (Number(alloc[s.id]) || 0) * s.weight;
  }
  return { growthPct: Math.round(growth * 10) / 10, fromCampaign: true };
}

/**
 * Startovní morálka personálu podle toho, jak ministr naplnil modelový
 * požadavek akutní lůžkové péče (handoff.demand_ref_pct). Bez kampaně 0.
 */
export function startingMorale(ministrState, handoff) {
  const pct = Number(ministrState?.alloc?.akutni_luzkova);
  if (!Number.isFinite(pct)) return 0;
  const gap = pct - handoff.demand_ref_pct;
  if (gap >= 0) return 1;
  if (gap >= -2) return 0;
  return -1;
}

/**
 * Projekce bilance PŘED rozhodnutími: příjmy z vyhlášky minus nákladový
 * drift (osobní + věcné náklady) minus strukturální deficit. Vše v mil. Kč.
 */
export function projectedBalance(hospital, growthPct) {
  const base = hospital.baseline_budget_mil;
  const revenueGrowth = base * (growthPct / 100);
  const personnel = base * (hospital.personnel_share_pct / 100);
  const costDrift = personnel * (hospital.personnel_drift_pct / 100)
    + (base - personnel) * (hospital.other_drift_pct / 100);
  const balance = revenueGrowth - costDrift - hospital.structural_deficit_mil;
  const r = (v) => Math.round(v * 10) / 10;
  return {
    revenue_growth_mil: r(revenueGrowth),
    cost_drift_mil: r(costDrift),
    structural_mil: hospital.structural_deficit_mil,
    balance_mil: r(balance),
  };
}

/** Vybraná option rozhodnutí (null, pokud hráč ještě nevybral). */
export function optionFor(decision, decisions) {
  const optId = decisions?.[decision.id];
  return decision.options.find(o => o.id === optId) ?? null;
}

/**
 * Součet dopadů hráčových rozhodnutí: cena (+) / úspora (−) v mil. Kč
 * a posuny os personál/pacienti. Nevybraná rozhodnutí nepřispívají.
 */
export function applyDecisions(doc, decisions) {
  let cost = 0, personal = 0, pacienti = 0, answered = 0;
  for (const d of doc.decisions) {
    const opt = optionFor(d, decisions);
    if (!opt) continue;
    answered += 1;
    cost += opt.cost_mil;
    personal += opt.effects.personal || 0;
    pacienti += opt.effects.pacienti || 0;
  }
  return { cost_mil: Math.round(cost * 10) / 10, personal, pacienti, answered, total: doc.decisions.length };
}

/**
 * Výsledek roku: tři osy + projekce. decisions = { decisionId: optionId }.
 * @returns {{growthPct, fromCampaign, projection, axes: {hospodareni, personal, pacienti}, answered, total}}
 */
export function yearResult(doc, decisions, ministrState) {
  const { growthPct, fromCampaign } = budgetFromMinistr(ministrState, doc.handoff);
  const projection = projectedBalance(doc.hospital, growthPct);
  const applied = applyDecisions(doc, decisions);
  return {
    growthPct,
    fromCampaign,
    projection,
    axes: {
      hospodareni: Math.round((projection.balance_mil - applied.cost_mil) * 10) / 10,
      personal: startingMorale(ministrState, doc.handoff) + applied.personal,
      pacienti: applied.pacienti,
    },
    answered: applied.answered,
    total: applied.total,
  };
}

const OPS = {
  lte: (v, t) => v <= t,
  lt: (v, t) => v < t,
  gte: (v, t) => v >= t,
  gt: (v, t) => v > t,
};

/**
 * Reakce spuštěné aktuálním stavem os (deterministické prahy). U osy
 * personál se ze záporných reakcí ukáže jen ta nejtvrdší (výpovědi
 * překrývají rezignaci vrchní sestry).
 */
export function reactionsFor(doc, axes) {
  const hit = doc.reactions.filter(r => OPS[r.operator](axes[r.axis], r.threshold));
  const personalNeg = hit.filter(r => r.axis === 'personal' && r.threshold < 0);
  if (personalNeg.length > 1) {
    const worst = personalNeg.reduce((a, b) => (a.threshold < b.threshold ? a : b));
    return hit.filter(r => !(r.axis === 'personal' && r.threshold < 0) || r === worst);
  }
  return hit;
}

/**
 * Modifikátor čekacích dob pro akt III (Příběh pacienta):
 * kratsi | stejne | delsi podle osy pacienti.
 */
export function waitingModifier(axes) {
  if (axes.pacienti >= 2) return 'kratsi';
  if (axes.pacienti <= -2) return 'delsi';
  return 'stejne';
}

/** Tón osy podle pásem z dat: good | mid | bad. */
export function axisTone(axisId, value, bands) {
  const b = bands[axisId];
  if (value >= b.good_gte) return 'good';
  if (value >= b.mid_gte) return 'mid';
  return 'bad';
}

/**
 * Roční verdikt: tóny všech os + spuštěné reakce + modifikátor čekacích dob.
 */
export function verdict(doc, decisions, ministrState) {
  const result = yearResult(doc, decisions, ministrState);
  const tones = Object.fromEntries(
    Object.entries(result.axes).map(([id, v]) => [id, axisTone(id, v, doc.verdict_bands)]));
  return {
    ...result,
    tones,
    reactions: reactionsFor(doc, result.axes),
    waiting: waitingModifier(result.axes),
    complete: result.answered === result.total,
  };
}
