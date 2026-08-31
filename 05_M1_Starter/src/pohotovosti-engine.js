// Výpočetní jádro stránky pohotovostí — bez DOM, aby šlo testovat v node.
//
// Odpovídá na tři otázky, na kterých celá stránka stojí:
//   1. Má tohle místo TEĎ otevřeno? (a když ne, kdy otevře)
//   2. Jak je to daleko od místa, kde jsem?
//   3. Které z 6 256 obcí odpovídá tomu, co uživatel napsal?
//
// Renderování je v `pohotovosti.js`.

// ─────────────────────────────────────────────────────────────────────────
// Svátky
//
// Ordinační doba pohotovostí má „svátek“ jako samostatný den — o Velikonočním
// pondělí platí nedělní režim, ne pondělní. Bez správného kalendáře by web
// v ty nejrizikovější dny v roce (24.–26. 12., Velikonoce) ukazoval opak
// pravdy. Proto počítáme i pohyblivé svátky.
// ─────────────────────────────────────────────────────────────────────────

/** Pevné státní svátky a dny pracovního klidu v ČR (měsíc, den). */
const FIXED_HOLIDAYS = [
  [1, 1],   // Den obnovy samostatného českého státu / Nový rok
  [5, 1],   // Svátek práce
  [5, 8],   // Den vítězství
  [7, 5],   // Den slovanských věrozvěstů Cyrila a Metoděje
  [7, 6],   // Den upálení mistra Jana Husa
  [9, 28],  // Den české státnosti
  [10, 28], // Den vzniku samostatného československého státu
  [11, 17], // Den boje za svobodu a demokracii
  [12, 24], // Štědrý den
  [12, 25], // 1. svátek vánoční
  [12, 26], // 2. svátek vánoční
];

/**
 * Velikonoční neděle podle anonymního gregoriánského algoritmu (Meeus/Jones/Butcher).
 * @param {number} year
 * @returns {Date} lokální půlnoc velikonoční neděle
 */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Je daný den státní svátek nebo den pracovního klidu (kromě víkendu)? */
export function isCzechHoliday(date) {
  const y = date.getFullYear();
  if (FIXED_HOLIDAYS.some(([m, d]) => date.getMonth() + 1 === m && date.getDate() === d)) return true;

  const easter = easterSunday(y);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  return dayKey(date) === dayKey(goodFriday) || dayKey(date) === dayKey(easterMonday);
}

/** Klíč do týdenního rozvrhu pro daný okamžik. Svátek přebíjí den v týdnu. */
export function dayKeyFor(date) {
  if (isCzechHoliday(date)) return 'holiday';
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
}

/** Předchozí kalendářní den — kvůli službám přetékajícím přes půlnoc. */
function previousDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** „HH:MM“ → minuty od půlnoci. */
export function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Minuty od půlnoci → „H:MM“ (české zvyklosti: bez vodicí nuly u hodin).
 * 1440 zůstává „24:00“, ne „0:00“ — konec služby o půlnoci se nesmí číst
 * jako začátek dne.
 */
