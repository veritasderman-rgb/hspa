// Tři židle · Akt III — testy datového kontraktu (pribeh-pacienta.json)
// a enginu (determinismus průchodu, čas/platby, kampaňový modifikátor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  waitingFromCampaign, optionFor, stepTimeWeeks, journeyOutcome, bestCaseOutcome,
} from '../src/pribeh-engine.js';
import { validatePribehPacienta } from '../ingest/validate-pribeh-pacienta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pribeh-pacienta.json'), 'utf8'));
const SHIFT = doc.waiting_shift_weeks;
const byId = Object.fromEntries(doc.personas.map(p => [p.id, p]));

test('pribeh-pacienta.json prochází validátorem (fáze, dvojí vyprávění, doklady)', () => {
  assert.equal(validatePribehPacienta(), true);
});

test('data: tři startovní persony, disease_ref jen u onkologické', () => {
  assert.deepEqual(doc.personas.map(p => p.id).sort(), ['cmp_senior', 'diabetik', 'prs_zena']);
  assert.equal(byId.prs_zena.disease_ref, 'prs');
  assert.equal(byId.cmp_senior.disease_ref, undefined);
  assert.equal(byId.diabetik.disease_ref, undefined);
});

test('engine: waitingFromCampaign — čte verdikt aktu II, jinak stejne', () => {
  assert.equal(waitingFromCampaign(null), 'stejne');
  assert.equal(waitingFromCampaign({ verdict: { waiting: 'delsi' } }), 'delsi');
  assert.equal(waitingFromCampaign({ verdict: { waiting: 'nesmysl' } }), 'stejne');
});

test('engine: stepTimeWeeks — základ + delta option + posun jen na wait_sensitive', () => {
  const p = byId.cmp_senior;
  const rehab = p.steps.find(s => s.id === 'rehabilitace'); // base 6, wait_sensitive
  assert.equal(stepTimeWeeks(rehab, {}, 'stejne', SHIFT), 6);
  assert.equal(stepTimeWeeks(rehab, {}, 'delsi', SHIFT), 6 + SHIFT);
  assert.equal(stepTimeWeeks(rehab, {}, 'kratsi', SHIFT), 6 - SHIFT);
  assert.equal(stepTimeWeeks(rehab, { rehabilitace: 'ambulantni' }, 'stejne', SHIFT), 4, 'delta option −2');

  const akutni = p.steps.find(s => s.id === 'iktove_centrum'); // not wait_sensitive
  assert.equal(stepTimeWeeks(akutni, {}, 'delsi', SHIFT), akutni.base_time_weeks, 'akutní krok se neposouvá');
});

test('engine: journeyOutcome — determinismus, součty času a plateb z kapsy', () => {
  const p = byId.diabetik;
  const good = { prohlidka: 'chodit', noha: 'podiatrie' };
  const o1 = journeyOutcome(p, good, 'stejne', SHIFT);
  const o2 = journeyOutcome(p, good, 'stejne', SHIFT);
  assert.deepEqual(o1, o2, 'stejná rozhodnutí → identický výsledek');
  assert.equal(o1.oop_kc, 500, 'podiatrie = 500 Kč z kapsy');
  assert.equal(o1.complete, true, 'obě rozhodnutí zodpovězena');
  assert.equal(journeyOutcome(p, { prohlidka: 'chodit' }, 'stejne', SHIFT).complete, false,
    'nezodpovězené rozhodnutí → nekompletní');

  const bad = { prohlidka: 'nechodit', noha: 'samo' };
  const ob = journeyOutcome(p, bad, 'stejne', SHIFT);
  assert.equal(ob.weeks - o1.weeks, 16, 'zanedbání = +6 a +10 týdnů dle dat');
});

test('engine: kampaňový modifikátor z aktu II posouvá jen citlivé kroky', () => {
  for (const p of doc.personas) {
    const base = journeyOutcome(p, {}, 'stejne', SHIFT);
    const delsi = journeyOutcome(p, {}, 'delsi', SHIFT);
    const kratsi = journeyOutcome(p, {}, 'kratsi', SHIFT);
    const sensitive = p.steps.filter(s => s.wait_sensitive).length;
    assert.equal(delsi.weeks - base.weeks, sensitive * SHIFT, `${p.id}: delsi`);
    assert.equal(base.weeks - kratsi.weeks, sensitive * SHIFT, `${p.id}: kratsi (žádný krok nejde pod 0)`);
  }
});

test('engine: bestCaseOutcome — nejhladší průchod je referenční minimum času', () => {
  for (const p of doc.personas) {
    const best = bestCaseOutcome(p);
    // libovolná kombinace rozhodnutí nesmí být rychlejší než best case
    const worstDecisions = {};
    for (const s of p.steps) {
      if (s.decision) {
        worstDecisions[s.id] = [...s.decision.options].sort((a, b) =>
          (b.time_weeks_delta || 0) - (a.time_weeks_delta || 0))[0].id;
      }
    }
    const worst = journeyOutcome(p, worstDecisions, 'stejne', 0);
    assert.ok(best.weeks <= worst.weeks, `${p.id}: best ≤ worst`);
    assert.equal(best.complete, true);
  }
});

test('data: screeningová persona nese hlavní lekci v rozhodnutí o pozvánce', () => {
  const p = byId.prs_zena;
  const jit = journeyOutcome(p, { pozvanka: 'jit', lecba: 'ne' }, 'stejne', SHIFT);
  const odlozit = journeyOutcome(p, { pozvanka: 'odlozit', lecba: 'ne' }, 'stejne', SHIFT);
  assert.equal(odlozit.weeks - jit.weeks, 52, 'odklad screeningu = rok ztraceného náskoku');
});

test('engine: optionFor — vrací null pro krok bez rozhodnutí i bez odpovědi', () => {
  const p = byId.cmp_senior;
  const noDecision = p.steps.find(s => !s.decision);
  assert.equal(optionFor(noDecision, { [noDecision.id]: 'x' }), null);
  const withDecision = p.steps.find(s => s.decision);
  assert.equal(optionFor(withDecision, {}), null);
});

test('lékařova vrstva: každý krok má fakta a slepou skvrnu, každá volba stopu v dokumentaci', () => {
  for (const p of doc.personas) {
    assert.ok(p.outcome_lekar?.length > 40, `${p.id}: outcome_lekar`);
    for (const s of p.steps) {
      assert.ok(Array.isArray(s.lekar_facts) && s.lekar_facts.length >= 1, `${p.id}/${s.id}: lekar_facts`);
      for (const f of s.lekar_facts) {
        assert.ok(f.label && f.value, `${p.id}/${s.id}: fakt bez label/value`);
      }
      assert.ok(s.lekar_blind?.length > 30, `${p.id}/${s.id}: lekar_blind`);
      for (const o of s.decision?.options ?? []) {
        assert.ok(o.lekar_reflection?.length > 30, `${p.id}/${s.id}/${o.id}: lekar_reflection`);
      }
    }
  }
});

test('lékařova vrstva: pohledy pacient/lékař se liší i textově (žádný copy-paste)', () => {
  for (const p of doc.personas) {
    for (const s of p.steps) {
      assert.notEqual(s.views.pacient, s.views.lekar, `${p.id}/${s.id}: identické pohledy`);
      assert.notEqual(s.views.lekar, s.lekar_blind, `${p.id}/${s.id}: blind duplikuje pohled`);
    }
  }
});
