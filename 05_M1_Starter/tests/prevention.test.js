// Testy datového kontraktu pro data/prevention.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('prevention.json: 9 témat, povinná pole, validní cross-refs', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prevention.json'), 'utf8'));
  assert.equal(data.themes.length, 9, `expected 9 themes, got ${data.themes.length}`);

  const ind = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8')).indicators;
  const str = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'strategies.json'), 'utf8')).strategies;
  const indIds = new Set(ind.map(i => i.id));
  const strIds = new Set(str.map(s => s.id));

  const requiredFields = ['id', 'title', 'what_we_know', 'try_this_week', 'sources'];

  for (const t of data.themes) {
    for (const f of requiredFields) {
      assert.ok(t[f] != null, `theme ${t.id ?? '?'}: missing field '${f}'`);
    }
    assert.ok(
      Array.isArray(t.try_this_week) && t.try_this_week.length >= 3,
      `theme ${t.id}: try_this_week must have ≥3 items`
    );
    assert.ok(
      typeof t.what_we_know === 'string' && t.what_we_know.length >= 100,
      `theme ${t.id}: what_we_know too short`
    );
    for (const id of t.hspa_indicators ?? []) {
      assert.ok(indIds.has(id), `theme ${t.id}: unknown indicator '${id}'`);
    }
    for (const id of t.strategies ?? []) {
      assert.ok(strIds.has(id), `theme ${t.id}: unknown strategy '${id}'`);
    }
  }
});

test('prevention.json: hero, flow_steps, version přítomny', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prevention.json'), 'utf8'));
  assert.ok(data.version, 'missing version');
  assert.ok(data.generated_at, 'missing generated_at');
  assert.ok(data.hero && data.hero.headline, 'missing hero.headline');
  assert.ok(Array.isArray(data.flow_steps) && data.flow_steps.length >= 4, 'missing or too few flow_steps');
});

test('prevention.json: každé téma má unikátní ID', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prevention.json'), 'utf8'));
  const ids = data.themes.map(t => t.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length, 'duplicate theme IDs found');
});

test('prevention.json: každé téma má ≥2 zdroje s url a title', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prevention.json'), 'utf8'));
  for (const t of data.themes) {
    assert.ok(Array.isArray(t.sources) && t.sources.length >= 2, `theme ${t.id}: need ≥2 sources`);
    for (const s of t.sources) {
      assert.ok(s.url, `theme ${t.id}: source missing url`);
      assert.ok(s.title, `theme ${t.id}: source missing title`);
    }
  }
});

test('prevention.json: každé téma má caveat, subtitle, daily_choice, system_levers', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prevention.json'), 'utf8'));
  for (const t of data.themes) {
    assert.ok(t.caveat && t.caveat.length > 10, `theme ${t.id}: caveat too short or missing`);
    assert.ok(t.subtitle, `theme ${t.id}: missing subtitle`);
    assert.ok(t.daily_choice, `theme ${t.id}: missing daily_choice`);
    assert.ok(Array.isArray(t.system_levers) && t.system_levers.length >= 3, `theme ${t.id}: need ≥3 system_levers`);
  }
});

test('prevention.json: MVP sada 9 témat — všechna očekávaná ID přítomna', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prevention.json'), 'utf8'));
  const ids = new Set(data.themes.map(t => t.id));
  const expected = [
    'jidlo', 'pohyb', 'tabak_nikotin', 'alkohol',
    'vztahy_samota', 'smysl_zivota', 'deti_prostredi',
    'digitalni_zdravi', 'screening_preventivni_pece',
  ];
  for (const id of expected) {
    assert.ok(ids.has(id), `missing expected theme id: '${id}'`);
  }
});
