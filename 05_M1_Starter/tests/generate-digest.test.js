// Testy digest generátoru (scripts/generate-digest.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffIndicators, buildDigest } from '../scripts/generate-digest.js';

test('diffIndicators: změny hodnot, signálů a nové verifikace', () => {
  const oldL = [
    { id: 'a', name: 'A', value: 10, signal: 'warn', source: { origin: 'seed' } },
    { id: 'b', name: 'B', value: 5, signal: 'bad', source: { origin: 'live' }, verification_status: 'verified' },
  ];
  const newL = [
    { id: 'a', name: 'A', value: 12, signal: 'good', source: { origin: 'live' }, verification_status: 'verified' },
    { id: 'b', name: 'B', value: 5, signal: 'bad', source: { origin: 'live' }, verification_status: 'verified' },
  ];
  const d = diffIndicators(oldL, newL);
  assert.equal(d.valueChanges.length, 1);
  assert.equal(d.signalChanges.length, 1);
  assert.deepEqual(d.newlyVerified.map(x => x.id), ['a']);
});

test('buildDigest: markdown obsahuje články v okně a stav verifikace', () => {
  const md = buildDigest({
    indicators: [{ id: 'a', name: 'A', value: 1, source: { origin: 'live' }, verification_status: 'verified' }],
    snapshot: { indicators: [] },
    snapshotDate: '2026-06-03',
    articles: [
      { slug: 'clanek-x.html', title: 'X', date: '2026-06-09', perex: 'p' },
      { slug: 'clanek-old.html', title: 'Old', date: '2026-01-01' },
    ],
    today: '2026-06-10', days: 7,
  });
  assert.match(md, /Nové články \(1\)/);
  assert.match(md, /clanek-x\.html/);
  assert.ok(!md.includes('clanek-old'));
  assert.match(md, /Ověřeno \*\*1\*\*/);
});
