// Tři židle · Akt II — testy datového kontraktu (reditel-hra.json) a enginu
// (handoff z aktu I, projekce bilance, osy, reakce, verdikt).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  budgetFromMinistr, startingMorale, projectedBalance, applyDecisions,
  yearResult, reactionsFor, waitingModifier, axisTone, verdict,
} from '../src/reditel-engine.js';
import { validateReditelHra } from '../ingest/validate-reditel-hra.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'reditel-hra.json'), 'utf8'));

/** Vybere pro každé rozhodnutí option s nejlepším součtem os (drahá dobrota). */
function bestForPeople() {
  const out = {};
  for (const d of doc.decisions) {
    out[d.id] = [...d.options].sort((a, b) =>
      (b.effects.personal + b.effects.pacienti) - (a.effects.personal + a.effects.pacienti)
      || a.cost_mil - b.cost_mil)[0].id;
  }
  return out;
}

/** Vybere všude nejlevnější/nejúspornější option (škrtací ředitel). */
function cheapest() {
  const out = {};
  for (const d of doc.decisions) {
    out[d.id] = [...d.options].sort((a, b) => a.cost_mil - b.cost_mil)[0].id;
  }
  return out;
}

test('reditel-hra.json prochází validátorem (nemocnice, handoff, rozhodnutí, reakce)', () => {
  assert.equal(validateReditelHra(), true);
});

test('engine: budgetFromMinistr — vážený růst z kampaně, jinak default vyhlášky', () => {
  const noState = budgetFromMinistr(null, doc.handoff);
  assert.equal(noState.growthPct, doc.handoff.default_growth_pct);
  assert.equal(noState.fromCampaign, false);

  const gen = budgetFromMinistr({ alloc: { akutni_luzkova: 10, nasledna_luzkova: 10 } }, doc.handoff);
  assert.equal(gen.growthPct, 10, 'stejný růst obou segmentů → stejný vážený růst');
  assert.equal(gen.fromCampaign, true);

  const skimp = budgetFromMinistr({ alloc: { akutni_luzkova: 2, nasledna_luzkova: 2 } }, doc.handoff);
  assert.ok(skimp.growthPct < noState.growthPct, 'lakomá vyhláška → menší rozpočet než default');
});

test('engine: startingMorale — nálada personálu podle gapu vs. požadavek segmentu', () => {
  assert.equal(startingMorale(null, doc.handoff), 0, 'bez kampaně neutrál');
  const d = doc.handoff.demand_ref_pct;
  assert.equal(startingMorale({ alloc: { akutni_luzkova: d } }, doc.handoff), 1, 'požadavek naplněn → +1');
  assert.equal(startingMorale({ alloc: { akutni_luzkova: d - 1 } }, doc.handoff), 0);
  assert.equal(startingMorale({ alloc: { akutni_luzkova: d - 4 } }, doc.handoff), -1, 'hluboko pod → −1');
});

test('engine: projectedBalance — ruční výpočet (default 7 %: −25,4 mil.)', () => {
  const p = projectedBalance(doc.hospital, 7);
  // 650×7 % = 45,5 příjem; drift 650×0,55×9 % + 650×0,45×3 % = 32,2+8,8 = 41; −30 strukturální
  assert.equal(p.revenue_growth_mil, 45.5);
  assert.equal(p.cost_drift_mil, 41);
  assert.equal(p.balance_mil, -25.4);
  assert.ok(projectedBalance(doc.hospital, 12).balance_mil > 0, 'štědrá vyhláška → kladná projekce');
});

test('engine: applyDecisions — nevybraná rozhodnutí nepřispívají, součty sedí', () => {
  const none = applyDecisions(doc, {});
  assert.deepEqual([none.cost_mil, none.personal, none.pacienti, none.answered], [0, 0, 0, 0]);
  const one = applyDecisions(doc, { platy_sester: 'zvysit' });
  assert.equal(one.cost_mil, 18);
  assert.equal(one.personal, 2);
  assert.equal(one.answered, 1);
  assert.equal(one.total, doc.decisions.length);
});

test('design: nelze mít všechny tři osy zelené bez štědré vyhlášky (pointa hry)', () => {
  const v = verdict(doc, bestForPeople(), null); // default 7 % růst
  assert.equal(v.tones.personal, 'good');
  assert.ok(v.tones.hospodareni === 'bad', `dobrota za default rozpočtu = deficit (${v.axes.hospodareni} mil.)`);

  const skrty = verdict(doc, cheapest(), null);
  assert.ok(skrty.axes.hospodareni > v.axes.hospodareni, 'škrty bilanci zlepšují');
  assert.ok(skrty.tones.personal === 'bad', 'škrtací ředitel přijde o personál');
});

test('engine: reactionsFor — prahy s precedenty; výpovědi překrývají rezignaci', () => {
  const calm = reactionsFor(doc, { hospodareni: 0, personal: 0, pacienti: 0 });
  assert.equal(calm.length, 0);
  const bad = reactionsFor(doc, { hospodareni: 0, personal: -5, pacienti: 0 });
  assert.deepEqual(bad.map(r => r.id), ['vypovedi_interna'], 'jen nejtvrdší personální reakce');
  const mild = reactionsFor(doc, { hospodareni: 0, personal: -2, pacienti: 0 });
  assert.deepEqual(mild.map(r => r.id), ['vrchni_sestra']);
  const sanace = reactionsFor(doc, { hospodareni: -25, personal: 0, pacienti: 0 });
  assert.deepEqual(sanace.map(r => r.id), ['sanace']);
  const dobro = reactionsFor(doc, { hospodareni: 0, personal: 3, pacienti: 2 });
  assert.deepEqual(dobro.map(r => r.id).sort(), ['kratsi_cekacky', 'stabilizace']);
});

test('engine: waitingModifier — předává čekací doby do aktu III', () => {
  assert.equal(waitingModifier({ pacienti: 2 }), 'kratsi');
  assert.equal(waitingModifier({ pacienti: 0 }), 'stejne');
  assert.equal(waitingModifier({ pacienti: -2 }), 'delsi');
});

test('engine: verdict — kompletnost, tóny dle pásem, kampaňový rozpočet se propisuje', () => {
  const v = verdict(doc, {}, null);
  assert.equal(v.complete, false);
  assert.equal(axisTone('hospodareni', 0, doc.verdict_bands), 'good');
  assert.equal(axisTone('hospodareni', -10, doc.verdict_bands), 'mid');
  assert.equal(axisTone('hospodareni', -21, doc.verdict_bands), 'bad');

  // štědrá vyhláška z aktu I (12 % lůžkovým) dovolí dobrotu bez sanace
  const rich = verdict(doc, bestForPeople(), { alloc: { akutni_luzkova: 12, nasledna_luzkova: 12 } });
  const poor = verdict(doc, bestForPeople(), { alloc: { akutni_luzkova: 3, nasledna_luzkova: 3 } });
  assert.ok(rich.axes.hospodareni > poor.axes.hospodareni + 40, 'rozpočet z aktu I hýbe bilancí o desítky milionů');
  assert.ok(rich.axes.personal > poor.axes.personal, 'lakomá vyhláška sráží i startovní morálku');
  assert.equal(rich.complete, true);
});
