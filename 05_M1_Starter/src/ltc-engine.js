// Model „Kdo se o nás postará v roce 2035“ — čistá logika bez DOM.
//
// Přerozděluje poptávku po dlouhodobé péči o seniory (65+) v roce 2035 mezi
// pobytové služby, terénní služby a rodiny podle toho, kolik lůžek a kolik
// pečovatelů bude k dispozici. Parametry (kapacity, počty klientů, jednotkové
// náklady, přepočty) jsou v data/ltc-scenare.json a pocházejí ze studie
// Deloitte pro APSS ČR (2026), každý s citací a stranou.
//
// Logika (věrná scénářům studie, ne vlastní predikce):
//  1. Pobytová péče obslouží nejvýš tolik klientů, kolik unesou lůžka
//     (clients_per_bed). Poptávka základního scénáře je 135 tis.; nad ni může
//     pobytová péče pohltit přírůstek terénní a neformální péče (scénář 2).
//  2. Kdo se do pobytové péče nevejde, jde nejdřív do terénních služeb —
//     ale jen část (divert_share, studie max. 40 %, zbytek má příliš vysokou
//     závislost) a jen když na to terén má pečovatele (clients_per_fte).
//  3. Všechno ostatní nesou rodiny (neformální péče): osoby → pečující dny →
//     ekvivalent plných úvazků (days_per_fte).
//  4. Náklady = klienti × jednotkový náklad 2035 (reálné ceny). U neformální
//     péče je „náklad“ jen příspěvek na péči — práce rodin v rozpočtu není.
//
// Používá src/ltc-kalkulacka.js (render) a tests/ltc-engine.test.js.

const TYPES = ['ds', 'dzr', 'other'];

/** Součet hodnot objektu {ds, dzr, other}. */
function sum(obj) {
  return TYPES.reduce((n, k) => n + (obj[k] ?? 0), 0);
}

/** Podíly {ds, dzr, other} z absolutního rozdělení. */
function shares(split) {
  const total = sum(split);
  return Object.fromEntries(TYPES.map(k => [k, total ? split[k] / total : 0]));
}

/** Přepočte parametry z data/ltc-scenare.json na interní tvar modelu. */
export function paramsFromData(d) {
  const b = d.baseline_2024;
  const z = d.base_2035;
  const m = d.model;
  return {
    beds2024: b.residential.beds,
    res2024: { ...b.residential.clients },
    ter2024: b.terenni.clients,
    fte2024: b.terenni.fte,
    inf2024: b.neformalni.persons,
    infDays2024: b.neformalni.days,
    infFte2024: b.neformalni.fte,
    cost2024: b.system_cost_mld,
    unit2024: { ...b.unit_costs_tis_kc },

    resZs: { ...z.residential.clients },
    terZs: z.terenni.clients,
    fteZs: z.terenni.fte,
    infZs: z.neformalni.persons,
    infDaysZs: z.neformalni.days,
    unit: { ...z.unit_costs_tis_kc },
    unitInfAdded: z.unit_cost_neformalni_added_tis_kc,

    // Odvozeno přesně z tabulky (135 000 / 111 000), aby základní scénář
    // nevykazoval falešný výpadek z pouhého zaokrouhlení konstanty.
    clientsPerBed: sum(z.residential.clients) / z.residential.beds,
    clientsPerFte: m.clients_per_fte,
    divertMax: m.divert_share_max,
    shortfallShare: shares(m.shortfall_split),
    extraShare: shares(m.extra_split),
    growthTer: m.growth_terenni_2035,
    growthInf: m.growth_neformalni_2035,
    daysPerAdded: m.days_per_added_person,
    daysPerFte: m.days_per_fte,
    investPerBedMil: m.investment_per_bed_mil_kc,
  };
}

/**
 * Spočítá rozdělení péče v roce 2035 pro zadané kapacity.
 * @param {{beds: number, fte: number, divertShare: number}} inputs
 * @param {object} P  parametry z paramsFromData()
 */
