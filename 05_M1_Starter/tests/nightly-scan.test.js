// Testy nočního skeneru: respektování audit.last_reviewed u check-sources.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLastReviewed, daysBetween, REVIEW_SKIP_DAYS, scanArticle,
} from '../scripts/nightly-scan.js';

const TODAY = '2026-06-03';
const fx = name => ({
  slug: `tests/fixtures/nightly/${name}.html`,
  title: name, number: '1', date: '2026-01-01', published: true,
});
const types = item => item.flags.map(f => f.type);

test('parseLastReviewed vytáhne datum z audit komentáře', () => {
  assert.equal(parseLastReviewed('<!-- last_reviewed: 2026-06-01 -->'), '2026-06-01');
  assert.equal(parseLastReviewed('last_reviewed: "2026-05-15"'), '2026-05-15');
  assert.equal(parseLastReviewed('<p>bez auditu</p>'), null);
});

test('daysBetween počítá dny správně', () => {
  assert.equal(daysBetween('2026-06-01', '2026-06-03'), 2);
  assert.equal(daysBetween('2026-05-20', '2026-06-03'), 14);
  assert.equal(daysBetween('bad', '2026-06-03'), null);
});

test('check-sources se přeskočí u článku auditovaného < 14 dní', () => {
  const item = scanArticle(fx('recent-review'), TODAY, { skipReviewed: true });
  assert.ok(!types(item).includes('check-sources'), 'check-sources nemá být přítomné');
  assert.ok(item.check_sources_skipped, 'má být zaznamenáno check_sources_skipped');
  assert.equal(item.last_reviewed, '2026-06-01');
});

test('check-sources se NEpřeskočí u staršího auditu (> 14 dní)', () => {
  const item = scanArticle(fx('old-review'), TODAY, { skipReviewed: true });
  assert.ok(types(item).includes('check-sources'), 'check-sources má být přítomné');
  assert.ok(!item.check_sources_skipped);
});

test('--no-skip-reviewed (skipReviewed:false) ukáže check-sources i u recentního auditu', () => {
  const item = scanArticle(fx('recent-review'), TODAY, { skipReviewed: false });
  assert.ok(types(item).includes('check-sources'));
});

test('date-passed surfuje i u recentně auditovaného článku (check-sources přeskočeno)', () => {
  const item = scanArticle(fx('recent-review-datepassed'), TODAY, { skipReviewed: true });
  const t = types(item);
  assert.ok(t.includes('date-passed'), 'date-passed se nesmí přeskočit');
  assert.ok(!t.includes('check-sources'), 'check-sources se má přeskočit');
});

test('REVIEW_SKIP_DAYS je 14 (sladěno s rutinou)', () => {
  assert.equal(REVIEW_SKIP_DAYS, 14);
});

// --- indicator-drift (článek ↔ datový kontrakt) ---

test('valueVariants: generuje české zápisy hodnoty vč. tisícových mezer', async () => {
  const { valueVariants } = await import('../scripts/nightly-scan.js');
  const v = valueVariants(4564.4);
  assert.ok(v.includes('4564,4'), 'desetinná čárka');
  assert.ok(v.includes('4 564,4'), 'tisícová mezera');
  assert.ok(v.includes('4564'), 'celé číslo');
  const w = valueVariants(98.7);
  assert.ok(w.includes('98,7'));
});

test('findIndicatorDrift: flaguje zastaralou citaci, mlčí u aktuální', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([
    ['foo_ind', { id: 'foo_ind', value: 98.7, unit: '%', year: 2022 }],
    ['bar_ind', { id: 'bar_ind', value: 250.4, unit: '/100k', year: 2023 }],
  ]);
  const html = `
    <li><a href="indicator.html?id=foo_ind">Foo</a> — 35,8 % vs. OECD 91 %</li>
    <li><a href="indicator.html?id=bar_ind">Bar</a> — 250,4 / 100 000 (2023)</li>`;
  const drifts = findIndicatorDrift(html, byId);
  assert.equal(drifts.length, 1);
  assert.equal(drifts[0].id, 'foo_ind');
});

test('findIndicatorDrift: bez čísel v okolí neflaguje (jen odkaz bez citace)', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([['foo_ind', { id: 'foo_ind', value: 98.7, unit: '%', year: 2022 }]]);
  const html = '<a href="indicator.html?id=foo_ind">detail indikátoru</a> bez čísel okolo.';
  assert.equal(findIndicatorDrift(html, byId).length, 0);
});

test('findIndicatorDrift: jednociferná varianta nematchne uvnitř letopočtu (boundary)', async () => {
  const { findIndicatorDrift } = await import('../scripts/nightly-scan.js');
  const byId = new Map([['pad_ind', { id: 'pad_ind', value: 2.1, unit: '/1000', year: 2024 }]]);
  // okno obsahuje rok 2026 (obsahuje číslici 2), ale NE hodnotu 2,1 → musí flagovat
  const html = '<p>V roce 2026 bylo pádů 3,4 na 1 000 hospitalizací — <a href="indicator.html?id=pad_ind">detail</a></p>';
  const drifts = findIndicatorDrift(html, byId);
  assert.equal(drifts.length, 1, 'stará citace 3,4 ≠ aktuální 2,1; rok 2026 nesmí maskovat drift');
  // a naopak: správná citace 2,1 nesmí flagovat
  const ok = '<p>Pádů je 2,1 na 1 000 hospitalizací (2024) — <a href="indicator.html?id=pad_ind">detail</a></p>';
  assert.equal(findIndicatorDrift(ok, byId).length, 0);
});
