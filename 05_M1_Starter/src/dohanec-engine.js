// Doháněč — „kdy doženeme OECD?" (balík B plánu Diagnóza, PLAN-DIAGNOZA.md §B)
//
// Čistý výpočetní modul bez DOM. Vstupem je objekt indikátoru
// z data/indicators.json, výstupem verdikt:
//
//   dohanec(indicator) → { status, year, rate, gap, note }
//
//   status: 'catches_up' | 'diverging' | 'already_better' | 'insufficient_data'
//   year:   rok protnutí průměru OECD (jen catches_up; strop 2100), jinak null
//   rate:   průměrná roční změna z trendu (lineární, se znaménkem), 3 des. místa
//   gap:    aktuální rozdíl hodnota − benchmark OECD (se znaménkem), 2 des. místa
//   note:   lidsky čitelné shrnutí (česky)
//
// Metodická poctivost: benchmark OECD držíme KONSTANTNÍ — jde o modelovou
// extrapolaci současného tempa, NE o predikci. Každá note to připomíná.

/** Strop extrapolace — protnutí po tomto roce bereme jako „prakticky nikdy". */
export const ROK_STROP = 2100;

/** Tolerance pro „nulové" tempo (stagnace). */
export const EPS_TEMPO = 1e-9;

/** Krátký disclaimer společný pro všechny výstupy. */
const DISCLAIMER = 'Průměr OECD držíme konstantní — modelová extrapolace, ne predikce.';

