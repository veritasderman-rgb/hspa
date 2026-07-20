// Týdny zdraví — testy registru a pure helperů.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDay, isWithin, activeWeekFor, upcomingWeeks, resolveWeek, formatRange } from '../src/awareness-core.js';
import { shouldShowAwarenessPopup } from '../src/awareness-popup.js';
import { validateAwarenessWeeks } from '../ingest/validate-awareness-weeks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'awareness-weeks.json'), 'utf8'));

test('awareness-weeks.json prochází validátorem', () => {
  assert.equal(validateAwarenessWeeks(), true);
});

test('data: pilot Světový týden kojení je ready a sedí na 1.–7. 8.', () => {
  const wbw = reg.weeks.find(w => w.id === 'svetovy-tyden-kojeni-2026');
  assert.ok(wbw, 'pilot chybí');
  assert.equal(wbw.status, 'ready');
  assert.equal(wbw.start, '2026-08-01');
  assert.equal(wbw.end, '2026-08-07');
});

test('helper: isWithin — kraje intervalu jsou včetně', () => {
  const w = { start: '2026-08-01', end: '2026-08-07' };
  assert.equal(isWithin(w, '2026-08-01'), true);
  assert.equal(isWithin(w, '2026-08-07'), true);
  assert.equal(isWithin(w, '2026-07-31'), false);
  assert.equal(isWithin(w, '2026-08-08'), false);
});

test('helper: activeWeekFor vrací jen ready týden obsahující den', () => {
  const weeks = [
    { id: 'a', status: 'ready', start: '2026-08-01', end: '2026-08-07' },
    { id: 'b', status: 'draft', start: '2026-10-05', end: '2026-10-11' },
  ];
  assert.equal(activeWeekFor('2026-08-03', weeks).id, 'a');
  assert.equal(activeWeekFor('2026-10-07', weeks), null, 'draft se nikdy neaktivuje');
  assert.equal(activeWeekFor('2026-09-01', weeks), null);
});

test('helper: upcomingWeeks řadí budoucí dle startu, archived vynechává', () => {
  const weeks = [
    { id: 'a', status: 'ready', start: '2026-08-01', end: '2026-08-07' },
    { id: 'b', status: 'draft', start: '2026-11-18', end: '2026-11-24' },
    { id: 'c', status: 'archived', start: '2027-02-01', end: '2027-02-07' },
  ];
  const up = upcomingWeeks('2026-09-01', weeks);
  assert.deepEqual(up.map(w => w.id), ['b']);
});

test('helper: resolveWeek — ?id override, jinak aktivní, jinak nejbližší příští', () => {
  const weeks = reg.weeks;
  assert.equal(resolveWeek(weeks, '2026-08-03').id, 'svetovy-tyden-kojeni-2026', 'aktivní');
  assert.equal(resolveWeek(weeks, '2026-06-01', 'svetovy-antibioticky-tyden-2026').id, 'svetovy-antibioticky-tyden-2026', 'override');
  // mimo aktivní → nejbližší příští (nejdřívější start po dni)
  const r = resolveWeek(weeks, '2026-06-01');
  assert.ok(r && parseDay(r.start) > parseDay('2026-06-01'));
});

test('helper: formatRange čte česky', () => {
  assert.equal(formatRange({ start: '2026-08-01', end: '2026-08-07' }), '1. srpna – 7. srpna 2026');
});

test('popup: shouldShow — dismiss per-týden a jednou za návštěvu', () => {
  assert.equal(shouldShowAwarenessPopup('w1', {}, {}), true);
  assert.equal(shouldShowAwarenessPopup('w1', { w1: Date.now() }, {}), false, 'zavřený mlčí');
  assert.equal(shouldShowAwarenessPopup('w1', {}, { shown: 'w1' }), false, 'už zobrazený v návštěvě');
  assert.equal(shouldShowAwarenessPopup('w1', { w2: 1 }, { shown: 'w2' }), true, 'jiný týden nevadí');
  assert.equal(shouldShowAwarenessPopup(null, {}, {}), false);
});
