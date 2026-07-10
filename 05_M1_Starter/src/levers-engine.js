// Simulátor pák — čistý výpočetní engine (bez DOM, importovatelný v testech).
//
// Ilustrativní modelový odhad dle citované evidence, NE predikce. Viz
// data/levers.json a PLAN-SIMULATOR-PAK.md.

/** Round na daný počet desetinných míst (stabilní). */
export function round(v, d = 1) {
  const f = 10 ** d;
  return Math.round((v + Number.EPSILON) * f) / f;
}

/**
 * Aplikuje elasticitní efekt na aktuální hodnotu indikátoru.
 * new = current × (1 + coef_per_unit/100 × delta)
 * @param {number} current  aktuální hodnota indikátoru
 * @param {number} coefPerUnit  relativní % změny na 1 jednotku posunu páky
 * @param {number} delta  posun páky (v jednotkách control.unit)
 * @returns {number} projektovaná hodnota (nezaokrouhlená)
 */
export function applyElasticity(current, coefPerUnit, delta) {
  if (!Number.isFinite(current) || !Number.isFinite(coefPerUnit) || !Number.isFinite(delta)) return current;
  return current * (1 + (coefPerUnit / 100) * delta);
}

/** Je páka aktivní? slider → hodnota > 0; toggle → 1. */
export function leverActive(lever, value) {
  const v = Number(value) || 0;
  return v > 0;
}

/**
 * Spočítá dopad jedné páky na dotčené indikátory pro dané nastavení (delta/on).
 * @returns {Array<{indicator, kind, before, after, deltaPct, polarity, strength, note, source}>}
 */
export function simulateLever(lever, value, indicatorsById) {
  const active = leverActive(lever, value);
  const out = [];
  for (const eff of lever.effects || []) {
    const ind = indicatorsById.get(eff.indicator);
    const before = ind && Number.isFinite(ind.value) ? ind.value : null;
    if (eff.kind === 'elasticity') {
      const after = active && before != null
        ? round(applyElasticity(before, eff.coef_per_unit, Number(value)), 2)
        : before;
      const deltaPct = before != null && before !== 0 && after != null
        ? round(((after - before) / before) * 100, 1)
        : null;
      out.push({
        indicator: eff.indicator, kind: 'elasticity', before, after, deltaPct,
        polarity: deltaPct == null ? null : (deltaPct < 0 ? 'down' : deltaPct > 0 ? 'up' : 'flat'),
        strength: null, note: eff.note, source: eff.source, confidence: eff.confidence,
      });
    } else {
      // directional
      out.push({
        indicator: eff.indicator, kind: 'directional', before, after: before, deltaPct: null,
        polarity: active ? eff.polarity : null,
        strength: active ? eff.strength : null,
        note: eff.note, source: eff.source, confidence: eff.confidence,
      });
    }
  }
  return out;
}

/**
 * Spočítá dopad všech pák pro dané nastavení { leverId: value }.
 * @returns {Array} sloučené efekty přes všechny páky (pořadí = pořadí pák)
 */
export function simulate(levers, settings, indicatorsById) {
  const results = [];
  for (const lever of levers) {
    const value = settings[lever.id] ?? lever.control?.default ?? 0;
    results.push({ lever: lever.id, label: lever.label, effects: simulateLever(lever, value, indicatorsById) });
  }
  return results;
}
