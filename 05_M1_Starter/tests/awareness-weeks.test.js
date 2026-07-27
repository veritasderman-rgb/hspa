// Týdny zdraví — testy registru a pure helperů.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDay, isWithin, activeWeekFor, announceWeekFor, upcomingWeeks, pastWeeks, resolveWeek, formatRange } from '../src/awareness-core.js';
import { shouldShowAwarenessPopup, popupVariant } from '../src/awareness-popup.js';
import { validateAwarenessWeeks } from '../ingest/validate-awareness-weeks.js';
import { rotate, assessReadiness, isPublishedArticle } from '../scripts/awareness-rotate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'awareness-weeks.json'), 'utf8'));

test('awareness-weeks.json prochází validátorem', () => {
  assert.equal(validateAwarenessWeeks(), true);
});

test('data: pilot Světový týden kojení je ready a sedí na 1.–7. 8.', () => {
  const wbw = reg.weeks.find(w => w.id === 'svetovy-tyden-kojeni-2026');
  assert.ok(wbw, 'pilot chybí');
  assert.equal(wbw.status, 'ready');
  assert.equal(wbw.start, '2026-08-01');
  assert.equal(wbw.end, '2026-08-07');
});

test('helper: isWithin — kraje intervalu jsou včetně', () => {
  const w = { start: '2026-08-01', end: '2026-08-07' };
  assert.equal(isWithin(w, '2026-08-01'), true);
  assert.equal(isWithin(w, '2026-08-07'), true);
  assert.equal(isWithin(w, '2026-07-31'), false);
  assert.equal(isWithin(w, '2026-08-08'), false);
});

test('helper: activeWeekFor vrací jen ready týden obsahující den', () => {
  const weeks = [
    { id: 'a', status: 'ready', start: '2026-08-01', end: '2026-08-07' },
    { id: 'b', status: 'draft', start: '2026-10-05', end: '2026-10-11' },
  ];
  assert.equal(activeWeekFor('2026-08-03', weeks).id, 'a');
  assert.equal(activeWeekFor('2026-10-07', weeks), null, 'draft se nikdy neaktivuje');
  assert.equal(activeWeekFor('2026-09-01', weeks), null);
});

test('helper: upcomingWeeks řadí budoucí dle startu, archived vynechává', () => {
  const weeks = [
    { id: 'a', status: 'ready', start: '2026-08-01', end: '2026-08-07' },
    { id: 'b', status: 'draft', start: '2026-11-18', end: '2026-11-24' },
    { id: 'c', status: 'archived', start: '2027-02-01', end: '2027-02-07' },
  ];
  const up = upcomingWeeks('2026-09-01', weeks);
  assert.deepEqual(up.map(w => w.id), ['b']);
});

test('helper: resolveWeek — ?id override, jinak aktivní, jinak nejbližší příští', () => {
  const weeks = reg.weeks;
  assert.equal(resolveWeek(weeks, '2026-08-03').id, 'svetovy-tyden-kojeni-2026', 'aktivní');
  assert.equal(resolveWeek(weeks, '2026-06-01', 'svetovy-antibioticky-tyden-2026').id, 'svetovy-antibioticky-tyden-2026', 'override');
  // mimo aktivní → nejbližší příští (nejdřívější start po dni)
  const r = resolveWeek(weeks, '2026-06-01');
  assert.ok(r && parseDay(r.start) > parseDay('2026-06-01'));
});

test('helper: formatRange čte česky', () => {
  assert.equal(formatRange({ start: '2026-08-01', end: '2026-08-07' }), '1. srpna – 7. srpna 2026');
});

test('helper: pastWeeks — archiv řadí od nejnovějšího, drafty vynechává', () => {
  const weeks = [
    { id: 'a', status: 'archived', start: '2026-08-01', end: '2026-08-07' },
    { id: 'b', status: 'ready', start: '2026-10-05', end: '2026-10-11' },
    { id: 'c', status: 'draft', start: '2026-09-01', end: '2026-09-07' },
  ];
  const past = pastWeeks('2026-11-01', weeks);
  assert.deepEqual(past.map(w => w.id), ['b', 'a'], 'nejnovější první; draft c chybí');
  assert.deepEqual(pastWeeks('2026-07-01', weeks), [], 'před prvním týdnem prázdné');
});

test('helper: resolveWeek s ?id vrací i archivovaný týden (trvalá landing page)', () => {
  const weeks = [{ id: 'old', status: 'archived', start: '2026-08-01', end: '2026-08-07' }];
  assert.equal(resolveWeek(weeks, '2026-12-01', 'old').id, 'old');
});

// ── Týdenní rotace (scripts/awareness-rotate.js) ──────────────────────────

test('data: ready pilot má kompletní context (why/affects/cz)', () => {
  const wbw = reg.weeks.find(w => w.id === 'svetovy-tyden-kojeni-2026');
  assert.ok(wbw.context, 'context chybí');
  assert.ok(wbw.context.why, 'why chybí');
  assert.ok(Array.isArray(wbw.context.affects) && wbw.context.affects.length > 0, 'affects chybí');
  assert.ok(wbw.context.cz, 'cz chybí');
});

