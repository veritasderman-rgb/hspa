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

// ─────────────────────────────────────────────────────────────────────────
// Ve kterém kraji uživatel stojí
//
// Potřebuje to sekce rotace: v devíti krajích se zubní pohotovost střídá
// a rozpis z druhého konce republiky je uživateli k ničemu.
//
// Původně se kraj bral podle nejbližší pohotovosti — což u hranice krajů
// selže. Bezuchov (okres Přerov, Olomoucký kraj) má nejblíž pracoviště
// v Bystřici pod Hostýnem (Zlínský kraj, 8,6 km), takže by se ukázal
// zlínský rozpis a olomoucký, který pro Bezuchov platí, by se skryl.
//
// Dvě spolehlivé cesty podle toho, odkud výchozí bod přišel:
//   • z našeptávače obcí → známe okres, mapa okres → kraj je přesná
//   • z geolokace        → bod v polygonu kraje (data/cz-regions.geojson)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Leží bod uvnitř prstence? Ray casting (even-odd rule).
 * @param {Array<[number,number]>} ring — pole [lon, lat]
 */
export function pointInRing(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = (yi > lat) !== (yj > lat)
      && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Bod uvnitř Polygon/MultiPolygon geometrie (díry se odečítají). */
export function pointInGeometry(geometry, lon, lat) {
  const polygons = geometry?.type === 'MultiPolygon'
    ? geometry.coordinates
    : geometry?.type === 'Polygon' ? [geometry.coordinates] : [];

  for (const polygon of polygons) {
    const [outer, ...holes] = polygon;
    if (!outer || !pointInRing(outer, lon, lat)) continue;
    if (holes.some(h => pointInRing(h, lon, lat))) continue;
    return true;
  }
  return false;
}

/**
 * NUTS-3 kód kraje, ve kterém bod leží.
 *
 * Geojson je zjednodušený, takže bod těsně u hranice (nebo u státní hranice)
 * nemusí padnout do žádného polygonu. V takovém případě vrátíme kraj
 * s nejbližším těžištěm — pořád je to blíž pravdě než kraj náhodné
 * nejbližší nemocnice.
 *
 * @param {object} geojson — data/cz-regions.geojson
 * @returns {string|null} např. 'CZ071'
 */
export function regionCodeAt(geojson, lat, lon) {
  const features = geojson?.features ?? [];
  if (!features.length || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  for (const f of features) {
    if (pointInGeometry(f.geometry, lon, lat)) return f.properties?.code ?? null;
  }

  let best = null;
  let bestDist = Infinity;
  for (const f of features) {
    const c = geometryCentroid(f.geometry);
    if (!c) continue;
    const d = haversineKm({ lat, lon }, c);
    if (d != null && d < bestDist) { bestDist = d; best = f.properties?.code ?? null; }
  }
  return best;
}

/** Hrubé těžiště geometrie — stačí na výběr nejbližšího kraje. */
function geometryCentroid(geometry) {
  const polygons = geometry?.type === 'MultiPolygon'
    ? geometry.coordinates
    : geometry?.type === 'Polygon' ? [geometry.coordinates] : [];
  let sumLat = 0;
  let sumLon = 0;
  let n = 0;
  for (const polygon of polygons) {
    for (const [lon, lat] of polygon[0] ?? []) { sumLon += lon; sumLat += lat; n += 1; }
  }
  return n ? { lat: sumLat / n, lon: sumLon / n } : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Časová triáž: „kam teď“ není totéž co „která pohotovost má otevřeno“
//
// Pohotovostní služba je ze zákona (§ 7a zákona č. 372/2011 Sb.) péče
// poskytovaná MIMO ordinační hodiny ambulantních poskytovatelů. Vyhláška
// č. 380/2025 Sb. tomu odpovídá: v pracovní den předepisuje minimum až
// v okně 16:00–22:00. V pondělí v deset dopoledne tedy pohotovost neslouží
// — a nemá sloužit.
//
// Stránka se na to napřed neptala a odpovídala doslovně: „nejbližší otevřená
// pohotovost“ pro Mariánské Lázně byla v deset dopoledne v PRAZE, 115 km
// daleko, protože jediná otevřená místa v republice byla nepřetržitá.
// Přitom 470 metrů od uživatele stojí nemocnice s chirurgickou ambulancí
// a její vlastní LPS otevírá v 15:30.
//
// Odsud tenhle blok: podle hodiny se liší, co je správná odpověď.
// ─────────────────────────────────────────────────────────────────────────

/** Začátek a konec běžných ordinačních hodin (minuty od půlnoci). */
const ORDINACNI_OD = 7 * 60;
const ORDINACNI_DO = 16 * 60;

/**
 * Je teď běžná ordinační doba, kdy pohotovost ještě neslouží?
 *
 * Pracovní den 7:00–16:00. Konec je v 16:00 schválně — vyhláška po
 * poskytovateli chce tři hodiny nepřetržitě v okně 16:00–22:00, takže
 * dřív pohotovost obecně nenajede. Je to hranice, ne přesný rozvrh
 * konkrétní ordinace; stránka podle ní radí, ne tvrdí.
 */
export function isWorkingHours(date = new Date()) {
  if (isCzechHoliday(date)) return false;
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= ORDINACNI_OD && minutes < ORDINACNI_DO;
}

/** Koho volat jako první podle toho, co uživatel hledá. */
const PRVNI_KONTAKT = {
  lps_dospeli: 'praktik',
  lps_deti: 'detsky_lekar',
  zubni: 'zubar',
  lekarna: 'lekarna',
};

/**
 * Sestaví doporučení „kam teď“ podle hodiny a podle toho, co je v okolí.
 *
 * Vrací strukturu, ne text — formulace patří do renderu. Pole `steps` je
 * seřazené od toho, co má člověk zkusit nejdřív.
 *
 * DVĚ PRAVIDLA, KTERÁ SE TU DRŽÍ:
 *
 * 1. Bez polohy žádné konkrétní místo. Dokud uživatel nezadal obec ani
 *    nepovolil geolokaci, nelze říct „nejbližší“ — seznam je pak seřazený
 *    podle stavu a názvu, takže první položka je libovolné pracoviště kdekoli
 *    v republice. Nabídnout ho jako „nejbližší od vás“ by byl výmysl.
 *
 * 2. Denní alternativa jen tam, kde je pro ni důkaz. Registr neumí rozlišit
 *    ambulanci, kam se chodí neobjednaně, od ambulance na objednání — pokus
 *    odvodit to z oborů skončil u Masarykova onkologického ústavu. Bereme
 *    proto jen urgentní příjem (registrovaný, z podstaty neobjednaný) a
 *    pracoviště, které samo provozuje pohotovost: to prokazatelně přijímá
 *    lidi bez objednání, a přes den tam bývá běžná ambulance téhož zařízení.
 *    I tak se říká „zavolejte“, ne „přijďte“.
 *
 * @param {{
 *   now?: Date,
 *   hasOrigin?: boolean,           // zadal uživatel obec nebo povolil polohu?
 *   category?: string,             // co uživatel hledá (kvůli prvnímu kontaktu)
 *   online?: object|null,          // krajská online pohotovost, když v kraji je
 *   nearestOpen?: {place: object, distanceKm: number|null}|null,
 *   nearestLps?: {place: object, status: object, distanceKm: number|null}|null,
 *   nearestUrgent?: {place: object, distanceKm: number|null}|null,
 *   adviceLine?: object|null,      // neakutní poradní linka ZZS kraje, když ji kraj má
 *   farThresholdKm?: number,
 * }} input
 * @returns {{ mode: 'ordinacni_doba'|'pohotovost', openIsFar: boolean, steps: Array<object> }}
 */
/**
 * Stav poradní linky ZZS podle zveřejněného rozvrhu (`hours_spec`, stejný
 * tvar jako u pohotovostí). Bez rozvrhu je stav `unknown` — linka se nabízí
 * s poznámkou, že web dobu neuvádí; „zavřeno“ se tvrdí jen podle rozvrhu.
 */
export function adviceLineStatus(line, now = new Date()) {
  if (!line?.hours_spec) return { state: 'unknown', until: null, next: null, nextDate: null };
  const st = evaluateStatus(line.hours_spec, now);
  return { state: st.state, until: st.until, next: st.next, nextDate: st.nextDate };
}

export function careAdvice(input = {}) {
  const {
    now = new Date(),
    hasOrigin = false,
    category = 'lps_dospeli',
    online = null,
    nearestOpen = null,
    nearestLps = null,
    nearestUrgent = null,
    nearestAmbulance = null,
    adviceLine = null,
    farThresholdKm = 40,
  } = input;

  const working = isWorkingHours(now);
  const steps = [];
  const kontakt = PRVNI_KONTAKT[category] ?? 'praktik';

  // Fyzická místa dává smysl nabízet jen tomu, o kom víme, odkud hledá.
  const open = hasOrigin ? nearestOpen : null;
  const lps = hasOrigin ? nearestLps : null;
  const urgent = hasOrigin ? nearestUrgent : null;
  // Denní úrazová ambulance je jediná odpověď, která v ordinační době někam
  // pošle — pohotovost v tu dobu ze zákona neslouží. Nabízí se jen když má
  // právě teď otevřeno; „otevře v sedm ráno“ nikomu v deset dopoledne
  // nepomůže a mezi kroky by to bylo jen další místo, kam nejít.
  const ambulance = hasOrigin && nearestAmbulance?.status?.state === 'open' ? nearestAmbulance : null;

  // Denní alternativa je jen pro lékařskou péči. Kdo v deset dopoledne hledá
  // zubní pohotovost, patří ke svému zubaři — ne do úrazové ambulance, která
  // o zubech nic neví; kdo hledá lékárnu, do kterékoli otevřené lékárny.
  const medicalFlow = category === 'lps_dospeli' || category === 'lps_deti';

  // Neakutní poradní linka záchranné služby (kde ji kraj provozuje) patří
  // hned za první kontakt: odpovídá na „nevím, jestli s tím někam jít“,
  // což je otázka, kterou tahle stránka sama zodpovědět nesmí. Nabízí se
  // jen u lékařské péče a jen tomu, o kom víme, z jakého kraje hledá —
  // linka jiného kraje by mu neporadila. A jen když podle zveřejněného
  // rozvrhu právě běží: linka, kterou ve tři ráno nikdo nezvedne, není krok.
  const poradnaStatus = adviceLine ? adviceLineStatus(adviceLine, now) : null;
  const poradna = hasOrigin && medicalFlow && adviceLine && poradnaStatus.state !== 'closed' ? adviceLine : null;

  if (working) {
    steps.push({ kind: 'prvni_kontakt', priority: 1, contact: kontakt });
    if (poradna) steps.push({ kind: 'poradna', priority: 1.5, line: poradna, status: poradnaStatus });
    if (ambulance && medicalFlow) steps.push({ kind: 'ambulance_denni', priority: 2, ...ambulance });
    if (online && medicalFlow) steps.push({ kind: 'online', priority: 3, service: online });
    if (medicalFlow && urgent) steps.push({ kind: 'urgent', priority: 4, ...urgent });
    // Jedna karta, ne dvě: totéž pracoviště říká „přes den tu je běžná
    // ambulance, zavolejte“ i „pohotovost tu otevírá v…“.
    if (lps) steps.push({ kind: 'lps_pozdeji', priority: 5, daytimeHint: medicalFlow, ...lps });
  } else {
    if (open) steps.push({ kind: 'lps_otevrena', priority: 1, ...open });
    if (poradna) steps.push({ kind: 'poradna', priority: 1.5, line: poradna, status: poradnaStatus });
    // Mimo ordinační dobu je pohotovost hlavní odpověď; ambulance s noční
    // nebo víkendovou dobou (úrazová pohotovost nemocnice) se hodí jen když
    // pohotovost otevřená není.
    if (!open && ambulance && medicalFlow) steps.push({ kind: 'ambulance_denni', priority: 2, ...ambulance });
    if (online && medicalFlow) steps.push({ kind: 'online', priority: 3, service: online });
    if (!open && lps) steps.push({ kind: 'lps_pozdeji', priority: 4, ...lps });
    if (!open && medicalFlow && urgent) steps.push({ kind: 'urgent', priority: 5, ...urgent });
  }

  if (!hasOrigin) steps.push({ kind: 'zadejte_polohu', priority: 9 });

  // Když je nejbližší otevřená pohotovost přes půl republiky daleko, není to
  // odpověď — je to ukázka, že v tuhle hodinu žádná otevřená prostě není.
  const openIsFar = open?.distanceKm != null && open.distanceKm > farThresholdKm;

  return { mode: working ? 'ordinacni_doba' : 'pohotovost', openIsFar, steps };
}

// ─────────────────────────────────────────────────────────────────────────
// Hlášení změny — sdílené hlavní stránkou (src/pohotovosti.js) a builderem
// okresních stránek (scripts/build-pohotovosti-okresy.js), aby hlášení
// vypadala stejně a šla třídit podle štítku.
//
// Nejčastější důvod, proč tahle stránka lže, je, že se zdroj změnil
// a nikdo nám to neřekl. Člověk, který právě zjistil, že telefon nefunguje,
// je nejlepší detektor, jaký máme — a nesmí ho to stát víc než kliknutí.
// ─────────────────────────────────────────────────────────────────────────

export const FEEDBACK_ISSUES_URL = 'https://github.com/veritasderman-rgb/hspa/issues/new';

function formatPhoneCz(phone) {
  const m = /^\+420(\d{3})(\d{3})(\d{3})$/.exec(String(phone ?? ''));
  return m ? `${m[1]} ${m[2]} ${m[3]}` : String(phone ?? '');
}

/**
 * Předvyplněné GitHub issue k jednomu pracovišti.
 * @param {object} place  záznam z data/pohotovosti.json
 * @param {{base?: string, labels?: string[], generatedDay?: string, page?: string}} opts
 */
export function feedbackIssueUrl(place, { base = FEEDBACK_ISSUES_URL, labels = [], generatedDay = '', page = 'pohotovosti.html' } = {}) {
  const p = place ?? {};
  const title = `Pohotovosti: změna u „${p.name ?? '?'}“${p.okres ? ` (${p.okres})` : ''}`;
  const body = [
    `**Pracoviště:** ${p.workplace ? `${p.name} — ${p.workplace}` : p.name ?? '?'} (id \`${p.id ?? '?'}\`)`,
    `**Typ:** ${p.category_label ?? p.category ?? ''}`,
    p.address ? `**Adresa v datech:** ${p.address}` : null,
    p.phone ? `**Telefon v datech:** ${formatPhoneCz(p.phone)}` : null,
    '',
    '**Co je jinak:** (telefon / adresa / ordinační doba / zrušeno / jiné)',
    '',
    '**Jak jste to ověřili:** (telefonát dne …, web pracoviště, na místě)',
    '',
    `_Data k ${generatedDay || '?'}, stránka ${page}._`,
  ].filter(line => line != null).join('\n');
  const params = new URLSearchParams({ title, body });
  for (const label of labels) params.append('labels', label);
  return `${base}?${params}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Slug okresu — sdílené mezi builderem okresních stránek
// (scripts/build-pohotovosti-okresy.js) a odkazy na ně. Jediná definice,
// aby vygenerovaný soubor a odkaz nemohly skončit každý s jiným tvarem.
// ─────────────────────────────────────────────────────────────────────────

export function okresSlug(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/hlavni mesto praha/, 'praha')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
