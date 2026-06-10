// Testy embed widgetu (src/embed.js): sparkline + renderEmbedCard.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// jsdom není v deps; testujeme čisté funkce přes dynamický import s guardem.
// embed.js volá init() jen pod `typeof window !== 'undefined'`, takže import
// v node (bez window) je bezpečný.
const mod = await import('../src/embed.js');

test('sparklineSvg: vrátí prázdno pro < 2 body', () => {
  assert.equal(mod.sparklineSvg([]), '');
  assert.equal(mod.sparklineSvg([{ year: 2020, value: 1 }]), '');
});

test('sparklineSvg: vykreslí path + koncový bod pro validní trend', () => {
  const svg = mod.sparklineSvg([
    { year: 2020, value: 10 }, { year: 2021, value: 12 }, { year: 2022, value: 11 },
  ]);
  assert.match(svg, /<svg/);
  assert.match(svg, /<path d="M/);
  assert.match(svg, /<circle/);
  assert.match(svg, /Trend 2020–2022/);
});

test('renderEmbedCard: obsahuje název, hodnotu, signal, benchmark, odkaz na detail', () => {
  const html = mod.renderEmbedCard({
    id: 'foo', name: 'Naděje dožití', area: 'Výsledky', value: 79.9, unit: 'let',
    year: 2024, signal: 'warn', benchmark: { oecd: 81.1 },
    verification_status: 'verified', source: { name: 'ČSÚ' },
    trend: [{ year: 2022, value: 79.5 }, { year: 2024, value: 79.9 }],
  });
  assert.match(html, /Naděje dožití/);
  assert.match(html, /79,9/);
  assert.match(html, /embed-signal-warn/);
  assert.match(html, /OECD ⌀ 81,1/);
  assert.match(html, /Ověřeno/);
  assert.match(html, /indicator\.html\?id=foo/);
  assert.match(html, /target="_top"/);
});

test('renderEmbedCard: escapuje název (XSS guard)', () => {
  const html = mod.renderEmbedCard({ id: 'x', name: '<script>alert(1)</script>', value: 1, signal: 'neutral' });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(html, /&lt;script&gt;/);
});
