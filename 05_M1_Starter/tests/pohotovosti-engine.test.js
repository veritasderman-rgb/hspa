// Výpočetní jádro stránky pohotovostí: svátky, „otevřeno teď“, vzdálenost,
// vyhledání obce, řazení výsledků.
//
// Nejcitlivější místa, na která se tu míří:
//   • svátek přebíjí den v týdnu (24. 12. má nedělní režim, ne středeční),
//   • služba přes půlnoc je ve tři ráno pořád otevřená,
//   • „doba neuvedena“ se nesmí zobrazit jako „zavřeno“.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  easterSunday,
  isCzechHoliday,
  dayKeyFor,
  toMinutes,
  formatMinutes,
  formatRange,
  splitRanges,
  evaluateStatus,
  haversineKm,
  formatDistance,
  normalizeQuery,
  searchObce,
  rankPlaces,
  rotationDuty,
  nextRotationDate,
  pointInRing,
  pointInGeometry,
  regionCodeAt,
  isWorkingHours,
  careAdvice,
} from '../src/pohotovosti-engine.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const week = (over = {}) => ({
  mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [], holiday: [], ...over,
});

test('easterSunday sedí na známé roky', () => {
  assert.equal(easterSunday(2024).toDateString(), 'Sun Mar 31 2024');
  assert.equal(easterSunday(2025).toDateString(), 'Sun Apr 20 2025');
  assert.equal(easterSunday(2026).toDateString(), 'Sun Apr 05 2026');
  assert.equal(easterSunday(2027).toDateString(), 'Sun Mar 28 2027');
});

test('isCzechHoliday pokrývá pevné i pohyblivé svátky', () => {
  assert.equal(isCzechHoliday(new Date(2026, 0, 1)), true, 'Nový rok');
  assert.equal(isCzechHoliday(new Date(2026, 11, 24)), true, 'Štědrý den');
  assert.equal(isCzechHoliday(new Date(2026, 10, 17)), true, '17. listopadu');
  assert.equal(isCzechHoliday(new Date(2026, 3, 3)), true, 'Velký pátek 2026');
  assert.equal(isCzechHoliday(new Date(2026, 3, 6)), true, 'Velikonoční pondělí 2026');
  assert.equal(isCzechHoliday(new Date(2026, 7, 31)), false, 'obyčejné pondělí');
});

test('dayKeyFor dá svátku přednost před dnem v týdnu', () => {
  // 24. 12. 2026 je čtvrtek. Pohotovost tehdy jede svátečním, ne čtvrtečním režimem.
  assert.equal(new Date(2026, 11, 24).getDay(), 4);
  assert.equal(dayKeyFor(new Date(2026, 11, 24)), 'holiday');
  assert.equal(dayKeyFor(new Date(2026, 7, 31)), 'mon');
  assert.equal(dayKeyFor(new Date(2026, 8, 5)), 'sat');
});

test('formátování časů a rozsahů', () => {
  assert.equal(toMinutes('16:30'), 990);
  assert.equal(formatMinutes(990), '16:30');
  assert.equal(formatRange(['08:00', '20:00']), '8:00–20:00');
  assert.equal(formatRange(['00:00', '24:00']), 'nepřetržitě');
});

test('splitRanges odděluje část přetékající přes půlnoc', () => {
  const { today, overflow } = splitRanges([['15:30', '07:00']]);
  assert.deepEqual(today, [[930, 1440]]);
  assert.deepEqual(overflow, [[0, 420]]);
});

test('evaluateStatus · otevřeno v ordinační době', () => {
  const hours = { kind: 'weekly', week: week({ mon: [['17:00', '22:00']] }) };
  const res = evaluateStatus(hours, new Date(2026, 7, 31, 18, 30));
  assert.equal(res.state, 'open');
  assert.equal(res.until, '22:00');
});

