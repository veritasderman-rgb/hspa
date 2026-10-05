// Úhradová vyhláška — čistý výpočetní engine (bez DOM, testovatelný).
//
// v2: plná segmentace dle číselníku ZPP (17 segmentů, baseline NRHZS 2023)
// + škálování podílů na letošní objem systému (scale = objem 2026 / součet
// 2023). Hráč rozděluje modelovou obálku růstu; engine počítá cenu vyhlášky,
// nové podíly (definitorika — přesná matematika, vč. skupinových efektů),
// náladu zástupců (gap vs. modelový požadavek) a doložené směrové efekty.
//
// v3 (říjen 2026): relativní spravedlnost v náladě (moodContext — segment
// pod průměrem eskaluje, když jiný dostal víc, než žádal), slovní vysvětlení
// gapu (moodExplain), víceletá projekce struktury při stejné vyhlášce
// (newShares years, yearsToShare), trilema verdiktu (dohody × reforma ×
// bilance), „co si odnést" (takeaways) a signály čekání pro akt III
// (segmentWaitSignals).
//
// v3.1: KRYTÍ VYHLÁŠKY — deficit má následky už v aktu I. Deficit do výše
// rezervy systému (fondy pojišťoven) hra unese; nad rezervu pojišťovny krátí
// úhrady všem poměrně (zálohy, regulace), zástupci reagují na to, co
// skutečně dostanou (effectiveAlloc), a slib bez krytí eskaluje o stupeň
// (promiseBroken). „Všem všechno" tak nekončí 15/15 dohod s poznámkou pod
// čarou, ale rozpadem dohod. Co je modelové, říká komentář u každé funkce.
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

const round1 = (v) => Math.round(v * 10) / 10;
const fmt = (v) => String(round1(v)).replace('.', ',');

function yearsCount(years) {
  const y = Number(years);
  return Number.isFinite(y) ? Math.max(0, Math.round(y)) : 1;
}

/**
 * Parametry hry z dokumentu dat — jedno místo pro všechny volající
 * (vyhlaska.js, hub, porovnání, akt III).
 * @returns {{envelopeMld:number, scale:number, reserveMld:number}}
 */
export function vyhlaskaParams(doc) {
  const baseSum = (doc?.segments || []).reduce((a, s) => a + s.baseline_mld, 0);
  return {
    envelopeMld: Number.isFinite(doc?.envelope?.amount_mld) ? doc.envelope.amount_mld : 0,
    scale: Number.isFinite(doc?.current_total_mld) && baseSum > 0 ? doc.current_total_mld / baseSum : 1,
    reserveMld: Number.isFinite(doc?.envelope?.reserve_mld) ? Math.max(0, doc.envelope.reserve_mld) : 0,
  };
}

/**
 * Krytí vyhlášky (modelové pravidlo v3.1): deficit do výše rezervy systému
 * (fondy pojišťoven) se unese, nad ni pojišťovny krátí úhrady VŠEM poměrně.
 * ratio = podíl slibu, který se skutečně vyplatí (1 = plně kryto).
 * @returns {{ratio:number, deficitMld:number, uncoveredMld:number, fundedMld:number}}
 */
export function coverageFor(costMld, envelopeMld, reserveMld = 0) {
  const cost = Math.max(0, Number(costMld) || 0);
  const capacity = (Number(envelopeMld) || 0) + Math.max(0, Number(reserveMld) || 0);
  const deficit = Math.max(0, cost - (Number(envelopeMld) || 0));
  const ratio = cost <= capacity || cost <= 0 ? 1 : capacity / cost;
  return {
    ratio,
    deficitMld: round1(deficit),
    uncoveredMld: round1(Math.max(0, cost - capacity)),
    fundedMld: round1(Math.min(cost, capacity)),
  };
}

/** Skutečně vyplacený růst per segment = slíbený × krytí (nezaokrouhleno). */
export function effectiveAlloc(segments, alloc, params) {
  const { ratio } = coverageFor(totalCost(segments, alloc, params.scale), params.envelopeMld, params.reserveMld);
  const out = {};
  for (const s of segments) out[s.id] = (Number(alloc[s.id]) || 0) * ratio;
  return out;
}

