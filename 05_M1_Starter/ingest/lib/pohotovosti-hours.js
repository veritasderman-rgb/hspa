// Normalizace provozní doby pohotovostí do jednoho strojově čitelného tvaru.
//
// Čtyři kraje zveřejňují otevřená data o pohotovostech a každý si zapisuje
// ordinační hodiny jinak:
//
//   Karlovarský, Liberecký  → sloupec na každý den týdne („16:00 - 21:00“)
//   Královéhradecký         → jedna volná věta („všední den: 16:00 – 22:00,
//                              SO,NE, svátek: 08:00 – 22:00“)
//   Olomoucký               → řádek na jednu službu s datem a typem dne
//                              („sobota“, „víkendy a svátky“, „všední dny“)
//
// Tenhle modul je převádí na jeden tvar, se kterým pak umí pracovat frontend
// (`src/pohotovosti.js`) při rozhodování „má tohle teď otevřeno?“.
//
// Výsledný tvar:
//   { kind: 'weekly',   week: { mon: [[from,to]], …, holiday: [[from,to]] }, note, raw }
//   { kind: 'rotation', shifts: [{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', ranges: [[from,to]] }], note, raw }
//
// Časy jsou řetězce „H:MM“ ve 24h formátu. Rozsah, který přetéká přes půlnoc
// („15:30 – 07:00“), se NEROZDĚLUJE — konec menší než začátek je platný zápis
// a frontend ho tak vyhodnocuje. Nepřetržitý provoz je [['00:00','24:00']].

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_KEYS = [...DAYS, 'holiday'];

/** Prázdný týden — každý den bez ordinačních hodin. */
export function emptyWeek() {
  return Object.fromEntries(DAY_KEYS.map(d => [d, []]));
}

/** „nepřetržitě“, „24 hodin denně“, „non-stop“ → celý den. */
const NONSTOP = /nepretrzit|non\s*-?\s*stop|24\s*hod|24\/7|celodenne/;

/** Diakritiku pryč, ať regexy nemusí řešit „všední“ vs „vsedni“. */
function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * „7:5“ → „07:05“; „16“ → „16:00“. Vrací null pro nesmysly.
 * @returns {string|null}
 */
export function normalizeTime(raw) {
  const s = String(raw ?? '').trim().replace(/\s/g, '').replace(/\./g, ':');
  const m = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] == null ? 0 : Number(m[2]);
  // 24:00 je legitimní konec dne; 24:30 už ne.
  if (!(h >= 0 && h <= 24) || !(min >= 0 && min <= 59)) return null;
  if (h === 24 && min !== 0) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Vytáhne z textu časové rozsahy. Zvládá pomlčku, en dash i „od…do“.
 * „16:00 - 21:00“ → [['16:00','21:00']]
 * „nepřetržitě“   → [['00:00','24:00']]
 * @returns {Array<[string,string]>}
 */
export function parseRanges(text) {
  const s = norm(text);
  if (!s) return [];
  if (/^(zavreno|zavrena|neordinuje|neni|nema|-|—|x)$/.test(s)) return [];
  if (NONSTOP.test(s)) return [['00:00', '24:00']];

  const out = [];
  const re = /(\d{1,2}(?:[:.]\d{1,2})?)\s*(?:-|–|—|do|az)\s*(\d{1,2}(?:[:.]\d{1,2})?)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const from = normalizeTime(m[1]);
    const to = normalizeTime(m[2]);
    if (from && to && from !== to) out.push([from, to]);
  }
  return out;
}

/**
 * Královéhradecký zápis: jedna věta, ve které se střídají označení dnů
 * a časy. Rozseká ji na segmenty „popis dnů: časy“ a rozdělí do týdne.
 *
 * „všední den: 16:00 – 22:00, SO,NE, svátek: 08:00 – 22:00“
 *   → po–pá 16–22, so/ne/svátek 8–22
 *
 * POZOR na dvojtečky: „16:00“ je taky dvojtečka. Dělící jsou jen ty, před
 * kterými NENÍ číslice. A označení dnů se může táhnout přes několik čárkou
 * oddělených tokenů („SO, NE, svátek“), takže hranici mezi časem předchozího
 * segmentu a popisem dnů toho následujícího hledáme odzadu: tokeny bez
 * číslice patří k popisu dnů.
 *
 * @returns {ReturnType<typeof emptyWeek>}
 */