export function formatMinutes(min) {
  if (min === 1440) return '24:00';
  const m = ((min % 1440) + 1440) % 1440;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** „16:00“ → „16:00“; ořízne vodicí nulu, ať se karty čtou jako jízdní řád. */
export function formatTime(hhmm) {
  const min = toMinutes(hhmm);
  return min == null ? String(hhmm ?? '') : formatMinutes(min);
}

/** Formátuje jeden interval do „16:00–22:00“. */
export function formatRange([from, to]) {
  if (from === '00:00' && to === '24:00') return 'nepřetržitě';
  return `${formatTime(from)}–${formatTime(to)}`;
}

/**
 * Intervaly daného dne v minutách; rozsahy přes půlnoc se rozdělí na část
 * dnešní a část „přetečenou“ do zítřka.
 * @returns {{today: Array<[number,number]>, overflow: Array<[number,number]>}}
 */
export function splitRanges(ranges) {
  const today = [];
  const overflow = [];
  for (const [from, to] of ranges ?? []) {
    const a = toMinutes(from);
    const b = toMinutes(to);
    if (a == null || b == null) continue;
    if (b > a) today.push([a, b]);
    else { today.push([a, 1440]); overflow.push([0, b]); }
  }
  return { today, overflow };
}

/**
 * Vyhodnotí stav místa v daný okamžik.
 *
 * @param {object|null} hours — normalizovaný objekt z data/pohotovosti.json
 * @param {Date} now
 * @returns {{ state: 'open'|'closed'|'unknown', until: string|null, next: string|null, nextDate: string|null }}
 *   state 'unknown' = zdroj ordinační dobu neuvádí. Nikdy ho nepřevádět na
 *   „zavřeno“ — to je jiné tvrzení a na pohotovosti nebezpečné.
 */
export function evaluateStatus(hours, now = new Date()) {
  if (!hours) return { state: 'unknown', until: null, nonstop: false, next: null, nextDate: null };
  if (hours.kind === 'rotation') return evaluateRotation(hours, now);

  const week = hours.week ?? {};
  const minutes = now.getHours() * 60 + now.getMinutes();

  // Otevřeno teď: buď v dnešním intervalu, nebo v tom, co přeteklo ze včerejška.
  const todaySplit = splitRanges(week[dayKeyFor(now)]);
  const yesterdaySplit = splitRanges(week[dayKeyFor(previousDay(now))]);

  for (const [a, b] of todaySplit.today) {
    if (minutes >= a && minutes < b) {
      return { state: 'open', until: formatMinutes(b), nonstop: a === 0 && b === 1440, next: null, nextDate: null };
    }
  }
  for (const [a, b] of yesterdaySplit.overflow) {
    if (minutes >= a && minutes < b) return { state: 'open', until: formatMinutes(b), nonstop: false, next: null, nextDate: null };
  }

  // Zavřeno — najdi nejbližší otevření v příštích sedmi dnech.
  const upcoming = todaySplit.today.filter(([a]) => a > minutes).sort((x, y) => x[0] - y[0])[0];
  if (upcoming) {
    return { state: 'closed', until: null, nonstop: false, next: formatMinutes(upcoming[0]), nextDate: isoDate(now) };
  }

  for (let offset = 1; offset <= 7; offset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    const { today } = splitRanges(week[dayKeyFor(day)]);
    if (!today.length) continue;
    const first = today.sort((x, y) => x[0] - y[0])[0];
    return { state: 'closed', until: null, nonstop: false, next: formatMinutes(first[0]), nextDate: isoDate(day) };
  }

  return { state: 'closed', until: null, nonstop: false, next: null, nextDate: null };
}

/** Rotační služba: platí jen v dny, na které je ordinace v rozpisu. */
function evaluateRotation(hours, now) {
  const today = isoDate(now);
  const minutes = now.getHours() * 60 + now.getMinutes();

  for (const shift of hours.shifts ?? []) {
    if (today < shift.from || today > shift.to) continue;
    for (const [from, to] of shift.ranges) {
      const a = toMinutes(from);
      const b = toMinutes(to);
      if (a != null && b != null && minutes >= a && minutes < b) {
        return { state: 'open', until: formatMinutes(b), nonstop: a === 0 && b === 1440, next: null, nextDate: null };
      }
    }
  }

  const future = (hours.shifts ?? [])
    .filter(s => s.to >= today && s.ranges.length)
    .sort((a, b) => a.from.localeCompare(b.from))[0];
  if (!future) return { state: 'unknown', until: null, nonstop: false, next: null, nextDate: null };

  return {
    state: 'closed',
    until: null,
    nonstop: false,
    next: formatMinutes(toMinutes(future.ranges[0][0]) ?? 0),
    nextDate: future.from,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Vzdálenost
// ─────────────────────────────────────────────────────────────────────────

const R_EARTH_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Vzdálenost vzdušnou čarou v kilometrech (haversine). */
export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** „3,4 km“ / „420 m“ — vzdušnou čarou, ne po silnici. */
export function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 100) * 10} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

// ─────────────────────────────────────────────────────────────────────────
// Vyhledávání obce
// ─────────────────────────────────────────────────────────────────────────

/** Diakritiku pryč, ať „Zdar nad Sazavou“ najde „Žďár nad Sázavou“. */
export function normalizeQuery(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Našeptávač obcí. Řadí přesnou shodu, pak začátek názvu, pak výskyt uvnitř;
 * při stejném skóre vyhrává kratší název (aby „Brno“ přebilo „Brno-Bosonohy“).
 *
 * @param {Array<[string, number, number, string, string]>} obce — kompaktní pole z data/obce-gps.json
 * @param {string} query
 * @param {number} [limit]
 * @returns {Array<{name: string, lat: number, lon: number, okres: string, lau: string}>}
 */
export function searchObce(obce, query, limit = 8) {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];

  const scored = [];
  for (const row of obce ?? []) {
    const [name, lat, lon, okres, lau] = row;
    const n = normalizeQuery(name);
    let score = -1;
    if (n === q) score = 0;
    else if (n.startsWith(q)) score = 1;
    else if (n.includes(q)) score = 2;
    else continue;
    scored.push({ score, len: name.length, name, lat, lon, okres, lau });
  }

  scored.sort((a, b) => a.score - b.score || a.len - b.len || a.name.localeCompare(b.name, 'cs'));
  return scored.slice(0, limit).map(({ score, len, ...rest }) => rest);
}

// ─────────────────────────────────────────────────────────────────────────
// Řazení a filtrování výsledků
// ─────────────────────────────────────────────────────────────────────────

/** Pořadí stavů ve výpisu: otevřené nahoru, neznámé před zavřené. */
const STATE_RANK = { open: 0, unknown: 1, closed: 2 };

/**
 * Připraví výsledky pro výpis: doplní vzdálenost a stav, profiltruje a seřadí.
 *
 * @param {Array<object>} places
 * @param {{
 *   origin?: {lat: number, lon: number}|null,
 *   categories?: string[],
 *   openOnly?: boolean,
 *   now?: Date,
 *   limit?: number,
 * }} [opts]
 */
export function rankPlaces(places, opts = {}) {
  const { origin = null, categories = [], openOnly = false, now = new Date(), limit = 0 } = opts;

  let rows = (places ?? []).map(place => {
    const status = evaluateStatus(place.hours, now);
    const distanceKm = origin ? haversineKm(origin, place) : null;
    return { place, status, distanceKm };
  });

  if (categories.length) rows = rows.filter(r => categories.includes(r.place.category));
  // „Jen otevřené“ nechává i místa bez zveřejněné doby — vyřadit je by
  // znamenalo tvrdit, že mají zavřeno, což zdroj neříká.
  if (openOnly) rows = rows.filter(r => r.status.state !== 'closed');

  rows.sort((a, b) => {
    if (origin) {
      const da = a.distanceKm ?? Infinity;
      const db = b.distanceKm ?? Infinity;
      if (da !== db) return da - db;
    } else {
      const sa = STATE_RANK[a.status.state] ?? 3;
      const sb = STATE_RANK[b.status.state] ?? 3;
      if (sa !== sb) return sa - sb;
    }
    return a.place.name.localeCompare(b.place.name, 'cs');
  });

  return limit > 0 ? rows.slice(0, limit) : rows;
}

/**
 * Ordinace, které v daném kraji slouží rotační službu v konkrétní den.
 * @param {object} rotation — položka z `rotations`
 * @param {Date} [now]
 */
export function rotationDuty(rotation, now = new Date()) {
  const today = isoDate(now);
  return (rotation?.practices ?? [])
    .map(p => ({ practice: p, shift: (p.hours?.shifts ?? []).find(s => today >= s.from && today <= s.to) }))
    .filter(x => x.shift);
}

/** Nejbližší termín rotace od dneška (pro větu „další služba v sobotu“). */
export function nextRotationDate(rotation, now = new Date()) {
  const today = isoDate(now);
  return (rotation?.dates ?? []).find(d => d >= today) ?? null;
}