/**
 * Nové podíly segmentů po vyhlášce (definitorický přepočet, žádný model).
 * Podíly jsou nezávislé na scale (škálování je proporční).
 * `years` > 1 = TATÁŽ vyhláška opakovaná každý rok (složený růst) — projekce
 * setrvačnosti struktury, ne predikce; 0 = výchozí stav.
 * @returns {Object} { [id]: { mld, share_pct } } — mld v cenách baseline roku
 */
export function newShares(segments, alloc, years = 1) {
  const n = yearsCount(years);
  const grown = segments.map(s => ({
    id: s.id,
    mld: s.baseline_mld * (1 + (Number(alloc[s.id]) || 0) / 100) ** n,
  }));
  const total = grown.reduce((a, g) => a + g.mld, 0);
  const out = {};
  for (const g of grown) {
    out[g.id] = { mld: g.mld, share_pct: total ? (g.mld / total) * 100 : 0 };
  }
  return out;
}

/** Součet podílů skupiny segmentů (např. lůžkový blok) v %, zaokrouhlený na 1 dp. */
export function groupShare(segments, alloc, ids, years = 1) {
  const shares = newShares(segments, alloc, years);
  const sum = ids.reduce((a, id) => a + (shares[id]?.share_pct || 0), 0);
  return round1(sum);
}

/**
 * Projekce podílu skupiny při stejné vyhlášce každý rok (definitorika).
 * @returns {Array<{years:number, share:number}>}
 */
export function structureProjection(segments, alloc, ids, horizons = [1, 5, 10, 20]) {
  return horizons.map(y => ({ years: y, share: groupShare(segments, alloc, ids, y) }));
}

/**
 * Za kolik let by podíl skupiny klesl na cíl (OECD ~30 %) při stejné vyhlášce
 * každý rok. 0 = už je pod cílem; null = podíl neklesá nebo to trvá déle než
 * maxYears (hra pak říká „víc než generaci").
 */
export function yearsToShare(segments, alloc, ids, target = 30, maxYears = 100) {
  const base = groupShare(segments, alloc, ids, 0);
  if (base <= target) return 0;
  if (groupShare(segments, alloc, ids, 1) >= base) return null;
  for (let y = 1; y <= maxYears; y++) {
    if (groupShare(segments, alloc, ids, y) <= target) return y;
  }
  return null;
}

export const MOOD_ORDER = ['boost', 'agree', 'grudging', 'no_deal', 'protest'];
export const MOOD_LABELS = {
  boost: 'Dohoda + rozšíření péče',
  agree: 'Dohoda',
  grudging: 'Podpis s výhradami',
  no_deal: 'Bez dohody — rozhodne vyhláška',
  protest: 'Protest / stávková pohotovost',
};
const MOOD_SHORT = {
  boost: 'rozšíření péče',
  agree: 'dohoda',
  grudging: 'podpis s výhradami',
  no_deal: 'bez dohody',
  protest: 'protest',
};
/** O stupeň horší nálada (protest je dno). */
const MOOD_WORSE = { boost: 'agree', agree: 'grudging', grudging: 'no_deal', no_deal: 'protest', protest: 'protest' };

/** Modelové pravidlo v3 — citováno v UI („Jak hra počítá"). */
export const FAIRNESS_RULE = 'Segment, který roste pod průměrem systému, zatímco jiný vyjednávací '
  + 'segment dostal výrazně víc, než žádal (≥ 2 p. b. nad požadavek), eskaluje o jeden stupeň '
  + '— z podpisu s výhradami na „bez dohody", z „bez dohody" na protest.';

/** Krácení slibu, od kterého se slib počítá jako nesplněný (p. b.). */
export const PROMISE_CUT_PB = 1;
/** Modelové pravidlo v3.1 — citováno v UI. */
export const PROMISE_RULE = 'Dostane-li segment o ≥ 1 p. b. méně, než mu vyhláška slíbila (pojišťovny '
  + 'krátí po vyčerpání rezervy), a je proto v horším stavu, než by byl se slibem, eskaluje o další '
  + 'stupeň — nesplněný slib bolí víc než poctivá nízká nabídka.';

