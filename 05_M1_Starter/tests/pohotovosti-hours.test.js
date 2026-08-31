// Normalizace provozní doby a posouzení zákonného minima.
//
// Tyhle funkce rozhodují, jestli web řekne „otevřeno“ nebo „zavřeno“ někomu,
// kdo v deset večer řeší dítě s horečkou. Testy proto jdou po konkrétních
// zápisech, které se ve zdrojích opravdu vyskytly — ne po vymyšlených.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTime,
  parseRanges,
  parseCzechHoursSentence,
  daysFromLabel,
  weekFromPerDayColumns,
  weekHasHours,
  mergeWeeks,
  parseIsoDate,
  makeHours,
  longestBlockWithin,
  coversWindow,
  evaluateMinimum,
} from '../ingest/lib/pohotovosti-hours.js';

test('normalizeTime doplní nuly a odmítne nesmysly', () => {
  assert.equal(normalizeTime('7:5'), '07:05');
  assert.equal(normalizeTime('16'), '16:00');
  assert.equal(normalizeTime('8.30'), '08:30');
  assert.equal(normalizeTime('24:00'), '24:00');
  assert.equal(normalizeTime('24:30'), null);
  assert.equal(normalizeTime('25:00'), null);
  assert.equal(normalizeTime('nesmysl'), null);
});

test('parseRanges rozumí pomlčce, en dash i slovu „nepřetržitě“', () => {
  assert.deepEqual(parseRanges('16:00 - 21:00'), [['16:00', '21:00']]);
  assert.deepEqual(parseRanges('08:00 – 22:00'), [['08:00', '22:00']]);
  assert.deepEqual(parseRanges('nepřetržitě'), [['00:00', '24:00']]);
  assert.deepEqual(parseRanges('Zavřeno'), []);
  assert.deepEqual(parseRanges(''), []);
});

test('parseRanges nechá rozsah přes půlnoc v jednom kuse', () => {
  // „15:30 – 07:00“ je noční služba, ne chyba. Rozdělení na dva intervaly by
  // rozbilo výpočet „otevřeno teď“ ve tři ráno.
  assert.deepEqual(parseRanges('15:30 – 07:00'), [['15:30', '07:00']]);
});

test('parseCzechHoursSentence rozseká královéhradecký zápis na dny', () => {
  const week = parseCzechHoursSentence('všední den: 16:00 – 22:00, SO,NE, svátek: 08:00 – 22:00');
  assert.deepEqual(week.mon, [['16:00', '22:00']]);
  assert.deepEqual(week.fri, [['16:00', '22:00']]);
  assert.deepEqual(week.sat, [['08:00', '22:00']]);
  assert.deepEqual(week.sun, [['08:00', '22:00']]);
  assert.deepEqual(week.holiday, [['08:00', '22:00']]);
});

test('parseCzechHoursSentence nezamění dvojtečku v čase za oddělovač', () => {
  // „16:00“ obsahuje dvojtečku stejně jako „svátek:“. Kdyby se braly stejně,
  // rozpadne se věta na nesmysly a všechny dny zůstanou prázdné.
  const week = parseCzechHoursSentence('pátek: 14:00 - 20:00, SO, NE, svátek: 08:00 – 18:00');
  assert.deepEqual(week.fri, [['14:00', '20:00']]);
  assert.deepEqual(week.mon, []);
  assert.deepEqual(week.sat, [['08:00', '18:00']]);
  assert.deepEqual(week.holiday, [['08:00', '18:00']]);
});

test('parseCzechHoursSentence zvládne „nepřetržitě“ jako hodnotu segmentu', () => {
  const week = parseCzechHoursSentence('všední den: 15:30 – 07:00, SO, NE, svátek: nepřetržitě');
  assert.deepEqual(week.wed, [['15:30', '07:00']]);
  assert.deepEqual(week.sun, [['00:00', '24:00']]);
});

test('daysFromLabel rozumí českým označením dnů', () => {
  assert.deepEqual(daysFromLabel('všední den').sort(), ['fri', 'mon', 'thu', 'tue', 'wed']);
  assert.deepEqual(daysFromLabel('víkendy a svátky').sort(), ['holiday', 'sat', 'sun']);
  assert.deepEqual(daysFromLabel('sobota'), ['sat']);
  assert.deepEqual(daysFromLabel('SO, NE').sort(), ['sat', 'sun']);
});

test('weekFromPerDayColumns přenese karlovarský tvar sloupec-na-den', () => {
  const week = weekFromPerDayColumns({
    mon: '16:00 - 21:00',
    sat: '9:00 - 19:00',
    holiday: '9:00 - 19:00',
  });
  assert.deepEqual(week.mon, [['16:00', '21:00']]);
  assert.deepEqual(week.sat, [['09:00', '19:00']]);
  assert.deepEqual(week.tue, []);
  assert.ok(weekHasHours(week));
});

test('mergeWeeks slučuje bez duplicit', () => {
  const a = weekFromPerDayColumns({ sat: '8:00 - 12:00' });
  const b = weekFromPerDayColumns({ sat: '8:00 - 12:00', sun: '9:00 - 13:00' });
  const merged = mergeWeeks(a, b);
  assert.deepEqual(merged.sat, [['08:00', '12:00']]);
  assert.deepEqual(merged.sun, [['09:00', '13:00']]);
});