export function parseCzechHoursSentence(text) {
  const week = emptyWeek();
  const s = String(text ?? '').trim();
  if (!s) return week;

  // Pozice dělících dvojteček (ta, před níž není číslice).
  const marks = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== ':') continue;
    let j = i - 1;
    while (j >= 0 && /\s/.test(s[j])) j--;
    if (j < 0 || !/\d/.test(s[j])) marks.push(i);
  }

  // Věta bez popisu dnů = jeden režim pro všechny dny („nepřetržitě“).
  if (!marks.length) {
    const ranges = parseRanges(s);
    if (ranges.length) for (const d of DAY_KEYS) week[d] = ranges.map(r => [...r]);
    return week;
  }

  /** Odštípne z konce textu čárkou oddělené tokeny bez číslic — to je popis dnů. */
  const splitTail = (chunk) => {
    const tokens = chunk.split(',');
    let cut = tokens.length;
    while (cut > 1 && !/\d/.test(tokens[cut - 1])) cut--;
    return { value: tokens.slice(0, cut).join(','), nextLabel: tokens.slice(cut).join(',') };
  };

  const segments = [];
  let label = s.slice(0, marks[0]);
  for (let k = 0; k < marks.length; k++) {
    const valueEnd = k + 1 < marks.length ? marks[k + 1] : s.length;
    const chunk = s.slice(marks[k] + 1, valueEnd);
    if (k + 1 < marks.length) {
      const { value, nextLabel } = splitTail(chunk);
      segments.push({ label, times: value });
      label = nextLabel;
    } else {
      segments.push({ label, times: chunk });
    }
  }

  for (const seg of segments) {
    const ranges = parseRanges(seg.times);
    if (!ranges.length) continue;
    for (const day of daysFromLabel(seg.label)) week[day] = ranges.map(r => [...r]);
  }
  return week;
}

/**
 * Ze slovního označení dnů udělá seznam klíčů týdne.
 * Rozumí „všední den“, „SO,NE“, „pátek“, „víkendy a svátky“, „svátek“.
 * @returns {string[]}
 */
export function daysFromLabel(label) {
  const s = norm(label);
  const out = new Set();

  const single = [
    [/\bpondeli\b|\bpo\b/, 'mon'],
    [/\butery\b|\but\b/, 'tue'],
    [/\bstreda\b|\bstredu\b|\bst\b/, 'wed'],
    [/\bctvrtek\b|\bct\b/, 'thu'],
    [/\bpatek\b|\bpa\b/, 'fri'],
    [/\bsobota\b|\bsobotu\b|\bso\b/, 'sat'],
    [/\bnedele\b|\bnedeli\b|\bne\b/, 'sun'],
  ];

  if (/vsedni|pracovni den|po\s*-\s*pa|pondeli\s*-\s*patek/.test(s)) {
    ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(d => out.add(d));
  }
  if (/vikend/.test(s)) { out.add('sat'); out.add('sun'); }
  if (/svat/.test(s)) out.add('holiday');
  if (/kazdy den|denne|vsechny dny/.test(s)) DAY_KEYS.forEach(d => out.add(d));

  for (const [re, key] of single) if (re.test(s)) out.add(key);

  return [...out];
}

/**
 * Karlovarský a Liberecký formát: hodnota na každý den zvlášť.
 * @param {Record<string,string>} byDay — klíče DAY_KEYS, hodnoty jako „16:00 - 21:00“
 */
export function weekFromPerDayColumns(byDay) {
  const week = emptyWeek();
  for (const day of DAY_KEYS) {
    week[day] = parseRanges(byDay[day]);
  }
  return week;
}

/** Má týden aspoň jeden interval? Prázdný rozvrh je stejně bezcenný jako žádný. */
export function weekHasHours(week) {
  return DAY_KEYS.some(d => Array.isArray(week?.[d]) && week[d].length > 0);
}