/** Rozdíl přidělené % vs. modelový požadavek segmentu (p. b.). */
export function gapFor(segment, allocPct) {
  return (Number(allocPct) || 0) - segment.demand_pct;
}

/**
 * Základní nálada čistě podle gapu:
 * gap ≥ +2 → boost (pozitivní extrém: segment slibuje konkrétní rozšíření
 * péče — ordinační hodiny, kapacity, vstup nových metod);
 * gap ≥ 0 → agree; ≥ −2 → grudging; ≥ −4 → no_deal; jinak protest.
 */
export function baseMood(gap) {
  if (gap >= 2) return 'boost';
  if (gap >= 0) return 'agree';
  if (gap >= -2) return 'grudging';
  if (gap >= -4) return 'no_deal';
  return 'protest';
}

/**
 * Kontext pro relativní spravedlnost: průměrný růst systému a vyjednávací
 * segmenty, které dostaly výrazně víc, než žádaly. Zákonné položky
 * (dr_segment: false) nikoho „neprovokují" — nevyjednávají.
 * Počítá se z toho, co segmenty skutečně dostanou (effectiveAlloc).
 */
export function moodContext(segments, alloc) {
  return {
    avgPct: avgGrowthPct(segments, alloc),
    boostedIds: segments
      .filter(s => s.dr_segment !== false && gapFor(s, alloc[s.id]) >= 2)
      .map(s => s.id),
  };
}

/**
 * Modelové pravidlo relativní spravedlnosti (FAIRNESS_RULE): platí jen pro
 * segmenty v grudging/no_deal, které rostou pod průměrem, a jen když někdo
 * jiný dostal boost. Bez ctx se nepoužije (zpětně kompatibilní).
 */
export function fairnessEscalates(segment, allocPct, ctx) {
  if (!ctx || !Array.isArray(ctx.boostedIds) || ctx.boostedIds.length === 0) return false;
  const mood = baseMood(gapFor(segment, allocPct));
  if (mood !== 'grudging' && mood !== 'no_deal') return false;
  if (ctx.boostedIds.every(id => id === segment.id)) return false;
  return (Number(allocPct) || 0) < ctx.avgPct - 1e-9;
}

/**
 * Modelové pravidlo nesplněného slibu (PROMISE_RULE): slíbeno nominalPct,
 * vyplaceno effectivePct; krácení ≥ PROMISE_CUT_PB a nálada ze slibu by byla
 * lepší než `mood` → eskalace o stupeň. Bez nominálu (null) se nepoužije.
 */
export function promiseBroken(segment, nominalPct, effectivePct, mood) {
  if (nominalPct == null) return false;
  const n = Number(nominalPct) || 0;
  const e = Number(effectivePct) || 0;
  if (n - e < PROMISE_CUT_PB) return false;
  return MOOD_ORDER.indexOf(baseMood(gapFor(segment, n))) < MOOD_ORDER.indexOf(mood);
}

/**
 * Rozklad nálady: základ (z toho, co segment dostane) → relativní
 * spravedlnost → nesplněný slib. Jediné místo, kde se stupně skládají.
 * @returns {{base:string, escalated:boolean, broken:boolean, mood:string}}
 */
export function moodDetail(segment, effectivePct, ctx = null, nominalPct = null) {
  const base = baseMood(gapFor(segment, effectivePct));
  const escalated = Boolean(ctx) && fairnessEscalates(segment, effectivePct, ctx);
  const afterFair = escalated ? MOOD_WORSE[base] : base;
  const broken = promiseBroken(segment, nominalPct, effectivePct, afterFair);
  return { base, escalated, broken, mood: broken ? MOOD_WORSE[afterFair] : afterFair };
}

/**
 * Nálada zástupce segmentu: gap vs. modelový požadavek z toho, co segment
 * skutečně dostane (allocPct), s volitelným kontextem relativní spravedlnosti
 * a volitelným slibem (nominalPct) pro pravidlo nesplněného slibu.
 */