/** Konečné číslo? (odmítá null, undefined, NaN, ±Infinity, ne-čísla) */
function jeCislo(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

/** České formátování čísla do note (desetinná čárka, bez zbytečných nul). */
export function czCislo(x, desetin = 3) {
  if (!jeCislo(x)) return '—';
  const zaokrouhleno = Number(x.toFixed(desetin));
  return String(zaokrouhleno).replace('.', ',');
}

/**
 * Sestaví časovou řadu pro výpočet tempa: validní body z trend[]
 * seřazené podle roku + aktuální (value, year) jako poslední bod,
 * pokud je rok novější než poslední bod trendu.
 * Vrací pole [{year, value}] (může být prázdné).
 */
export function sestavRadu(indicator) {
  const trend = Array.isArray(indicator?.trend) ? indicator.trend : [];
  const body = trend
    .filter((b) => b && jeCislo(b.year) && jeCislo(b.value))
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((b) => ({ year: b.year, value: b.value }));
  if (jeCislo(indicator?.value) && jeCislo(indicator?.year)) {
    const posledni = body.length ? body[body.length - 1] : null;
    if (!posledni || indicator.year > posledni.year) {
      body.push({ year: indicator.year, value: indicator.value });
    }
  }
  return body;
}

/**
 * Lineární průměrná roční změna přes celou řadu:
 * (poslední hodnota − první hodnota) / (poslední rok − první rok).
 * Vrací null, když řadu nelze spočítat (< 2 body nebo nulové rozpětí let).
 */
export function prumerneTempo(rada) {
  if (!Array.isArray(rada) || rada.length < 2) return null;
  const prvni = rada[0];
  const posledni = rada[rada.length - 1];
  const rozpetiLet = posledni.year - prvni.year;
  if (rozpetiLet === 0) return null; // ošetření dělení nulou
  return (posledni.value - prvni.value) / rozpetiLet;
}

/** Pomocník na sestavení výsledku insufficient_data s důvodem. */
function nedostatekDat(duvod) {
  return {
    status: 'insufficient_data',
    year: null,
    rate: null,
    gap: null,
    note: `Nedostatek dat pro Doháněč: ${duvod} ${DISCLAIMER}`,
  };
}

/**
 * Doháněč — hlavní funkce. Spočte, kdy ČR při současném tempu
 * dožene (konstantní) průměr OECD.
 *
 * @param {object} indicator — záznam z data/indicators.json
 * @returns {{status: string, year: number|null, rate: number|null, gap: number|null, note: string}}
 */
export function dohanec(indicator) {
  // 1) Vstupní kontroly → insufficient_data
  if (!indicator || typeof indicator !== 'object') {
    return nedostatekDat('chybí indikátor.');
  }
  const oecd = indicator.benchmark?.oecd;
  if (!jeCislo(oecd)) {
    return nedostatekDat('chybí benchmark OECD.');
  }
  const smer = indicator.direction;
  if (smer !== 'higher_is_better' && smer !== 'lower_is_better') {
    return nedostatekDat(
      smer === 'context_dependent'
        ? 'směr indikátoru je závislý na kontextu (nelze říct, co je „lépe").'
        : 'chybí směr indikátoru (direction).'
    );
  }
  if (!jeCislo(indicator.value) || !jeCislo(indicator.year)) {
    return nedostatekDat('chybí aktuální hodnota nebo rok.');
  }
  const trendBodu = Array.isArray(indicator.trend)
    ? indicator.trend.filter((b) => b && jeCislo(b.year) && jeCislo(b.value)).length
    : 0;
  if (trendBodu < 3) {
    return nedostatekDat('trend má méně než 3 body (nelze odhadnout tempo).');
  }

  // 2) Tempo z řady (trend + aktuální bod, pokud je novější)
  const rada = sestavRadu(indicator);
  const tempo = prumerneTempo(rada);
  if (tempo === null) {
    return nedostatekDat('body trendu nepokrývají žádné časové rozpětí (nelze spočítat tempo).');
  }

  // 3) Rozdíl vs. benchmark (se znaménkem) + zaokrouhlené výstupy
  const gapPresne = indicator.value - oecd;
  const gap = Number(gapPresne.toFixed(2));
  const rate = Number(tempo.toFixed(3));
  const jednotka = typeof indicator.unit === 'string' && indicator.unit ? ` ${indicator.unit}` : '';

  // 4) ČR je už na správné straně benchmarku → already_better
  const lepsi =
    (smer === 'higher_is_better' && indicator.value >= oecd) ||
    (smer === 'lower_is_better' && indicator.value <= oecd);
  if (lepsi) {
    return {
      status: 'already_better',
      year: null,
      rate,
      gap,
      note:
        `ČR je už na lepší straně průměru OECD (rozdíl ${czCislo(gapPresne, 2)}${jednotka}) — ` +
        `není co dohánět. ${DISCLAIMER}`,
    };
  }

  // 5) Stagnace nebo tempo směřující OD benchmarku → diverging
  //    (nejsme already_better, takže dohánění = tempo s opačným znaménkem než gap)
  if (Math.abs(tempo) < EPS_TEMPO) {
    return {
      status: 'diverging',
      year: null,
      rate,
      gap,
      note:
        'Při současném tempu průměr OECD nedoženeme — stagnujeme (tempo je prakticky nulové). ' +
        DISCLAIMER,
    };
  }
  if (tempo * gapPresne > 0) {
    return {
      status: 'diverging',
      year: null,
      rate,
      gap,
      note:
        `Při současném tempu průměr OECD nedoženeme — vzdalujeme se ` +
        `(${czCislo(tempo, 3)}${jednotka} ročně špatným směrem). ${DISCLAIMER}`,
    };
  }

  // 6) Doháníme → rok protnutí (od posledního datového bodu řady)
  const rokTed = rada[rada.length - 1].year;
  const rokProtnuti = rokTed + Math.ceil(Math.abs(gapPresne) / Math.abs(tempo));
  if (rokProtnuti > ROK_STROP) {
    return {
      status: 'diverging',
      year: null,
      rate,
      gap,
      note:
        `Při současném tempu prakticky nikdy (za současného tempa až po roce ${ROK_STROP}). ` +
        DISCLAIMER,
    };
  }
  return {
    status: 'catches_up',
    year: rokProtnuti,
    rate,
    gap,
    note:
      `Při současném tempu (${czCislo(tempo, 3)}${jednotka} ročně) doženeme průměr OECD ` +
      `kolem roku ${rokProtnuti}. ${DISCLAIMER}`,
  };
}