test('evaluateStatus · zavřeno s časem nejbližšího otevření dnes', () => {
  const hours = { kind: 'weekly', week: week({ mon: [['17:00', '22:00']] }) };
  const res = evaluateStatus(hours, new Date(2026, 7, 31, 10, 0));
  assert.equal(res.state, 'closed');
  assert.equal(res.next, '17:00');
  assert.equal(res.nextDate, '2026-08-31');
});

test('evaluateStatus · najde otevření i o několik dní dál', () => {
  const hours = { kind: 'weekly', week: week({ sat: [['08:00', '20:00']] }) };
  const res = evaluateStatus(hours, new Date(2026, 7, 31, 23, 0)); // pondělí večer
  assert.equal(res.state, 'closed');
  assert.equal(res.nextDate, '2026-09-05', 'nejbližší sobota');
  assert.equal(res.next, '8:00');
});

test('evaluateStatus · noční služba přes půlnoc je ve tři ráno otevřená', () => {
  const hours = { kind: 'weekly', week: week({ mon: [['15:30', '07:00']] }) };
  const res = evaluateStatus(hours, new Date(2026, 8, 1, 3, 0)); // úterý 3:00
  assert.equal(res.state, 'open');
  assert.equal(res.until, '7:00');
});

test('evaluateStatus · svátek jede svátečním rozvrhem', () => {
  const hours = { kind: 'weekly', week: week({ thu: [], holiday: [['09:00', '18:00']] }) };
  const res = evaluateStatus(hours, new Date(2026, 11, 24, 12, 0)); // Štědrý den, čtvrtek
  assert.equal(res.state, 'open', 'čtvrteční rozvrh je prázdný, ale je svátek');
});

test('evaluateStatus · chybějící doba je „unknown“, nikdy „closed“', () => {
  assert.equal(evaluateStatus(null).state, 'unknown');
  assert.equal(evaluateStatus(undefined).state, 'unknown');
});

test('evaluateStatus · rotační služba platí jen ve svůj termín', () => {
  const hours = {
    kind: 'rotation',
    shifts: [{ from: '2026-09-05', to: '2026-09-05', ranges: [['08:00', '12:00']] }],
  };
  assert.equal(evaluateStatus(hours, new Date(2026, 8, 5, 9, 0)).state, 'open');
  assert.equal(evaluateStatus(hours, new Date(2026, 8, 5, 13, 0)).state, 'closed');
  const before = evaluateStatus(hours, new Date(2026, 8, 1, 9, 0));
  assert.equal(before.state, 'closed');
  assert.equal(before.nextDate, '2026-09-05');
});

test('haversineKm a formátování vzdálenosti', () => {
  const praha = { lat: 50.0755, lon: 14.4378 };
  const brno = { lat: 49.1951, lon: 16.6068 };
  const km = haversineKm(praha, brno);
  assert.ok(km > 180 && km < 190, `Praha–Brno vyšlo ${km} km`);
  assert.equal(formatDistance(0.42), '420 m');
  assert.equal(formatDistance(3.44), '3,4 km');
  assert.equal(formatDistance(184.2), '184 km');
  assert.equal(formatDistance(null), null);
  assert.equal(haversineKm(praha, null), null);
});

test('searchObce ignoruje diakritiku a řadí přesnou shodu první', () => {
  const obce = [
    ['Žďár nad Sázavou', 49.5626, 15.9394, 'Žďár nad Sázavou', 'CZ595209'],
    ['Brno', 49.1951, 16.6068, 'Brno-město', 'CZ582786'],
    ['Brno-venkov', 49.2, 16.5, 'Brno-venkov', ''],
    ['Nové Město na Moravě', 49.5614, 16.0742, 'Žďár nad Sázavou', ''],
  ];
  assert.equal(searchObce(obce, 'zdar')[0].name, 'Žďár nad Sázavou');
  assert.equal(searchObce(obce, 'Brno')[0].name, 'Brno', 'kratší přesná shoda vyhrává');
  assert.deepEqual(searchObce(obce, 'x'), [], 'jedno písmeno nehledá');
  assert.equal(normalizeQuery('Žďár  nad Sázavou'), 'zdar nad sazavou');
});

