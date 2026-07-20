// Týdny zdraví — čisté pure helpery (bez DOM, bez side-efektů).
// Sdílí je microsite (awareness-week.js), popup (awareness-popup.js) i testy.
// Viz PLAN-TYDNY-ZDRAVI.md.

/** Parsuje 'YYYY-MM-DD' na UTC časové razítko půlnoci; NaN při chybě. */
export function parseDay(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Je den (YYYY-MM-DD) uvnitř intervalu týdne včetně krajů? */
export function isWithin(week, day) {
  const t = parseDay(day);
  const a = parseDay(week.start);
  const b = parseDay(week.end);
  return Number.isFinite(t) && Number.isFinite(a) && Number.isFinite(b) && t >= a && t <= b;
}

/**
 * Aktivní týden pro dané datum: ready záznam, jehož interval obsahuje den.
 * Když žádný, vrací null.
 */
export function activeWeekFor(day, weeks) {
  return (weeks || []).find(w => w.status === 'ready' && isWithin(w, day)) || null;
}

/** Nejbližší nadcházející ne-archivované týdny (start > den), dle startu. */
export function upcomingWeeks(day, weeks) {
  const t = parseDay(day);
  return (weeks || [])
    .filter(w => w.status !== 'archived' && parseDay(w.start) > t)
    .sort((a, b) => parseDay(a.start) - parseDay(b.start));
}

/** Týden k zobrazení na microsite: ?id= override → aktivní → nejbližší příští. */
export function resolveWeek(weeks, day, id) {
  if (id) return (weeks || []).find(w => w.id === id) || null;
  return activeWeekFor(day, weeks) || upcomingWeeks(day, weeks)[0] || null;
}

const MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
export function formatRange(week) {
  const fmt = (s) => { const [, m, d] = s.split('-').map(Number); return `${d}. ${MONTHS[m - 1]}`; };
  return `${fmt(week.start)} – ${fmt(week.end)} ${week.end.slice(0, 4)}`;
}
