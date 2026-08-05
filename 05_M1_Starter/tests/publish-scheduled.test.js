// Testy review-hold logiky cronu publish-scheduled.js — pojistka proti
// automatické publikaci rozpracovaných draftů + výběrové pravidlo fronty.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessHtml, holdReason, pickArticleToPublish, promoteStatusForPublish, assignPublicationNumber } from '../scripts/publish-scheduled.js';

test('assessHtml: čistý publikovatelný článek nemá draft markery', () => {
  const html = '<title>Něco zajímavého · HSPA Monitor</title>'
    + '<meta name="article:audit-status" content="verified">';
  const r = assessHtml(html);
  assert.equal(r.htmlStatus, 'verified');
  assert.deepEqual(r.draftMarkers, []);
});

test('assessHtml: zachytí (DRAFT) v titulku i v article-meta-date', () => {
  const html = '<title>Něco · HSPA Monitor (DRAFT)</title>'
    + '<span class="article-meta-date">draft · květen 2026</span>';
  const r = assessHtml(html);
  assert.equal(r.draftMarkers.length, 2);
});

test('holdReason: zadrží článek s _review_note', () => {
  assert.equal(holdReason({ _review_note: 'počkat na data' }, '<title>x</title>'), '_review_note');
});

test('holdReason: zadrží podle articles.json audit.status=flagged', () => {
  assert.match(holdReason({ audit: { status: 'flagged' } }, '<title>x</title>'), /flagged/);
});

test('holdReason: draft je nově PUBLIKOVATELNÝ (fronta = připraveno)', () => {
  // Politika „pustit i drafty": draft status sám o sobě nezadrží.
  assert.equal(holdReason({}, '<meta name="article:audit-status" content="draft">'), null);
  assert.equal(holdReason({ audit: { status: 'draft' } }, '<title>x</title>'), null);
});

test('holdReason: review-pending je publikovatelný', () => {
  assert.equal(holdReason({ audit: { status: 'review-pending' } }, '<title>x</title>'), null);
});

test('holdReason: zadrží flagged / draft-flagged / needs-rewrite', () => {
  for (const st of ['flagged', 'draft-flagged', 'needs-rewrite']) {
    assert.match(holdReason({ audit: { status: st } }, '<title>x</title>'), new RegExp(st));
  }
});

test('holdReason: zadrží draft s viditelným article-review-banner', () => {
  const html = '<meta name="article:audit-status" content="draft">'
    + '<main><aside class="article-review-banner">Status revize: čeká na schválení</aside></main>';
  assert.match(holdReason({}, html), /article-review-banner/);
});

test('promoteStatusForPublish: draft → review-pending (json i nested audit)', () => {
  const a = { 'audit-status': 'draft', audit: { status: 'draft' } };
  assert.equal(promoteStatusForPublish(a), 'review-pending');
  assert.equal(a['audit-status'], 'review-pending');
  assert.equal(a.audit.status, 'review-pending');
});

test('promoteStatusForPublish: chybějící status → review-pending', () => {
  const a = {};
  assert.equal(promoteStatusForPublish(a), 'review-pending');
  assert.equal(a['audit-status'], 'review-pending');
});

test('promoteStatusForPublish: verified/partial/review-pending se nemění', () => {
  for (const st of ['verified', 'partial', 'review-pending']) {
    const a = { 'audit-status': st };
    assert.equal(promoteStatusForPublish(a), null);
    assert.equal(a['audit-status'], st);
  }
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

// --- Redakční pořadové číslo se přiděluje až při publikaci ---------------
// Dokud ho nastavoval draft, dva PR z jedné noci si sáhly pro stejné `max+1`,
// kolidovaly na témže řádku articles.json a po „vezmi obojí" zůstaly dva
// články se stejným číslem (v korpusu jich takhle bylo 18). Publikace je
// sériová — nejvýš jeden článek denně — takže tady kolize nastat nemůže.

test('assignPublicationNumber: draft bez čísla dostane max+1', () => {
  const draft = { slug: 'novy' };
  const all = [{ number: 3 }, { number: 7 }, { number: 5 }, draft];
  assert.equal(assignPublicationNumber(draft, all), 8);
  assert.equal(draft.number, 8);
});

test('assignPublicationNumber: článek s číslem se nepřečíslovává', () => {
  const a = { slug: 'stary', number: 42 };
  assert.equal(assignPublicationNumber(a, [{ number: 99 }, a]), null);
  assert.equal(a.number, 42);
});

test('assignPublicationNumber: nečíselné number (manifest „M") se nepočítá do maxima', () => {
  const draft = { slug: 'novy' };
  assert.equal(assignPublicationNumber(draft, [{ number: 'M' }, { number: 4 }, draft]), 5);
});

test('assignPublicationNumber: prázdný korpus začíná od 1', () => {
  const draft = { slug: 'prvni' };
  assert.equal(assignPublicationNumber(draft, [draft]), 1);
});

test('assignPublicationNumber: dvě publikace po sobě nikdy nedají stejné číslo', () => {
  const all = [{ number: 1 }, { number: 2 }];
  const first = { slug: 'a' };
  all.push(first);
  assignPublicationNumber(first, all);
  const second = { slug: 'b' };
  all.push(second);
  assignPublicationNumber(second, all);
  assert.notEqual(first.number, second.number);
  assert.deepEqual([first.number, second.number], [3, 4]);
});