const place = (over) => ({
  id: 'p', name: 'Test', category: 'lps_dospeli', lat: 50, lon: 14, hours: null, ...over,
});

test('rankPlaces řadí podle vzdálenosti, když známe výchozí bod', () => {
  const places = [
    place({ id: 'daleko', name: 'Daleko', lat: 49.2, lon: 16.6 }),
    place({ id: 'blizko', name: 'Blízko', lat: 50.08, lon: 14.44 }),
  ];
  const rows = rankPlaces(places, { origin: { lat: 50.0755, lon: 14.4378 } });
  assert.deepEqual(rows.map(r => r.place.id), ['blizko', 'daleko']);
  assert.ok(rows[0].distanceKm < 1);
});

test('rankPlaces bez výchozího bodu staví otevřené nahoru', () => {
  const now = new Date(2026, 7, 31, 18, 0); // pondělí 18:00
  const places = [
    place({ id: 'zavreno', name: 'Zavřeno', hours: { kind: 'weekly', week: week({ mon: [['08:00', '12:00']] }) } }),
    place({ id: 'otevreno', name: 'Otevřeno', hours: { kind: 'weekly', week: week({ mon: [['17:00', '22:00']] }) } }),
    place({ id: 'nevime', name: 'Nevíme' }),
  ];
  const rows = rankPlaces(places, { now, openOnly: false });
  assert.deepEqual(rows.map(r => r.place.id), ['otevreno', 'nevime', 'zavreno']);
});

test('rankPlaces · „jen otevřené“ nevyhazuje místa bez zveřejněné doby', () => {
  // Zdroj u nich neříká „zavřeno“, jen mlčí. Skrýt je by znamenalo tvrdit víc,
  // než víme — a připravit člověka o pracoviště, které nejspíš otevřené je.
  const now = new Date(2026, 7, 31, 18, 0);
  const places = [
    place({ id: 'zavreno', hours: { kind: 'weekly', week: week({ mon: [['08:00', '12:00']] }) } }),
    place({ id: 'nevime' }),
  ];
  const rows = rankPlaces(places, { now, openOnly: true });
  assert.deepEqual(rows.map(r => r.place.id), ['nevime']);
});

test('rankPlaces filtruje podle kategorie a umí limit', () => {
  const places = [
    place({ id: 'a', category: 'lps_dospeli' }),
    place({ id: 'b', category: 'zubni' }),
    place({ id: 'c', category: 'lekarna' }),
  ];
  const rows = rankPlaces(places, { categories: ['zubni', 'lekarna'], openOnly: false });
  assert.deepEqual(rows.map(r => r.place.id).sort(), ['b', 'c']);
  assert.equal(rankPlaces(places, { openOnly: false, limit: 1 }).length, 1);
});

test('rotationDuty a nextRotationDate čtou rozpis střídavé služby', () => {
  const rotation = {
    dates: ['2026-09-05', '2026-09-06', '2026-09-12'],
    practices: [
      { name: 'Ordinace A', hours: { kind: 'rotation', shifts: [{ from: '2026-09-05', to: '2026-09-05', ranges: [['08:00', '12:00']] }] } },
      { name: 'Ordinace B', hours: { kind: 'rotation', shifts: [{ from: '2026-09-12', to: '2026-09-12', ranges: [['08:00', '12:00']] }] } },
    ],
  };
  const duty = rotationDuty(rotation, new Date(2026, 8, 5, 9, 0));
  assert.deepEqual(duty.map(d => d.practice.name), ['Ordinace A']);
  assert.equal(nextRotationDate(rotation, new Date(2026, 8, 7)), '2026-09-12');
  assert.equal(nextRotationDate(rotation, new Date(2026, 8, 30)), null);
});

