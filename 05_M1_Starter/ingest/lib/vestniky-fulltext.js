// Fulltextový index Věstníků MZ — sdílená tokenizace pro builder
// (build-vestniky-fulltext.js), inkrementální krok fetcheru a frontend
// (src/vestniky.js normalizuje dotaz IDENTICKY, jinak se nic nenajde).
//
// Návrh: invertovaný index term → [id částek]. Termy jsou bez diakritiky,
// lowercase, 4–24 znaků, prefix-stemming na 8 znaků (česká flexe:
// „mamografického" i „mamografie" → „mamograf"). Stopwords drží jen
// nejčastější šum úředního textu.

export const STOPWORDS = new Set([
  'jsou', 'bude', 'budou', 'byla', 'bylo', 'byly', 'jako', 'jeho', 'jeji',
  'jejich', 'ktery', 'ktera', 'ktere', 'kterych', 'kterym', 'kterou', 'nebo',
  'podle', 'pouze', 'take', 'tato', 'tento', 'teto', 'tomto', 'tohoto',
  'aby', 'vsak', 'pokud', 'musi', 'muze', 'mohou', 'byt', 'dle', 'odst',
  'pism', 'zakona', 'ceske', 'ceska', 'republiky', 'republice',
  'zdravotnictvi', 'ministerstva', 'ministerstvo', 'ministerstvem',
  'vestnik', 'vestniku', 'castka', 'castky', 'strana', 'rocnik',
]);

/** Normalizace shodná s frontend hledáním: bez diakritiky, lowercase. */
export function normFt(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Text → Set termů (normalizace + prefix-8 stemming + stopwords). */
export function tokenize(text) {
  const out = new Set();
  for (const m of normFt(text).matchAll(/[a-z][a-z0-9]{3,23}/g)) {
    const t = m[0];
    if (STOPWORDS.has(t)) continue;
    out.add(t.length > 8 ? t.slice(0, 8) : t);
  }
  return out;
}

/** Dotaz → pole termů stejnou normalizací (pro frontend i testy). */
export function queryTerms(q) {
  return [...tokenize(q)];
}

/** Vloží dokument do indexu (mutuje index.termy; idempotentní přes zpracovano). */
export function pridejDoIndexu(index, castkaId, text) {
  if (index.zpracovano.includes(castkaId)) return false;
  for (const t of tokenize(text)) {
    (index.termy[t] ??= []).push(castkaId);
  }
  index.zpracovano.push(castkaId);
  return true;
}

/** Prázdný obal indexu. */
export function novyIndex() {
  return {
    version: '1.0',
    pozn: 'Invertovaný fulltextový index PDF věstníků: term (bez diakritiky, prefix 8 znaků) '
      + '→ id částek. Kryje částky s extrahovatelným PDF (od ~2006; nejstarší ročníky '
      + '1998–2005 jsou na webu MZ jen jako ZIP a v indexu nejsou). Vyhledávání vrací '
      + 'částky, ne úryvky — úřední znění je vždy v PDF.',
    zpracovano: [],
    termy: {},
  };
}