const CTX = () => ({
  artById: new Map([
    ['clanek-a.html', { slug: 'clanek-a.html', published: true, date: '2026-01-01' }],
    ['clanek-draft.html', { slug: 'clanek-draft.html', published: false }],
  ]),
  indIds: new Set(['ind_x']),
  prevIds: new Set(['tema_y']),
  root: null, // vypne kontrolu existence souboru
});

test('rotate: archivuje doběhnutý ready týden', () => {
  const doc = { weeks: [{ id: 'past', status: 'ready', start: '2026-01-01', end: '2026-01-07' }] };
  const { changes } = rotate(doc, '2026-03-01', CTX());
  assert.equal(doc.weeks[0].status, 'archived');
  assert.deepEqual(changes, [{ id: 'past', action: 'archived' }]);
});

test('rotate: aktivuje hotový draft v okně 14 dní (nejvýše jeden)', () => {
  const base = { context: { why: 'w', affects: ['a'], cz: 'c' }, popup: { headline: 'h', body: 'b', cta: 'c' }, kicker: 'k', title: 't', lead: 'l', linked_indicators: ['ind_x'] };
  const doc = { weeks: [
    { ...base, id: 'soon', status: 'draft', start: '2026-03-05', end: '2026-03-11' },
    { ...base, id: 'later', status: 'draft', start: '2026-03-20', end: '2026-03-26' },
  ] };
  const { changes } = rotate(doc, '2026-03-01', CTX());
  assert.equal(doc.weeks[0].status, 'ready', 'nejbližší aktivován');
  assert.equal(doc.weeks[1].status, 'draft', 'druhý zůstává draft');
  assert.deepEqual(changes.filter(c => c.action === 'activated'), [{ id: 'soon', action: 'activated' }]);
});

test('rotate: neaktivuje draft mimo okno 14 dní', () => {
  const base = { context: { why: 'w', affects: ['a'], cz: 'c' }, popup: { headline: 'h', body: 'b', cta: 'c' }, kicker: 'k', title: 't', lead: 'l', linked_indicators: ['ind_x'] };
  const doc = { weeks: [{ ...base, id: 'far', status: 'draft', start: '2026-05-01', end: '2026-05-07' }] };
  rotate(doc, '2026-03-01', CTX());
  assert.equal(doc.weeks[0].status, 'draft');
});

test('rotate: neaktivuje nekompletní draft (chybí context)', () => {
  const doc = { weeks: [{ id: 'thin', status: 'draft', start: '2026-03-05', end: '2026-03-11', popup: { headline: 'h', body: 'b', cta: 'c' }, kicker: 'k', title: 't', lead: 'l', linked_indicators: ['ind_x'] }] };
  const { changes } = rotate(doc, '2026-03-01', CTX());
  assert.equal(doc.weeks[0].status, 'draft');
  const skip = changes.find(c => c.action === 'skipped');
  assert.ok(skip && skip.reasons.some(r => /context/.test(r)));
});

test('rotate: prázdná microsite (jen draft článek, žádný indikátor) se neaktivuje', () => {
  const doc = { weeks: [{ id: 'empty', status: 'draft', start: '2026-03-05', end: '2026-03-11', context: { why: 'w', affects: ['a'], cz: 'c' }, popup: { headline: 'h', body: 'b', cta: 'c' }, kicker: 'k', title: 't', lead: 'l', linked_articles: ['clanek-draft.html'], linked_indicators: [] }] };
  const { changes } = rotate(doc, '2026-03-01', CTX());
  assert.equal(doc.weeks[0].status, 'draft');
  const skip = changes.find(c => c.action === 'skipped');
  assert.ok(skip && skip.reasons.some(r => /prázdná/.test(r)));
});

test('isPublishedArticle: draft a budoucí datum jsou skryté', () => {
  assert.equal(isPublishedArticle({ published: true, date: '2026-01-01' }, '2026-03-01'), true);
  assert.equal(isPublishedArticle({ published: false }, '2026-03-01'), false);
  assert.equal(isPublishedArticle({ published: true, date: '2026-09-01' }, '2026-03-01'), false);
  assert.equal(isPublishedArticle(null, '2026-03-01'), false);
});

test('popup: shouldShow — dismiss per-týden a jednou za návštěvu', () => {
  assert.equal(shouldShowAwarenessPopup('w1', {}, {}), true);
  assert.equal(shouldShowAwarenessPopup('w1', { w1: Date.now() }, {}), false, 'zavřený mlčí');
  assert.equal(shouldShowAwarenessPopup('w1', {}, { shown: 'w1' }), false, 'už zobrazený v návštěvě');
  assert.equal(shouldShowAwarenessPopup('w1', { w2: 1 }, { shown: 'w2' }), true, 'jiný týden nevadí');
  assert.equal(shouldShowAwarenessPopup(null, {}, {}), false);
});

