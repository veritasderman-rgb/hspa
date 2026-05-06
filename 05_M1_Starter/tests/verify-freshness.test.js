// Tests for ingest/verify-freshness.js — summarize() function only.
// CLI side-effects (file I/O, process.exit) jsou ověřené smoke-testem v CI.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../ingest/verify-freshness.js';

test('summarize: empty list', () => {
  const s = summarize([]);
  assert.equal(s.total, 0);
  assert.equal(s.live, 0);
  assert.equal(s.live_ratio, 0);
  assert.deepEqual(s.by_origin, {});
});

test('summarize: all seed', () => {
  const indicators = [
    { id: 'a', source: { name: 'OECD', origin: 'seed', fetched_at: new Date().toISOString() } },
    { id: 'b', source: { name: 'OECD', origin: 'seed', fetched_at: new Date().toISOString() } },
    { id: 'c', source: { name: 'ČSÚ', origin: 'seed', fetched_at: new Date().toISOString() } },
  ];
  const s = summarize(indicators);
  assert.equal(s.total, 3);
  assert.equal(s.live, 0);
  assert.equal(s.live_ratio, 0);
  assert.equal(s.by_origin.seed, 3);
  assert.equal(s.by_source['OECD'].total, 2);
  assert.equal(s.by_source['OECD'].live, 0);
  assert.equal(s.by_source['ČSÚ'].total, 1);
});

test('summarize: mixed live/seed', () => {
  const now = new Date().toISOString();
  const indicators = [
    { id: 'a', source: { name: 'OECD', origin: 'live', fetched_at: now } },
    { id: 'b', source: { name: 'OECD', origin: 'live', fetched_at: now } },
    { id: 'c', source: { name: 'ČSÚ', origin: 'seed', fetched_at: now } },
    { id: 'd', source: { name: 'ČSÚ', origin: 'seed', fetched_at: now } },
  ];
  const s = summarize(indicators);
  assert.equal(s.total, 4);
  assert.equal(s.live, 2);
  assert.equal(s.live_ratio, 0.5);
  assert.equal(s.by_source['OECD'].live, 2);
  assert.equal(s.by_source['ČSÚ'].seed, 2);
});

test('summarize: detects stale fetched_at older than 7 days', () => {
  const old = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
  const fresh = new Date().toISOString();
  const indicators = [
    { id: 'old1', source: { name: 'OECD', origin: 'live', fetched_at: old } },
    { id: 'fresh1', source: { name: 'OECD', origin: 'live', fetched_at: fresh } },
  ];
  const s = summarize(indicators);
  assert.equal(s.stale_count, 1);
  assert.equal(s.stale_sample[0].id, 'old1');
});

test('summarize: handles missing source field', () => {
  const indicators = [
    { id: 'broken' },
    { id: 'partial', source: {} },
  ];
  const s = summarize(indicators);
  assert.equal(s.total, 2);
  assert.equal(s.live, 0);
  assert.equal(s.by_origin.unknown, 2);
});
