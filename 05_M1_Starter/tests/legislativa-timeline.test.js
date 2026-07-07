// Testy časové osy legislativního radaru (buildTimelineEvents).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildTimelineEvents } from '../src/legislativa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const NOW = new Date('2026-07-07T12:00:00Z');

const RADAR = [
  { id: 'a', title_short: 'Novela A', veklep_url: 'https://x/a', phase: 'pripominky',
    dates: { authorized: '2026-06-01', last_change: '2026-06-01', comments_until: '2026-08-01' } },
  { id: 'b', title_short: 'Novela B', veklep_url: 'https://x/b', phase: 'dokonceno',
    dates: { authorized: '2026-01-10', last_change: '2026-05-20', comments_until: '2026-02-10' } },
];
const PLAN = [
  { id: 'p1', nazev: 'Slib 1', plan_termin: '2026-04', stav: 'nezahajeno' },   // po termínu
  { id: 'p2', nazev: 'Slib 2', plan_termin: '2026-10', stav: 'nezahajeno' },   // budoucí slib
  { id: 'p3', nazev: 'Slib 3', plan_termin: '2026-04', stav: 'vlada' },        // splněno/v procesu
];

test('buildTimelineEvents: skládá události z radaru i plánu, seřazené vzestupně', () => {
  const ev = buildTimelineEvents(RADAR, PLAN, NOW);
  const dates = ev.map(e => e.date);
  assert.deepEqual(dates, [...dates].sort());
  // radar: 2× authorized + 2× comments_until + 1× dokonceno; plán: 3× slib
  assert.equal(ev.length, 8);
});

test('buildTimelineEvents: statusy — běžící termín, po termínu, splněný a budoucí slib', () => {
  const ev = buildTimelineEvents(RADAR, PLAN, NOW);
  const open = ev.find(e => e.kind === 'pripominky' && e.date === '2026-08-01');
  assert.equal(open.status, 'open');
  const closed = ev.find(e => e.kind === 'pripominky' && e.date === '2026-02-10');
  assert.equal(closed.status, 'done');
  const overdue = ev.find(e => e.kind === 'slib' && e.title === 'Slib 1');
  assert.equal(overdue.status, 'overdue');
  const future = ev.find(e => e.kind === 'slib' && e.title === 'Slib 2');
  assert.equal(future.status, 'upcoming');
  const fulfilled = ev.find(e => e.kind === 'slib' && e.title === 'Slib 3');
  assert.equal(fulfilled.status, 'done');
});

test('buildTimelineEvents: sliby mají měsíční přesnost, dokončení nese datum poslední změny', () => {
  const ev = buildTimelineEvents(RADAR, PLAN, NOW);
  assert.ok(ev.filter(e => e.kind === 'slib').every(e => e.monthOnly && e.date.endsWith('-01')));
  const done = ev.find(e => e.kind === 'dokonceno');
  assert.equal(done.date, '2026-05-20');
});

test('buildTimelineEvents: reálná data — neprázdná osa, validní statusy', () => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'legislativa.json'), 'utf8'));
  const ev = buildTimelineEvents(d.items, d.plan_items, NOW);
  assert.ok(ev.length >= 10, `málo událostí (${ev.length})`);
  const valid = new Set(['done', 'open', 'upcoming', 'overdue']);
  assert.ok(ev.every(e => valid.has(e.status)));
});