export function moodFor(segment, allocPct, ctx = null, nominalPct = null) {
  return moodDetail(segment, allocPct, ctx, nominalPct).mood;
}

/**
 * Slovní vysvětlení nálady pro UI: „Chybí 3 p. b. k požadavku → bez dohody",
 * vč. krácení slibu a eskalací.
 * @returns {{gap:number, base:string, mood:string, escalated:boolean, broken:boolean, text:string}}
 */
export function moodExplain(segment, allocPct, ctx = null, nominalPct = null) {
  const d = moodDetail(segment, allocPct, ctx, nominalPct);
  const e = Number(allocPct) || 0;
  const gap = gapFor(segment, e);
  const g = Math.abs(gap);
  const cut = nominalPct != null && (Number(nominalPct) || 0) - e >= 0.05;
  let text = cut ? `Slíbeno +${fmt(nominalPct)} %, kryto +${fmt(e)} %: ` : '';
  if (gap >= 2) text += `${cut ? '' : '+'}${cut ? '+' : ''}${fmt(g)} p. b. nad požadavek → ${MOOD_SHORT.boost}`;
  else if (gap > 0) text += `+${fmt(g)} p. b. nad požadavek → ${MOOD_SHORT.agree}`;
  else if (gap === 0) text += `${cut ? 'p' : 'P'}řesně na požadavku → ${MOOD_SHORT.agree}`;
  else text += `${cut ? 'c' : 'C'}hybí ${fmt(g)} p. b. k požadavku → ${MOOD_SHORT[d.base]}`;
  if (d.escalated) {
    text += ` · roste pod průměrem systému (${fmt(ctx.avgPct)} %), zatímco jiní dostali víc, než žádali → ${MOOD_SHORT[d.broken ? MOOD_WORSE[d.base] : d.mood]}`;
  }
  if (d.broken) {
    text += ` · slib bez krytí (o ${fmt((Number(nominalPct) || 0) - e)} p. b. méně, než vyhláška slíbila) → ${MOOD_SHORT[d.mood]}`;
  }
  return { gap: round1(gap), base: d.base, mood: d.mood, escalated: d.escalated, broken: d.broken, text };
}

/**
 * Doložené efekty vaší vyhlášky. Directional efekt se aktivuje, když segment
 * roste NADPRŮMĚRNĚ (relativní posílení mění strukturu; stejný růst pro
 * všechny strukturu nemění). Definitional se přepočítává vždy — buď pro
 * jeden segment, nebo pro skupinu (effect.group_segments). Volající předává
 * to, co segmenty skutečně dostanou (effectiveAlloc).
 * @returns {Array<{segment, kind, indicator?, polarity?, strength?, active, above_avg_pb?, note, source}>}
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
          before: round1(before),
          after: round1(after),
          active: true, note: eff.note, source: eff.source,
        });
      } else if (eff.kind === 'directional') {
        const active = eff.active_when === 'above_avg' ? pct > avg : pct > 0;
        out.push({
          segment: s.id, kind: 'directional', indicator: eff.indicator,
          polarity: active ? eff.polarity : null,
          strength: active ? eff.strength : null,
          active, above_avg_pb: round1(pct - avg),
          note: eff.note, source: eff.source, confidence: eff.confidence,
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
 * Verdikt vaší vyhlášky: cena vs. obálka (v dnešních cenách), krytí,
 * počet dohod (vs. reálné DR 2027), posun podílu lůžkového bloku vůči OECD.
 * Dohody se počítají JEN přes vyjednávací segmenty DR (dr_segment !== false)
 * — centrová léčba a zákonné položky se nevyjednávají, takže by srovnání
 * s reálným „12 z 15" zkreslovaly. Nálady se počítají z toho, co segmenty
 * skutečně dostanou (krytí), s relativní spravedlností a nesplněným slibem.
 */
