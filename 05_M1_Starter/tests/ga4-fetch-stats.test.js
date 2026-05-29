// Testy pro scripts/fetch-ga4-stats.js — pure helpers.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isoDateNDaysAgo, shapeOutput, loadConfig } from '../scripts/fetch-ga4-stats.js';

test('isoDateNDaysAgo — vrací YYYY-MM-DD string', () => {
  const today = isoDateNDaysAgo(0);
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

test('isoDateNDaysAgo — N dnů zpět je správně', () => {
  const a = new Date(isoDateNDaysAgo(0));
  const b = new Date(isoDateNDaysAgo(7));
  const diffDays = Math.round((a - b) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 7);
});

test('shapeOutput — formátuje top_indicators správně', () => {
  const raw = {
    from: '2026-05-22',
    to: '2026-05-29',
    indicatorRows: [
      { dimensionValues: [{ value: 'mortalita_inhosp_ami' }], metricValues: [{ value: '1247' }] },
      { dimensionValues: [{ value: 'nadeje_doziti_total' }], metricValues: [{ value: '982' }] },
    ],
    articleRows: [],
    termRows: [],
    sourceRows: [],
    shareRows: [],
    externalRows: [],
    trendRows: [],
  };
  const out = shapeOutput(raw);
  assert.equal(out.top_indicators.length, 2);
  assert.equal(out.top_indicators[0].id, 'mortalita_inhosp_ami');
  assert.equal(out.top_indicators[0].clicks, 1247);
  assert.equal(out.version, '1.0');
  assert.equal(out.period.from, '2026-05-22');
});

test('shapeOutput — formátuje top_articles s avg engagement', () => {
  const raw = {
    from: '2026-05-22',
    to: '2026-05-29',
    indicatorRows: [],
    articleRows: [
      {
        dimensionValues: [{ value: '/clanek-deficit-vzp-2026.html' }],
        metricValues: [{ value: '3210' }, { value: '589640' }, { value: '2845' }],
      },
    ],
    termRows: [],
    sourceRows: [],
    shareRows: [],
    externalRows: [],
    trendRows: [],
  };
  const out = shapeOutput(raw);
  assert.equal(out.top_articles.length, 1);
  assert.equal(out.top_articles[0].slug, 'clanek-deficit-vzp-2026');
  assert.equal(out.top_articles[0].views, 3210);
  // 589640 / 3210 = 183.69 → round to 184
  assert.equal(out.top_articles[0].avg_engagement_s, 184);
  assert.equal(out.top_articles[0].users, 2845);
});

test('shapeOutput — formátuje 30d trend s YYYYMMDD → YYYY-MM-DD', () => {
  const raw = {
    from: '2026-05-22',
    to: '2026-05-29',
    indicatorRows: [],
    articleRows: [],
    termRows: [],
    sourceRows: [],
    shareRows: [],
    externalRows: [],
    trendRows: [
      { dimensionValues: [{ value: '20260520' }], metricValues: [{ value: '1234' }] },
      { dimensionValues: [{ value: '20260521' }], metricValues: [{ value: '1456' }] },
    ],
  };
  const out = shapeOutput(raw);
  assert.equal(out.traffic_trend_30d.length, 2);
  assert.equal(out.traffic_trend_30d[0].date, '2026-05-20');
  assert.equal(out.traffic_trend_30d[0].users, 1234);
});

test('shapeOutput — filtruje řádky bez dimension value', () => {
  const raw = {
    from: '2026-05-22',
    to: '2026-05-29',
    indicatorRows: [
      { dimensionValues: [{ value: 'good_id' }], metricValues: [{ value: '100' }] },
      { dimensionValues: [{ value: null }], metricValues: [{ value: '50' }] },
      { dimensionValues: [], metricValues: [{ value: '10' }] },
    ],
    articleRows: [],
    termRows: [],
    sourceRows: [],
    shareRows: [],
    externalRows: [],
    trendRows: [],
  };
  const out = shapeOutput(raw);
  assert.equal(out.top_indicators.length, 1);
  assert.equal(out.top_indicators[0].id, 'good_id');
});

test('loadConfig — vrací null když chybí env vars', () => {
  const oldKey = process.env.GA_SERVICE_ACCOUNT_KEY;
  const oldId = process.env.GA_PROPERTY_ID;
  delete process.env.GA_SERVICE_ACCOUNT_KEY;
  delete process.env.GA_PROPERTY_ID;
  const config = loadConfig();
  assert.equal(config, null);
  if (oldKey) process.env.GA_SERVICE_ACCOUNT_KEY = oldKey;
  if (oldId) process.env.GA_PROPERTY_ID = oldId;
});

test('loadConfig — odhalí invalidní JSON v GA_SERVICE_ACCOUNT_KEY', () => {
  const oldKey = process.env.GA_SERVICE_ACCOUNT_KEY;
  const oldId = process.env.GA_PROPERTY_ID;
  process.env.GA_SERVICE_ACCOUNT_KEY = 'not json {';
  process.env.GA_PROPERTY_ID = '12345';
  assert.throws(() => loadConfig(), /není validní JSON/);
  process.env.GA_SERVICE_ACCOUNT_KEY = oldKey ?? '';
  process.env.GA_PROPERTY_ID = oldId ?? '';
});

test('loadConfig — odhalí chybějící private_key / client_email', () => {
  const oldKey = process.env.GA_SERVICE_ACCOUNT_KEY;
  const oldId = process.env.GA_PROPERTY_ID;
  process.env.GA_SERVICE_ACCOUNT_KEY = JSON.stringify({ client_email: 'x@y.com' });
  process.env.GA_PROPERTY_ID = '12345';
  assert.throws(() => loadConfig(), /chybí client_email nebo private_key/);
  process.env.GA_SERVICE_ACCOUNT_KEY = oldKey ?? '';
  process.env.GA_PROPERTY_ID = oldId ?? '';
});
