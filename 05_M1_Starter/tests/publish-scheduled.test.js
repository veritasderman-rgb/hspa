// Testy review-hold logiky cronu publish-scheduled.js — pojistka proti
// automatické publikaci rozpracovaných draftů + výběrové pravidlo fronty.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessHtml, holdReason, pickArticleToPublish } from '../scripts/publish-scheduled.js';

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

// ─── pickArticleToPublish — výběr jednoho článku z fronty ───

test('pickArticleToPublish: prázdná fronta → null', () => {
  assert.equal(pickArticleToPublish([]), null);
  assert.equal(pickArticleToPublish(undefined), null);
});

test('pickArticleToPublish: bez topical → vyhrává nejstarší ready_since', () => {
  const r = pickArticleToPublish([
    { slug: 'a', ready_since: '2026-05-10' },
    { slug: 'b', ready_since: '2026-05-03' },
    { slug: 'c', ready_since: '2026-05-20' },
  ]);
  assert.equal(r.article.slug, 'b');
  assert.equal(r.basis, 'queue');
});

test('pickArticleToPublish: topical má přednost před nejdéle čekajícím', () => {
  const r = pickArticleToPublish([
    { slug: 'evergreen', ready_since: '2026-01-01' },
    { slug: 'topical', ready_since: '2026-05-20', topical_until: '2026-06-01' },
  ]);
  assert.equal(r.article.slug, 'topical');
  assert.equal(r.basis, 'topical');
});

test('pickArticleToPublish: mezi topical vyhrává nejbližší topical_until', () => {
  const r = pickArticleToPublish([
    { slug: 'pozdeji', ready_since: '2026-01-01', topical_until: '2026-08-01' },
    { slug: 'driv', ready_since: '2026-05-01', topical_until: '2026-05-25' },
  ]);
  assert.equal(r.article.slug, 'driv');
  assert.equal(r.basis, 'topical');
});

test('pickArticleToPublish: shoda ready_since → rozhodne scheduled_for', () => {
  const r = pickArticleToPublish([
    { slug: 'a', ready_since: '2026-05-05', scheduled_for: '2026-05-30' },
    { slug: 'b', ready_since: '2026-05-05', scheduled_for: '2026-05-22' },
  ]);
  assert.equal(r.article.slug, 'b');
});
