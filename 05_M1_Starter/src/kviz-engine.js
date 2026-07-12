// Kvíz — „Otestujte se z českého zdravotnictví" (kviz.html).
//
// Čistý výpočetní modul bez DOM a bez fetch (testovatelný v node:test).
// Otázky se negenerují ručně, ale ŽIVĚ z datového kontraktu
// (data/indicators.json) — správnou odpověď určuje aktuální hodnota
// indikátoru, ne redakce. Tři typy otázek:
//
//   'vs_oecd'   — Je ČR NAD, nebo POD průměrem OECD? (jen tam, kde se
//                 hodnoty liší aspoň o 5 %, ať otázka není chyták)
//   'guess'     — Tipněte hodnotu na posuvníku (tolerance ±25 %)
//   'direction' — Když tohle číslo roste, je to pro zdraví dobře? (z pole
//                 direction; context_dependent se vynechává)
//
// UI vrstva: src/kviz.js. Náhodu dodává volající (rng) — engine je
// deterministický, testy používají seedovaný generátor.

/** Konečné číslo? */
function jeCislo(x) {
  return typeof x === 'number' && Number.isFinite(x);
}

/** Tolerance tipu na posuvníku (± % skutečné hodnoty). */
export const GUESS_TOLERANCE_PCT = 25;

/** Minimální relativní rozdíl ČR vs. OECD pro typ vs_oecd (ať není chyták). */
export const VS_OECD_MIN_DIFF = 0.05;

/**
 * Indikátory způsobilé pro daný typ otázky.
 *
 * @param {Array<object>} indicators — pole .indicators z data/indicators.json
 * @param {'vs_oecd'|'guess'|'direction'} type
 * @returns {Array<object>}
 */
export function eligibleFor(indicators, type) {
  if (!Array.isArray(indicators)) return [];
  return indicators.filter((i) => {
    if (!i || !jeCislo(i.value) || !i.name || !i.unit) return false;
    if (type === 'vs_oecd') {
      if (!jeCislo(i.benchmark?.oecd)) return false;
      const ref = Math.max(Math.abs(i.benchmark.oecd), 1e-9);
      return Math.abs(i.value - i.benchmark.oecd) / ref >= VS_OECD_MIN_DIFF;
    }
    if (type === 'guess') {
      // posuvník potřebuje kladnou hodnotu a rozumné měřítko
      return i.value > 0;
    }
    if (type === 'direction') {
      return i.direction === 'higher_is_better' || i.direction === 'lower_is_better';
    }
    return false;
  });
}

/** Hezká horní mez posuvníku: ~2× max(hodnota, OECD), zaokrouhleno nahoru. */
export function sliderMax(value, oecd) {
  const zaklad = 2 * Math.max(value, jeCislo(oecd) ? oecd : 0);
  if (zaklad <= 0) return 1;
  // zaokrouhli na 1/2/5 × 10^n nahoru
  const rad = 10 ** Math.floor(Math.log10(zaklad));
  for (const nasobek of [1, 2, 5, 10]) {
    if (nasobek * rad >= zaklad) return nasobek * rad;
  }
  return 10 * rad;
}

/** Krok posuvníku odvozený z počtu desetinných míst hodnoty. */
export function sliderStep(max) {
  if (max <= 2) return 0.1;
  if (max <= 20) return 0.5;
  if (max <= 200) return 1;
  return Math.max(1, 10 ** (Math.floor(Math.log10(max)) - 2));
}