export function simulate(inputs, P) {
  const beds = Math.max(0, Number(inputs.beds) || 0);
  const fte = Math.max(0, Number(inputs.fte) || 0);
  const divertShare = Math.min(P.divertMax, Math.max(0, Number(inputs.divertShare) || 0));

  const demandRes = sum(P.resZs);                       // 135 tis.
  const demandResMax = demandRes + P.growthTer + P.growthInf; // 231 tis. (scénář 2)
  const capRes = beds * P.clientsPerBed;
  const servedRes = Math.min(capRes, demandResMax);

  // Výpadek pobytové péče (lůžek je míň, než chce demografie) …
  const shortfall = Math.max(0, demandRes - servedRes);
  // … nebo naopak přebytek, který pohltí přírůstek terénu a rodin (scénář 2).
  const extra = Math.max(0, servedRes - demandRes);
  const extraTer = Math.min(extra, P.growthTer);
  const extraInf = Math.min(Math.max(0, extra - extraTer), P.growthInf);

  const resByType = Object.fromEntries(TYPES.map(k => [
    k,
    P.resZs[k] - shortfall * P.shortfallShare[k] + extra * P.extraShare[k],
  ]));

  // Terén: základní poptávka minus to, co si vzala pobytová péče; navíc část
  // lidí bez lůžka — jen kolik dovolí závislost (divertShare) a pečovatelé.
  const demandTerBase = P.terZs - extraTer;
  const capTer = fte * P.clientsPerFte;
  const servedTerBase = Math.min(demandTerBase, capTer);
  const terShortfall = demandTerBase - servedTerBase;          // základní terén bez pečovatelů → rodiny
  const roomTer = Math.max(0, capTer - servedTerBase);
  const divertWanted = shortfall * divertShare;
  const diverted = Math.min(divertWanted, roomTer);
  const servedTer = servedTerBase + diverted;

  // Rodiny nesou zbytek.
  const infBase = P.infZs - extraInf;
  const infAdded = (shortfall - diverted) + terShortfall;
  const infPersons = infBase + infAdded;
  const daysPerBase = P.infDaysZs / P.infZs;
  const infDays = infBase * daysPerBase + infAdded * P.daysPerAdded;
  const infFte = infDays / P.daysPerFte;
  const infAddedFte = infAdded * P.daysPerAdded / P.daysPerFte;

  // Náklady (mld. Kč, reálné ceny 2035).
  const costRes = TYPES.reduce((n, k) => n + resByType[k] * P.unit[k], 0) / 1e6;
  const costTer = servedTer * P.unit.terenni / 1e6;
  const costInf = (infBase * P.unit.neformalni + infAdded * P.unitInfAdded) / 1e6;
  const costTotal = costRes + costTer + costInf;

  const investmentMld = Math.max(0, beds - P.beds2024) * P.investPerBedMil / 1e3;

  return {
    inputs: { beds, fte, divertShare },
    residential: {
      capacity: capRes,
      served: servedRes,
      byType: resByType,
      demand: demandRes,
      shortfall,
      extra,
      extraFromTer: extraTer,
      extraFromInf: extraInf,
    },
    terenni: {
      demandBase: demandTerBase,
      capacity: capTer,
      servedBase: servedTerBase,
      diverted,
      divertWanted,
      shortfall: terShortfall,
      served: servedTer,
    },
    neformalni: {
      base: infBase,
      added: infAdded,
      persons: infPersons,
      days: infDays,
      fte: infFte,
      addedFte: infAddedFte,
    },
    costs: { res: costRes, ter: costTer, inf: costInf, total: costTotal },
    investmentMld,
    personsTotal: servedRes + servedTer + infPersons,
  };
}

/** Výchozí (základní) scénář studie pro srovnání. */
export function baseline(P) {
  return simulate({ beds: sum(P.resZs) / P.clientsPerBed, fte: P.fteZs, divertShare: P.divertMax }, P);
}

/** Referenční hodnoty roku 2024 ve stejném tvaru jako výstup simulate(). */
export function year2024(P) {
  return {
    residential: { served: sum(P.res2024), byType: { ...P.res2024 } },
    terenni: { served: P.ter2024 },
    neformalni: { persons: P.inf2024, days: P.infDays2024, fte: P.infFte2024 },
    costs: {
      res: TYPES.reduce((n, k) => n + P.res2024[k] * P.unit2024[k], 0) / 1e6,
      ter: P.ter2024 * P.unit2024.terenni / 1e6,
      inf: P.inf2024 * P.unit2024.neformalni / 1e6,
      total: P.cost2024,
    },
    personsTotal: sum(P.res2024) + P.ter2024 + P.inf2024,
  };
}

/** Zaokrouhlení na tisíce — výstupy modelu nejsou přesnější než vstupy. */
export function roundThousands(n) {
  return Math.round(n / 1000) * 1000;
}
