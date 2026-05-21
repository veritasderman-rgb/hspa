// Smoke testy datového kontraktu pro data/dohodovaci-rizeni.json
// a existence souborů stránky dohodovaci-rizeni.html.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const data = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'dohodovaci-rizeni.json'), 'utf8'),
);

test('dohodovaci-rizeni.json: kontrakt — 9 dimenzí, 44 sad, povinná pole', () => {
  assert.ok(data.version, 'missing version');
  assert.ok(data.negotiation_context?.lead, 'missing negotiation_context.lead');
  assert.equal(data.dimensions.length, 9, 'expected 9 dimensions');
  assert.equal(data.datasets.length, 44, 'expected 44 datasets');

  for (const d of data.dimensions) {
    for (const f of ['id', 'number', 'label', 'color', 'dataset_ids']) {
      assert.ok(d[f] != null, `dimension ${d.id}: missing ${f}`);
    }
  }
});

test('dohodovaci-rizeni.json: datasety mají validní status a dimenzi', () => {
  const dimIds = new Set(data.dimensions.map((d) => d.id));
  const valid = new Set(['ready', 'external', 'stub']);
  const seen = new Set();
  for (const ds of data.datasets) {
    assert.ok(ds.id && ds.ois_code && ds.title, `dataset ${ds.id}: missing core field`);
    assert.ok(valid.has(ds.status), `dataset ${ds.id}: bad status ${ds.status}`);
    assert.ok(dimIds.has(ds.dimension), `dataset ${ds.id}: unknown dimension`);
    assert.ok(!seen.has(ds.id), `duplicate dataset id ${ds.id}`);
    seen.add(ds.id);
  }
});

test('dohodovaci-rizeni.json: cross-ref dimension.dataset_ids ↔ datasets', () => {
  const dsIds = new Set(data.datasets.map((d) => d.id));
  for (const dim of data.dimensions) {
    for (const id of dim.dataset_ids) {
      assert.ok(dsIds.has(id), `dimension ${dim.id}: dangling dataset_id ${id}`);
    }
  }
});

test('dohodovaci-rizeni.json: ready sada SSS-04-02 má časovou řadu', () => {
  const pristroje = data.datasets.find((d) => d.ois_code === 'SSS-04-02');
  assert.ok(pristroje, 'SSS-04-02 not found');
  assert.equal(pristroje.status, 'ready');
  assert.ok(pristroje.series.length > 0, 'SSS-04-02 must have series');
  assert.ok(pristroje.headline?.value != null, 'SSS-04-02 must have headline value');
  for (const s of pristroje.series) {
    assert.ok(s.points.length >= 3, `series ${s.key}: needs ≥3 points`);
  }
});

test('dohodovaci-rizeni.json: dimenze 2 — 5 sad ready s vizualizačními daty', () => {
  const d2 = data.datasets.filter((x) => x.dimension === 'd2');
  assert.equal(d2.length, 5, 'dimenze 2 má 5 sad');
  for (const ds of d2) {
    assert.equal(ds.status, 'ready', `${ds.ois_code} musí být ready`);
    assert.ok(ds.headline?.value != null, `${ds.ois_code}: headline`);
    assert.ok(ds.role_in_negotiation, `${ds.ois_code}: role_in_negotiation`);
    assert.ok(ds.what_it_says, `${ds.ois_code}: what_it_says`);
    const hasViz =
      (ds.series && ds.series.length) ||
      (ds.series_periods && ds.series_periods.length) ||
      (ds.pyramid && ds.pyramid.age_bands);
    assert.ok(hasViz, `${ds.ois_code}: musí mít series / series_periods / pyramid`);
  }
});

test('dohodovaci-rizeni.json: OIS-11-16 má validní pyramidu', () => {
  const p = data.datasets.find((x) => x.ois_code === 'OIS-11-16').pyramid;
  assert.ok(p, 'pyramid chybí');
  assert.equal(p.age_bands.length, 12, '12 věkových pásem');
  assert.equal(p.muzi.length, 12, 'muži 12 pásem');
  assert.equal(p.zeny.length, 12, 'ženy 12 pásem');
  const totalM = p.muzi.reduce((a, b) => a + b.value, 0);
  assert.ok(totalM > 30000, 'součet mužů realistický');
});

test('dohodovaci-rizeni.json: ≥9 sad ready, dimenze 6 zpracována', () => {
  const ready = data.datasets.filter((x) => x.status === 'ready');
  assert.ok(ready.length >= 9, `očekáváno ≥9 ready, je ${ready.length}`);
  const d6ready = data.datasets.filter((x) => x.dimension === 'd6' && x.status === 'ready');
  assert.ok(d6ready.length >= 3, `dimenze 6 má ${d6ready.length} ready (očekáváno ≥3)`);
  for (const ds of d6ready) {
    assert.ok(ds.series.length > 0, `${ds.ois_code}: series`);
    assert.ok(ds.role_in_negotiation && ds.what_it_says, `${ds.ois_code}: redakční text`);
  }
});

test('dohodovaci-rizeni: stránka a modul existují', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'dohodovaci-rizeni.html')), 'dohodovaci-rizeni.html missing');
  assert.ok(fs.existsSync(path.join(ROOT, 'src', 'dohodovaci-rizeni.js')), 'src/dohodovaci-rizeni.js missing');
});
