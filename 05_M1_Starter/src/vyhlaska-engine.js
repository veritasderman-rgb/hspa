// Úhradová vyhláška — čistý výpočetní engine (bez DOM, testovatelný).
//
// Hráč rozděluje modelovou obálku růstu úhrad mezi segmenty. Engine počítá:
// cenu vyhlášky, nové podíly segmentů (definitorika — přesná matematika),
// náladu zástupců (gap vs. modelový požadavek) a doložené směrové efekty.
// Viz data/vyhlaska-hra.json a PLAN-VYHLASKA-HRA.md.

/** Cena vyhlášky v mld Kč pro dané % růstu per segment. */
export function totalCost(segments, alloc) {
  let sum = 0;
  for (const s of segments) {
    const pct = Number(alloc[s.id]) || 0;
    sum += s.baseline_mld * (pct / 100);
  }
  return sum;
}

/** Vážený průměrný růst systému v % (kotva pro „nadprůměrné posílení"). */
export function avgGrowthPct(segments, alloc) {
  const base = segments.reduce((a, s) => a + s.baseline_mld, 0);
  if (!base) return 0;
  return (totalCost(segments, alloc) / base) * 100;
}

/**
 * Nové podíly segmentů po vyhlášce (definitorický přepočet, žádný model).
 * @returns {Object} { [id]: { mld, share_pct } }
 */
export function newShares(segments, alloc) {
  const grown = segments.map(s => ({
    id: s.id,
    mld: s.baseline_mld * (1 + (Number(alloc[s.id]) || 0) / 100),
  }));
  const total = grown.reduce((a, g) => a + g.mld, 0);
  const out = {};
  for (const g of grown) {
    out[g.id] = { mld: g.mld, share_pct: total ? (g.mld / total) * 100 : 0 };
  }
  return out;
}

export const MOOD_ORDER = ['agree', 'grudging', 'no_deal', 'protest'];
export const MOOD_LABELS = {
  agree: 'Dohoda',
  grudging: 'Podpis s výhradami',
  no_deal: 'Bez dohody — rozhodne vyhláška',
  protest: 'Protest / stávková pohotovost',
};

/**
 * Nálada zástupce segmentu podle rozdílu přidělené % vs. modelový požadavek.
 * gap ≥ 0 → agree; ≥ −2 → grudging; ≥ −4 → no_deal; jinak protest.
 */
export function moodFor(segment, allocPct) {
  const gap = (Number(allocPct) || 0) - segment.demand_pct;
  if (gap >= 0) return 'agree';
  if (gap >= -2) return 'grudging';
  if (gap >= -4) return 'no_deal';
  return 'protest';
}

/**
 * Doložené efekty vaší vyhlášky. Directional efekt se aktivuje, když segment
 * roste NADPRŮMĚRNĚ (relativní posílení mění strukturu; stejný růst pro
 * všechny strukturu nemění). Definitional se přepočítává vždy.
 * @returns {Array<{segment, kind, indicator?, polarity?, strength?, active, note, source}>}
 */
export function effectsFor(segments, alloc, indicatorsById) {
  const avg = avgGrowthPct(segments, alloc);
  const shares = newShares(segments, alloc);
  const out = [];
  for (const s of segments) {
    const pct = Number(alloc[s.id]) || 0;
    for (const eff of s.effects || []) {
      if (eff.kind === 'definitional') {
        const ind = indicatorsById?.get?.(eff.indicator);
        out.push({
          segment: s.id, kind: 'definitional', indicator: eff.indicator,
          before: ind && Number.isFinite(ind.value) ? ind.value : s.baseline_share_pct,
          after: Math.round(shares[s.id].share_pct * 10) / 10,
          active: true, note: eff.note, source: eff.source,
        });
      } else if (eff.kind === 'directional') {
        const active = eff.active_when === 'above_avg' ? pct > avg : pct > 0;
        out.push({
          segment: s.id, kind: 'directional', indicator: eff.indicator,
          polarity: active ? eff.polarity : null,
          strength: active ? eff.strength : null,
          active, note: eff.note, source: eff.source, confidence: eff.confidence,
        });
      } else {
        // kind: none — poctivé „nedoloženo"
        out.push({ segment: s.id, kind: 'none', active: false, note: eff.note, source: eff.source });
      }
    }
  }
  return out;
}

/**
 * Verdikt vaší vyhlášky: cena vs. obálka, počet dohod (vs. reálné DR 2027),
 * posun podílu lůžkové péče vůči OECD.
 */
export function verdict(segments, alloc, envelopeMld) {
  const cost = totalCost(segments, alloc);
  const shares = newShares(segments, alloc);
  const moods = segments.map(s => ({ id: s.id, mood: moodFor(s, alloc[s.id]) }));
  const deals = moods.filter(m => m.mood === 'agree' || m.mood === 'grudging').length;
  const protests = moods.filter(m => m.mood === 'protest').length;
  const luz = segments.find(s => s.id === 'luzkova');
  return {
    cost: Math.round(cost * 10) / 10,
    envelope: envelopeMld,
    balance: Math.round((envelopeMld - cost) * 10) / 10, // + rezerva / − deficit
    deficit: cost > envelopeMld,
    deals,
    segmentsTotal: segments.length,
    protests,
    moods,
    luzkovaShareBefore: luz ? luz.baseline_share_pct : null,
    luzkovaShareAfter: luz ? Math.round(shares.luzkova.share_pct * 10) / 10 : null,
  };
}