test('announceWeekFor: okno announce_from ≤ den < start, jen ready', () => {
  const w = { id: 'kojeni', status: 'ready', start: '2026-08-01', end: '2026-08-07', announce_from: '2026-07-27' };
  assert.equal(announceWeekFor('2026-07-26', [w]), null, 'před oknem mlčí');
  assert.equal(announceWeekFor('2026-07-27', [w])?.id, 'kojeni', 'první den okna ohlašuje');
  assert.equal(announceWeekFor('2026-07-31', [w])?.id, 'kojeni', 'den před startem ohlašuje');
  assert.equal(announceWeekFor('2026-08-01', [w]), null, 'od startu přebírá ostrý týden (activeWeekFor)');
  assert.equal(announceWeekFor('2026-07-28', [{ ...w, status: 'draft' }]), null, 'draft se neohlašuje');
  assert.equal(announceWeekFor('2026-07-28', [{ ...w, announce_from: undefined }]), null, 'bez announce_from se neohlašuje');
});

test('popupVariant: announce má vlastní stateKey a texty; dismiss ohlášení neumlčí ostrý popup', () => {
  const w = {
    id: 'kojeni', observance: 'Světový týden kojení', start: '2026-08-01', end: '2026-08-07',
    popup: { headline: 'Je týden', body: 'B', cta: 'Otevřít', announce_headline: 'Blíží se', announce_body: 'AB', announce_cta: 'Mrknout' },
  };
  const ann = popupVariant(w, 'announce');
  const act = popupVariant(w, 'active');
  assert.equal(ann.stateKey, 'kojeni:announce');
  assert.equal(act.stateKey, 'kojeni');
  assert.equal(ann.headline, 'Blíží se');
  assert.equal(act.headline, 'Je týden');
  assert.ok(ann.range && /srpna/.test(ann.range), 'ohlášení nese termín týdne');
  // klíčové: zavření ohlášení nesmí umlčet ostrý popup
  const state = { [ann.stateKey]: Date.now() };
  assert.equal(shouldShowAwarenessPopup(ann.stateKey, state, {}), false);
  assert.equal(shouldShowAwarenessPopup(act.stateKey, state, {}), true);
});

test('popupVariant: announce fallbacky bez vlastních textů', () => {
  const w = { id: 'x', observance: 'Den X', start: '2026-09-10', end: '2026-09-16', lead: 'L', popup: { headline: 'H', body: 'B', cta: 'C' } };
  const ann = popupVariant(w, 'announce');
  assert.equal(ann.headline, 'Blíží se Den X');
  assert.equal(ann.body, 'B');
  assert.equal(ann.cta, 'Podívat se, co chystáme');
});

test('validace: announce_from musí být před startem a max 14 dní předem', () => {
  const base = { id: 'a', observance: 'o', observance_source: 's', kicker: 'k', title: 't', lead: 'l', status: 'ready', start: '2026-08-01', end: '2026-08-07', popup: { headline: 'h', body: 'b', cta: 'c' }, context: { why: 'w', affects: ['x'], cz: 'c' }, linked_indicators: ['nadeje_doziti_total'] };
  const run = (announce_from) => validateAwarenessWeeks({ weeks: [{ ...base, announce_from }] });
  assert.equal(run('2026-07-27'), true, 'platné okno projde');
  assert.equal(run('2026-08-01'), false, 'announce_from == start selže');
  assert.equal(run('2026-07-01'), false, 'víc než 14 dní předem selže');
  assert.equal(run('nesmysl'), false, 'neplatné datum selže');
});

test('parseDay: odmítá neexistující kalendářní dny (Codex #885)', () => {
  assert.ok(Number.isFinite(parseDay('2026-02-28')));
  assert.ok(Number.isNaN(parseDay('2026-02-31')), '31. února neexistuje');
  assert.ok(Number.isNaN(parseDay('2026-13-01')), '13. měsíc neexistuje');
  assert.ok(Number.isNaN(parseDay('2026-04-31')), '31. dubna neexistuje');
  assert.ok(Number.isFinite(parseDay('2028-02-29')), 'přestupný rok projde');
  assert.ok(Number.isNaN(parseDay('2026-02-29')), 'nepřestupný 29. únor selže');
});

test('validace: announce_from s neexistujícím dnem selže (2026-02-31)', () => {
  const base = { id: 'a', observance: 'o', observance_source: 's', kicker: 'k', title: 't', lead: 'l', status: 'ready', start: '2026-08-01', end: '2026-08-07', popup: { headline: 'h', body: 'b', cta: 'c' }, context: { why: 'w', affects: ['x'], cz: 'c' }, linked_indicators: ['nadeje_doziti_total'] };
  assert.equal(validateAwarenessWeeks({ weeks: [{ ...base, announce_from: '2026-07-32' }] }), false);
});

test('popupVariant: CTA vede na tyden.html?id= (překryv ohlášení s jiným týdnem)', () => {
  const w = { id: 'svetovy-tyden-kojeni-2026', observance: 'X', start: '2026-08-01', end: '2026-08-07', popup: {} };
  assert.equal(popupVariant(w, 'announce').href, 'tyden.html?id=svetovy-tyden-kojeni-2026');
  assert.equal(popupVariant(w, 'active').href, 'tyden.html?id=svetovy-tyden-kojeni-2026');
});
