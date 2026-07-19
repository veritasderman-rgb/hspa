// Tři židle — testy kampaňového stepperu (stav kroků, doporučený další krok).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepperModel, nextStepHint } from '../src/hra-stepper.js';
import { emptyState } from '../src/hra-stav.js';

test('stepper: prázdná kampaň — vše čeká, hint vede na akt I', () => {
  const steps = stepperModel(emptyState());
  assert.deepEqual(steps.map(s => s.status), ['todo', 'todo', 'todo', 'todo']);
  const hint = nextStepHint(steps, 'vysledovka');
  assert.equal(hint.href, 'vyhlaska.html');
  assert.match(hint.text, /akt I/);
});

test('stepper: statusy sledují uložené akty (done/progress) a handoff popisky drží', () => {
  const state = {
    ...emptyState(),
    ministr: { alloc: { akutni_luzkova: 7 } },
    reditel: { decisions: { platy_sester: 'zvysit' }, verdict: { complete: false } },
  };
  const steps = stepperModel(state);
  assert.deepEqual(steps.map(s => s.status), ['done', 'progress', 'todo', 'todo']);
  assert.match(steps[0].handoff, /rozpočet/);
  assert.match(steps[1].handoff, /čekací doby/);
  // hint z aktu I vede na rozehraný akt II
  assert.equal(nextStepHint(steps, 'ministr').href, 'reditel.html');
  // hráč na aktu II žádný hint nedostane — je tam, kde má být
  assert.equal(nextStepHint(steps, 'reditel'), null);
});

test('stepper: kompletní kampaň — vše done, hint vede na výsledovku', () => {
  const state = {
    ...emptyState(),
    ministr: { alloc: { akutni_luzkova: 7 } },
    reditel: { decisions: { a: 'b' }, verdict: { complete: true } },
    pacient: { persona: 'diabetik', outcome: { complete: true } },
  };
  const steps = stepperModel(state);
  assert.deepEqual(steps.map(s => s.status), ['done', 'done', 'done', 'done']);
  const hint = nextStepHint(steps, 'pacient');
  assert.equal(hint.href, 'hra.html');
});
