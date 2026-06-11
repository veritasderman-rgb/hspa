// Testy českého formátování čísel (formatNumberCz) — UX audit nález §4:
// karty zobrazovaly „17989.8" a „2.736" s desetinnou tečkou vedle „55,3 %".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumberCz } from '../src/page-shared.js';

// toLocaleString('cs-CZ') odděluje tisíce nezlomitelnou mezerou (U+00A0)
const NBSP = ' ';

test('formatNumberCz: desetinná čárka a mezera mezi tisíci', () => {
  assert.equal(formatNumberCz(17989.8), `17${NBSP}989,8`);
  assert.equal(formatNumberCz(803252), `803${NBSP}252`);
  assert.equal(formatNumberCz(2.736), '2,736');
  assert.equal(formatNumberCz(79.9), '79,9');
});

test('formatNumberCz: minDecimals/maxDecimals', () => {
  assert.equal(formatNumberCz(5, { minDecimals: 1, maxDecimals: 1 }), '5,0');
  assert.equal(formatNumberCz(2.736, { maxDecimals: 1 }), '2,7');
  assert.equal(formatNumberCz(80, { maxDecimals: 1 }), '80');
});

test('formatNumberCz: okrajové hodnoty', () => {
  assert.equal(formatNumberCz(null), '—');
  assert.equal(formatNumberCz(undefined), '—');
  assert.equal(formatNumberCz(''), '—');
  assert.equal(formatNumberCz('n/a'), 'n/a');
  assert.equal(formatNumberCz(0), '0');
});
