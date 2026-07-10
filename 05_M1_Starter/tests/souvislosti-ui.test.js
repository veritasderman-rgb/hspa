// Testy bloku Souvislosti na detailu indikátoru (souvislostiHtml v src/indicator.js)
// + statické varianty v generátoru per-indikátorových stránek.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { souvislostiHtml } from '../src/indicator.js';
import { buildPage } from '../scripts/generate-indicator-pages.js';

const BUCKET = {
  id: 'ind_a',
  name: 'Indikátor A',
  model: {
    node: { id: 'n1', label: 'Digitalizace a datová páteř', kind: 'lever', layer: 'Struktury' },
    incoming: [{ node_id: 'n2', label: 'Governance', polarity: 'plus', strength: 'strong', mechanism: 'M1' }],
    outgoing: [{ node_id: 'n3', label: 'Kvalita péče', polarity: 'minus', strength: 'weak', mechanism: 'M2' }],
  },
  legislativa: [{ kind: 'radar', id: 'leg1', title: 'Novela X', phase: 'pripominky' }],
  articles: [{ slug: 'clanek-a.html', title: 'A' }],
  claims: [],
  barometr: {
    commitments: [{ id: 'cm1', stav: 'ceka_na_data', oblast: 'Struktury' }],
    statements: [{ id: 'st1', verdikt: 'sedi_s_daty' }],
  },
};

test('souvislostiHtml: plný bucket vykreslí model, legislativu i barometr', () => {
  const html = souvislostiHtml(BUCKET);
  assert.match(html, /Digitalizace a datová páteř/);
  assert.match(html, /Co na něj působí/);
  assert.match(html, /Na co má vliv/);
  assert.match(html, /↓ tlumí/); // minus polarity
  assert.match(html, /Novela X/);
  assert.match(html, /Čeká na data/); // UI label stavu závazku
  assert.match(html, /1× výrok v Ověřovně/);
  assert.match(html, /barometr\.html/);
  assert.match(html, /model-systemu\.html/);
});

test('souvislostiHtml: prázdný/nulový bucket → prázdný string (sekce se skryje)', () => {
  assert.equal(souvislostiHtml(null), '');
  assert.equal(souvislostiHtml({ id: 'x', articles: [{ slug: 'a' }], claims: [{ id: 'c' }] }), '');
});

test('souvislostiHtml: escapuje HTML v datech', () => {
  const html = souvislostiHtml({ model: { node: { label: '<img src=x onerror=1>', layer: '' } } });
  assert.ok(!html.includes('<img'), 'HTML z dat nesmí projít neescapované');
});

test('buildPage: statická stránka nese kompaktní Souvislosti, bez bucketu ne', () => {
  const ind = { id: 'ind_a', name: 'A', area: 'Výsledky', domain: 'X', value: 1, unit: '%', year: 2024, source: { name: 'Z' } };
  const withSuv = buildPage(ind, null, BUCKET).html;
  assert.match(withSuv, /Souvislosti/);
  assert.match(withSuv, /Barometr politických prohlášení/);
  const withoutSuv = buildPage(ind, null, undefined).html;
  assert.ok(!/suv-section/.test(withoutSuv), 'bez bucketu se sekce nevykreslí');
});
