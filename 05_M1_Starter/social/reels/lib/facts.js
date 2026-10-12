// Společná faktová kázeň všech stylů (Kompík, Florence): fakta s citací z článku
// a žádné napsané číslo, které by nebylo doložené faktem.

export const NUM_RE = /\d+(?:[\s  ]\d{3})*(?:[.,]\d+)?/g;

const norm = x => String(x).replace(/[\s  ]/g, '').replace('.', ',');

/** "16,1" → 16.1 ; "1,05 mil." → 1.05 */
export function parseValue(v) {
  const m = String(v).replace(/\s/g, '').match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : NaN;
}

/** Tvar `facts[]`: každý fakt má id, value, source a doslovnou citaci z článku. */
export function checkFacts(facts, err) {
  facts.forEach((f, i) => {
    for (const k of ['id', 'value', 'source', 'quote']) if (!f[k]) err(`facts[${i}]: chybí ${k}`);
  });
}

/**
 * Každé číslo napsané ve viditelném textu beatů (klíče `keys`) musí být hodnota
 * nebo rok faktu, nebo číslo z citace některého faktu.
 */
export function checkNumbers(beats, facts, err, keys = ['line', 'text', 'label', 'cta']) {
  const allowed = new Set();
  facts.forEach(f => {
    allowed.add(norm(f.value));
    if (f.year) allowed.add(String(f.year));
    (String(f.quote || '').match(NUM_RE) || []).forEach(n => allowed.add(norm(n)));
  });
  beats.forEach((b, i) => {
    for (const key of keys) {
      for (const n of String(b[key] || '').match(NUM_RE) || []) {
        if (!allowed.has(norm(n))) err(`beat ${i + 1} (${b.type}): číslo „${n}" v \`${key}\` není hodnota, rok ani číslo z citace žádného faktu — doplň fakt s citací z článku`);
      }
    }
  });
}
