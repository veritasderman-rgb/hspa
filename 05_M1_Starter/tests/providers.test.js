// Testy pro data/providers.json + transform_providers + nrhzs_providers (F4).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeProvider, sortAndTrim, buildOutput } from '../ingest/transform_providers.js';
import { NRHZS_DATASETS } from '../ingest/fetchers/nrhzs_providers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROVIDERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'providers.json'), 'utf8'));

test('data/providers.json — povinná pole', () => {
  assert.ok(PROVIDERS.version);
  assert.ok(Array.isArray(PROVIDERS.providers));
  assert.ok(Array.isArray(PROVIDERS.caveats));
  assert.ok(PROVIDERS.caveats.length >= 1, 'caveats musí obsahovat alespoň 1 záznam (limity dat)');
});

test('data/providers.json — všechny IČO jsou string, leky_kc + zp_kc jsou čísla', () => {
  for (const p of PROVIDERS.providers) {
    assert.equal(typeof p.ico, 'string');
    assert.ok(p.ico.length >= 6, `IČO ${p.ico} podivné`);
    assert.equal(typeof p.leky_kc, 'number');
    assert.equal(typeof p.zp_kc, 'number');
  }
});

test('data/providers.json — seřazeno desc podle leky_kc + zp_kc', () => {
  const totals = PROVIDERS.providers.map(p => p.leky_kc + p.zp_kc);
  for (let i = 1; i < totals.length; i++) {
    assert.ok(totals[i - 1] >= totals[i], `pořadí porušeno na indexu ${i}`);
  }
});

test('NRHZS_DATASETS — obsahuje datasety pro léky i ZP', () => {
  const cats = new Set(NRHZS_DATASETS.map(d => d.category));
  assert.ok(cats.has('leky'));
  assert.ok(cats.has('zp'));
});

test('normalizeProvider — defaultní hodnoty', () => {
  const p = normalizeProvider({ ico: 12345, nazev: 'Test' });
  assert.equal(p.ico, '12345');
  assert.equal(p.leky_kc, 0);
  assert.equal(p.zp_kc, 0);
  assert.equal(p.vykony_pocet, null);
  assert.equal(p.segment, 'ostatni');
});

test('normalizeProvider — odmítne záznam bez IČO', () => {
  assert.equal(normalizeProvider({ nazev: 'Bez IČO' }), null);
});

test('sortAndTrim — seřadí a ořeže', () => {
  const data = [
    { ico: '1', leky_kc: 10, zp_kc: 0 },
    { ico: '2', leky_kc: 100, zp_kc: 50 },
    { ico: '3', leky_kc: 20, zp_kc: 10 },
  ];
  const out = sortAndTrim(data, 2);
  assert.equal(out.length, 2);
  assert.equal(out[0].ico, '2');
  assert.equal(out[1].ico, '3');
});

test('buildOutput — vyprodukuje validní strukturu s caveats', () => {
  const snap = {
    year: 2024,
    providers: [{ ico: '1', nazev: 'A', leky_kc: 100, zp_kc: 10 }],
    caveats: ['caveat'],
    segments_legend: { ostatni: { label: 'Ostatní', color: '#aaa' } },
  };
  const out = buildOutput(snap);
  assert.equal(out.year, 2024);
  assert.equal(out.providers.length, 1);
  assert.deepEqual(out.caveats, ['caveat']);
});
