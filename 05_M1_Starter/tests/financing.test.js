// Testy pro datový kontrakt data/financing.json + validátor + transform.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateFinancing } from '../ingest/validate-financing.js';
import { loadSeed, mergeZppCache, buildOutput } from '../ingest/transform_financing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FINANCING = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'financing.json'), 'utf8'));

test('data/financing.json — validátor projde bez chyb', () => {
  assert.deepEqual(validateFinancing(FINANCING), []);
});

test('data/financing.json — sankey 2023 obsahuje 4 sources a 4 targets', () => {
  const s = FINANCING.sankey['2023'];
  assert.equal(s.sources.length, 4);
  assert.equal(s.targets.length, 4);
});

test('data/financing.json — součet sources = součet targets (±5 %)', () => {
  const s = FINANCING.sankey['2023'];
  const sumSrc = s.sources.reduce((a, x) => a + x.value_mld_kc, 0);
  const sumTgt = s.targets.reduce((a, x) => a + x.value_mld_kc, 0);
  const diffPct = Math.abs(sumSrc - sumTgt) / sumSrc * 100;
  assert.ok(diffPct <= 5, `odchylka ${diffPct.toFixed(2)} % > 5 %`);
});

test('data/financing.json — trend.years.length === segment.values.length pro všechny segmenty', () => {
  const yLen = FINANCING.trend.years.length;
  for (const [k, seg] of Object.entries(FINANCING.trend.segments)) {
    assert.equal(seg.values.length, yLen, `segment ${k}`);
  }
});

test('data/financing.json — všechny headline stats existují', () => {
  assert.ok(FINANCING.headline_stats.uhrady_zp_mld_kc);
  assert.ok(FINANCING.headline_stats.per_pojistence_kc);
  assert.ok(FINANCING.headline_stats.meziroci_rust_pct);
  assert.ok(FINANCING.headline_stats.podil_hdp_pct);
});

test('validateFinancing detekuje chybějící klíče', () => {
  const errors = validateFinancing({});
  assert.ok(errors.length > 0);
  assert.ok(errors.some(e => e.includes('chybí sankey')));
  assert.ok(errors.some(e => e.includes('chybí trend')));
});

test('validateFinancing detekuje rozjetí sources × targets', () => {
  const broken = JSON.parse(JSON.stringify(FINANCING));
  broken.sankey['2023'].targets[0].value_mld_kc = 1000;
  const errors = validateFinancing(broken);
  assert.ok(errors.some(e => e.includes('sources') && e.includes('targets')));
});

test('validateFinancing detekuje rozdílnou délku trend.values', () => {
  const broken = JSON.parse(JSON.stringify(FINANCING));
  broken.trend.segments.luzkova.values = [1, 2, 3];
  const errors = validateFinancing(broken);
  assert.ok(errors.some(e => e.includes('values') && e.includes('hodnot')));
});

test('transform_financing.buildOutput vyprodukuje validní JSON', () => {
  const seed = loadSeed();
  const merged = mergeZppCache(seed, '/nonexistent');
  const out = buildOutput(merged);
  assert.deepEqual(validateFinancing(out), []);
});

test('transform_financing — duplikátní ID v sources jsou odhaleny', () => {
  const seed = loadSeed();
  seed.sources = [...seed.sources, { ...seed.sources[0] }];
  const out = buildOutput(seed);
  const errors = validateFinancing(out);
  assert.ok(errors.some(e => e.includes('duplikátní')));
});
