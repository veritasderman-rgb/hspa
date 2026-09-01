// Vyhodnocení plnění strategií — čistá logika bez DOM závislostí.
//
// Odpovídá na otázku „plní se to?" tam, kde to jde poctivě: u indikátorů
// dokumentu mapovaných PŘÍMO (match: primo) s číselně srovnatelnou výchozí
// hodnotou, cílem a naší aktuální hodnotou spočítá pozici na trajektorii
// výchozí stav → cíl. Všude jinde říká proč to nejde — proxy se proti cílům
// dokumentu číselně nesrovnává nikdy (jiná metodika), „chybi" nemá data.
//
// Pozice ≠ predikce: říká, kde jsme DNES mezi výchozím stavem a cílem,
// ne jestli trend do cílového roku vydrží.
//
// Používá src/strategie-plneni.js (render) a tests/plneni-eval.test.js.

/**
 * Parsuje jedno české číslo z hodnoty dokumentu („15,9 %", „79,9 let",
 * „1 234"). Vrací null, když řetězec nenese právě jedno číslo — složené
 * hodnoty („muži 62,7 / ženy 64,0") se poctivě nesrovnávají.
 */
export function parseCzNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/[  ]/g, ' ').trim();
  if (!s) return null;
  // interval s pomlčkou mezi čísly („5–10 %") je složená hodnota
  if (/\d\s*[–—-]\s*\d/.test(s)) return null;
  // pomlčka jako prozaický oddělovač („0 center — pilíř v roce 2013…"):
  // hodnotu nese část před ní
  s = s.split(/[–—]/)[0].trim();
  if (!s) return null;
  // složené hodnoty a výčty nezkoušet
  if (/[/;]| a | až /.test(s)) return null;
  // jmenovatel není druhé číslo: „256,8 na 100 000 obyvatel" → „256,8",
  // „1 CDZ na cca 100 000" → „1 CDZ"
  s = s.replace(/\s*(?:na|z)\s+(?:cca\s*)?\d[\d\s]*(?:tis\.?|obyvatel\w*|pojištěnc\w*|narozených|osob|dětí|žen|mužů)?/gi, ' ');
  // spojit tisícové mezery: „1 234" → „1234"
  s = s.replace(/(\d)\s+(?=\d{3}\b)/g, '$1');
  const matches = s.match(/-?\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length !== 1) return null;
  return Number(matches[0].replace(',', '.'));
}

/** Interní: bezpečné vytažení cíle (target_2035 = starší pojmenování). */
export function targetOf(x) {
  return x?.target_2035 ?? x?.target ?? null;
}

/**
 * Pozice na trajektorii výchozí stav → cíl dokumentu.
 *
 * @returns {{status: string, progressPct?: number, reason?: string}}
 *  status: 'splneno' | 'na-ceste' | 'beze-zmeny' | 'opacny-smer' | 'nelze'
 *  progressPct: 0–100+ podíl uražené cesty (jen u číselných verdiktů)
 *  reason: proč nelze (jen u 'nelze')
 */
