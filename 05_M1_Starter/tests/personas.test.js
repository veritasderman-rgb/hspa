// Testy person (data/personas.json) a jejich minihomepage (pro-*.html).
// personas.json je jediný zdroj pravdy pro rozcestník i minihomepage — hlídáme
// schema + že všechny odkazy (nástroje, minihomepage, indikátory, linie)
// míří na existující cíle, a smoke render přes renderPersonaPage.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPersonaPage, selectGridIndicators } from '../src/persona.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const personas = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'personas.json'), 'utf8')).personas;
const indicators = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8')).indicators;
const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8')).articles;
const themes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'themes.json'), 'utf8')).themes;
const indIds = new Set(indicators.map(i => i.id));
const themeIds = new Set(themes.map(t => t.id));

test('personas.json má čtyři persony s povinnými poli', () => {
  assert.equal(personas.length, 4);
  for (const p of personas) {
    for (const k of ['id', 'slug', 'label', 'card_title', 'card_desc', 'hero', 'tools', 'indicator_ids', 'topics', 'theme_ids']) {
      assert.ok(p[k] != null, `persona ${p.id} postrádá pole ${k}`);
    }
    for (const k of ['kicker', 'headline', 'lead']) {
      assert.ok(typeof p.hero[k] === 'string' && p.hero[k].length > 5, `persona ${p.id} má chabé hero.${k}`);
    }
    assert.ok(p.tools.length >= 1 && p.indicator_ids.length >= 1 && p.topics.length >= 1);
  }
});

test('každá persona má existující minihomepage pro-{slug}.html', () => {
  for (const p of personas) {
    assert.ok(fs.existsSync(path.join(ROOT, `pro-${p.slug}.html`)), `chybí pro-${p.slug}.html`);
  }
});

test('všechny odkazy nástrojů míří na existující .html soubory', () => {
  for (const p of personas) {
    for (const t of p.tools) {
      assert.match(t.href, /^[a-z0-9-]+\.html$/, `nečekaný href u ${p.id}: ${t.href}`);
      assert.ok(fs.existsSync(path.join(ROOT, t.href)), `nástroj ${p.id} míří na neexistující ${t.href}`);
      assert.ok(t.title && t.desc, `nástroj ${p.id} bez title/desc`);
    }
  }
});

test('indicator_ids a theme_ids existují v kontraktu', () => {
  for (const p of personas) {
    for (const id of p.indicator_ids) assert.ok(indIds.has(id), `persona ${p.id}: neznámý indikátor ${id}`);
    for (const id of p.theme_ids) assert.ok(themeIds.has(id), `persona ${p.id}: neznámá linie ${id}`);
  }
});

test('každá persona najde alespoň jeden viditelný článek podle topics', () => {
  // Pojistka proti prázdné sekci „Články pro vás".
  for (const p of personas) {
    const topics = new Set(p.topics);
    const hit = articles.some(a => (a.topics ?? []).some(t => topics.has(t)));
    assert.ok(hit, `persona ${p.id} nemá žádný článek pro topics ${[...topics].join(',')}`);
  }
});

test('grid_dimensions každé persony jsou platné HSPA dimenze', () => {
  const validDims = new Set(indicators.map(i => i.dimension).filter(Boolean));
  for (const p of personas) {
    assert.ok(Array.isArray(p.grid_dimensions) && p.grid_dimensions.length >= 1, `persona ${p.id} bez grid_dimensions`);
    for (const d of p.grid_dimensions) assert.ok(validDims.has(d), `persona ${p.id}: neznámá dimenze ${d}`);
  }
});

test('selectGridIndicators vrací 20–30 relevantních indikátorů bez duplicit a bez rezistence_ záplavy', () => {
  for (const p of personas) {
    const grid = selectGridIndicators(p, indicators, themes);
    assert.ok(grid.length >= 20 && grid.length <= 30, `persona ${p.id}: grid má ${grid.length} (očekáváno 20–30)`);
    const ids = grid.map(i => i.id);
    assert.equal(new Set(ids).size, ids.length, `persona ${p.id}: duplicitní indikátory v gridu`);
    for (const i of grid) assert.ok(i && i.value != null, `persona ${p.id}: karta bez hodnoty`);
    // Kotvy persony jsou v gridu (jádro relevance).
    for (const anchor of p.indicator_ids) assert.ok(ids.includes(anchor), `persona ${p.id}: kotva ${anchor} chybí v gridu`);
    // Mikroindikátory rezistence se z doplnění vynechávají.
    const res = ids.filter(id => id.startsWith('rezistence_'));
    assert.ok(res.length <= 1, `persona ${p.id}: příliš mnoho rezistence_ v gridu (${res.length})`);
  }
});

test('renderPersonaPage vyrenderuje smysluplné HTML bez leaků', () => {
  const indById = new Map(indicators.map(i => [i.id, i]));
  for (const p of personas) {
    const others = personas.filter(x => x.id !== p.id);
    const html = renderPersonaPage(p, { indById, indicators, articles, themes, others });
    assert.ok(html.includes(p.hero.headline), `render ${p.id} bez headline`);
    assert.ok(/persona-tool/.test(html), `render ${p.id} bez nástrojů`);
    assert.ok(/persona-ind/.test(html), `render ${p.id} bez indikátorů`);
    assert.ok(/class="card-grid"/.test(html), `render ${p.id} bez koncového gridu`);
    assert.ok((html.match(/class="indicator-card"/g) ?? []).length >= 20, `render ${p.id}: grid má < 20 karet`);
    assert.ok(html.includes('pro-'), `render ${p.id} bez křížových odkazů`);
    assert.doesNotMatch(html, /undefined|\[object Object\]/, `render ${p.id} obsahuje leak`);
  }
});
