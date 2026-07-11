// Úhradová vyhláška — čistý výpočetní engine (bez DOM, testovatelný).
//
// v2: plná segmentace dle číselníku ZPP (17 segmentů, baseline NRHZS 2023)
// + škálování podílů na letošní objem systému (scale = objem 2026 / součet
// 2023). Hráč rozděluje modelovou obálku růstu; engine počítá cenu vyhlášky,
// nové podíly (definitorika — přesná matematika, vč. skupinových efektů),
// náladu zástupců (gap vs. modelový požadavek) a doložené směrové efekty.
// Viz data/vyhlaska-hra.json a PLAN-VYHLASKA-HRA.md.

/** Cena vyhlášky v mld Kč pro dané % růstu per segment (scale = na dnešní objem). */
export function totalCost(segments, alloc, scale = 1) {
  let sum = 0;
  for (const s of segments) {
    const pct = Number(alloc[s.id]) || 0;
    sum += s.baseline_mld * scale * (pct / 100);
  }
  return sum;
}

/** Vážený průměrný růst systému v % (kotva pro „nadprůměrné posílení"). */
export function avgGrowthPct(segments, alloc) {
  const base = segments.reduce((a, s) => a + s.baseline_mld, 0);
  if (!base) return 0;
  return (totalCost(segments, alloc, 1) / base) * 100;
}

/**
 * Nové podíly segmentů po vyhlášce (definitorický přepočet, žádný model).
 * Podíly jsou nezávislé na scale (škálování je proporční).
 * @returns {Object} { [id]: { mld, share_pct } } — mld v cenách baseline roku
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

/** Součet podílů skupiny segmentů (např. lůžkový blok) v %, zaokrouhlený na 1 dp. */
export function groupShare(segments, alloc, ids) {
  const shares = newShares(segments, alloc);
  const sum = ids.reduce((a, id) => a + (shares[id]?.share_pct || 0), 0);
  return Math.round(sum * 10) / 10;
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
 * všechny strukturu nemění). Definitional se přepočítává vždy — buď pro
 * jeden segment, nebo pro skupinu (effect.group_segments).
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
        const ids = Array.isArray(eff.group_segments) && eff.group_segments.length
          ? eff.group_segments : [s.id];
        const before = ids.reduce((a, id) => {
          const seg = segments.find(x => x.id === id);
          return a + (seg ? seg.baseline_mld : 0);
        }, 0) / segments.reduce((a, x) => a + x.baseline_mld, 0) * 100;
        const after = ids.reduce((a, id) => a + (shares[id]?.share_pct || 0), 0);
        out.push({
          segment: s.id, kind: 'definitional', indicator: eff.indicator,
          before: Math.round(before * 10) / 10,
          after: Math.round(after * 10) / 10,
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

/** ID segmentů lůžkového bloku (pro verdikt struktury vs. OECD). */
export const LUZKOVA_GROUP = ['akutni_luzkova', 'centrove_leky', 'nasledna_luzkova'];

/**
 * Verdikt vaší vyhlášky: cena vs. obálka (v dnešních cenách), počet dohod
 * (vs. reálné DR 2027), posun podílu lůžkového bloku vůči OECD.
 */
export function verdict(segments, alloc, envelopeMld, scale = 1) {
  const cost = totalCost(segments, alloc, scale);
  const moods = segments.map(s => ({ id: s.id, mood: moodFor(s, alloc[s.id]) }));
  const deals = moods.filter(m => m.mood === 'agree' || m.mood === 'grudging').length;
  const protests = moods.filter(m => m.mood === 'protest').length;
  const totalBase = segments.reduce((a, s) => a + s.baseline_mld, 0);
  const luzIds = LUZKOVA_GROUP.filter(id => segments.some(s => s.id === id));
  const before = luzIds.reduce((a, id) => a + segments.find(s => s.id === id).baseline_mld, 0)
    / (totalBase || 1) * 100;
  return {
    cost: Math.round(cost * 10) / 10,
    envelope: envelopeMld,
    balance: Math.round((envelopeMld - cost) * 10) / 10, // + rezerva / − deficit
    deficit: cost > envelopeMld,
    deals,
    segmentsTotal: segments.length,
    protests,
    moods,
    luzkovaShareBefore: Math.round(before * 10) / 10,
    luzkovaShareAfter: groupShare(segments, alloc, luzIds),
  };
}
