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

test('dohodovaci-rizeni.json: všechny sady zpracovány (ready/external, 0 stub)', () => {
  const stub = data.datasets.filter((x) => x.status === 'stub');
  assert.equal(stub.length, 0, `zbývající stub sady: ${stub.map((x) => x.ois_code).join(', ')}`);
  const ready = data.datasets.filter((x) => x.status === 'ready');
  assert.ok(ready.length >= 43, `očekáváno ≥43 ready, je ${ready.length}`);
});

test('dohodovaci-rizeni.json: každá ready sada má headline, viz i redakční text', () => {
  for (const ds of data.datasets.filter((x) => x.status === 'ready')) {
    assert.ok(ds.headline && ds.headline.value != null, `${ds.ois_code}: headline`);
    const hasViz =
      (ds.series && ds.series.length) ||
      (ds.series_periods && ds.series_periods.length) ||
      (ds.pyramid && ds.pyramid.age_bands) ||
      (ds.ranked && ds.ranked.items && ds.ranked.items.length);
    assert.ok(hasViz, `${ds.ois_code}: chybí vizualizační data`);
    assert.ok(ds.role_in_negotiation, `${ds.ois_code}: role_in_negotiation`);
    assert.ok(ds.what_it_says, `${ds.ois_code}: what_it_says`);
  }
});

test('dohodovaci-rizeni.json: všechny dimenze 1–8 mají ready sady', () => {
  for (const num of [1, 2, 3, 5, 6, 7, 8]) {
    const dim = data.dimensions.find((d) => d.number === num);
    const ready = dim.dataset_ids
      .map((id) => data.datasets.find((x) => x.id === id))
      .filter((x) => x && (x.status === 'ready' || x.status === 'external'));
    assert.ok(ready.length === dim.dataset_ids.length, `dimenze ${num}: ${ready.length}/${dim.dataset_ids.length} zpracováno`);
  }
});

test('dohodovaci-rizeni.json: DRG sady mají žebříček (ranked)', () => {
  for (const ois of ['OIS-11-37', 'OIS-11-51']) {
    const ds = data.datasets.find((x) => x.ois_code === ois);
    assert.ok(ds.ranked && Array.isArray(ds.ranked.items), `${ois}: ranked chybí`);
    assert.ok(ds.ranked.items.length >= 5, `${ois}: ranked má ${ds.ranked.items.length} položek`);
    for (const it of ds.ranked.items) {
      assert.ok(it.name && typeof it.value === 'number', `${ois}: ranked položka neúplná`);
    }
  }
});

test('dohodovaci-rizeni.json: strategická analýza je kompletní', () => {
  const a = data.strategic_analysis;
  assert.ok(a, 'strategic_analysis chybí');
  assert.ok(a.title && a.thesis && a.methodology, 'chybí title/thesis/methodology');
  assert.ok(Array.isArray(a.key_numbers) && a.key_numbers.length >= 3, 'key_numbers');
  for (const n of a.key_numbers) {
    assert.ok(typeof n.value === 'number' && n.label && n.plain, `key_number neúplné: ${n.label}`);
  }
  for (const q of ['strengths', 'weaknesses', 'opportunities', 'threats']) {
    assert.ok(Array.isArray(a.swot[q]) && a.swot[q].length >= 3, `SWOT ${q} má málo položek`);
  }
  assert.ok(a.cost_structure.items.length >= 3, 'cost_structure items');
  assert.ok(a.timeline.events.length >= 4, 'timeline events');
  assert.ok(a.recommendations.length >= 3, 'recommendations');
});

test('dohodovaci-rizeni.json: personální predikce (odchodová vlna)', () => {
  const wf = data.strategic_analysis.workforce;
  assert.ok(wf && wf.intro && wf.demographic && wf.estimate, 'workforce: prozaické bloky');
  const ac = wf.age_chart;
  assert.equal(ac.age_bands.length, 12, 'age_chart pásma');
  assert.equal(ac.doctors.length, 12, 'age_chart hodnoty');
  assert.ok(ac.doctors.every((v) => typeof v === 'number'), 'age_chart čísla');
  const pc = wf.projection_chart;
  assert.equal(pc.labels.length, pc.per_year.length, 'projekce per_year délka');
  assert.equal(pc.labels.length, pc.cumulative.length, 'projekce cumulative délka');
  // kumulativní řada musí být neklesající
  for (let i = 1; i < pc.cumulative.length; i++) {
    assert.ok(pc.cumulative[i] >= pc.cumulative[i - 1], 'cumulative neklesá');
  }
  assert.ok(wf.key_numbers.length >= 3, 'workforce key_numbers');
});

test('dohodovaci-rizeni.json: rychlost růstu segmentů', () => {
  const cg = data.strategic_analysis.cost_growth;
  assert.ok(cg && cg.intro && cg.takeaway, 'cost_growth: prozaické bloky');
  assert.ok(cg.segments.length >= 6, 'cost_growth segmentů');
  for (const s of cg.segments) {
    assert.ok(s.label && typeof s.cagr === 'number' && s.note, `segment neúplný: ${s.label}`);
    assert.ok(['cost', 'volume'].includes(s.type), `segment ${s.label}: typ`);
  }
  // musí obsahovat nákladové i objemové segmenty
  assert.ok(cg.segments.some((s) => s.type === 'cost'), 'aspoň 1 nákladový');
  assert.ok(cg.segments.some((s) => s.type === 'volume'), 'aspoň 1 objemový');
});

test('dohodovaci-rizeni.json: citlivostní predikce má 3 scénáře + benchmark', () => {
  const fc = data.strategic_analysis.forecast;
  const n = fc.labels.length;
  assert.equal(fc.history.length, n, 'history délka');
  for (const key of ['optimistic', 'base', 'risk']) {
    const s = fc.scenarios[key];
    assert.ok(s && s.label && s.rate && s.assumption, `scénář ${key}: metadata`);
    assert.equal(s.values.length, n, `scénář ${key}: délka values`);
    assert.ok(typeof s.y2030 === 'number', `scénář ${key}: y2030`);
  }
  assert.equal(fc.benchmark.values.length, n, 'benchmark délka');
  assert.ok(fc.gap_2030 && typeof fc.gap_2030.value === 'number', 'gap_2030');
  // scénáře musí vycházet ze stejné hodnoty 2024 jako skutečnost
  const i2024 = fc.labels.indexOf(2024);
  assert.equal(fc.scenarios.base.values[i2024], fc.history[i2024], 'scénář navazuje na skutečnost 2024');
  // pořadí: rizikový ≥ základní ≥ optimistický ≥ udržitelný v roce 2030
  const i2030 = fc.labels.indexOf(2030);
  assert.ok(
    fc.scenarios.risk.values[i2030] > fc.scenarios.base.values[i2030] &&
      fc.scenarios.base.values[i2030] > fc.scenarios.optimistic.values[i2030] &&
      fc.scenarios.optimistic.values[i2030] >= fc.benchmark.values[i2030],
    'scénáře 2030 ve správném pořadí',
  );
});

test('dohodovaci-rizeni: stránka a modul existují', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'dohodovaci-rizeni.html')), 'dohodovaci-rizeni.html missing');
  assert.ok(fs.existsSync(path.join(ROOT, 'src', 'dohodovaci-rizeni.js')), 'src/dohodovaci-rizeni.js missing');
});