export function verdict(segments, alloc, envelopeMld, scale = 1, reserveMld = 0) {
  const cost = totalCost(segments, alloc, scale);
  const cov = coverageFor(cost, envelopeMld, reserveMld);
  const effective = {};
  for (const s of segments) effective[s.id] = (Number(alloc[s.id]) || 0) * cov.ratio;
  const ctx = moodContext(segments, effective);
  const moods = segments.map(s => {
    const d = moodDetail(s, effective[s.id], ctx, alloc[s.id]);
    return { id: s.id, mood: d.mood, escalated: d.escalated, broken: d.broken };
  });
  const negotiating = segments.filter(s => s.dr_segment !== false);
  const negMoods = moods.filter(m => negotiating.some(s => s.id === m.id));
  const deals = negMoods.filter(m => ['boost', 'agree', 'grudging'].includes(m.mood)).length;
  const boosts = moods.filter(m => m.mood === 'boost').length; // vč. nevyjednávacích (rozšíření péče je reálné i tam)
  const protests = negMoods.filter(m => m.mood === 'protest').length;
  const totalBase = segments.reduce((a, s) => a + s.baseline_mld, 0);
  const luzIds = LUZKOVA_GROUP.filter(id => segments.some(s => s.id === id));
  const before = luzIds.reduce((a, id) => a + segments.find(s => s.id === id).baseline_mld, 0)
    / (totalBase || 1) * 100;
  return {
    cost: round1(cost),
    envelope: envelopeMld,
    reserve: Math.max(0, Number(reserveMld) || 0),
    balance: round1(envelopeMld - cost), // + rezerva / − deficit
    deficit: cost > envelopeMld,
    deficitMld: cov.deficitMld,
    uncoveredMld: cov.uncoveredMld,
    coverage: cov.ratio,
    effective,
    deals,
    segmentsTotal: negotiating.length,
    boosts,
    protests,
    escalations: moods.filter(m => m.escalated).length,
    brokenPromises: moods.filter(m => m.broken).length,
    moods,
    avgPct: round1(ctx.avgPct),
    luzkovaShareBefore: round1(before),
    luzkovaShareAfter: groupShare(segments, effective, luzIds),
  };
}

/** Osy trilematu v pořadí zobrazení. */
export const TRILEMMA_AXES = ['dohody', 'reforma', 'bilance'];
export const TRILEMMA_LABELS = { dohody: 'Dohody', reforma: 'Reforma struktury', bilance: 'Bilance' };

/**
 * Trilema vyhlášky — tři cíle, které nejdou maximalizovat najednou. Prahy
 * jsou modelové (uvedeno v „Jak hra počítá"):
 *  dohody:  good = všichni podepsali; bad = protest nebo < 2/3 dohod; jinak mid
 *  reforma: good = lůžkový blok klesl ≥ 0,3 p. b. (směrem k OECD); bad = roste
 *           o > 0,05 p. b.; jinak mid (plošný růst = beze změny)
 *  bilance: good = v obálce; mid = deficit kryje rezerva systému; bad = nad
 *           rezervu (pojišťovny krátí úhrady)
 * @param {ReturnType<typeof verdict>} v
 */
export function trilemma(v) {
  const need = Math.ceil(v.segmentsTotal * 2 / 3);
  const dohodyTone = v.protests > 0 || v.deals < need ? 'bad' : v.deals === v.segmentsTotal ? 'good' : 'mid';
  const drift = round1(v.luzkovaShareAfter - v.luzkovaShareBefore);
  const reformaTone = drift <= -0.3 ? 'good' : drift <= 0.05 ? 'mid' : 'bad';
  const deficitMld = Math.max(0, round1(v.cost - v.envelope));
  const uncovered = Number.isFinite(v.uncoveredMld) ? v.uncoveredMld : Math.max(0, round1(deficitMld - (v.reserve || 0)));
  const bilanceTone = deficitMld === 0 ? 'good' : uncovered === 0 ? 'mid' : 'bad';
  const axes = {
    dohody: {
      tone: dohodyTone,
      value: `${v.deals} z ${v.segmentsTotal}`,
      note: v.protests ? `${v.protests}× protest` : v.deals === v.segmentsTotal ? 'všichni podepsali' : 'bez protestu',
    },
    reforma: {
      tone: reformaTone,
      value: `${drift > 0 ? '+' : drift < 0 ? '−' : ''}${fmt(Math.abs(drift))} p. b.`,
      note: drift <= -0.3 ? 'lůžkový blok klesá k OECD' : drift > 0.05 ? 'lůžkový blok dál roste' : 'struktura beze změny',
    },
    bilance: {
      tone: bilanceTone,
      value: deficitMld ? `−${fmt(deficitMld)} mld` : `+${fmt(Math.max(0, v.balance))} mld`,
      note: deficitMld === 0 ? 'v obálce' : uncovered === 0 ? 'deficit kryje rezerva' : `nekryto ${fmt(uncovered)} mld — pojišťovny krátí`,
    },
  };
  return {
    axes,
    sacrificed: TRILEMMA_AXES.filter(a => axes[a].tone === 'bad'),
    drift,
    deficitMld,
    uncoveredMld: uncovered,
  };
}