export function computeTrajectory({ baselineValue, baselineYear, targetValue, current, currentYear }) {
  const b = parseCzNumber(baselineValue);
  const t = parseCzNumber(targetValue);
  const c = typeof current === 'number' ? current : parseCzNumber(current);
  if (b == null || t == null || c == null) {
    return { status: 'nelze', reason: 'hodnoty nejde číselně srovnat' };
  }
  // Posun jde měřit jen na novějších datech: stejný rok jako výchozí stav
  // srovnává metodiky zdrojů, ne vývoj v čase.
  if (currentYear != null && baselineYear != null && currentYear <= baselineYear) {
    return { status: 'nelze', reason: `naše hodnota (${currentYear}) není novější než výchozí stav dokumentu (${baselineYear}) — posun zatím nelze měřit` };
  }
  // Výchozí stav a cíl řádově jinde (typicky rok v textu místo hodnoty,
  // „program spuštěn 2024" vs. cíl 30 %) — nesrovnávat.
  const bigger = Math.max(Math.abs(b), Math.abs(t));
  const smaller = Math.max(Math.min(Math.abs(b), Math.abs(t)), 1e-9);
  if (b !== 0 && t !== 0 && bigger / smaller > 50) {
    return { status: 'nelze', reason: 'výchozí stav a cíl jsou řádově jinde — nejde o stejnou veličinu' };
  }
  // Naše hodnota řádově jinde než výchozí stav (počet zařízení vs. míra
  // na 100 tisíc) — jednotky se rozcházejí, nesrovnávat.
  if (b !== 0 && c !== 0 && Math.max(Math.abs(c) / Math.abs(b), Math.abs(b) / Math.abs(c)) > 25) {
    return { status: 'nelze', reason: 'naše hodnota je řádově jinde než výchozí stav dokumentu — nejspíš jiné jednotky' };
  }
  const span = t - b;
  if (span === 0) {
    return { status: 'nelze', reason: 'cíl dokumentu je shodný s výchozím stavem' };
  }
  const p = (c - b) / span;
  // Řádový/metodický nesoulad — poctivě přiznat, ne hlásit falešný verdikt:
  // víc než celá dráha zpátky (p < −1), nebo trojnásobek dráhy dopředu.
  if (!Number.isFinite(p) || p < -1 || p > 3) {
    return { status: 'nelze', reason: 'hodnota se od trajektorie dokumentu řádově liší — nejspíš jiná metodika měření' };
  }
  const progressPct = Math.round(p * 100);
  if (p >= 0.999) return { status: 'splneno', progressPct };
  if (p >= 0.05) return { status: 'na-ceste', progressPct };
  if (p > -0.05) return { status: 'beze-zmeny', progressPct };
  return { status: 'opacny-smer', progressPct };
}

/** Popisky verdiktů — vždy text, nikdy jen barva. */
export const VERDICT_LABEL = {
  splneno: 'cíl už splněn',
  'na-ceste': 'míří k cíli',
  'beze-zmeny': 'zatím beze změny',
  'opacny-smer': 'vzdaluje se od cíle',
  nelze: 'číselně nesrovnatelné',
  sledujeme: 'sledujeme (proxy)',
  nemerime: 'nikdo veřejně neměří',
};

/**
 * Zařadí jeden indikátor dokumentu do právě jednoho koše vyhodnocení.
 * @param {object} di   indikátor dokumentu (baseline, target/target_2035, mapping)
 * @param {object|null} ind  živý indikátor kontraktu (value, year) — jen u primo/proxy
 */
export function evaluateDocIndicator(di, ind) {
  const match = di?.mapping?.match;
  if (match !== 'primo' && match !== 'proxy') {
    return { bucket: 'nemerime' };
  }
  if (match === 'proxy' || !ind || ind.value == null) {
    // Proxy nikdy nesrovnáváme proti cílům dokumentu — jiná metodika.
    return { bucket: 'sledujeme' };
  }
  const tg = targetOf(di);
  const traj = computeTrajectory({
    baselineValue: di.baseline?.value,
    baselineYear: di.baseline?.year,
    targetValue: tg?.value,
    current: ind.value,
    currentYear: ind.year,
  });
  if (traj.status === 'nelze') {
    return { bucket: 'sledujeme', trajectory: traj };
  }
  return { bucket: traj.status, trajectory: traj };
}

/** Pořadí košů ve scoreboardu (sémantické, ne podle velikosti). */
export const BUCKET_ORDER = ['splneno', 'na-ceste', 'beze-zmeny', 'opacny-smer', 'sledujeme', 'nemerime'];

/**
 * Agregace přes všechny indikátory dokumentu (rámcové + per cíl).
 * @returns {{counts: object, total: number, perSc: Map}}
 */
export function aggregateScore(plneni, indMap) {
  const counts = Object.fromEntries(BUCKET_ORDER.map(b => [b, 0]));
  const perSc = new Map();
  const get = (id) => (id ? indMap.get(id) ?? null : null);

  const evalList = (list, key) => {
    const local = Object.fromEntries(BUCKET_ORDER.map(b => [b, 0]));
    for (const di of list ?? []) {
      const { bucket } = evaluateDocIndicator(di, get(di.mapping?.indicator_id));
      counts[bucket]++;
      local[bucket]++;
    }
    if (key != null) perSc.set(key, local);
    return local;
  };

  evalList(plneni.ramcove_indikatory, '_ramec');
  for (const sc of plneni.cile ?? []) evalList(sc.doc_indicators, sc.sc);

  const total = Object.values(counts).reduce((a, v) => a + v, 0);
  return { counts, total, perSc };
}
