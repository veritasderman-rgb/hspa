// Testy logiky zobrazení newsletter popupu (B-39).
// shouldShowPopup je čistá funkce — testovatelná bez DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowPopup } from '../src/newsletter-popup.js';

const DAY = 86400000;
const NOW = 1_700_000_000_000;

test('shouldShowPopup: čerstvý návštěvník → zobrazit', () => {
  assert.equal(shouldShowPopup({}, NOW), true);
  assert.equal(shouldShowPopup(undefined, NOW), true);
});

test('shouldShowPopup: přihlášený uživatel → nikdy', () => {
  assert.equal(shouldShowPopup({ subscribed: true }, NOW), false);
});

test('shouldShowPopup: zavřeno před 5 dny → nezobrazit', () => {
  assert.equal(shouldShowPopup({ dismissedAt: NOW - 5 * DAY }, NOW), false);
});

test('shouldShowPopup: zavřeno právě teď → nezobrazit', () => {
  assert.equal(shouldShowPopup({ dismissedAt: NOW }, NOW), false);
});

test('shouldShowPopup: zavřeno před 31 dny → zobrazit znovu', () => {
  assert.equal(shouldShowPopup({ dismissedAt: NOW - 31 * DAY }, NOW), true);
});

test('shouldShowPopup: subscribed má přednost před dismissedAt', () => {
  assert.equal(
    shouldShowPopup({ subscribed: true, dismissedAt: NOW - 99 * DAY }, NOW),
    false,
  );
});
