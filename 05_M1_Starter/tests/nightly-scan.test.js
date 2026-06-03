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
