// Test pro stránku detailu indikátoru — cz-map renderer + indicator-detail helpers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCzMapSVG, renderCzMapLegend, regionList } from '../src/cz-map.js';
import { fmtNum, diffPctVsBenchmark } from '../src/indicator-detail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('regionList: vrací 14 NUTS3 krajů ČR', () => {
  const list = regionList();
  assert.equal(list.length, 14);
  for (const r of list) {
    assert.match(r.code, /^CZ\d{3}$/);
    assert.ok(r.name);
    assert.ok(r.short);
  }
});

test('renderCzMapSVG: vrací validní SVG s 14 hexagony', () => {
  const ds = {
    unit: 'let',
    country_avg: 80,
    direction: 'higher_is_better',
    regions: regionList().map(r => ({ code: r.code, name: r.name, value: 80 + Math.random() * 4 - 2 })),
  };
  const svg = renderCzMapSVG(ds);
  assert.match(svg, /<svg /);
  assert.match(svg, /<\/svg>/);
  // Každý kraj má g.cz-region
  const matches = svg.match(/data-code="CZ\d{3}"/g) ?? [];
  assert.equal(matches.length, 14);
});

test('renderCzMapSVG: data nedostupná → šedá výplň, dash text', () => {
  const ds = {
    unit: '%',
    country_avg: 50,
    direction: 'higher_is_better',
    regions: [{ code: 'CZ010', name: 'Praha', value: 60 }], // jen 1 ze 14
  };
  const svg = renderCzMapSVG(ds);
  // Praha s hodnotou
  assert.match(svg, /data-value="60"/);
  // Ostatní s prázdnou hodnotou
  assert.match(svg, /data-value=""/);
});

test('renderCzMapLegend: pro lower_is_better obsahuje "méně = lépe"', () => {
  const html = renderCzMapLegend('lower_is_better');
  assert.match(html, /méně = lépe/);
});

test('renderCzMapLegend: context_dependent → jen šedá škála', () => {
  const html = renderCzMapLegend('context_dependent');
  assert.doesNotMatch(html, /lépe/);
  assert.match(html, /Odchylka/);
});

test('fmtNum: <100 → 1 desetinné, ≥100 → celé číslo', () => {
  assert.equal(fmtNum(79.92, 'let'), '79.9 let');
  assert.equal(fmtNum(240, 'na 100k'), '240 na 100k');
  assert.equal(fmtNum(null), '—');
});

test('diffPctVsBenchmark: ČR 80 vs OECD 100 → −20 %', () => {
  const d = diffPctVsBenchmark(80, 100);
  assert.equal(d, -20);
});

test('diffPctVsBenchmark: chybějící hodnoty → null', () => {
  assert.equal(diffPctVsBenchmark(null, 100), null);
  assert.equal(diffPctVsBenchmark(80, null), null);
  assert.equal(diffPctVsBenchmark(80, 0), null);
});

test('regions.json: každý dataset má id pro dohledání podle indicator_id', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'regions.json'), 'utf8'));
  for (const ds of data.datasets) {
    assert.ok(ds.id, `dataset ${ds.name} missing id`);
    assert.ok(ds.unit);
    assert.ok(typeof ds.country_avg === 'number');
    assert.ok(['higher_is_better', 'lower_is_better', 'context_dependent'].includes(ds.direction));
    assert.ok(Array.isArray(ds.regions));
    assert.equal(ds.regions.length, 14, `dataset ${ds.id} should have 14 regions`);
  }
});

test('regions.json: nový indikátor unmet_need_medical má krajská data', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'regions.json'), 'utf8'));
  const ds = data.datasets.find(d => d.id === 'unmet_need_medical');
  assert.ok(ds, 'expected dataset for unmet_need_medical');
  assert.equal(ds.regions.length, 14);
  assert.equal(ds.direction, 'lower_is_better');
});