/**
 * Rozklad obálky: kolik stojí plné požadavky všech, kolik z toho nemocnice
 * (akutní lůžková) a co po uspokojení všech ostatních zbude na nemocnice.
 * Čistá aritmetika z dat — pointa „hra je potají jednorozměrná".
 */
export function demandSplit(segments, scale, envelopeMld) {
  const cost = (s) => s.baseline_mld * scale * (s.demand_pct / 100);
  const total = segments.reduce((a, s) => a + cost(s), 0);
  const hospital = segments.filter(s => s.id === 'akutni_luzkova').reduce((a, s) => a + cost(s), 0);
  const others = total - hospital;
  return {
    total: round1(total),
    hospital: round1(hospital),
    others: round1(others),
    leftover: round1(envelopeMld - others),
  };
}

/**
 * „Co si odnést" — nejvýš tři věty vybrané podle toho, co hráč udělal.
 * Pořadí = priorita (nekrytý deficit má přednost — je to dominantní příběh).
 * Čísla se počítají z dat, ne z textu.
 * @param {object} opts  { scale, yearsToOecd }
 * @returns {Array<{id:string, text:string, href?:string}>}
 */
export function takeaways(segments, alloc, v, opts = {}) {
  const out = [];
  const scale = Number.isFinite(opts.scale) ? opts.scale : 1;
  const moodOf = (id) => v.moods.find(m => m.id === id)?.mood;
  const akut = moodOf('akutni_luzkova');
  const vals = segments.map(s => Number(alloc[s.id]) || 0);
  const uniform = vals.length > 0 && vals[0] > 0 && Math.max(...vals) - Math.min(...vals) < 0.001;
  const split = demandSplit(segments, scale, v.envelope);
  const uncovered = Number.isFinite(v.uncoveredMld) ? v.uncoveredMld : 0;

  if (v.deficit && uncovered > 0) {
    out.push({
      id: 'deficit',
      text: `Vyhláška je ${fmt(v.cost - v.envelope)} mld nad obálkou a rezerva systému (${fmt(v.reserve)} mld, necelé dva dny výdajů) kryje jen část: pojišťovny krátí úhrady všem na ${Math.round(v.coverage * 100)} % slibu.${v.brokenPromises ? ` ${v.brokenPromises}× slib bez krytí eskaloval — nesplněný slib bolí víc než poctivá nízká nabídka.` : ''} Štědrost bez peněz je nejdražší vyhláška ze všech.`,
      href: 'clanek-platba-statni-pojistenci-2027-tri-cisla.html',
    });
  } else if (v.deficit) {
    out.push({
      id: 'deficit',
      text: `Vyhláška je ${fmt(v.cost - v.envelope)} mld nad obálkou. Rezerva systému (${fmt(v.reserve)} mld) to letos unese — ale příští rok začínáte bez polštáře a dluh se přenáší dál.`,
      href: 'clanek-platba-statni-pojistenci-2027-tri-cisla.html',
    });
  }
  if (akut === 'no_deal' || akut === 'protest') {
    out.push({
      id: 'dr2027',
      text: `Právě jste zopakovali reálné dohodovací řízení pro rok 2027: akutní lůžková péče skončila bez dohody a o jejích úhradách rozhodla až vyhláška. Nemocnice jsou ${fmt(segments.find(s => s.id === 'akutni_luzkova')?.baseline_share_pct ?? 0)} % systému — jejich požadavek sám stojí ${fmt(split.hospital)} z ${fmt(split.total)} mld všech požadavků.`,
      href: 'clanek-dohodovaci-rizeni-2027-vysledek.html',
    });
  }
  if (uniform) {
    out.push({
      id: 'status_quo',
      text: `Všem stejně je vyhláška většiny let. Struktura se nepohne ani o desetinu procentního bodu — přesně tak vzniká setrvačnost, kvůli které má Česko ${fmt(v.luzkovaShareBefore)} % úhrad v lůžkovém bloku proti ~30 % v OECD.`,
    });
  }
  if (v.escalations > 0) {
    out.push({
      id: 'fairness',
      text: `${v.escalations}× eskalace kvůli relativní spravedlnosti: segment pod průměrem vidí, že jiný dostal víc, než žádal. V dohodovacím řízení je srovnání se sousedem silnější než aritmetika.`,
    });
  }
  if (v.protests > 0 && akut !== 'protest') {
    out.push({
      id: 'protest',
      text: `${v.protests}× protest. Precedent: podzim 2023, kdy hromadné výpovědi lékařů z přesčasů skončily memorandem vlády a ČLK.`,
    });
  }
  const drift = round1(v.luzkovaShareAfter - v.luzkovaShareBefore);
  if (drift <= -0.3) {
    const y = opts.yearsToOecd;
    out.push({
      id: 'reform',
      text: `Lůžkový blok klesl o ${fmt(Math.abs(drift))} p. b. za jeden rok. ${Number.isFinite(y) && y > 0
        ? `Tímhle tempem byste na průměr OECD dosáhli za ${y} let — reforma struktury je práce na generaci.`
        : 'Na průměr OECD je to i tak víc než generace.'}`,
    });
  }
  if (out.length === 0) {
    out.push({
      id: 'one_lever',
      text: `Jediné rozhodnutí, které v téhle hře opravdu bolí, je, kolik ubrat nemocnicím: všech ${segments.length - 1} ostatních segmentů dostane plný požadavek za ${fmt(split.others)} mld — a na nemocnice pak zbude ${fmt(split.leftover)} z ${fmt(split.hospital)} mld, které chtějí.`,
    });
  }
  return out.slice(0, 3);
}