// ─────────────────────────────────────────────────────────────────────────
// Určení kraje výchozího bodu
// ─────────────────────────────────────────────────────────────────────────

const SQUARE = {
  type: 'Polygon',
  coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
};

test('pointInRing / pointInGeometry — základní geometrie', () => {
  assert.equal(pointInRing(SQUARE.coordinates[0], 5, 5), true);
  assert.equal(pointInRing(SQUARE.coordinates[0], 15, 5), false);
  assert.equal(pointInGeometry(SQUARE, 5, 5), true);
  assert.equal(pointInGeometry(SQUARE, -1, 5), false);
  assert.equal(pointInGeometry(null, 5, 5), false);
});

test('pointInGeometry odečítá díry v polygonu', () => {
  const withHole = {
    type: 'Polygon',
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
    ],
  };
  assert.equal(pointInGeometry(withHole, 1, 1), true);
  assert.equal(pointInGeometry(withHole, 5, 5), false, 'bod v díře je venku');
});

test('regionCodeAt určí kraj z hranic, ne z nejbližší pohotovosti', () => {
  // Regrese: kraj se dřív bral podle nejbližšího pracoviště. Bezuchov (okres
  // Přerov, Olomoucký kraj) má nejblíž Bystřici pod Hostýnem ve Zlínském kraji
  // (8,6 km), takže se ukazoval zlínský rozpis rotace a olomoucký se skrýval.
  const geojson = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'cz-regions.geojson'), 'utf8'));
  assert.equal(regionCodeAt(geojson, 49.4627, 17.6088), 'CZ071', 'Bezuchov je Olomoucký kraj');
  assert.equal(regionCodeAt(geojson, 50.0755, 14.4378), 'CZ010', 'Praha');
  assert.equal(regionCodeAt(geojson, 49.1951, 16.6068), 'CZ064', 'Brno');
  assert.equal(regionCodeAt(geojson, 49.8209, 18.2625), 'CZ080', 'Ostrava');
  assert.equal(regionCodeAt(geojson, 49.9639, 14.0721), 'CZ020', 'Beroun');
});

test('regionCodeAt souhlasí s okresem u všech obcí gazetteeru', () => {
  // Hranice krajů v geojsonu jsou zjednodušené — tenhle test hlídá, že to
  // zjednodušení nikde neposune obec do sousedního kraje.
  const geojson = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'cz-regions.geojson'), 'utf8'));
  const gazetteer = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'obce-gps.json'), 'utf8'));
  const dataset = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'data', 'pohotovosti.json'), 'utf8'));

  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  // Pravda o příslušnosti okresu ke kraji plyne z pohotovostí — každá nese
  // okres i NUTS-3 kód kraje ze stejného zdroje.
  const krajByOkres = new Map(dataset.places.filter(p => p.okres && p.kraj_code).map(p => [norm(p.okres), p.kraj_code]));

  let checked = 0;
  const mismatches = [];
  for (const [name, lat, lon, okres] of gazetteer.obce) {
    const expected = krajByOkres.get(norm(okres));
    if (!expected) continue;
    checked += 1;
    const got = regionCodeAt(geojson, lat, lon);
    if (got !== expected) mismatches.push(`${name} (okres ${okres}): ${got} místo ${expected}`);
  }
  assert.ok(checked > 3000, `ověřeno jen ${checked} obcí`);
  assert.deepEqual(mismatches.slice(0, 5), [], `${mismatches.length} obcí spadlo do jiného kraje`);
});

test('regionCodeAt se nezasekne na prázdném nebo neplatném vstupu', () => {
  assert.equal(regionCodeAt(null, 50, 14), null);
  assert.equal(regionCodeAt({ features: [] }, 50, 14), null);
  assert.equal(regionCodeAt({ features: [{ geometry: SQUARE, properties: { code: 'X' } }] }, NaN, 14), null);
});

// ─────────────────────────────────────────────────────────────────────────
// Časová triáž „kam teď“
// ─────────────────────────────────────────────────────────────────────────

