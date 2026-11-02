// Agregáty odpovědí na dotazníky: sdílí je GET /api/dotaznik?agregace=1
// a scripts/export-dotaznik.js (→ data/pojistovny-dotaznik-agregaty.json).
//
// Pravidla zveřejnění:
//  - jen otázky s nabídkou (`moznosti`) a jen hodnoty z nabídky; volné texty
//    se nezveřejňují nikdy,
//  - každá hodnota z nabídky je v agregátu (i s nulou), aby graf neskákal,
//  - méně než MIN_ODPOVEDI odpovědí v sadě → agregát se skryje (`skryto: true`),
//    protože tři a méně řádků u adresných sad by dovolilo přiřadit odpověď
//    konkrétní instituci.

import { flattenOtazky, questionKind } from './_dotaznik-validate.js';

export const MIN_ODPOVEDI = 3;

/**
 * @param {object} def       sada z pojistovny-otazky.json
 * @param {Array}  aggRows   řádky view dotaznik_agregace pro sadu: {otazka_id, hodnota, pocet}
 * @param {Array}  typRows   řádky {respondent_typ, pocet}
 */
export function buildSadaAgregaty(def, aggRows, typRows) {
  const respondentTypy = {};
  let pocet = 0;
  for (const r of typRows ?? []) {
    const n = Number(r.pocet) || 0;
    respondentTypy[r.respondent_typ] = n;
    pocet += n;
  }
  const out = { otazky: {}, pocet_odpovedi: pocet, respondent_typy: respondentTypy };
  if (pocet < MIN_ODPOVEDI) {
    if (pocet > 0) out.skryto = true;
    return out;
  }
  const questions = flattenOtazky(def).filter((q) => questionKind(q) !== 'text');
  for (const q of questions) {
    const counts = Object.fromEntries(q.moznosti.map((m) => [m, 0]));
    for (const r of aggRows ?? []) {
      if (r.otazka_id === q.id && Object.hasOwn(counts, r.hodnota)) counts[r.hodnota] += Number(r.pocet) || 0;
    }
    out.otazky[q.id] = counts;
  }
  return out;
}

/** Dotáže se databáze na jednu sadu a vrátí hotový agregát. */
export async function fetchSadaAgregaty(sql, def) {
  const aggRows = await sql`
    select otazka_id, hodnota, pocet
    from dotaznik_agregace
    where sada_id = ${def.id}`;
  const typRows = await sql`
    select respondent_typ, count(*)::int as pocet
    from dotaznik_odpoved
    where sada_id = ${def.id}
    group by respondent_typ`;
  return buildSadaAgregaty(def, aggRows, typRows);
}