/** Indikátory čekání, jejichž aktivní pokles znamená kratší čekárnu segmentu. */
export const WAIT_INDICATORS = ['cekaci_doby_specialist', 'cekaci_doba_kycel'];

/**
 * Signály čekání pro akt III (Příběh pacienta): u kroků tagovaných segmentem
 * posouvá čas. Modelové mapování z vlastních eskalačních textů hry:
 * boost = segment rozšiřuje hodiny/kapacity → 'kratsi'; aktivní doložený
 * pokles čekání (WAIT_INDICATORS) → 'kratsi'; protest = omezení příjmu
 * pacientů → 'delsi'. Ostatní stavy čekání nemění (nejsou ve výstupu).
 * S `params` (vyhlaskaParams) se počítá z toho, co segmenty skutečně
 * dostanou (krytí) a se slibem; bez params ze slibu samotného.
 * @returns {Object<string, 'kratsi'|'delsi'>}
 */
export function segmentWaitSignals(segments, alloc, params = null) {
  const effective = params ? effectiveAlloc(segments, alloc, params) : alloc;
  const ctx = moodContext(segments, effective);
  const effects = effectsFor(segments, effective);
  const out = {};
  for (const s of segments) {
    const mood = moodFor(s, effective[s.id], ctx, params ? alloc[s.id] : null);
    if (mood === 'protest') { out[s.id] = 'delsi'; continue; }
    const shorter = mood === 'boost' || effects.some(e => e.segment === s.id && e.kind === 'directional'
      && e.active && e.polarity === 'down' && WAIT_INDICATORS.includes(e.indicator));
    if (shorter) out[s.id] = 'kratsi';
  }
  return out;
}
