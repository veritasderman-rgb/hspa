// JSON-stat 2.0 parser.
// Sdílený mezi ČSÚ DataStat (M3) a Eurostat (M4) — oba vrací JSON-stat 2.0.
// Spec: https://json-stat.org/

/**
 * Detekuje, zda objekt vypadá jako JSON-stat dataset (2.0 nebo 1.x v obálce).
 */
export function isJsonStat(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj?.value && obj?.dimension && obj?.id && obj?.size) return true;
  if (obj?.dataset?.value && obj?.dataset?.dimension) return true;
  return false;
}

/**
 * Parsuj JSON-stat dataset na ploché observace.
 * @param {any} input — buď přímý dataset nebo {dataset:{...}} obálka
 * @returns {Array<Record<string, any>>} každá položka má klíče dimenzí + value
 */
export function parseJsonStat(input) {
  const ds = input?.dataset?.value && input?.dataset?.dimension ? input.dataset : input;
  if (!ds?.value || !ds?.dimension || !ds?.id || !ds?.size) return [];

  const dims = ds.id.map(id => ({
    id,
    codes: extractCategoryCodes(ds.dimension[id]?.category),
  }));

  const out = [];
  const total = ds.size.reduce((a, b) => a * b, 1);
  for (let i = 0; i < total; i++) {
    const v = Array.isArray(ds.value) ? ds.value[i] : ds.value[String(i)];
    if (v == null) continue;
    const idx = unflatten(i, ds.size);
    const tags = {};
    dims.forEach((d, k) => { tags[d.id] = d.codes[idx[k]]; });
    out.push({ ...tags, value: Number(v) });
  }
  return out;
}

/**
 * Z `category` objektu (typicky `{index, label}`) vytáhne pole kódů
 * v pořadí podle indexu.
 */
function extractCategoryCodes(category) {
  if (!category) return [];
  const idx = category.index;
  if (Array.isArray(idx)) return idx;
  if (idx && typeof idx === 'object') {
    return Object.keys(idx).sort((a, b) => idx[a] - idx[b]);
  }
  // Fallback: pouze label → klíče v původním pořadí
  if (category.label && typeof category.label === 'object') return Object.keys(category.label);
  return [];
}

function unflatten(index, sizes) {
  const out = new Array(sizes.length);
  let rem = index;
  for (let k = sizes.length - 1; k >= 0; k--) {
    out[k] = rem % sizes[k];
    rem = Math.floor(rem / sizes[k]);
  }
  return out;
}

/**
 * Z observací vrátí poslední (nejnovější rok). Time dimension může být
 * pojmenovaná různě — vyzkouší 'time', 'cas', 'rok', 'year', 'TIME_PERIOD'.
 */
export function pickLatestByYear(observations) {
  if (!observations.length) return null;
  return observations.reduce((best, o) => {
    const year = extractYear(o);
    const bestYear = best ? extractYear(best) : -Infinity;
    return year > bestYear ? o : best;
  }, null);
}

export function extractYear(obs) {
  const v = obs?.time ?? obs?.cas ?? obs?.rok ?? obs?.year ?? obs?.TIME_PERIOD ?? null;
  if (v == null) return -Infinity;
  const n = Number(v);
  return Number.isFinite(n) ? n : -Infinity;
}