test('isWorkingHours zná hranici, za kterou pohotovost teprve nastupuje', () => {
  assert.equal(isWorkingHours(new Date(2026, 8, 7, 10, 0)), true, 'pondělí dopoledne');
  assert.equal(isWorkingHours(new Date(2026, 8, 7, 15, 59)), true, 'těsně před 16:00');
  assert.equal(isWorkingHours(new Date(2026, 8, 7, 16, 0)), false, 'v 16:00 začíná okno vyhlášky');
  assert.equal(isWorkingHours(new Date(2026, 8, 7, 6, 59)), false, 'před sedmou');
  assert.equal(isWorkingHours(new Date(2026, 8, 5, 10, 0)), false, 'sobota');
  assert.equal(isWorkingHours(new Date(2026, 8, 6, 10, 0)), false, 'neděle');
  assert.equal(isWorkingHours(new Date(2026, 11, 24, 10, 0)), false, 'Štědrý den je svátek, ne pracovní den');
});

const advicePlace = (over) => ({ id: 'x', name: 'Nemocnice', category: 'lps_dospeli', ...over });

test('careAdvice · v ordinační době neposílá na pohotovost, ale k praktikovi', () => {
  // Regrese: v pondělí v deset ukazovala stránka jako „nejbližší otevřenou“
  // pohotovost v Praze, 115 km od Mariánských Lázní, protože jediná otevřená
  // místa v republice byla nepřetržitá.
  const advice = careAdvice({
    now: new Date(2026, 8, 7, 10, 0),
    online: { name: 'Karlovarská pohotovost', kraj_code: 'CZ041' },
    nearestOpen: { place: advicePlace({ name: 'Praha' }), distanceKm: 115 },
    nearestLps: { place: advicePlace({ name: 'Mariánské Lázně' }), status: { state: 'closed', next: '15:30' }, distanceKm: 0.47 },
    nearestAmbulance: { place: advicePlace({ name: 'Nemocnice Mariánské Lázně' }), distanceKm: 0.47 },
  });

  assert.equal(advice.mode, 'ordinacni_doba');
  assert.deepEqual(advice.steps.map(s => s.kind), ['praktik', 'online', 'ambulance', 'lps_pozdeji']);
  assert.ok(!advice.steps.some(s => s.kind === 'lps_otevrena'),
    'vzdálenou otevřenou pohotovost v ordinační době nenabízíme jako řešení');
});

test('careAdvice · mimo ordinační dobu vede na otevřenou pohotovost', () => {
  const advice = careAdvice({
    now: new Date(2026, 8, 7, 18, 0),
    online: { name: 'Karlovarská pohotovost' },
    nearestOpen: { place: advicePlace({ name: 'Mariánské Lázně' }), status: { state: 'open', until: '21:00' }, distanceKm: 0.47 },
    nearestLps: { place: advicePlace({ name: 'Mariánské Lázně' }), status: { state: 'open' }, distanceKm: 0.47 },
  });
  assert.equal(advice.mode, 'pohotovost');
  assert.equal(advice.steps[0].kind, 'lps_otevrena');
  assert.equal(advice.openIsFar, false);
});

test('careAdvice · označí, když je nejbližší otevřená přes půl republiky', () => {
  const advice = careAdvice({
    now: new Date(2026, 8, 7, 23, 0),
    nearestOpen: { place: advicePlace(), status: { state: 'open' }, distanceKm: 115 },
  });
  assert.equal(advice.openIsFar, true, '115 km není odpověď, je to důkaz, že nic blízko nemá otevřeno');
});

test('careAdvice · bez online služby a bez ambulance nespadne', () => {
  const advice = careAdvice({ now: new Date(2026, 8, 7, 10, 0) });
  assert.equal(advice.mode, 'ordinacni_doba');
  assert.deepEqual(advice.steps.map(s => s.kind), ['praktik']);
  assert.equal(advice.openIsFar, false);
});
