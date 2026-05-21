// Testy review-hold logiky cronu publish-scheduled.js — pojistka proti
// automatické publikaci rozpracovaných draftů.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessHtml, holdReason } from '../scripts/publish-scheduled.js';

test('assessHtml: čistý publikovatelný článek nemá draft markery', () => {
  const html = '<title>Něco zajímavého · HSPA Monitor</title>'
    + '<meta name="article:audit-status" content="verified">';
  const r = assessHtml(html);
  assert.equal(r.htmlStatus, 'verified');
  assert.deepEqual(r.draftMarkers, []);
});

test('assessHtml: zachytí (DRAFT) v titulku, masthead i datu', () => {
  const html = '<title>Něco · HSPA Monitor (DRAFT)</title>'
    + '<span class="masthead-score">DRAFT — neukládáno do articles.json</span>'
    + '<span class="article-meta-date">draft · květen 2026</span>';
  const r = assessHtml(html);
  assert.equal(r.draftMarkers.length, 3);
});

test('holdReason: zadrží článek s _review_note', () => {
  assert.equal(holdReason({ _review_note: 'počkat na data' }, '<title>x</title>'), '_review_note');
});

test('holdReason: zadrží podle articles.json audit.status', () => {
  assert.match(holdReason({ audit: { status: 'review-pending' } }, '<title>x</title>'), /review-pending/);
});

test('holdReason: zadrží podle HTML audit-status draft', () => {
  assert.match(holdReason({}, '<meta name="article:audit-status" content="draft">'), /HTML audit-status=draft/);
});

test('holdReason: zadrží mislabeled partial s (DRAFT) v titulku', () => {
  // přesně případ socialne-zdravotni-pomezi: status partial, ale draft v titulku
  const html = '<title>X · HSPA Monitor (DRAFT)</title>'
    + '<meta name="article:audit-status" content="partial">';
  assert.match(holdReason({}, html), /draft markery/);
});

test('holdReason: připravený verified článek bez markerů → null', () => {
  const html = '<title>X · HSPA Monitor</title>'
    + '<meta name="article:audit-status" content="verified">';
  assert.equal(holdReason({}, html), null);
});

test('holdReason: čistý partial článek se publikuje (partial je publikovatelný)', () => {
  const html = '<title>X · HSPA Monitor</title>'
    + '<meta name="article:audit-status" content="partial">';
  assert.equal(holdReason({}, html), null);
});
