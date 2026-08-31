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
} from '../src/pohotovosti-engine.js';

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
