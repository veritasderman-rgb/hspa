// Testy modulu src/cz-map.js — pickColor logika.
// Renderování DOM (SVG) testujeme jen na úrovni vrácených hodnot;
// integrační testování interakce probíhá manuálně v prohlížeči.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickColor } from '../src/cz-map.js';

test('pickColor: hodnoty blízko průměru (±2 %) vrací neutrální šedou', () => {
  // higher_is_better
  assert.equal(pickColor(0, true), '#E2E8F0');
  assert.equal(pickColor(1.5, true), '#E2E8F0');
  assert.equal(pickColor(-1.9, true), '#E2E8F0');
  // lower_is_better — neutrální zóna nezávisí na směru
  assert.equal(pickColor(0, false), '#E2E8F0');
  assert.equal(pickColor(-1.5, false), '#E2E8F0');
});

test('pickColor: higher_is_better — kladný odchylka = zelený odstín, záporná = červený', () => {
  const goodHigh = pickColor(15, true);  // +15 % od průměru, vyšší je lepší → zelená
  const badHigh = pickColor(-15, true);  // -15 %, vyšší je lepší → červená
  assert.match(goodHigh, /^rgb\(/);
  assert.match(badHigh, /^rgb\(/);
  assert.notEqual(goodHigh, badHigh);
});

test('pickColor: lower_is_better — kladná odchylka = horší (červená)', () => {
  const badLow = pickColor(15, false);   // +15 %, nižší je lepší → červená
  const goodLow = pickColor(-15, false); // -15 %, nižší je lepší → zelená
  assert.notEqual(badLow, goodLow);
  // shoda barev mezi inverzemi: goodLow == goodHigh při stejné magnitude
  assert.equal(goodLow, pickColor(15, true));
  assert.equal(badLow, pickColor(-15, true));
});

test('pickColor: saturuje na ±20 % (větší odchylky vrací stejnou barvu jako hraniční)', () => {
  const at20 = pickColor(20, true);
  const at40 = pickColor(40, true);
  const at100 = pickColor(100, true);
  assert.equal(at20, at40);
  assert.equal(at20, at100);
});
