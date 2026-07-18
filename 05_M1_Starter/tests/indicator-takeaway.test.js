// Testy pro buildTakeaway (src/indicator.js) — auto-generovaný plain-language
// verdikt na detailu indikátoru. Cíl: vést stránku významem, ne surovým číslem.
// Čistá funkce bez DOM, proto testovatelná v node:test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTakeaway } from '../src/indicator.js';

test('podprůměrný indikátor (higher_is_better, signal bad) — verdikt zaostávání', () => {
  const ind = {
    value: 12, unit: 'na mil. ob.', year: 2024,
    benchmark: { oecd: 16, eu: 14.5 },
    direction: 'higher_is_better', signal: 'bad',
    trend: [{ year: 2023, value: 12 }, { year: 2024, value: 12 }],
  };
  const { text, tone } = buildTakeaway(ind);
  assert.equal(tone, 'bad');
  assert.match(text, /Česko: 12 na mil\. ob\./);
  assert.match(text, /pod průměrem OECD/);
  assert.match(text, /vyšší je lepší/i);
  assert.match(text, /Česko zaostává/);
  assert.match(text, /beze změny/i);
});

test('nadstandard (lower_is_better, signal good) — verdikt „vede dobře"', () => {
  const ind = {
    value: 2.2, unit: '%',
    benchmark: { eu: 11.3 },
    direction: 'lower_is_better', signal: 'good',
    trend: [{ year: 2023, value: 2.4 }, { year: 2024, value: 2.2 }],
  };
  const { text, tone } = buildTakeaway(ind);
  assert.equal(tone, 'good');
  assert.match(text, /pod průměrem EU/);
  assert.match(text, /nižší je lepší/i);
  assert.match(text, /Česko si vede dobře/);
});

test('bez benchmarku — nezmiňuje OECD/EU, ale dá směr a signál', () => {
  const ind = {
    value: 9.3, unit: '%',
    direction: 'lower_is_better', signal: 'neutral',
    trend: [],
  };
  const { text, tone } = buildTakeaway(ind);
  assert.equal(tone, 'neutral');
  assert.doesNotMatch(text, /OECD|EU/);
  assert.match(text, /^Česko: 9,3 %\./);
  assert.match(text, /nižší je lepší/i);
});

test('kontextový indikátor — explicitní věta o kontextovosti', () => {
  const ind = {
    value: 28, unit: 'na osobu',
    benchmark: { oecd: 26 },
    direction: 'context_dependent', signal: 'neutral',
  };
  const { text } = buildTakeaway(ind);
  assert.match(text, /kontextový ukazatel/i);
  assert.doesNotMatch(text, /lepší je|vyšší je lepší|nižší je lepší/);
});

test('zhruba na úrovni průměru — pod 2 % rozdílu', () => {
  const ind = {
    value: 15.8, unit: '%',
    benchmark: { eu: 16 },
    direction: 'lower_is_better', signal: 'warn',
  };
  const { text } = buildTakeaway(ind);
  assert.match(text, /zhruba na úrovni průměru EU/);
});

test('meziroční zlepšení se označí jako (zlepšení)', () => {
  const ind = {
    value: 80, unit: '%',
    direction: 'higher_is_better', signal: 'good',
    trend: [{ year: 2023, value: 70 }, { year: 2024, value: 80 }],
  };
  const { text } = buildTakeaway(ind);
  assert.match(text, /Meziročně roste/);
  assert.match(text, /\(zlepšení\)/);
});

test('chybějící / nečíselná hodnota → prázdný verdikt', () => {
  assert.deepEqual(buildTakeaway({ value: null }), { text: '', tone: 'neutral' });
  assert.deepEqual(buildTakeaway({ value: 'n/a' }), { text: '', tone: 'neutral' });
  assert.deepEqual(buildTakeaway(null), { text: '', tone: 'neutral' });
});