/** Fisher–Yates s dodaným rng (deterministické pro testy). */
function zamichej(pole, rng) {
  const out = [...pole];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Společná datová kostra otázky z indikátoru. */
function zaklad(ind, type) {
  return {
    type,
    id: ind.id,
    name: ind.name,
    unit: ind.unit,
    year: jeCislo(ind.year) ? ind.year : null,
    value: ind.value,
    oecd: jeCislo(ind.benchmark?.oecd) ? ind.benchmark.oecd : null,
    direction: ind.direction ?? null,
  };
}

/**
 * Sestaví sadu otázek — mix typů, každý indikátor max 1×.
 *
 * @param {Array<object>} indicators
 * @param {{count?: number, rng?: () => number}} [opts]
 * @returns {Array<object>} otázky; každá nese vše pro položení, vyhodnocení
 *   i vysvětlení (hodnota, OECD, rok, odkazový id indikátoru)
 */
export function buildQuestions(indicators, { count = 10, rng = Math.random } = {}) {
  const typy = ['vs_oecd', 'guess', 'direction'];
  const pouzite = new Set();
  const otazky = [];

  // Předmíchané fronty kandidátů per typ.
  const fronty = Object.fromEntries(
    typy.map((t) => [t, zamichej(eligibleFor(indicators, t), rng)])
  );

  let t = 0;
  let vycerpano = 0;
  while (otazky.length < count && vycerpano < typy.length) {
    const type = typy[t % typy.length];
    t += 1;
    const fronta = fronty[type];
    let ind = null;
    while (fronta.length) {
      const kandidat = fronta.pop();
      if (!pouzite.has(kandidat.id)) { ind = kandidat; break; }
    }
    if (!ind) { vycerpano += 1; continue; }
    vycerpano = 0;
    pouzite.add(ind.id);

    const q = zaklad(ind, type);
    if (type === 'vs_oecd') {
      q.correct = ind.value > ind.benchmark.oecd; // true = ČR nad průměrem
    } else if (type === 'guess') {
      q.min = 0;
      q.max = sliderMax(ind.value, q.oecd);
      q.step = sliderStep(q.max);
      q.tolerancePct = GUESS_TOLERANCE_PCT;
    } else {
      q.correct = ind.direction === 'higher_is_better'; // true = růst je dobře
    }
    otazky.push(q);
  }
  return otazky;
}

/**
 * Vyhodnotí odpověď.
 *
 * @param {object} q — otázka z buildQuestions
 * @param {boolean|number} answer — vs_oecd/direction: boolean; guess: číslo
 * @returns {{correct: boolean, deltaPct?: number}}
 */
export function evaluateAnswer(q, answer) {
  if (!q) return { correct: false };
  if (q.type === 'guess') {
    if (!jeCislo(answer)) return { correct: false };
    const deltaPct = (Math.abs(answer - q.value) / Math.max(Math.abs(q.value), 1e-9)) * 100;
    return { correct: deltaPct <= (q.tolerancePct ?? GUESS_TOLERANCE_PCT), deltaPct };
  }
  return { correct: answer === q.correct };
}

/**
 * Slovní verdikt podle skóre (5 pásem).
 *
 * @param {number} correct
 * @param {number} total
 * @returns {{tier: number, title: string, text: string}}
 */
export function scoreVerdict(correct, total) {
  const podil = total > 0 ? correct / total : 0;
  if (podil >= 0.9) return {
    tier: 5, title: 'Datový chirurg',
    text: 'Tohle už není odhad, to je diagnóza. Čtete český systém líp než většina lidí, kteří o něm rozhodují.',
  };
  if (podil >= 0.7) return {
    tier: 4, title: 'Atestovaný pozorovatel',
    text: 'Solidní orientace — víte, kde systém tlačí bota. Pár čísel vás ještě překvapilo, a to je dobře: přesně od toho ten portál je.',
  };
  if (podil >= 0.5) return {
    tier: 3, title: 'Poučený pacient',
    text: 'Půlka na půlku. Intuice vás vede správně, ale čísla umí zaskočit — mrkněte na indikátory u otázek, kde jste vedle.',
  };
  if (podil >= 0.3) return {
    tier: 2, title: 'Čekárna překvapení',
    text: 'České zdravotnictví je jiné, než se o něm povídá — někde lepší, jinde horší. Dobrá zpráva: teď už víte, kde se dívat.',
  };
  return {
    tier: 1, title: 'První prohlídka',
    text: 'Skoro všechno bylo jinak? Nevadí — většina veřejné debaty se plete stejně. Každá otázka odkazuje na indikátor, kde je celý příběh.',
  };
}