/** Sloučí dva týdenní rozvrhy (např. dvě řádky téhož místa pro různé typy dnů). */
export function mergeWeeks(a, b) {
  const out = emptyWeek();
  for (const day of DAY_KEYS) {
    const seen = new Set();
    for (const range of [...(a?.[day] ?? []), ...(b?.[day] ?? [])]) {
      const key = range.join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      out[day].push([...range]);
    }
  }
  return out;
}

/**
 * Olomoucký zápis data: „2025/05/10 00:00:00+00“ → „2025-05-10“.
 * @returns {string|null}
 */
export function parseIsoDate(raw) {
  const s = String(raw ?? '').trim();
  const m = /^(\d{4})[/-](\d{2})[/-](\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * Postaví normalizovaný objekt provozní doby.
 * @param {{ kind: 'weekly'|'rotation', week?: object, shifts?: Array, note?: string|null, raw?: string|null }} spec
 */
export function makeHours(spec) {
  if (spec.kind === 'rotation') {
    return {
      kind: 'rotation',
      shifts: (spec.shifts ?? []).map(s => ({
        from: s.from,
        to: s.to ?? s.from,
        ranges: s.ranges.map(r => [...r]),
      })).sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
      note: spec.note ?? null,
      raw: spec.raw ?? null,
    };
  }
  return {
    kind: 'weekly',
    week: spec.week ?? emptyWeek(),
    note: spec.note ?? null,
    raw: spec.raw ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Zákonné minimum podle vyhlášky č. 380/2025 Sb., o pohotovostních službách
// (účinnost 1. 1. 2026, prováděcí předpis k § 7a odst. 3 zákona č. 372/2011 Sb.
//  ve znění zákona č. 290/2025 Sb.).
//
// § 2 odst. 1 — lékařská pohotovostní služba pro dospělé
// § 3 odst. 1 — lékařská pohotovostní služba pro děti
//   a) 3 hodiny nepřetržitě v čase mezi 16:00 a 22:00 v pracovní den
//   b) 8 hodin nepřetržitě, přičemž zároveň musí být poskytována v pevné
//      době od 10:00 do 16:00, v sobotu, neděli a v den pracovního klidu
//
// § 4 odst. 1 — pohotovostní služba v oboru zubní lékařství
//   4 hodiny nepřetržitě v čase mezi 7:00 a 15:00 v sobotu, neděli a v den
//   pracovního klidu (pro pracovní dny vyhláška požadavek nestanoví)
//
// § 5 odst. 1 — lékárenská pohotovostní služba
//   3 hodiny nepřetržitě v čase mezi a) 17:00 a 23:00 v pracovní den,
//   b) 15:00 a 20:00 v sobotu, neděli a v den pracovního klidu
//
// Hodnotíme ZVEŘEJNĚNOU ordinační dobu, ne skutečný provoz. Když zdroj
// hodiny neuvádí, výsledek je null („nelze posoudit“) — ne „nesplňuje“.
// ─────────────────────────────────────────────────────────────────────────

/** Minuty od půlnoci; „24:00“ = 1440. */
export function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? ''));
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Intervaly jednoho dne v minutách. Rozsah přes půlnoc („15:30–07:00“)
 * se ořízne koncem dne — vyhláška mluví o době v rámci daného dne.
 * @returns {Array<[number,number]>}
 */
export function dayIntervals(ranges) {
  const out = [];
  for (const [from, to] of ranges ?? []) {
    const a = toMinutes(from);
    const b = toMinutes(to);
    if (a == null || b == null) continue;
    if (b > a) out.push([a, b]);
    else out.push([a, 1440]); // přetéká do dalšího dne
  }
  return out.sort((x, y) => x[0] - y[0]);
}

/** Slije překrývající se a navazující intervaly do souvislých bloků. */
export function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else out.push([...iv]);
  }
  return out;
}

/**
 * Nejdelší souvislý blok uvnitř okna [windowFrom, windowTo] v minutách.
 * „3 hodiny nepřetržitě v čase mezi 16:00 a 22:00“ = tenhle výpočet >= 180.
 */
export function longestBlockWithin(ranges, windowFrom, windowTo) {
  const clipped = mergeIntervals(dayIntervals(ranges))
    .map(([a, b]) => [Math.max(a, windowFrom), Math.min(b, windowTo)])
    .filter(([a, b]) => b > a);
  return clipped.reduce((max, [a, b]) => Math.max(max, b - a), 0);
}

