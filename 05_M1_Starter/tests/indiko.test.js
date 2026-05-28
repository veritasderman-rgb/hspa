// Testy INDIKO scraperu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';

import { extractPhaseMedians, extractMdtShare } from '../ingest/fetchers/indiko.js';

test('extractPhaseMedians — table-by-label strategy', () => {
  const html = `<html><body><table>
    <tr><th>Podezření</th><td>3 dny</td></tr>
    <tr><th>Diagnostika</th><td>14 dní</td></tr>
    <tr><th>MDT</th><td>5 dní</td></tr>
    <tr><th>Léčba</th><td>21 dní</td></tr>
    <tr><th>Follow-up</th><td>30 dní</td></tr>
  </table></body></html>`;
  const $ = cheerio.load(html);
  const r = extractPhaseMedians($);
  assert.equal(r.strategy, 'table-by-label');
  assert.equal(r.phases.podezreni.median_days, 3);
  assert.equal(r.phases.diagnostika.median_days, 14);
  assert.equal(r.phases.mdt.median_days, 5);
  assert.equal(r.phases.lecba.median_days, 21);
  assert.equal(r.phases.follow_up.median_days, 30);
});

test('extractPhaseMedians — data-phase strategy', () => {
  const html = `<html><body>
    <div data-phase="diagnostika" data-median="12">12 dní</div>
    <div data-phase="mdt" data-median="4">4 dny</div>
    <div data-phase="lecba" data-median="18">18 dní</div>
  </body></html>`;
  const $ = cheerio.load(html);
  const r = extractPhaseMedians($);
  assert.equal(r.strategy, 'data-attr');
  assert.equal(r.phases.diagnostika.median_days, 12);
  assert.equal(r.phases.mdt.median_days, 4);
  assert.equal(r.phases.lecba.median_days, 18);
});

test('extractPhaseMedians — empty when no match', () => {
  const $ = cheerio.load('<html><body><p>nic</p></body></html>');
  const r = extractPhaseMedians($);
  assert.equal(r.strategy, 'partial-or-empty');
  assert.equal(Object.keys(r.phases).length, 0);
});

test('extractMdtShare — data-attr strategy', () => {
  const html = `<html><body>
    <div data-mdt-share="72.5">72,5 %</div>
  </body></html>`;
  const $ = cheerio.load(html);
  const r = extractMdtShare($);
  assert.equal(r.mdt_share, 72.5);
  assert.equal(r.strategy, 'data-attr');
});

test('extractMdtShare — text-pattern strategy', () => {
  const html = `<html><body>
    <p>Podíl pacientů projednaných na MDT komisi: 68,2 % v roce 2024.</p>
  </body></html>`;
  const $ = cheerio.load(html);
  const r = extractMdtShare($);
  assert.equal(r.mdt_share, 68.2);
  assert.equal(r.strategy, 'text-pattern');
});

test('extractMdtShare — none-matched returns null', () => {
  const $ = cheerio.load('<html><body><p>nic</p></body></html>');
  const r = extractMdtShare($);
  assert.equal(r.mdt_share, null);
  assert.equal(r.strategy, 'none-matched');
});