test('parseIsoDate převede olomoucký tvar data', () => {
  assert.equal(parseIsoDate('2025/05/10 00:00:00+00'), '2025-05-10');
  assert.equal(parseIsoDate('2026-01-11'), '2026-01-11');
  assert.equal(parseIsoDate(''), null);
});

test('makeHours řadí rotační termíny podle data', () => {
  const hours = makeHours({
    kind: 'rotation',
    shifts: [
      { from: '2026-09-13', ranges: [['08:00', '12:00']] },
      { from: '2026-09-05', ranges: [['08:00', '12:00']] },
    ],
  });
  assert.deepEqual(hours.shifts.map(s => s.from), ['2026-09-05', '2026-09-13']);
  assert.equal(hours.shifts[0].to, '2026-09-05', 'jednodenní služba má to = from');
});

test('longestBlockWithin měří jen souvislý úsek uvnitř okna', () => {
  // Dvě oddělené hodiny nedávají dvouhodinový blok.
  assert.equal(longestBlockWithin([['16:00', '17:00'], ['19:00', '20:00']], 16 * 60, 22 * 60), 60);
  // Navazující intervaly se slijí.
  assert.equal(longestBlockWithin([['16:00', '18:00'], ['18:00', '21:00']], 16 * 60, 22 * 60), 300);
  // Okno rozsah ořízne.
  assert.equal(longestBlockWithin([['10:00', '20:00']], 16 * 60, 22 * 60), 240);
});

test('coversWindow pozná pevnou dobu 10:00–16:00', () => {
  assert.equal(coversWindow([['08:00', '20:00']], 10 * 60, 16 * 60), true);
  assert.equal(coversWindow([['11:00', '20:00']], 10 * 60, 16 * 60), false);
  assert.equal(coversWindow([['08:00', '12:00'], ['13:00', '20:00']], 10 * 60, 16 * 60), false);
});

test('evaluateMinimum · LPS splňující vyhlášku 380/2025 Sb.', () => {
  const week = weekFromPerDayColumns({
    mon: '17:00 - 22:00', tue: '17:00 - 22:00', wed: '17:00 - 22:00',
    thu: '17:00 - 22:00', fri: '17:00 - 22:00',
    sat: '8:00 - 20:00', sun: '8:00 - 20:00', holiday: '8:00 - 20:00',
  });
  const res = evaluateMinimum('lps_dospeli', { kind: 'weekly', week });
  assert.equal(res.meets, true);
  assert.equal(res.checks.length, 2);
});

test('evaluateMinimum · víkend kratší než 8 hodin minimum nesplní', () => {
  const week = weekFromPerDayColumns({
    mon: '16:00 - 22:00',
    sat: '10:00 - 16:00', sun: '10:00 - 16:00', holiday: '10:00 - 16:00',
  });
  const res = evaluateMinimum('lps_dospeli', { kind: 'weekly', week });
  assert.equal(res.meets, false);
  assert.equal(res.checks[0].ok, true, 'pracovní den 6 h v okně 16–22 stačí');
  assert.equal(res.checks[1].ok, false, 'o víkendu je jen 6 h, vyhláška chce 8');
});

test('evaluateMinimum · zubní pohotovost se posuzuje jen o víkendu', () => {
  const ok = evaluateMinimum('zubni', { kind: 'weekly', week: weekFromPerDayColumns({ sat: '8:00 - 12:00' }) });
  assert.equal(ok.meets, true);
  const short = evaluateMinimum('zubni', { kind: 'weekly', week: weekFromPerDayColumns({ sat: '8:00 - 11:00' }) });
  assert.equal(short.meets, false);
  // Pracovní dny vyhláška u zubní pohotovosti nepředepisuje — samy o sobě nestačí.
  const weekdayOnly = evaluateMinimum('zubni', { kind: 'weekly', week: weekFromPerDayColumns({ mon: '8:00 - 15:00' }) });
  assert.equal(weekdayOnly.meets, false);
});

test('evaluateMinimum · lékárenská pohotovost chce oba časové úseky', () => {
  const onlyWeekday = evaluateMinimum('lekarna', {
    kind: 'weekly',
    week: weekFromPerDayColumns({ mon: '17:00 - 23:00' }),
  });
  assert.equal(onlyWeekday.meets, false, 'chybí víkendový úsek 15:00–20:00');

  const both = evaluateMinimum('lekarna', {
    kind: 'weekly',
    week: weekFromPerDayColumns({ mon: '17:00 - 23:00', sat: '15:00 - 20:00' }),
  });
  assert.equal(both.meets, true);
});

test('evaluateMinimum bez zveřejněné doby vrací null, ne „nesplňuje“', () => {
  // Rozdíl „nevíme“ vs. „nesplňuje“ je tvrzení o konkrétním poskytovateli.
  assert.equal(evaluateMinimum('lps_dospeli', null).meets, null);
  assert.equal(evaluateMinimum('lps_dospeli', { kind: 'weekly', week: weekFromPerDayColumns({}) }).meets, null);
  assert.equal(evaluateMinimum('zzs', { kind: 'weekly', week: weekFromPerDayColumns({ sat: '8:00 - 20:00' }) }).meets, null);
});