/** Pokrývá některý souvislý blok celé okno [from, to]? („pevná doba 10:00–16:00“) */
export function coversWindow(ranges, windowFrom, windowTo) {
  return mergeIntervals(dayIntervals(ranges)).some(([a, b]) => a <= windowFrom && b >= windowTo);
}

/** Nejdelší souvislý blok dne v minutách (bez omezení oknem). */
export function longestBlock(ranges) {
  return mergeIntervals(dayIntervals(ranges)).reduce((max, [a, b]) => Math.max(max, b - a), 0);
}

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKEND = ['sat', 'sun', 'holiday'];

/**
 * Posoudí, zda zveřejněná doba splňuje minimum podle vyhlášky 380/2025 Sb.
 *
 * @param {string} category — lps_dospeli | lps_deti | zubni | lekarna
 * @param {{kind: string, week?: object}} hours
 * @returns {{ meets: boolean|null, checks: Array<{rule: string, ok: boolean, detail: string}> }}
 *          `meets: null` = nelze posoudit (chybí hodiny nebo kategorie není ve vyhlášce)
 */
export function evaluateMinimum(category, hours) {
  if (!hours || hours.kind !== 'weekly' || !weekHasHours(hours.week)) {
    return { meets: null, checks: [] };
  }
  const week = hours.week;
  const checks = [];

  // Stačí, když podmínku splní kterýkoli pracovní den / kterýkoli víkendový
  // den — vyhláška předepisuje rozsah služby, ne že běží každý den v týdnu.
  const bestWeekday = (fn) => Math.max(...WEEKDAYS.map(d => fn(week[d])));
  const bestWeekend = (fn) => Math.max(...WEEKEND.map(d => fn(week[d])));
  const hours1 = (min) => Math.round(min / 6) / 10;

  if (category === 'lps_dospeli' || category === 'lps_deti') {
    const wd = bestWeekday(r => longestBlockWithin(r, 16 * 60, 22 * 60));
    checks.push({
      rule: '§ 2/3 odst. 1 písm. a) — 3 h nepřetržitě mezi 16:00 a 22:00 v pracovní den',
      ok: wd >= 180,
      detail: `nejdelší souvislý blok v okně: ${hours1(wd)} h`,
    });
    const weLong = bestWeekend(r => longestBlock(r));
    const weFixed = WEEKEND.some(d => coversWindow(week[d], 10 * 60, 16 * 60));
    checks.push({
      rule: '§ 2/3 odst. 1 písm. b) — 8 h nepřetržitě a pevně 10:00–16:00 v sobotu, neděli a svátek',
      ok: weLong >= 480 && weFixed,
      detail: `nejdelší souvislý blok: ${hours1(weLong)} h; pevná doba 10–16 ${weFixed ? 'pokryta' : 'nepokryta'}`,
    });
  } else if (category === 'zubni') {
    const we = bestWeekend(r => longestBlockWithin(r, 7 * 60, 15 * 60));
    checks.push({
      rule: '§ 4 odst. 1 — 4 h nepřetržitě mezi 7:00 a 15:00 v sobotu, neděli a svátek',
      ok: we >= 240,
      detail: `nejdelší souvislý blok v okně: ${hours1(we)} h`,
    });
  } else if (category === 'lekarna') {
    const wd = bestWeekday(r => longestBlockWithin(r, 17 * 60, 23 * 60));
    checks.push({
      rule: '§ 5 odst. 1 písm. a) — 3 h nepřetržitě mezi 17:00 a 23:00 v pracovní den',
      ok: wd >= 180,
      detail: `nejdelší souvislý blok v okně: ${hours1(wd)} h`,
    });
    const we = bestWeekend(r => longestBlockWithin(r, 15 * 60, 20 * 60));
    checks.push({
      rule: '§ 5 odst. 1 písm. b) — 3 h nepřetržitě mezi 15:00 a 20:00 v sobotu, neděli a svátek',
      ok: we >= 180,
      detail: `nejdelší souvislý blok v okně: ${hours1(we)} h`,
    });
  } else {
    return { meets: null, checks: [] };
  }

  return { meets: checks.every(c => c.ok), checks };
}
