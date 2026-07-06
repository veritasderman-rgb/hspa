// Testy pro ingest/run.js — čistá funkce formatFetcherSummary().
// Importovat run.js je bezpečné: auto-spuštění pipeline je pod
// import.meta.url guardem, takže se při importu nespustí.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatFetcherSummary } from '../ingest/run.js';
import { summarize } from '../ingest/verify-freshness.js';

const FETCHERS = [
  { name: 'ČSÚ DataStat' },
  { name: 'OECD Health' },
  { name: 'Eurostat' },
];

test('formatFetcherSummary: OK/FAIL značka podle failures', () => {
  const summary = summarize([]);
  const out = formatFetcherSummary({
    fetchers: FETCHERS,
    failures: [{ name: 'OECD Health', error: 'HTTP 404' }],
    summary,
  });
  assert.match(out, /OK {4}ČSÚ DataStat/);
  assert.match(out, /FAIL {2}OECD Health — HTTP 404/);
  assert.match(out, /OK {4}Eurostat/);
});

test('formatFetcherSummary: bez selhání jsou všechny fetchery OK', () => {
  const summary = summarize([]);
  const out = formatFetcherSummary({ fetchers: FETCHERS, failures: [], summary });
  assert.doesNotMatch(out, /FAIL/);
  const okCount = (out.match(/OK {4}/g) || []).length;
  assert.equal(okCount, 3);
});

test('formatFetcherSummary: agregát živých indikátorů celkem i podle zdroje', () => {
  const now = new Date().toISOString();
  const indicators = [
    { id: 'a', source: { name: 'OECD', origin: 'live', fetched_at: now } },
    { id: 'b', source: { name: 'OECD', origin: 'seed', fetched_at: now } },
    { id: 'c', source: { name: 'ČSÚ', origin: 'live', fetched_at: now } },
    { id: 'd', source: { name: 'ČSÚ', origin: 'live', fetched_at: now } },
  ];
  const summary = summarize(indicators);
  const out = formatFetcherSummary({ fetchers: FETCHERS, failures: [], summary });
  // 3 ze 4 živé = 75.0 %
  assert.match(out, /Živé indikátory: 3\/4 \(75\.0 %\)/);
  // per-source řádky (počet živých / celkem, ratio, název zdroje)
  assert.match(out, /1\/2 +live \(50 %\) +OECD/);
  assert.match(out, /2\/2 +live \(100 %\) +ČSÚ/);
});

test('formatFetcherSummary: prázdný běh nedělí nulou', () => {
  const summary = summarize([]);
  const out = formatFetcherSummary({ fetchers: [], failures: [], summary });
  assert.match(out, /Živé indikátory: 0\/0 \(0\.0 %\)/);
});
