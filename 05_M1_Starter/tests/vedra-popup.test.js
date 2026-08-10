// Testy logiky sezónního vedra popupu (src/vedra-popup.js).
// isVedraWindow, vedraCampaignId a shouldShowVedraPopup jsou čisté funkce —
// testovatelné bez DOM. Vzor: newsletter-popup.test.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isVedraWindow, vedraCampaignId, shouldShowVedraPopup } from '../src/vedra-popup.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CFG = { enabled: true, from: '2026-06-01', to: '2026-08-31' };

test('isVedraWindow: uvnitř okna → true (včetně obou mezí)', () => {
  assert.equal(isVedraWindow(CFG, '2026-07-15'), true);
  assert.equal(isVedraWindow(CFG, '2026-06-01'), true);
  assert.equal(isVedraWindow(CFG, '2026-08-31'), true);
});

test('isVedraWindow: mimo okno → false', () => {
  assert.equal(isVedraWindow(CFG, '2026-05-31'), false);
  assert.equal(isVedraWindow(CFG, '2026-09-01'), false);
});

test('isVedraWindow: vypnuto nebo rozbitá konfigurace → false', () => {
  assert.equal(isVedraWindow({ ...CFG, enabled: false }, '2026-07-15'), false);
  assert.equal(isVedraWindow(null, '2026-07-15'), false);
  assert.equal(isVedraWindow({ enabled: true }, '2026-07-15'), false);
  assert.equal(isVedraWindow({ enabled: true, from: 'červen', to: 'srpen' }, '2026-07-15'), false);
});

test('vedraCampaignId: klíč váže dismiss na konkrétní okno', () => {
  assert.equal(vedraCampaignId(CFG), '2026-06-01..2026-08-31');
  assert.notEqual(vedraCampaignId(CFG), vedraCampaignId({ ...CFG, from: '2027-06-01', to: '2027-08-31' }));
});

test('shouldShowVedraPopup: čerstvý návštěvník → zobrazit', () => {
  assert.equal(shouldShowVedraPopup('2026-06-01..2026-08-31'), true);
});

test('shouldShowVedraPopup: zavřeno v této kampani → nezobrazit', () => {
  assert.equal(shouldShowVedraPopup('k1', { k1: 1700000000000 }), false);
});

test('shouldShowVedraPopup: dismiss loňské kampaně neumlčí letošní', () => {
  assert.equal(shouldShowVedraPopup('k2', { k1: 1700000000000 }), true);
});

test('shouldShowVedraPopup: už zobrazen v této session → nezobrazit', () => {
  assert.equal(shouldShowVedraPopup('k1', {}, { shown: 'k1' }), false);
  assert.equal(shouldShowVedraPopup('k1', {}, { shown: 'k2' }), true);
});

test('shouldShowVedraPopup: bez kampaně → nikdy', () => {
  assert.equal(shouldShowVedraPopup('', {}, {}), false);
});

test('data/vedra-popup.json: validní konfigurace s texty', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vedra-popup.json'), 'utf8'));
  assert.equal(typeof cfg.enabled, 'boolean');
  assert.match(cfg.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(cfg.to, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(cfg.from <= cfg.to, 'from musí předcházet to');
  for (const k of ['kicker', 'headline', 'body', 'cta']) {
    assert.ok(typeof cfg[k] === 'string' && cfg[k].length > 0, `chybí text ${k}`);
  }
});

test('newsletter-popup respektuje __vedraPopupActive (guard v kódu)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'newsletter-popup.js'), 'utf8');
  assert.ok(src.includes('__vedraPopupActive'), 'newsletter popup musí mlčet při aktivním vedra popupu');
});
