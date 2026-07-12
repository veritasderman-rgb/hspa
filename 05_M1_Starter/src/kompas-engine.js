// Osobní zdravotní kompas — čistý výpočetní engine (bez DOM, testovatelný).
//
// Filtruje preventivní checky (data/personal-checks.json) podle profilu
// {age, sex, smoking} a počítá krajský kontext z data/regions.json.
// Informace, NE lékařská rada. Viz PLAN-KOMPAS-OSOBNI.md.

const CATEGORY_ORDER = { prohlidka: 0, screening: 1, ockovani: 2 };

/**
 * Týká se check daného profilu? Věk v rozsahu, pohlaví sedí, risk gate splněn.
 * @param {object} check
 * @param {{age?:number, sex?:'male'|'female', smoking?:boolean}} profile
 */
export function checkApplies(check, profile = {}) {
  const { age, sex, smoking } = profile;
  if (Number.isFinite(age)) {
    if (Number.isFinite(check.age_min) && age < check.age_min) return false;
    if (Number.isFinite(check.age_max) && check.age_max != null && age > check.age_max) return false;
  }
  if (check.sex && check.sex !== 'all' && sex && check.sex !== sex) return false;
  if (check.requires_risk === 'smoking' && !smoking) return false;
  return true;
}

/**
 * Vrátí checky, které se profilu týkají, seřazené podle kategorie
 * (prohlídka → screening → očkování), v rámci kategorie dle age_min.
 */
export function applicableChecks(checks, profile = {}) {
  return (checks || [])
    .filter(c => checkApplies(c, profile))
    .sort((a, b) => {
      const ca = CATEGORY_ORDER[a.category] ?? 9;
      const cb = CATEGORY_ORDER[b.category] ?? 9;
      if (ca !== cb) return ca - cb;
      return (a.age_min ?? 0) - (b.age_min ?? 0);
    });
}

/**
 * Krajský kontext pro dataset a kód kraje.
 * @returns {null|{value, country_avg, unit, year, rank, of, direction, better}}
 *   better: true = kraj je na příznivé straně průměru, false = nepříznivé,
 *   null = na průměru nebo směr context_dependent.
 */
export function regionStat(dataset, krajCode) {
  if (!dataset || !Array.isArray(dataset.regions) || !krajCode) return null;
  const row = dataset.regions.find(r => r.code === krajCode);
  if (!row || !Number.isFinite(row.value)) return null;

  const values = dataset.regions.filter(r => Number.isFinite(r.value));
  const dir = dataset.direction;
  // Pořadí: 1 = nejlepší dle směru.
  const sorted = [...values].sort((a, b) =>
    dir === 'lower_is_better' ? a.value - b.value : b.value - a.value);
  const rank = sorted.findIndex(r => r.code === krajCode) + 1;

  let better = null;
  if (Number.isFinite(dataset.country_avg) && dir !== 'context_dependent') {
    if (row.value === dataset.country_avg) better = null;
    else if (dir === 'higher_is_better') better = row.value > dataset.country_avg;
    else if (dir === 'lower_is_better') better = row.value < dataset.country_avg;
  }

  return {
    value: row.value,
    country_avg: Number.isFinite(dataset.country_avg) ? dataset.country_avg : null,
    unit: dataset.unit || '',
    year: dataset.year ?? null,
    rank,
    of: values.length,
    direction: dir,
    better,
  };
}
