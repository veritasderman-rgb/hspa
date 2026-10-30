// Pojistka proti tvrzením na neověřeném seedu (ingest/validate-seed-claims.js, docs/seed-audit.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedClaims, compareBaseline, isUnverifiedSeed } from '../ingest/validate-seed-claims.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

test('isUnverifiedSeed: seed bez ověření ano, ověřený seed a živá data ne', () => {
  assert.equal(isUnverifiedSeed({ source: { origin: 'seed' } }), true);
  assert.equal(isUnverifiedSeed({ source: { origin: 'seed' }, verification_status: 'verified' }), false);
  assert.equal(isUnverifiedSeed({ source: { origin: 'live' } }), false);
});

test('seedClaims: bere exact a derived tvrzení navázaná na neověřený seed', () => {
  const indicators = [
    { id: 'a', source: { origin: 'seed' } },
    { id: 'b', source: { origin: 'live' } },
  ];
  const claims = [
    { id: 'x--01', indicator_id: 'a', relation: 'exact' },
    { id: 'x--02', indicator_id: 'a', relation: 'derived' },
    { id: 'x--03', indicator_id: 'a', relation: 'related' },
    { id: 'x--04', indicator_id: 'b', relation: 'exact' },
    { id: 'x--05', relation: 'external' },
  ];
  assert.deepEqual(seedClaims(claims, indicators), ['x--01', 'x--02']);
});

test('compareBaseline: nové tvrzení i zastaralou položku baseline hlásí', () => {
  assert.deepEqual(compareBaseline(['a', 'c'], ['a', 'b']), { added: ['c'], stale: ['b'] });
});

test('repo: žádné tvrzení na neověřeném seedu mimo baseline a baseline bez zastaralých položek', () => {
  const current = seedClaims(read('data/claims.json').claims, read('data/indicators.json').indicators);
  const { added, stale } = compareBaseline(current, read('data/seed-claims-baseline.json').claims);
  assert.deepEqual(added, [], `nová tvrzení na neověřeném seedu: ${added.join(', ')}`);
  assert.deepEqual(stale, [], `baseline zmenši: node ingest/validate-seed-claims.js --update (${stale.join(', ')})`);
});
