// Testy datové vrstvy rubrik (F1 redesignu sekce Články).
// Rubrika = primární tematické zařazení článku, páteř hubu clanky.html.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const rubrics = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'rubrics.json'), 'utf8')
).rubrics;
const articles = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'articles.json'), 'utf8')
).articles;

const validIds = new Set(rubrics.map(r => r.id));

test('rubrics.json: 8 rubrik s povinnými poli a unikátním id', () => {
  assert.equal(rubrics.length, 8);
  const seen = new Set();
  for (const r of rubrics) {
    for (const field of ['id', 'label', 'order', 'color', 'kicker', 'headline', 'lead']) {
      assert.ok(r[field] != null && r[field] !== '', `rubrika ${r.id} postrádá pole ${field}`);
    }
    assert.ok(!seen.has(r.id), `duplicitní id rubriky: ${r.id}`);
    seen.add(r.id);
  }
});

test('rubrics.json: pořadí (order) je 1..8 bez mezer', () => {
  const orders = rubrics.map(r => r.order).sort((a, b) => a - b);
  assert.deepEqual(orders, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('articles.json: každý publikovaný článek má platnou rubriku', () => {
  const published = articles.filter(a => a.published !== false);
  for (const a of published) {
    assert.ok(a.rubric, `${a.slug}: chybí rubric`);
    assert.ok(validIds.has(a.rubric), `${a.slug}: rubric="${a.rubric}" není v rubrics.json`);
  }
});

test('articles.json: každá rubrika má aspoň jeden článek (žádná prázdná)', () => {
  const used = new Set(articles.filter(a => a.published !== false).map(a => a.rubric));
  for (const r of rubrics) {
    assert.ok(used.has(r.id), `rubrika ${r.id} nemá žádný publikovaný článek`);
  }
});
